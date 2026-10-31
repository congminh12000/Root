import { randomBytes, randomUUID } from 'node:crypto'
import { BOTS } from '@root/bots'
import {
  applyCommand, createGame, currentActor, legalActions, recordingRng, replay, seededRng, viewFor,
  type Action, type CommandResult, type FactionId, type GameRecord, type GameState,
} from '@root/game-engine'
import { decide, sharedPool, type BotJob, type Thinker } from './bot-pool.ts'
import type { CreateGameRequest, GameSummary, LogEntry, SeatInfo, ServerMessage } from './protocol.ts'

/** What is saved for one game: the public record plus the server-only secrets (seed, seat tokens). */
export interface SavedGame {
  id: string
  createdAt: string
  seed: string
  seats: { faction: FactionId; kind: 'human' | 'bot'; name: string; bot: string | null; token: string | null }[]
  record: GameRecord
}

type Listener = (msg: ServerMessage) => void

export interface RoomOptions {
  /** Pause before each bot move, so people can follow (ms). */
  botDelayMs?: number
  /** Time a human seat has for each decision; then a bot decides once for it (multiplayer.md). 0 turns it off. */
  turnSeconds?: number
  /** Where scheduled bot decisions run; the shared worker pool by default (bot-pool.ts). */
  thinker?: Thinker
}

/** Actions whose payload is public: everyone saw it happen. Others are logged by type only (hidden cards). */
const PUBLIC_DETAIL = new Set(['move', 'battle', 'craft', 'discard-card', 'marquise-build', 'marquise-recruit', 'eyrie-move', 'eyrie-battle', 'eyrie-build',
  'eyrie-recruit', 'eyrie-add-card', 'alliance-revolt', 'alliance-spread', 'alliance-organize', 'alliance-recruit', 'vagabond-move', 'vagabond-slip',
  'vagabond-battle', 'vagabond-quest', 'vagabond-strike', 'activate-dominance', 'vagabond-coalition', 'take-dominance', 'play-ambush', 'use-battle-card'])

const LOG_SIZE = 80
/** Who decides for a human whose time ran out. */
const TIMEOUT_BOT = 'search-fast'
/** Bot for a seat created without naming one. */
const DEFAULT_BOT = 'search'

/**
 * One game on the server: the only holder of the authoritative GameState. Humans act through seat tokens; bots act
 * from their PlayerView only. Every accepted command is appended to the record, which is enough to rebuild the game.
 */
export class Room {
  readonly saved: SavedGame
  state: GameState
  log: LogEntry[] = []
  private listeners = new Map<Listener, FactionId | null>()
  private connected = new Map<FactionId, number>()
  private botTimer: NodeJS.Timeout | null = null
  /** A scheduled bot decision is being worked out off the main thread. */
  private thinking = false
  private closed = false
  private clockTimer: NodeJS.Timeout | null = null
  /** When the human the game waits on runs out of time (epoch ms), or null. */
  deadline: number | null = null
  private persist: (g: SavedGame) => void
  private botDelayMs: number
  private turnSeconds: number
  private thinker: Thinker | null

  constructor(saved: SavedGame, persist: (g: SavedGame) => void, opts: RoomOptions = {}) {
    this.saved = saved
    this.persist = persist
    this.botDelayMs = opts.botDelayMs ?? 400
    this.turnSeconds = opts.turnSeconds ?? 90
    this.thinker = opts.thinker ?? null
    this.state = replay(saved.record)
    this.log = saved.record.commands.slice(-LOG_SIZE).map(({ command }, i, all) => this.entry(command.playerId, command.type, command.payload, saved.record.commands.length - all.length + i + 1))
  }

  static create(req: CreateGameRequest, persist: (g: SavedGame) => void, opts: RoomOptions = {}): Room {
    const id = randomUUID().slice(0, 8)
    const seed = randomBytes(16).toString('hex')
    const seats = req.seats.map(s => ({
      faction: s.faction, kind: s.kind, name: s.name?.trim() || (s.kind === 'bot' ? `Bot (${s.bot && BOTS[s.bot] ? s.bot : DEFAULT_BOT})` : s.faction),
      bot: s.kind === 'bot' ? (s.bot && BOTS[s.bot] ? s.bot : DEFAULT_BOT) : null,
      token: s.kind === 'human' ? randomBytes(12).toString('base64url') : null,
    }))
    const options = {
      gameId: id,
      players: seats.map(s => ({
        playerId: s.faction, faction: s.faction,
        controller: s.kind === 'human' ? { kind: 'human' as const, userId: s.name } : { kind: 'bot' as const, profile: s.bot! },
      })),
    }
    const rng = recordingRng(seededRng(`${seed}:setup`))
    createGame(options, rng) // validates the faction mix (decision 0003) before anything is saved
    const saved: SavedGame = { id, createdAt: new Date().toISOString(), seed, seats, record: { options, setupRandom: rng.values, commands: [] } }
    persist(saved)
    return new Room(saved, persist, opts)
  }

  get id() { return this.saved.id }

  /** The seat a token belongs to; null for spectators and unknown tokens. */
  seatFor(token: string | null): FactionId | null {
    if (!token) return null
    return this.saved.seats.find(s => s.token === token)?.faction ?? null
  }

  seatInfo(): SeatInfo[] {
    return this.saved.seats.map(s => ({ faction: s.faction, kind: s.kind, name: s.name, connected: s.kind === 'bot' || (this.connected.get(s.faction) ?? 0) > 0 }))
  }

  summary(): GameSummary {
    return { id: this.id, createdAt: this.saved.createdAt, seats: this.seatInfo(), turn: this.state.turn.number, winner: this.state.winner?.factions ?? null }
  }

  subscribe(seat: FactionId | null, listener: Listener): () => void {
    this.listeners.set(listener, seat)
    if (seat) this.connected.set(seat, (this.connected.get(seat) ?? 0) + 1)
    this.scheduleBot()
    this.broadcast()
    return () => {
      this.listeners.delete(listener)
      if (seat) this.connected.set(seat, (this.connected.get(seat) ?? 1) - 1)
      this.broadcast()
    }
  }

  /** Each listener gets its own projection; hidden information never leaves the server (game-state.md). */
  private broadcast() {
    for (const [listener, seat] of this.listeners) listener(this.message(seat))
  }

  message(seat: FactionId | null): ServerMessage {
    return {
      type: 'update', gameId: this.id, seat,
      view: viewFor(this.state, seat),
      legal: seat ? legalActions(this.state, seat) : [],
      seats: this.seatInfo(),
      log: this.log,
      deadline: this.deadline,
      now: Date.now(),
    }
  }

  /** Applies one command for `seat`. The engine does every check; the server only supplies playerId and randomness. */
  submit(seat: FactionId, actionId: string, expectedRevision: number, action: Action): CommandResult {
    const n = this.saved.record.commands.length
    const rng = recordingRng(seededRng(`${this.saved.seed}:${n}`))
    const command = { gameId: this.id, playerId: seat, expectedRevision, actionId, type: action.type, payload: action.payload }
    const out = applyCommand(this.state, command, rng)
    if (!out.result.ok || out.result.duplicate) return out.result
    this.state = out.state
    this.saved.record.commands.push({ command, random: rng.values })
    this.log = [...this.log, this.entry(seat, action.type, action.payload, this.state.meta.revision)].slice(-LOG_SIZE)
    this.persist(this.saved)
    this.scheduleBot()
    this.broadcast()
    return out.result
  }

  private entry(faction: string, type: string, payload: unknown, revision: number): LogEntry {
    return PUBLIC_DETAIL.has(type) ? { revision, faction: faction as FactionId, type, detail: payload } : { revision, faction: faction as FactionId, type }
  }

  /**
   * If a bot must act, it acts after a short delay so people can follow the game. If a human must act, their clock
   * starts; when it runs out a bot decides that one choice for them (multiplayer.md).
   */
  private scheduleBot() {
    this.startClock()
    if (this.closed || this.botTimer || this.thinking || this.state.winner) return
    const actor = currentActor(this.state)
    const seat = this.saved.seats.find(s => s.faction === actor)
    if (!actor || !seat || seat.kind !== 'bot') return
    this.botTimer = setTimeout(() => {
      this.botTimer = null
      void this.think(false)
    }, this.botDelayMs)
  }

  /**
   * One scheduled bot decision, worked out in a worker so other games keep running. If the game moved on while the
   * bot was thinking (the human acted just before the deadline), the answer is dropped.
   */
  private async think(forHuman: boolean) {
    const job = this.botJob(forHuman)
    if (!job) return
    this.thinking = true
    let index: number
    try {
      index = await (this.thinker ?? sharedPool().think)(job.job)
    } catch (e) {
      console.error(`game ${this.id}: bot worker failed, deciding here instead: ${(e as Error).message}`)
      index = -1
    } finally {
      this.thinking = false
    }
    if (this.closed || this.state.meta.revision !== job.revision) { this.scheduleBot(); return }
    try {
      this.applyBot(job, index >= 0 ? job.job.legal[index]! : null)
    } catch (e) {
      console.error(`game ${this.id}: ${forHuman ? 'timeout move' : 'bot'} failed: ${(e as Error).message}`) // keep serving other games
    }
  }

  /** Restarts the decision clock whenever the game waits on a human, at a new revision. */
  private startClock() {
    if (this.clockTimer) { clearTimeout(this.clockTimer); this.clockTimer = null }
    this.deadline = null
    const actor = currentActor(this.state)
    const seat = this.saved.seats.find(s => s.faction === actor)
    if (this.closed || !this.turnSeconds || this.state.winner || !seat || seat.kind !== 'human') return
    this.deadline = Date.now() + this.turnSeconds * 1000
    this.clockTimer = setTimeout(() => {
      this.clockTimer = null
      void this.think(true)
    }, this.turnSeconds * 1000)
  }

  /** What a bot may see for the decision the game waits on, or null when no bot of that kind should act. */
  private botJob(forHuman: boolean): { job: BotJob; actor: FactionId; forHuman: boolean; revision: number } | null {
    const actor = currentActor(this.state)
    const seat = this.saved.seats.find(s => s.faction === actor)
    if (!actor || !seat || this.state.winner) return null
    if (seat.kind !== (forHuman ? 'human' : 'bot')) return null
    const revision = this.state.meta.revision
    const job = { bot: forHuman ? TIMEOUT_BOT : seat.bot ?? DEFAULT_BOT, view: viewFor(this.state, actor), legal: legalActions(this.state, actor), seed: `${this.saved.seed}:bot:${revision}` }
    return { job, actor, forHuman, revision }
  }

  /** Submits the bot's choice; with no choice given, the bot decides here on the main thread. */
  private applyBot(j: NonNullable<ReturnType<Room['botJob']>>, action: Action | null) {
    const chosen = action ?? j.job.legal[decide(j.job)]!
    const result = this.submit(j.actor, `${j.forHuman ? 'timeout' : 'bot'}-${j.revision}`, j.revision, chosen)
    if (!result.ok) throw new Error(`bot ${j.job.bot} chose an illegal action: ${result.code}`)
  }

  /**
   * One bot decision now, on this thread. Bots get the same PlayerView and legal list a human would. With
   * `forHuman`, the bot decides for a human seat whose time ran out, using the strongest bot available.
   */
  botStep(forHuman = false): boolean {
    const job = this.botJob(forHuman)
    if (!job) return false
    this.applyBot(job, null)
    return true
  }

  close() {
    this.closed = true
    if (this.botTimer) clearTimeout(this.botTimer)
    if (this.clockTimer) clearTimeout(this.clockTimer)
  }
}

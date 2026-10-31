import { randomBytes, randomUUID } from 'node:crypto'
import { BOTS } from '@root/bots'
import {
  applyCommand, createGame, currentActor, legalActions, recordingRng, replay, seededRng, viewFor,
  type Action, type CommandResult, type FactionId, type GameRecord, type GameState,
} from '@root/game-engine'
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

/** Actions whose payload is public: everyone saw it happen. Others are logged by type only (hidden cards). */
const PUBLIC_DETAIL = new Set(['move', 'battle', 'craft', 'discard-card', 'marquise-build', 'marquise-recruit', 'eyrie-move', 'eyrie-battle', 'eyrie-build',
  'eyrie-recruit', 'eyrie-add-card', 'alliance-revolt', 'alliance-spread', 'alliance-organize', 'alliance-recruit', 'vagabond-move', 'vagabond-slip',
  'vagabond-battle', 'vagabond-quest', 'vagabond-strike', 'activate-dominance', 'vagabond-coalition', 'take-dominance', 'play-ambush', 'use-battle-card'])

const LOG_SIZE = 80

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
  private persist: (g: SavedGame) => void
  private botDelayMs: number

  constructor(saved: SavedGame, persist: (g: SavedGame) => void, botDelayMs = 400) {
    this.saved = saved
    this.persist = persist
    this.botDelayMs = botDelayMs
    this.state = replay(saved.record)
    this.log = saved.record.commands.slice(-LOG_SIZE).map(({ command }, i, all) => this.entry(command.playerId, command.type, command.payload, saved.record.commands.length - all.length + i + 1))
  }

  static create(req: CreateGameRequest, persist: (g: SavedGame) => void, botDelayMs?: number): Room {
    const id = randomUUID().slice(0, 8)
    const seed = randomBytes(16).toString('hex')
    const seats = req.seats.map(s => ({
      faction: s.faction, kind: s.kind, name: s.name?.trim() || (s.kind === 'bot' ? `Bot (${s.bot ?? 'simple'})` : s.faction),
      bot: s.kind === 'bot' ? (s.bot && BOTS[s.bot] ? s.bot : 'simple') : null,
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
    return new Room(saved, persist, botDelayMs)
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
    this.broadcast()
    this.scheduleBot()
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
    this.broadcast()
    this.scheduleBot()
    return out.result
  }

  private entry(faction: string, type: string, payload: unknown, revision: number): LogEntry {
    return PUBLIC_DETAIL.has(type) ? { revision, faction: faction as FactionId, type, detail: payload } : { revision, faction: faction as FactionId, type }
  }

  /** If a bot must act, it acts after a short delay so people can follow the game. */
  private scheduleBot() {
    if (this.botTimer || this.state.winner) return
    const actor = currentActor(this.state)
    const seat = this.saved.seats.find(s => s.faction === actor)
    if (!actor || !seat || seat.kind !== 'bot') return
    this.botTimer = setTimeout(() => {
      this.botTimer = null
      try { this.botStep() } catch (e) { console.error(`game ${this.id}: bot failed: ${(e as Error).message}`) } // keep serving other games
    }, this.botDelayMs)
  }

  /** One bot decision now. Bots get the same PlayerView and legal list a human would. */
  botStep(): boolean {
    const actor = currentActor(this.state)
    const seat = this.saved.seats.find(s => s.faction === actor)
    if (!actor || !seat || seat.kind !== 'bot' || this.state.winner) return false
    const bot = BOTS[seat.bot ?? 'simple']!
    const rng = seededRng(`${this.saved.seed}:bot:${this.state.meta.revision}`)
    const action = bot.choose(viewFor(this.state, actor), legalActions(this.state, actor), rng)
    const result = this.submit(actor, `bot-${this.state.meta.revision}`, this.state.meta.revision, action)
    if (!result.ok) throw new Error(`bot ${seat.bot} chose an illegal action: ${result.code}`)
    return true
  }

  close() { if (this.botTimer) clearTimeout(this.botTimer) }
}

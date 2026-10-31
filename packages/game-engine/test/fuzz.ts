import { ALLIANCE, BASE_DECK, EYRIE, MARQUISE } from '@root/game-data'
import { applyCommand, createGame, currentActor, legalActions, recordingRng, seededRng, type FactionId, type GameRecord, type GameState, type Rng } from '../src/index.ts'

/** Plays one game with uniformly random legal actions. Shared by the fuzz test and the CLI runner. */
export function randomGame(seed: string, factions: FactionId[], maxCommands = 3000): { state: GameState; record: GameRecord; commands: number } {
  const engineRng = recordingRng(seededRng(`engine:${seed}`))
  const pick = seededRng(`bot:${seed}`)
  const options = { gameId: seed, players: factions.map(f => ({ playerId: `p-${f}`, faction: f, controller: { kind: 'bot' as const, profile: 'random' } })) }
  let state = createGame(options, engineRng)
  const record: GameRecord = { options, setupRandom: [...engineRng.values], commands: [] }
  let n = 0
  while (!state.winner && n < maxCommands) {
    const f = currentActor(state)!
    const actions = legalActions(state, f)
    if (!actions.length) throw new Error(`${seed}: ${f} has no legal action at ${state.turn.step} (pending ${JSON.stringify(state.pending.at(-1))})`)
    const action = actions[pick.int(actions.length)]!
    const rng = recordingRng(seededRng(`${seed}:${n}`))
    const command = { gameId: seed, playerId: `p-${f}`, expectedRevision: state.meta.revision, actionId: `a${n}`, ...action }
    const out = applyCommand(state, command, rng)
    if (!out.result.ok) throw new Error(`${seed}: rejected ${action.type}: ${out.result.code}`)
    record.commands.push({ command, random: rng.values })
    state = out.state
    checkInvariants(state, seed)
    n++
  }
  return { state, record, commands: n }
}

const DECK_SIZE = (players: number) => BASE_DECK.filter(c => !(players === 2 && c.kind === 'dominance')).reduce((a, c) => a + c.copies, 0)

/** Pieces and cards are never created or lost (§1.5.1). */
export function checkInvariants(s: GameState, seed: string) {
  const fail = (msg: string) => { throw new Error(`${seed} rev ${s.meta.revision}: ${msg}`) }
  const onMap = (f: FactionId) => s.map.clearings.reduce((a, c) => a + (c.warriors[f] ?? 0), 0)
  const m = s.factions.marquise, e = s.factions.eyrie, a = s.factions.alliance, v = s.factions.vagabond
  if (m && onMap('marquise') + m.warriorSupply !== MARQUISE.warriors) fail('marquise warriors')
  if (e && onMap('eyrie') + e.warriorSupply !== EYRIE.warriors) fail('eyrie warriors')
  if (a && onMap('alliance') + a.warriorSupply + a.officers !== ALLIANCE.warriors) fail('alliance warriors')
  const tokens = (type: string) => s.map.clearings.reduce((n, c) => n + c.tokens.filter(t => t.type === type).length, 0)
  const buildings = (f: FactionId, type: string) => s.map.clearings.reduce((n, c) => n + c.slots.filter(x => x?.kind === 'building' && x.faction === f && x.type === type).length, 0)
  if (m) {
    if (tokens('wood') + m.woodSupply !== MARQUISE.wood) fail('wood')
    for (const b of ['sawmill', 'workshop', 'recruiter'] as const) if (buildings('marquise', b) + m.buildingsOnTrack[b] !== 6) fail(b)
  }
  if (e && buildings('eyrie', 'roost') + e.roostsOnTrack !== EYRIE.roosts) fail('roosts')
  if (a) {
    if (tokens('sympathy') + a.sympathyOnTrack !== ALLIANCE.sympathy) fail('sympathy')
    for (const c of s.map.clearings) if (c.tokens.filter(t => t.type === 'sympathy').length > 1) fail('two sympathy in a clearing')
    for (const [suit, c] of Object.entries(a.basesOnBoard)) {
      const on = s.map.clearings.findIndex(x => x.slots.some(y => y?.kind === 'building' && y.type === 'base' && y.suit === suit))
      if ((c ?? -1) !== on) fail(`base ${suit}`)
    }
  }
  for (const [f, n] of Object.entries(s.score)) if (n !== null && n !== undefined && n < 0) fail(`${f} score below zero`)
  if (v) {
    for (const t of ['tea', 'coin', 'bag'] as const) if (v.tracks[t] < 0 || v.tracks[t] > 3) fail(`${t} track`)
  }
  let cards = s.deck.length + s.discard.length + s.availableDominance.length
  for (const h of Object.values(s.hands)) cards += h.length
  for (const p of Object.values(s.playAreas)) cards += p.length
  if (a) cards += a.supporters.length
  if (s.battle?.ambushCard) cards += 1 // held while the attacker decides whether to foil it (§4.3.1)
  if (e) for (const col of Object.values(e.decree)) cards += col.filter(c => c.kind === 'card').length
  if (cards !== DECK_SIZE(s.seats.length)) fail(`cards ${cards} != ${DECK_SIZE(s.seats.length)}`)
  const ids = [...s.deck, ...s.discard, ...s.availableDominance, ...Object.values(s.hands).flat(), ...Object.values(s.playAreas).flat()]
  if (new Set(ids).size !== ids.length) fail('duplicate card')
}

export type { Rng }

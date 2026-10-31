import assert from 'node:assert/strict'
import { AUTUMN, EYRIE, MARQUISE } from '@root/game-data'
import { applyCommand, createGame, currentActor, legalActions, seededRng, type Action, type FactionId, type GameState, type Rng } from '../src/index.ts'
import { goto } from '../src/turn.ts'

export const ALL: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']

/** A four-player game after setup, with the board, hands and discard emptied and every supply full. */
export function scenario(factions: FactionId[] = ALL): GameState {
  const rng = seededRng('scenario')
  let s = createGame({ gameId: 'g', players: factions.map(f => ({ playerId: `p-${f}`, faction: f, controller: { kind: 'bot', profile: 't' } })) }, rng)
  let n = 0
  while (s.stage === 'setup') {
    const f = currentActor(s)!
    const out = applyCommand(s, { gameId: 'g', playerId: `p-${f}`, expectedRevision: s.meta.revision, actionId: `s${n++}`, ...legalActions(s, f)[0]! }, rng)
    s = out.state
  }
  for (const [i, c] of s.map.clearings.entries()) {
    c.warriors = {}
    c.tokens = []
    c.slots = c.slots.map((slot, k) => (k >= AUTUMN.clearings[i]!.slots - AUTUMN.clearings[i]!.ruins ? slot : null))
  }
  for (const f of factions) { s.hands[f] = []; s.playAreas[f] = []; s.score[f] = 0 }
  s.discard = []
  if (s.factions.marquise) Object.assign(s.factions.marquise, { warriorSupply: MARQUISE.warriors, woodSupply: MARQUISE.wood, keep: null, buildingsOnTrack: { sawmill: 6, workshop: 6, recruiter: 6 } })
  if (s.factions.eyrie) Object.assign(s.factions.eyrie, { warriorSupply: EYRIE.warriors, roostsOnTrack: EYRIE.roosts })
  if (s.factions.alliance) Object.assign(s.factions.alliance, { warriorSupply: 10, supporters: [] })
  s.turn = { seat: 0, phase: 'daylight', step: 'hold', number: 1 }
  return s
}

export function turnOf(s: GameState, f: FactionId, phase: GameState['turn']['phase'] = 'daylight') {
  s.turn = { seat: s.seats.findIndex(x => x.faction === f), phase, step: 'hold', number: 1 }
}

export function warriors(s: GameState, c: number, w: Partial<Record<FactionId, number>>) {
  for (const [f, n] of Object.entries(w) as [FactionId, number][]) {
    s.map.clearings[c]!.warriors[f] = n
    s.factions[f]!.warriorSupply -= n
  }
}

export function building(s: GameState, c: number, faction: FactionId, type: 'sawmill' | 'workshop' | 'recruiter' | 'roost') {
  const slots = s.map.clearings[c]!.slots
  slots[slots.indexOf(null)] = { kind: 'building', faction, type }
  if (faction === 'marquise') s.factions.marquise!.buildingsOnTrack[type as 'sawmill'] -= 1
  if (type === 'roost') s.factions.eyrie!.roostsOnTrack -= 1
}

export function token(s: GameState, c: number, faction: FactionId, type: 'wood' | 'keep' | 'sympathy') {
  s.map.clearings[c]!.tokens.push({ faction, type })
  if (type === 'keep') s.factions.marquise!.keep = c
}

/** An Rng that returns the given values in order (die faces: value v is index 3v of BATTLE_DIE). */
export function fixed(values: number[]): Rng {
  let i = 0
  return { int: n => { const v = values[i++]; assert.ok(v !== undefined && v < n, `fixed rng exhausted or out of range (${v} of ${n})`); return v } }
}
export const roll = (a: number, b: number) => fixed([a * 3, b * 3])

let counter = 0
/** Sends an action as the current actor through applyCommand and returns the new state. */
export function answer(s: GameState, action: Action, rng: Rng = fixed([])): GameState {
  const f = currentActor(s)!
  const out = applyCommand(s, { gameId: s.meta.gameId, playerId: `p-${f}`, expectedRevision: s.meta.revision, actionId: `t${++counter}`, ...action }, rng)
  assert.ok(out.result.ok, `${action.type}: ${JSON.stringify(out.result)}`)
  return out.state
}

export const types = (actions: Action[]) => actions.map(a => a.type)

/** Puts the turn on `step` of faction `f` and runs the step's `enter`, as the turn machine would. */
export function at(s: GameState, f: FactionId, step: string, rng: Rng = fixed([])): GameState {
  s.turn = { seat: s.seats.findIndex(x => x.faction === f), phase: 'birdsong', step, number: 1 }
  goto(s, step, rng)
  return s
}

export const ofType = <T extends Action['type']>(actions: Action[], type: T) => actions.filter((a): a is Extract<Action, { type: T }> => a.type === type)

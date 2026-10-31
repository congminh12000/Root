import { MIN_REACH, REACH } from '@root/game-data'
import type { Action } from './actions.ts'
import { ALLIANCE_SETUP } from './factions/alliance.ts'
import { EYRIE_SETUP } from './factions/eyrie.ts'
import { MARQUISE_SETUP } from './factions/marquise.ts'
import { VAGABOND_SETUP } from './factions/vagabond.ts'
import type { Rng } from './rng.ts'
import type { FactionId, GameState } from './state.ts'

/**
 * Whether a faction mix may start a game: 2–4 distinct factions whose Reach adds up to the minimum for that
 * player count (Law §5.2). The Law only recommends this; decision 0003 makes it mandatory.
 */
export function factionMixAllowed(factions: readonly FactionId[]): boolean {
  if (factions.length < 2 || factions.length > 4 || new Set(factions).size !== factions.length) return false
  const total = factions.reduce((sum, f) => sum + REACH[f], 0)
  return total >= MIN_REACH[factions.length]!
}

/**
 * One step of a faction's setup. A step either runs on its own (`auto`) or waits for the faction to pick one of
 * `options`; `apply` returns true once the step is finished (Marquise buildings take three picks).
 */
export type SetupStep =
  | { id: string; auto: (state: GameState, rng: Rng) => void }
  | { id: string; options: (state: GameState) => Action[]; apply: (state: GameState, action: Action) => boolean }

/** Setup order A–D printed on the faction boards (§5.1.7), not turn order. */
export const SETUP_ORDER: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']

const STEPS: Record<FactionId, SetupStep[]> = {
  marquise: MARQUISE_SETUP, eyrie: EYRIE_SETUP, alliance: ALLIANCE_SETUP, vagabond: VAGABOND_SETUP,
}

export function setupStep(faction: FactionId, id: string): SetupStep {
  const step = STEPS[faction].find(s => s.id === id)
  if (!step) throw new Error(`unknown setup step ${faction}/${id}`)
  return step
}

/** Queue every setup step on the pending stack, first step on top. */
export function queueSetup(state: GameState) {
  const order = SETUP_ORDER.filter(f => state.seats.some(s => s.faction === f))
  const steps = order.flatMap(f => STEPS[f].map(s => ({ kind: 'setup' as const, player: f, step: s.id })))
  state.pending = steps.reverse()
}

/** Run automatic steps until a faction must choose, then hand the first turn to seat 0 (§5.1.1). */
export function advanceSetup(state: GameState, rng: Rng) {
  while (state.stage === 'setup') {
    const top = state.pending.at(-1)
    if (!top) {
      state.stage = 'play'
      state.turn = { seat: 0, phase: 'birdsong', step: 'start', number: 1 }
      return
    }
    if (top.kind !== 'setup') throw new Error(`unexpected ${top.kind} during setup`)
    const step = setupStep(top.player, top.step)
    if (!('auto' in step)) return
    step.auto(state, rng)
    state.pending.pop()
  }
}

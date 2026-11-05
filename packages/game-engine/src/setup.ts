import { MIN_REACH, REACH } from '@root/game-data'
import type { Action } from './actions.ts'
import { ALLIANCE_SETUP } from './factions/alliance.ts'
import { EYRIE_ADVANCED_SETUP, EYRIE_SETUP } from './factions/eyrie.ts'
import { MARQUISE_ADVANCED_SETUP, MARQUISE_SETUP } from './factions/marquise.ts'
import { VAGABOND_SETUP } from './factions/vagabond.ts'
import { shuffle, type Rng } from './rng.ts'
import type { SetupStep } from './setup-step.ts'
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

export type { SetupStep } from './setup-step.ts'

/** Setup order A–D printed on the faction boards (§5.1.7), not turn order. */
export const SETUP_ORDER: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']

const STEPS: Record<FactionId, SetupStep[]> = {
  marquise: MARQUISE_SETUP, eyrie: EYRIE_SETUP, alliance: ALLIANCE_SETUP, vagabond: VAGABOND_SETUP,
}

/**
 * Advanced Setup (App. A, decisions/0006): each faction follows its setup card (docs/03-data-spec/setup-cards.md).
 * The Woodland Alliance and Vagabond cards hold the same steps as §8.3 and §9.3.
 */
const ADVANCED_STEPS: Record<FactionId, SetupStep[]> = {
  marquise: MARQUISE_ADVANCED_SETUP, eyrie: EYRIE_ADVANCED_SETUP, alliance: ALLIANCE_SETUP, vagabond: VAGABOND_SETUP,
}

/** A.10 Choose Starting Hands: keep three of five, putting the others face down on the deck one at a time. */
const KEEP = 3
const COMMON_STEPS: SetupStep[] = [
  {
    id: 'A.10',
    options: state => {
      const top = state.pending.at(-1)!
      const hand = state.hands[top.player] ?? []
      return hand.length > KEEP ? hand.map((card): Action => ({ type: 'return-card', payload: { card } })) : []
    },
    apply: (state, action) => {
      if (action.type !== 'return-card') return false
      const f = state.pending.at(-1)!.player
      state.hands[f] = state.hands[f]!.filter(c => c !== action.payload.card)
      state.deck.unshift(action.payload.card)
      return state.hands[f]!.length <= KEEP
    },
  },
  { id: 'A.10-shuffle', auto: (state, rng) => { state.deck = shuffle(state.deck, rng) } },
]

export function setupStep(faction: FactionId, id: string): SetupStep {
  const step = [...COMMON_STEPS, ...STEPS[faction], ...ADVANCED_STEPS[faction]].find(s => s.id === id)
  if (!step) throw new Error(`unknown setup step ${faction}/${id}`)
  return step
}

/** Queue every setup step on the pending stack, first step on top. */
export function queueSetup(state: GameState) {
  const entry = (player: FactionId, step: string) => ({ kind: 'setup' as const, player, step })
  if (state.setupMode === 'advanced') {
    // A.8.3: from the last player in turn order, counterclockwise; then A.10 in turn order and one shuffle.
    const order = [...state.seats].reverse().map(s => s.faction)
    const steps = [
      ...order.flatMap(f => ADVANCED_STEPS[f].map(s => entry(f, s.id))),
      ...state.seats.map(s => entry(s.faction, 'A.10')),
      entry(state.seats[0]!.faction, 'A.10-shuffle'),
    ]
    state.pending = steps.reverse()
    return
  }
  const order = SETUP_ORDER.filter(f => state.seats.some(s => s.faction === f))
  const steps = order.flatMap(f => STEPS[f].map(s => entry(f, s.id)))
  state.pending = steps.reverse()
}

/** Run automatic steps until a faction must choose, then hand the first turn to seat 0 (§5.1.1). */
export function advanceSetup(state: GameState, rng: Rng) {
  while (state.stage === 'setup') {
    const top = state.pending.at(-1)
    if (!top) {
      state.stage = 'play'
      state.turn = { seat: 0, phase: 'birdsong', step: 'birdsong-start', number: 1 }
      return
    }
    if (top.kind !== 'setup') throw new Error(`unexpected ${top.kind} during setup`)
    const step = setupStep(top.player, top.step)
    if (!('auto' in step)) return
    step.auto(state, rng)
    state.pending.pop()
  }
}

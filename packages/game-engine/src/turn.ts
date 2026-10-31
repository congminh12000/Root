import type { Action } from './actions.ts'
import { cardWindowActions, performCardAction, startCardActions } from './cards.ts'
import { dominanceActions, performDominance } from './common.ts'
import { ALLIANCE_TURN } from './factions/alliance.ts'
import { EYRIE_TURN } from './factions/eyrie.ts'
import { MARQUISE_TURN } from './factions/marquise.ts'
import { VAGABOND_TURN } from './factions/vagabond.ts'
import type { Rng } from './rng.ts'
import { checkDominanceVictory } from './rules.ts'
import type { FactionId, GameState, Phase } from './state.ts'

/**
 * The turn as a state machine (turn-flow.md, §1.4). `GameState.turn.step` names the current step. Each faction lists
 * its own steps; a `start` step is put in front of every phase for "at start of" effects (§1.4.1).
 */
export interface TurnStep {
  id: string
  phase: Phase
  /** Runs once when the step begins. May push pending decisions. */
  enter?: (state: GameState, rng: Rng) => void
  /** The step's own choices. Empty means the step is over (or, with `stuck`, cannot be completed). */
  options?: (state: GameState) => Action[]
  apply?: (state: GameState, action: Action, rng: Rng) => void
  /** The player may end the step early with `end-step`. */
  optional?: boolean
  /** Card effects and dominance usable "any time" in this phase also keep an optional step open. */
  window?: boolean
  /** True while an action is half taken (§1.4.2): no other effects, no end-step. */
  busy?: (state: GameState) => boolean
  /** A mandatory step with no options left (Eyrie Decree: Turmoil, §7.5.2). Must change the step. */
  stuck?: (state: GameState, rng: Rng) => void
}

// A function, not a constant: the faction modules import this one, so their lists are read only when needed.
const turnOf = (f: FactionId): TurnStep[] =>
  ({ marquise: MARQUISE_TURN, eyrie: EYRIE_TURN, alliance: ALLIANCE_TURN, vagabond: VAGABOND_TURN })[f]

function startStep(phase: Phase): TurnStep {
  return {
    id: `${phase}-start`, phase, optional: true, window: phase === 'birdsong',
    // §3.3.1 dominance is checked at the start of Birdsong, before anything else.
    enter: state => { if (phase === 'birdsong') checkDominanceVictory(state, activeFaction(state)) },
    options: state => startCardActions(state, activeFaction(state), phase),
  }
}

const STEPS = new Map<FactionId, TurnStep[]>()
export function stepsFor(f: FactionId): TurnStep[] {
  let steps = STEPS.get(f)
  if (!steps) {
    steps = (['birdsong', 'daylight', 'evening'] as Phase[]).flatMap(p => [startStep(p), ...turnOf(f).filter(s => s.phase === p)])
    STEPS.set(f, steps)
  }
  return steps
}

/** A step that freezes the turn machine: only effects usable any time in the phase, no automatic steps. Scenario tests park the turn here. */
export const HOLD_STEP = 'hold'

export const activeFaction = (state: GameState): FactionId => state.seats[state.turn.seat]!.faction

export function currentStep(state: GameState): TurnStep {
  const step = stepsFor(activeFaction(state)).find(s => s.id === state.turn.step)
  if (!step) throw new Error(`unknown step ${state.turn.step}`)
  return step
}

/** Moves to a step of the active faction and runs its `enter`. */
export function goto(state: GameState, id: string, rng: Rng) {
  const step = stepsFor(activeFaction(state)).find(s => s.id === id)
  if (!step) throw new Error(`unknown step ${id}`)
  state.turn.step = id
  state.turn.phase = step.phase
  step.enter?.(state, rng)
}

/** Goes to the first step of `phase` (Turmoil and Hideout end Daylight early). */
export function gotoPhase(state: GameState, phase: Phase, rng: Rng) {
  goto(state, `${phase}-start`, rng)
}

function nextStep(state: GameState, rng: Rng) {
  const steps = stepsFor(activeFaction(state))
  const i = steps.findIndex(s => s.id === state.turn.step)
  if (i + 1 < steps.length) goto(state, steps[i + 1]!.id, rng)
  else endTurn(state, rng)
}

/** End of Evening: reset per-turn counters and pass the turn clockwise (turn-flow.md). */
function endTurn(state: GameState, rng: Rng) {
  state.craftingUsed = []
  state.cardsUsed = []
  state.reveals = []
  const m = state.factions.marquise
  if (m) Object.assign(m, { recruitedThisTurn: false, actionsRemaining: 0, marching: 0, woodToPlace: 0 })
  const e = state.factions.eyrie
  if (e) { e.resolved = { recruit: [], move: [], battle: [], build: [] }; e.added = { count: 0, bird: false } }
  if (state.factions.alliance) state.factions.alliance.operationsLeft = 0
  const v = state.factions.vagabond
  if (v) { v.aidThisTurn = {}; v.refreshLeft = 0 }
  state.turn = { seat: (state.turn.seat + 1) % state.seats.length, phase: 'birdsong', step: 'birdsong-start', number: state.turn.number + 1 }
  goto(state, 'birdsong-start', rng)
}

/** Effects usable "any time" in the current phase: dominance in Daylight (§3.3) and persistent cards (cards.md). */
function windowActions(state: GameState, f: FactionId): Action[] {
  const out = cardWindowActions(state, f, state.turn.phase)
  if (state.turn.phase === 'daylight') out.push(...dominanceActions(state, f))
  return out
}

/** Legal actions for the active faction when no decision is pending. */
export function turnActions(state: GameState, f: FactionId): Action[] {
  if (state.turn.step === HOLD_STEP) return windowActions(state, f)
  const step = currentStep(state)
  const own = step.options?.(state) ?? []
  if (step.busy?.(state)) return own
  const extra = step.optional || step.window ? windowActions(state, f) : []
  const waiting = own.length > 0 || (step.window && extra.length > 0)
  if (!waiting) return []
  return [...own, ...extra, ...(step.optional ? [{ type: 'end-step', payload: {} } as Action] : [])]
}

export function performTurn(state: GameState, f: FactionId, action: Action, rng: Rng) {
  if (action.type === 'end-step') { nextStep(state, rng); return }
  if (action.type === 'activate-dominance' || action.type === 'take-dominance' || action.type === 'vagabond-coalition') { performDominance(state, f, action); return }
  if (performCardAction(state, f, action, rng)) return
  const step = currentStep(state)
  if (!step.apply) throw new Error(`step ${step.id} takes no action`)
  step.apply(state, action, rng)
}

/**
 * Runs automatic steps until the active player has a choice, a decision is pending, a battle is waiting or the game
 * is over. Steps without options end on their own (turn-flow.md "Chuyển bước").
 */
export function advanceTurn(state: GameState, rng: Rng) {
  for (let guard = 0; guard < 1000; guard++) {
    if (state.stage !== 'play' || state.winner || state.pending.length || state.battle || state.turn.step === HOLD_STEP) return
    const step = currentStep(state)
    if (turnActions(state, activeFaction(state)).length) return
    if (step.stuck) {
      const before = state.turn.step
      step.stuck(state, rng)
      if (state.turn.step !== before) continue
    }
    nextStep(state, rng)
  }
  throw new Error('advanceTurn: no progress after 1000 steps')
}

import type { Action } from './actions.ts'
import type { FactionId, GameState, PendingDecision } from './state.ts'

/**
 * Ordering simultaneous effects (§1.1.3, §4.3.6). Field Hospitals, Outrage and the Alliance's supporter discard can
 * be triggered at the same moment, and the order matters when they compete for the same cards. Instead of a fixed
 * order, the player who chooses picks which one resolves first, one at a time, until a single one is left.
 */

export type TriggeredEffect = Extract<PendingDecision, { kind: 'field-hospital' | 'outrage' | 'discard-supporters' }>

export const isTriggeredEffect = (p: PendingDecision): p is TriggeredEffect =>
  p.kind === 'field-hospital' || p.kind === 'outrage' || p.kind === 'discard-supporters'

/** Effects triggered in step 6 of the battle in progress share one batch; otherwise the command's revision. */
export const effectBatch = (state: GameState): number => (state.battle ? -1 : state.meta.revision)

/** Stack indexes (top first) of the same-batch effects still waiting for their order; empty when there is no choice. */
export function simultaneousEffects(state: GameState): number[] {
  const out: number[] = []
  const top = state.pending.at(-1)
  if (!top || !isTriggeredEffect(top) || top.batch === undefined) return out
  for (let i = state.pending.length - 1; i >= 0; i--) {
    const p = state.pending[i]!
    if (!isTriggeredEffect(p) || p.batch !== top.batch) break
    out.push(i)
  }
  return out.length >= 2 ? out : []
}

/** Whose pieces were removed to trigger the effect (§4.3.6). */
const triggeredBy = (p: TriggeredEffect): FactionId => (p.kind === 'field-hospital' ? 'marquise' : 'alliance')

/**
 * Who orders the effects: in battle, the side whose pieces were removed when they all come from one side (§4.3.6);
 * otherwise the player taking their turn (§1.1.3).
 */
export function effectOrderer(state: GameState): FactionId | null {
  const effects = simultaneousEffects(state).map(i => state.pending[i] as TriggeredEffect)
  if (!effects.length) return null
  const sides = new Set(effects.map(triggeredBy))
  if (state.battle && sides.size === 1) return [...sides][0]!
  return state.seats[state.turn.seat]!.faction
}

export const orderActions = (state: GameState): Action[] =>
  simultaneousEffects(state).map(index => {
    const p = state.pending[index] as TriggeredEffect
    return { type: 'order-effects', payload: { index, effect: p.kind, player: p.player } }
  })

/** Moves the chosen effect to the top of the stack, out of its batch, so it resolves next. */
export function performOrder(state: GameState, action: Extract<Action, { type: 'order-effects' }>) {
  const [chosen] = state.pending.splice(action.payload.index, 1) as [TriggeredEffect]
  delete chosen.batch
  state.pending.push(chosen)
}

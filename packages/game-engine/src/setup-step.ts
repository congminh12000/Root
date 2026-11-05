import type { Action } from './actions.ts'
import type { Rng } from './rng.ts'
import type { GameState } from './state.ts'

/**
 * One step of a faction's setup. A step either runs on its own (`auto`) or waits for the faction to pick one of
 * `options`; `apply` returns true once the step is finished (Marquise buildings take three picks).
 */
export type SetupStep =
  | { id: string; auto: (state: GameState, rng: Rng) => void }
  | { id: string; options: (state: GameState) => Action[]; apply: (state: GameState, action: Action) => boolean }

/** The choice handler of a step that waits for a pick, so another setup can reuse it. */
export function applyOf(step: SetupStep): Extract<SetupStep, { apply: unknown }>['apply'] {
  if (!('apply' in step)) throw new Error(`setup step ${step.id} takes no choice`)
  return step.apply
}

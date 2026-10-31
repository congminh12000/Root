import { adjacent, mapOf } from './board.ts'
import { pawnAt, rules, warriorsAt } from './rules.ts'
import { outrage } from './removal.ts'
import type { ClearingId, FactionId, GameState } from './state.ts'

/**
 * Whether `f` may take a move from `from` to `to` (§4.2): along a path to an adjacent clearing, with at least one
 * warrior there, ruling the origin or the destination (§4.2.1). The Vagabond's own movement is §9.
 */
export function canMove(state: GameState, f: FactionId, from: ClearingId, to: ClearingId): boolean {
  if (!adjacent(mapOf(state), from).includes(to)) return false
  if (warriorsAt(state, f, from) < 1 && !pawnAt(state, f, from)) return false
  return f === 'vagabond' || rules(state, f, from) || rules(state, f, to) // Nimble (§9.2.3)
}

/** Every legal (from, to, count) move for `f` (§4.2: any number more than zero). */
export function moveOptions(state: GameState, f: FactionId): { from: ClearingId; to: ClearingId; warriors: number }[] {
  const map = mapOf(state)
  return map.clearings.flatMap(({ id: from }) => {
    const n = warriorsAt(state, f, from)
    if (n < 1) return []
    return adjacent(map, from).filter(to => canMove(state, f, from, to))
      .flatMap(to => Array.from({ length: n }, (_, i) => ({ from, to, warriors: i + 1 })))
  })
}

export const sympathetic = (state: GameState, c: ClearingId) => state.map.clearings[c]!.tokens.some(t => t.type === 'sympathy')

/**
 * Moves warriors (§4.2). Callers check canMove. Another player's warriors moving into a sympathetic clearing cause
 * Outrage (§8.2.6), except Allied warriors forced along by the Vagabond (decisions/0004, OQ-16).
 */
export function moveWarriors(state: GameState, f: FactionId, from: ClearingId, to: ClearingId, n: number, opts: { forcedByVagabond?: boolean } = {}) {
  if (n < 1 || warriorsAt(state, f, from) < n) throw new Error(`cannot move ${n} ${f} warriors from ${from}`)
  const src = state.map.clearings[from]!.warriors, dst = state.map.clearings[to]!.warriors
  src[f] = src[f]! - n
  if (!src[f]) delete src[f]
  dst[f] = (dst[f] ?? 0) + n
  if (f !== 'alliance' && !opts.forcedByVagabond && sympathetic(state, to)) outrage(state, f, to)
}

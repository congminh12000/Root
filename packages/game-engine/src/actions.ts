import type { ClearingId, EyrieLeader, ForestId, MarquiseBuilding, VagabondCharacter } from './state.ts'

/**
 * Everything a player can choose. A GameCommand's `type` and `payload` must equal one entry of
 * legalActions() for the acting faction; that check is the engine's only validation path.
 */
export type Action =
  // Setup (§6.3, §7.3, §9.3)
  | { type: 'marquise-place-keep'; payload: { clearing: ClearingId } }
  | { type: 'marquise-place-building'; payload: { building: MarquiseBuilding; clearing: ClearingId } }
  | { type: 'eyrie-place-roost'; payload: { clearing: ClearingId } }
  | { type: 'eyrie-choose-leader'; payload: { leader: EyrieLeader } }
  | { type: 'vagabond-choose-character'; payload: { character: VagabondCharacter } }
  | { type: 'vagabond-place-pawn'; payload: { forest: ForestId } }

/** Key-order-independent equality for JSON-shaped values. */
export function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const ka = Object.keys(a), kb = Object.keys(b)
  return ka.length === kb.length && ka.every(k => sameJson((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
}

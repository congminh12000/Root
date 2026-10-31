import type { CardId, ClearingId, DecreeColumn, EyrieLeader, FactionId, ForestId, ItemType, MarquiseBuilding, PawnLocation, QuestId, VagabondCharacter } from './state.ts'

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
  // Battle decisions (§4.3)
  | { type: 'play-ambush'; payload: { card: CardId } }
  | { type: 'decline-ambush'; payload: Record<string, never> }
  | { type: 'use-battle-card'; payload: { card: CardId } }
  | { type: 'end-battle-cards'; payload: Record<string, never> }
  /** Buildings/tokens by type, or Vagabond items by `type` / `type:exhausted`, for the hits left after warriors. */
  | { type: 'take-hits'; payload: { remove: Record<string, number> } }
  // Shared decisions and actions
  | { type: 'field-hospital'; payload: { card: CardId } }
  | { type: 'decline-field-hospital'; payload: Record<string, never> }
  | { type: 'discard-card'; payload: { card: CardId } }
  | { type: 'activate-dominance'; payload: { card: CardId } }
  | { type: 'take-dominance'; payload: { dominance: CardId; spend: CardId } }
  | { type: 'vagabond-coalition'; payload: { card: CardId; with: FactionId } } // §9.2.8
  | { type: 'outrage-give'; payload: { card: CardId } } // §8.2.6
  | { type: 'outrage-reveal'; payload: Record<string, never> }
  | { type: 'discard-supporter'; payload: { card: CardId } } // §8.2.4
  // Turn flow (turn-flow.md)
  | { type: 'end-step'; payload: Record<string, never> }
  | { type: 'craft'; payload: { card: CardId } } // §4.1
  | { type: 'battle'; payload: { clearing: ClearingId; defender: FactionId } } // §4.3
  | { type: 'move'; payload: { from: ClearingId; to: ClearingId; warriors: number } } // §4.2
  // Marquise (§6.4–6.6)
  | { type: 'marquise-place-wood'; payload: { clearings: ClearingId[] } }
  | { type: 'marquise-spend-bird'; payload: { card: CardId } }
  | { type: 'marquise-end-march'; payload: Record<string, never> }
  | { type: 'marquise-recruit'; payload: { clearings: ClearingId[] } }
  | { type: 'marquise-build'; payload: { building: MarquiseBuilding; clearing: ClearingId; wood: ClearingId[] } }
  | { type: 'marquise-overwork'; payload: { clearing: ClearingId; card: CardId } }
  // Eyrie (§7.4–7.7)
  | { type: 'eyrie-add-card'; payload: { card: CardId; column: DecreeColumn } }
  | { type: 'eyrie-new-roost'; payload: { clearing: ClearingId } }
  | { type: 'eyrie-recruit'; payload: { index: number; clearing: ClearingId } }
  | { type: 'eyrie-move'; payload: { index: number; from: ClearingId; to: ClearingId; warriors: number } }
  | { type: 'eyrie-battle'; payload: { index: number; clearing: ClearingId; defender: FactionId } }
  | { type: 'eyrie-build'; payload: { index: number; clearing: ClearingId } }
  // Alliance (§8.4–8.6); `birds` is how many bird supporters to spend, the rest match the suit
  | { type: 'alliance-revolt'; payload: { clearing: ClearingId; birds: number } }
  | { type: 'alliance-spread'; payload: { clearing: ClearingId; birds: number } }
  | { type: 'alliance-mobilize'; payload: { card: CardId } }
  | { type: 'alliance-train'; payload: { card: CardId } }
  | { type: 'alliance-recruit'; payload: { clearing: ClearingId } }
  | { type: 'alliance-organize'; payload: { clearing: ClearingId } }
  // Vagabond (§9.4–9.6, V); item keys are `type` (face up) or `type:exhausted`
  | { type: 'vagabond-refresh'; payload: { items: Record<string, number> } }
  | { type: 'vagabond-slip'; payload: { to: PawnLocation } }
  | { type: 'vagabond-move'; payload: { to: ClearingId; ally?: { faction: FactionId; warriors: number } } }
  | { type: 'vagabond-battle'; payload: { defender: FactionId; ally?: FactionId } }
  | { type: 'vagabond-explore'; payload: Record<string, never> }
  | { type: 'vagabond-aid'; payload: { to: FactionId; card: CardId; exhaust: ItemType; take?: ItemType } }
  | { type: 'vagabond-quest'; payload: { quest: QuestId; reward: 'points' | 'draw' } }
  | { type: 'vagabond-strike'; payload: { target: FactionId; piece: string } }
  | { type: 'vagabond-repair'; payload: { item: string } }
  | { type: 'vagabond-steal'; payload: { from: FactionId } }
  | { type: 'vagabond-day-labor'; payload: { card: CardId } }
  | { type: 'vagabond-hideout'; payload: { items: Record<string, number> } }
  | { type: 'vagabond-remove-items'; payload: { items: Record<string, number> } }
  // Persistent card effects (cards.md)
  | { type: 'better-burrow-bank'; payload: { card: CardId; enemy: FactionId } }
  | { type: 'royal-claim'; payload: { card: CardId } }
  | { type: 'stand-and-deliver'; payload: { card: CardId; enemy: FactionId } }
  | { type: 'command-warren'; payload: { card: CardId; clearing: ClearingId; defender: FactionId } }
  | { type: 'cobbler'; payload: { card: CardId; from: ClearingId; to: ClearingId; warriors: number } }
  | { type: 'cobbler-vagabond'; payload: { card: CardId; to: ClearingId } }
  | { type: 'codebreakers'; payload: { card: CardId; target: FactionId } }
  | { type: 'tax-collector'; payload: { card: CardId; clearing: ClearingId } }

/** Key-order-independent equality for JSON-shaped values. */
export function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const ka = Object.keys(a), kb = Object.keys(b)
  return ka.length === kb.length && ka.every(k => sameJson((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
}

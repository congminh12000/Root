/** Content types shared by every package. The engine imports these; this package imports nothing. */

export type Suit = 'fox' | 'rabbit' | 'mouse' // Law §2.2.2
export type CardSuit = Suit | 'bird' // Law §2.1

/**
 * Law §9.2.5 prints items as glyphs: M boots, S sword, C crossbow, F torch, H hammer, T tea, X coin, B bag.
 * Confirmed against the item supply printed on the Autumn map (Walking Through Root p. 3).
 */
export type ItemType = 'boots' | 'sword' | 'crossbow' | 'torch' | 'hammer' | 'tea' | 'coin' | 'bag'

/** Where a value was checked. `unverified` values must be confirmed before release (open-questions.md). */
export type Evidence = 'law' | 'card-library' | 'walkthrough' | 'map-art' | 'unverified'

export interface CardDef {
  /** Stable id of the design, e.g. "root-tea-fox". Physical copies get ids `${id}#${n}` at setup. */
  id: string
  name: string
  suit: CardSuit
  copies: number
  copiesEvidence: Evidence
  /**
   * ambush §2.1.2 and dominance §2.1.3 cannot be crafted. Every other card is crafted (§4.1):
   * item and immediate cards are discarded after use (§4.1.2), persistent ones stay in the play area (§4.1.3).
   */
  kind: 'ambush' | 'dominance' | 'item' | 'immediate' | 'persistent'
  /** Crafting cost (§4.1.1), one entry per icon. 'any' is the three-colour question mark. */
  cost: (Suit | 'any')[]
  item?: ItemType
  /** Victory points printed on an item card (§3.2.2). */
  vp?: number
  /** Effect summary as printed, for reference; the engine encodes behaviour separately. */
  text?: string
  /** Leder Card Library id, e.g. "ROOT-51". */
  libraryId: string
}

export interface QuestDef {
  id: string
  name: string
  suit: Suit
  /** The two items exhausted to complete the quest (§9.5.5). */
  items: [ItemType, ItemType]
  libraryId: string
}

export interface ClearingDef {
  /** Index in `clearings`. Docs and UI show id + 1; the base map prints no numbers. */
  id: number
  /** Where it sits, for people reading the data, e.g. "top-left corner". */
  where: string
  suit: Suit
  /** Printed building slots, ruin slots included (§2.2.3). */
  slots: number
  /** Slots marked "R" (§2.2.4); 0 or 1 on Autumn. */
  ruins: number
  /** Centre in map art, 0..1 from the top-left. Layout only, never used by rules. */
  at: [number, number]
}

export interface MapDef {
  id: string
  name: string
  clearings: ClearingDef[]
  /** Undirected paths (§2.2), each pair listed once with the lower id first. */
  paths: [number, number][]
  /** Forests (§2.4) as the clearings around each one, in boundary order. */
  forests: number[][]
  /** Corner clearings for setup (§6.3.2, §7.3.2) and bird dominance (§3.3.1.II). */
  corners: { topLeft: number; topRight: number; bottomLeft: number; bottomRight: number }
  /** Items placed beside the map in setup (§5.1.5). */
  itemSupply: Partial<Record<ItemType, number>>
  evidence: Evidence
}

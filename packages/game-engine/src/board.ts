import { MAPS, type MapDef } from '@root/game-data'
import type { CardId, ClearingId, FactionId, GameState, SlotContent } from './state.ts'
import { shuffle, type Rng } from './rng.ts'

export const mapOf = (state: GameState): MapDef => MAPS[state.map.id]!

/** Clearings linked by a path (§2.2.1). */
export function adjacent(map: MapDef, c: ClearingId): ClearingId[] {
  return map.paths.flatMap(([a, b]) => (a === c ? [b] : b === c ? [a] : []))
}

export function corners(map: MapDef): ClearingId[] {
  const { topLeft, topRight, bottomLeft, bottomRight } = map.corners
  return [topLeft, topRight, bottomLeft, bottomRight]
}

/** The corner diagonally opposite a corner (§6.3.3, §7.3.2, §3.3.1.II). */
export function oppositeCorner(map: MapDef, c: ClearingId): ClearingId {
  const { topLeft, topRight, bottomLeft, bottomRight } = map.corners
  const pairs: [number, number][] = [[topLeft, bottomRight], [topRight, bottomLeft]]
  for (const [a, b] of pairs) { if (c === a) return b; if (c === b) return a }
  throw new Error(`clearing ${c} is not a corner`)
}

export const openSlots = (state: GameState, c: ClearingId) => state.map.clearings[c]!.slots.filter(s => s === null).length

/** The keep forbids other players from placing pieces in its clearing (§6.2.2). */
export function canPlaceIn(state: GameState, faction: FactionId, c: ClearingId): boolean {
  const keep = state.factions.marquise?.keep
  return faction === 'marquise' || keep === null || keep === undefined || keep !== c
}

/** Fills the first open slot (§2.2.3). Callers check openSlots first. */
export function placeInSlot(state: GameState, c: ClearingId, content: SlotContent) {
  const slots = state.map.clearings[c]!.slots
  const i = slots.indexOf(null)
  if (i < 0) throw new Error(`clearing ${c} has no open slot`)
  slots[i] = content
}

/** Moves warriors from a faction's supply onto the map; places as many as the supply allows (§1.5.4). */
export function placeWarriors(state: GameState, faction: FactionId, c: ClearingId, n: number): number {
  const board = state.factions[faction]!
  const placed = Math.min(n, board.warriorSupply)
  board.warriorSupply -= placed
  const w = state.map.clearings[c]!.warriors
  w[faction] = (w[faction] ?? 0) + placed
  return placed
}

/**
 * Draws from the top of the shared deck. The moment the deck is empty the discard pile is shuffled into a new deck
 * (§2.1), so cards discarded later stay in the discard pile.
 */
export function drawCards(state: GameState, n: number, rng: Rng): CardId[] {
  const drawn: CardId[] = []
  // Deck and discard were both empty when the deck ran out; cards discarded since are shuffled now.
  if (!state.deck.length && state.discard.length) { state.deck = shuffle(state.discard, rng); state.discard = [] }
  while (drawn.length < n && state.deck.length) {
    drawn.push(state.deck.shift()!)
    if (!state.deck.length && state.discard.length) {
      state.deck = shuffle(state.discard, rng)
      state.discard = []
    }
  }
  return drawn
}

import type { AllianceState, CardId, FactionId, FactionStates, GameState, ItemType } from './state.ts'

/**
 * What one seat may see (§1.2). Built by the engine from GameState; the server sends only this.
 * Spectators get the same projection with `self` null.
 */
export interface PlayerView {
  self: FactionId | null
  revision: number
  /** Board with every ruin's hidden items replaced by a count. */
  map: Omit<GameState['map'], 'clearings'> & {
    clearings: (Omit<GameState['map']['clearings'][number], 'slots'> & { slots: (VisibleSlot | null)[] })[]
  }
  deckCount: number
  discard: CardId[]
  availableDominance: CardId[]
  hand: CardId[] // own hand only
  handCounts: Partial<Record<FactionId, number>>
  /** Own supporters for the Alliance; others see only the count. */
  supporters: CardId[] | null
  supporterCount: number
  playAreas: GameState['playAreas']
  /** Faction boards are public except the Alliance's face-down supporters (§8.2.3). */
  factions: Omit<FactionStates, 'alliance'> & { alliance?: Omit<AllianceState, 'supporters'> }
  itemSupply: Partial<Record<ItemType, number>>
  questsAvailable: GameState['questsAvailable']
  score: GameState['score']
  turn: GameState['turn']
  /** Decisions owed by this seat; others see only who the game is waiting on. */
  pending: GameState['pending']
  waitingOn: FactionId[]
  winner: GameState['winner']
}

export type VisibleSlot =
  | Extract<NonNullable<GameState['map']['clearings'][number]['slots'][number]>, { kind: 'building' }>
  | { kind: 'ruin'; itemCount: number }

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
  /** Hands shown to this seat this turn (Codebreakers, Outrage §8.2.6). */
  revealed: GameState['reveals']
}

export type VisibleSlot =
  | Extract<NonNullable<GameState['map']['clearings'][number]['slots'][number]>, { kind: 'building' }>
  | { kind: 'ruin'; itemCount: number }

/** Projects the authoritative state to what `self` may see (§1.2, game-state.md). `null` is a spectator. */
export function viewFor(state: GameState, self: FactionId | null): PlayerView {
  const { alliance, ...openBoards } = state.factions
  const factions: PlayerView['factions'] = { ...openBoards }
  if (alliance) { const { supporters: _hidden, ...rest } = alliance; factions.alliance = rest }
  const handCounts: PlayerView['handCounts'] = {}
  for (const [f, cards] of Object.entries(state.hands)) handCounts[f as FactionId] = cards.length
  const top = state.pending.at(-1)
  const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x))
  return {
    self,
    revision: state.meta.revision,
    map: {
      id: state.map.id,
      clearings: state.map.clearings.map(c => ({
        warriors: { ...c.warriors },
        tokens: c.tokens.map(t => ({ ...t })),
        slots: c.slots.map(s => (s === null ? null : s.kind === 'ruin' ? { kind: 'ruin' as const, itemCount: s.items.length } : { ...s })),
      })),
    },
    deckCount: state.deck.length,
    discard: [...state.discard],
    availableDominance: [...state.availableDominance],
    hand: self ? [...(state.hands[self] ?? [])] : [],
    handCounts,
    supporters: self === 'alliance' && alliance ? [...alliance.supporters] : null,
    supporterCount: alliance?.supporters.length ?? 0,
    playAreas: copy(state.playAreas),
    factions: copy(factions),
    itemSupply: { ...state.itemSupply },
    questsAvailable: [...state.questsAvailable],
    score: { ...state.score },
    turn: { ...state.turn },
    pending: self ? state.pending.filter(p => p.player === self).map(p => ({ ...p })) : [],
    waitingOn: state.winner ? [] : top ? [top.player] : [state.seats[state.turn.seat]!.faction],
    winner: copy(state.winner),
    revealed: self ? copy(state.reveals.filter(r => r.to === self)) : [],
  }
}

import { BASE_DECK, type CardDef } from '@root/game-data'
import { mapOf, oppositeCorner, corners } from './board.ts'
import type { CardId, ClearingId, FactionId, GameState, Suit } from './state.ts'

// ── Cards (§2.1) ───────────────────────────────────────────────────────────────

const DEFS = new Map(BASE_DECK.map(c => [c.id, c]))
/** "tax-collector#2" → the Tax Collector definition. */
export const cardDef = (card: CardId): CardDef => DEFS.get(card.split('#')[0]!)!

/** Birds are wild (§2.1.1): a bird card matches every suit. */
export const matchesSuit = (card: CardId, suit: Suit) => cardDef(card).suit === suit || cardDef(card).suit === 'bird'
/** Reverse substitution (§2.1.1.II): only a bird card pays for "bird". */
export const isBird = (card: CardId) => cardDef(card).suit === 'bird'

/** Discard (G.5): to the shared pile, except dominance cards, which become available beside the map (§3.3.3). */
export function discardCard(state: GameState, card: CardId) {
  if (cardDef(card).kind === 'dominance') state.availableDominance.push(card)
  else state.discard.push(card)
}

/** Takes a card out of a hand; throws if it is not there (legalActions guarantees it is). */
export function takeFromHand(state: GameState, faction: FactionId, card: CardId) {
  const hand = state.hands[faction]!
  const i = hand.indexOf(card)
  if (i < 0) throw new Error(`${faction} does not hold ${card}`)
  hand.splice(i, 1)
}

// ── Map and rule (§2.2–2.5) ────────────────────────────────────────────────────

export const suitOf = (state: GameState, c: ClearingId): Suit => mapOf(state).clearings[c]!.suit

export const warriorsAt = (state: GameState, f: FactionId, c: ClearingId) => state.map.clearings[c]!.warriors[f] ?? 0

export const pawnAt = (state: GameState, f: FactionId, c: ClearingId) => {
  const pawn = f === 'vagabond' ? state.factions.vagabond?.pawn : null
  return pawn?.kind === 'clearing' && pawn.id === c
}

/** Warriors plus buildings: the presence that counts for rule (§2.5). Tokens and pawns do not count. */
export function presence(state: GameState, f: FactionId, c: ClearingId): number {
  const clearing = state.map.clearings[c]!
  return (clearing.warriors[f] ?? 0) + clearing.slots.filter(s => s?.kind === 'building' && s.faction === f).length
}

/** Whether `f` has any faction piece in the clearing: warriors, buildings, tokens or its pawn (G.10). */
export function hasPieces(state: GameState, f: FactionId, c: ClearingId): boolean {
  const clearing = state.map.clearings[c]!
  return presence(state, f, c) > 0 || clearing.tokens.some(t => t.faction === f) || pawnAt(state, f, c)
}

/**
 * Who rules a clearing (§2.5): most warriors + buildings, no one on a tie. Lords of the Forest (§7.2.2): the Eyrie
 * rule ties for the most, as long as they have a piece there.
 */
export function ruler(state: GameState, c: ClearingId): FactionId | null {
  const counts = state.seats.map(s => [s.faction, presence(state, s.faction, c)] as const).filter(([, n]) => n > 0)
  if (!counts.length) return null
  const top = Math.max(...counts.map(([, n]) => n))
  const leaders = counts.filter(([, n]) => n === top).map(([f]) => f)
  if (leaders.length === 1) return leaders[0]!
  return leaders.includes('eyrie') ? 'eyrie' : null
}

export const rules = (state: GameState, f: FactionId, c: ClearingId) => ruler(state, c) === f

/** Enemy (G.8): any other player you are not in a coalition with (§9.2.8). */
export function isEnemy(state: GameState, a: FactionId, b: FactionId): boolean {
  if (a === b) return false
  const coalition = state.factions.vagabond?.coalition
  return !(coalition && ((a === 'vagabond' && b === coalition) || (b === 'vagabond' && a === coalition)))
}

// ── Victory (§3) ───────────────────────────────────────────────────────────────

export const WINNING_SCORE = 30

/** Adds points unless the faction no longer scores (activated dominance or coalition, §3.3.1, §9.2.8). */
export function award(state: GameState, f: FactionId, points: number) {
  const current = state.score[f]
  if (current === null || current === undefined || points === 0) return
  state.score[f] = current + points
}

/** The Vagabond shares the win of the player he is in a coalition with (§9.2.8). */
function winnersWith(state: GameState, f: FactionId): FactionId[] {
  return state.factions.vagabond?.coalition === f ? [f, 'vagabond'] : [f]
}

/**
 * 30 points wins immediately (§3.1). If several reach 30 at once, the one closest clockwise from the player taking
 * their turn wins, counting that player first (§3.1.1). Returns true when the game is over.
 */
export function checkVictory(state: GameState): boolean {
  if (state.winner) return true
  const n = state.seats.length
  for (let k = 0; k < n; k++) {
    const f = state.seats[(state.turn.seat + k) % n]!.faction
    if ((state.score[f] ?? 0) >= WINNING_SCORE) {
      state.winner = { factions: winnersWith(state, f), reason: 'points' }
      state.pending = []
      state.battle = null
      return true
    }
  }
  return false
}

/** The activated dominance card in a faction's play area, if any (§3.3.1). */
export const activeDominance = (state: GameState, f: FactionId): CardId | undefined =>
  state.playAreas[f]?.find(c => cardDef(c).kind === 'dominance')

/**
 * Dominance victory, checked at the start of the faction's Birdsong (§3.3.1): rule three clearings of the card's
 * suit, or, for bird, two opposite corners.
 */
export function checkDominanceVictory(state: GameState, f: FactionId): boolean {
  const card = activeDominance(state, f)
  if (!card || state.winner) return false
  const suit = cardDef(card).suit
  const map = mapOf(state)
  const won = suit === 'bird'
    ? corners(map).some(c => rules(state, f, c) && rules(state, f, oppositeCorner(map, c)))
    : map.clearings.filter(c => c.suit === suit && rules(state, f, c.id)).length >= 3
  if (won) {
    state.winner = { factions: winnersWith(state, f), reason: 'dominance' }
    state.pending = []
    state.battle = null
  }
  return won
}

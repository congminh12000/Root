import type { Action } from './actions.ts'
import { placeWarriors } from './board.ts'
import { activeDominance, cardDef, discardCard, isBird, matchesSuit, suitOf, takeFromHand } from './rules.ts'
import type { FactionId, GameState, Suit } from './state.ts'

/** Decisions and actions every faction shares: Field Hospitals, discarding down, dominance (§3.3, §6.2.3). */

export function commonDecisionOptions(state: GameState): Action[] {
  const top = state.pending.at(-1)
  if (top?.kind === 'field-hospital') {
    const suit = suitOf(state, top.clearing)
    return [
      ...state.hands.marquise!.filter(c => matchesSuit(c, suit)).map((card): Action => ({ type: 'field-hospital', payload: { card } })),
      { type: 'decline-field-hospital', payload: {} },
    ]
  }
  if (top?.kind === 'discard-down') return state.hands[top.player]!.map((card): Action => ({ type: 'discard-card', payload: { card } }))
  return []
}

export function performCommonDecision(state: GameState, action: Action) {
  const top = state.pending.at(-1)!
  if (action.type === 'field-hospital' && top.kind === 'field-hospital') {
    state.pending.pop()
    takeFromHand(state, 'marquise', action.payload.card)
    discardCard(state, action.payload.card)
    const keep = state.factions.marquise!.keep
    if (keep !== null) placeWarriors(state, 'marquise', keep, top.warriors) // §6.2.3
  } else if (action.type === 'decline-field-hospital') {
    state.pending.pop()
  } else if (action.type === 'discard-card' && top.kind === 'discard-down') {
    takeFromHand(state, top.player, action.payload.card)
    discardCard(state, action.payload.card)
    if (state.hands[top.player]!.length <= top.to) state.pending.pop()
  }
}

/** Queue a discard-down decision when a hand is over the limit (§6.6, §7.6.2, §8.6.2, §9.6.3). */
export function requireDiscardDown(state: GameState, f: FactionId, to = 5) {
  if (state.hands[f]!.length > to) state.pending.push({ kind: 'discard-down', player: f, to })
}

// ── Dominance (§3.3) — available any time in your own Daylight ─────────────────

export function dominanceActions(state: GameState, f: FactionId): Action[] {
  const out: Action[] = []
  const hand = state.hands[f]!
  // §3.3.1: at least 10 points, still scoring, no dominance active. The Vagabond's coalition comes with §9.2.8.
  if (f !== 'vagabond' && (state.score[f] ?? -1) >= 10 && !activeDominance(state, f))
    for (const card of hand) if (cardDef(card).kind === 'dominance') out.push({ type: 'activate-dominance', payload: { card } })
  // §3.3.4: take an available dominance card by spending a matching card; a bird dominance needs a bird card.
  for (const dominance of state.availableDominance) {
    const suit = cardDef(dominance).suit
    for (const spend of hand) {
      if (suit === 'bird' ? isBird(spend) : matchesSuit(spend, suit as Suit)) out.push({ type: 'take-dominance', payload: { dominance, spend } })
    }
  }
  return out
}

export function performDominance(state: GameState, f: FactionId, action: Action) {
  if (action.type === 'activate-dominance') {
    takeFromHand(state, f, action.payload.card)
    state.playAreas[f]!.push(action.payload.card)
    state.score[f] = null // remove the score marker; no more points (§3.3.1)
  } else if (action.type === 'take-dominance') {
    takeFromHand(state, f, action.payload.spend)
    discardCard(state, action.payload.spend)
    state.availableDominance = state.availableDominance.filter(c => c !== action.payload.dominance)
    state.hands[f]!.push(action.payload.dominance)
  }
}

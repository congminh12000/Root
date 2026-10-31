import type { Action } from './actions.ts'
import { drawCards, placeWarriors } from './board.ts'
import { addSupporter } from './factions/alliance.ts'
import type { Rng } from './rng.ts'
import { activeDominance, cardDef, discardCard, isBird, matchesSuit, suitOf, takeFromHand } from './rules.ts'
import type { FactionId, GameState, Suit } from './state.ts'

/** Decisions and actions every faction shares: Field Hospitals, Outrage, discarding down, dominance (§3.3, §6.2.3, §8.2.6). */

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
  if (top?.kind === 'outrage') { // §8.2.6: a matching card (birds count, §2.1.1.I), else show the hand
    const matching = state.hands[top.player]!.filter(c => matchesSuit(c, suitOf(state, top.clearing)))
    return matching.length ? matching.map((card): Action => ({ type: 'outrage-give', payload: { card } })) : [{ type: 'outrage-reveal', payload: {} }]
  }
  if (top?.kind === 'discard-supporters') return state.factions.alliance!.supporters.map((card): Action => ({ type: 'discard-supporter', payload: { card } }))
  return []
}

export function performCommonDecision(state: GameState, action: Action, rng: Rng) {
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
  } else if (action.type === 'outrage-give' && top.kind === 'outrage') {
    state.pending.pop()
    takeFromHand(state, top.player, action.payload.card)
    addSupporter(state, action.payload.card)
  } else if (action.type === 'outrage-reveal' && top.kind === 'outrage') {
    state.pending.pop()
    state.reveals.push({ to: 'alliance', of: top.player, cards: [...state.hands[top.player]!] })
    for (const card of drawCards(state, 1, rng)) addSupporter(state, card)
  } else if (action.type === 'discard-supporter' && top.kind === 'discard-supporters') {
    const a = state.factions.alliance!
    a.supporters.splice(a.supporters.indexOf(action.payload.card), 1)
    discardCard(state, action.payload.card)
    if (a.supporters.length <= top.to) state.pending.pop()
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
  // §3.3.1: at least 10 points, still scoring, no dominance active.
  if (f !== 'vagabond' && (state.score[f] ?? -1) >= 10 && !activeDominance(state, f))
    for (const card of hand) if (cardDef(card).kind === 'dominance') out.push({ type: 'activate-dominance', payload: { card } })
  // §9.2.8: the Vagabond activates one instead to join the player with the fewest points, in games of four or more.
  if (f === 'vagabond' && state.seats.length >= 4 && (state.score.vagabond ?? -1) >= 10) {
    const scoring = state.seats.map(s => s.faction).filter(x => x !== 'vagabond' && typeof state.score[x] === 'number')
    const fewest = Math.min(...scoring.map(x => state.score[x] as number))
    for (const card of hand) if (cardDef(card).kind === 'dominance')
      for (const partner of scoring.filter(x => state.score[x] === fewest)) out.push({ type: 'vagabond-coalition', payload: { card, with: partner } })
  }
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
  } else if (action.type === 'vagabond-coalition') {
    const v = state.factions.vagabond!
    takeFromHand(state, f, action.payload.card)
    state.playAreas[f]!.push(action.payload.card)
    state.score.vagabond = null
    v.coalition = action.payload.with
    if (v.relationships[action.payload.with] === 'hostile') v.relationships[action.payload.with] = 0 // §9.2.9.III.d
  } else if (action.type === 'take-dominance') {
    takeFromHand(state, f, action.payload.spend)
    discardCard(state, action.payload.spend)
    state.availableDominance = state.availableDominance.filter(c => c !== action.payload.dominance)
    state.hands[f]!.push(action.payload.dominance)
  }
}

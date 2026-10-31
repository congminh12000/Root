import type { Action } from './actions.ts'
import { battleTargets, startBattle } from './battle.ts'
import { adjacent, drawCards, mapOf } from './board.ts'
import { exhaust, faceUp, pawnClearing } from './factions/vagabond.ts'
import { moveOptions, moveWarriors } from './move.ts'
import { removeWarriorsBy } from './removal.ts'
import type { Rng } from './rng.ts'
import { award, cardDef, discardCard, isEnemy, rules, warriorsAt } from './rules.ts'
import type { CardId, ClearingId, FactionId, GameState, Phase } from './state.ts'

/**
 * Effects of persistent cards outside battle (cards.md). "At start of" effects are offered in the phase's start step;
 * "in Birdsong" and "once in Daylight" effects any time in that phase between actions (§1.4.2). "Once" uses are kept
 * in `cardsUsed` until the end of the turn.
 */

/** Cards of one design in a faction's play area that have not been used this turn. */
function ready(state: GameState, f: FactionId, design: string): CardId[] {
  return (state.playAreas[f] ?? []).filter(c => cardDef(c).id === design && !state.cardsUsed.includes(c)).slice(0, 1)
}

const others = (state: GameState, f: FactionId) => state.seats.map(s => s.faction).filter(x => x !== f)
const enemies = (state: GameState, f: FactionId) => others(state, f).filter(x => isEnemy(state, f, x))

const hostileWarriorsAt = (state: GameState, c: ClearingId) =>
  state.seats.some(s => state.factions.vagabond?.relationships[s.faction] === 'hostile' && warriorsAt(state, s.faction, c) > 0)

/** Effects offered at the start of a phase (§1.4.1). */
export function startCardActions(state: GameState, f: FactionId, phase: Phase): Action[] {
  const out: Action[] = []
  if (phase === 'birdsong')
    for (const card of ready(state, f, 'better-burrow-bank')) for (const enemy of enemies(state, f)) out.push({ type: 'better-burrow-bank', payload: { card, enemy } })
  if (phase === 'daylight')
    for (const card of ready(state, f, 'command-warren')) {
      const clearings = f === 'vagabond' ? [pawnClearing(state)].filter((c): c is number => c !== null) : mapOf(state).clearings.map(c => c.id)
      for (const clearing of clearings) for (const defender of battleTargets(state, f, clearing)) out.push({ type: 'command-warren', payload: { card, clearing, defender } })
    }
  if (phase === 'evening')
    for (const card of ready(state, f, 'cobbler')) {
      if (f !== 'vagabond') { for (const m of moveOptions(state, f)) out.push({ type: 'cobbler', payload: { card, ...m } }); continue }
      // The Vagabond's move needs no boot here, but entering a Hostile clearing still costs one (§9.2.9.III.b, §9.2.10).
      const pawn = state.factions.vagabond!.pawn!
      const map = mapOf(state)
      const to = pawn.kind === 'clearing' ? adjacent(map, pawn.id) : map.forests[pawn.id]!
      for (const c of to) if (!hostileWarriorsAt(state, c) || faceUp(state, 'boots') > 0) out.push({ type: 'cobbler-vagabond', payload: { card, to: c } })
    }
  return out
}

/** Effects usable any time in the phase, between actions. */
export function cardWindowActions(state: GameState, f: FactionId, phase: Phase): Action[] {
  const out: Action[] = []
  if (phase === 'birdsong') {
    for (const card of (state.playAreas[f] ?? []).filter(c => cardDef(c).id === 'royal-claim').slice(0, 1)) out.push({ type: 'royal-claim', payload: { card } })
    for (const card of ready(state, f, 'stand-and-deliver'))
      for (const enemy of enemies(state, f)) if (state.hands[enemy]!.length) out.push({ type: 'stand-and-deliver', payload: { card, enemy } })
  }
  if (phase === 'daylight') {
    for (const card of ready(state, f, 'codebreakers')) for (const target of others(state, f)) out.push({ type: 'codebreakers', payload: { card, target } })
    for (const card of ready(state, f, 'tax-collector'))
      for (const { id: clearing } of mapOf(state).clearings) if (warriorsAt(state, f, clearing) > 0) out.push({ type: 'tax-collector', payload: { card, clearing } })
  }
  return out
}

/** Resolves a card effect; returns false when `action` is not one. */
export function performCardAction(state: GameState, f: FactionId, action: Action, rng: Rng): boolean {
  const use = (card: CardId) => state.cardsUsed.push(card)
  switch (action.type) {
    case 'better-burrow-bank':
      use(action.payload.card)
      state.hands[f]!.push(...drawCards(state, 1, rng))
      state.hands[action.payload.enemy]!.push(...drawCards(state, 1, rng))
      return true
    case 'royal-claim': {
      const card = action.payload.card
      state.playAreas[f] = state.playAreas[f]!.filter(c => c !== card)
      discardCard(state, card)
      award(state, f, mapOf(state).clearings.filter(c => rules(state, f, c.id)).length)
      return true
    }
    case 'stand-and-deliver': {
      use(action.payload.card)
      const hand = state.hands[action.payload.enemy]!
      state.hands[f]!.push(hand.splice(rng.int(hand.length), 1)[0]!)
      award(state, action.payload.enemy, 1)
      return true
    }
    case 'command-warren':
      use(action.payload.card)
      startBattle(state, f, action.payload.defender, action.payload.clearing, rng)
      return true
    case 'cobbler':
      use(action.payload.card)
      moveWarriors(state, f, action.payload.from, action.payload.to, action.payload.warriors)
      return true
    case 'cobbler-vagabond':
      use(action.payload.card)
      if (hostileWarriorsAt(state, action.payload.to)) exhaust(state, 'boots')
      state.factions.vagabond!.pawn = { kind: 'clearing', id: action.payload.to }
      return true
    case 'codebreakers':
      use(action.payload.card)
      state.reveals.push({ to: f, of: action.payload.target, cards: [...state.hands[action.payload.target]!] })
      return true
    case 'tax-collector':
      use(action.payload.card)
      removeWarriorsBy(state, f, action.payload.clearing, 1, { by: f })
      state.hands[f]!.push(...drawCards(state, 1, rng))
      return true
    default:
      return false
  }
}

import { BATTLE_DIE } from '@root/game-data'
import type { Action } from './actions.ts'
import { isTriggeredEffect } from './order.ts'
import { applyHitChoice, choices, dealHits, hitPool } from './removal.ts'
import type { Rng } from './rng.ts'
import { award, cardDef, checkVictory, discardCard, hasPieces, isEnemy, matchesSuit, pawnAt, suitOf, takeFromHand, warriorsAt } from './rules.ts'
import type { BattleSide, BattleState, CardId, ClearingId, FactionId, GameState } from './state.ts'

/** Battle (§4.3) as a resumable process: it stops on each decision and continues when the decision is answered. */

/** Attacker needs warriors or a pawn there; the defender must be an enemy with pieces there (§4.3, G.8). */
export function canBattle(state: GameState, attacker: FactionId, defender: FactionId, c: ClearingId): boolean {
  if (!isEnemy(state, attacker, defender)) return false
  if (warriorsAt(state, attacker, c) < 1 && !pawnAt(state, attacker, c)) return false
  return hasPieces(state, defender, c)
}

export function battleTargets(state: GameState, attacker: FactionId, c: ClearingId): FactionId[] {
  return state.seats.map(s => s.faction).filter(d => canBattle(state, attacker, d, c))
}

/** `ally`: the attacking Vagabond treats this Allied faction's warriors there as his own (§9.2.9.II.c). */
export function startBattle(state: GameState, attacker: FactionId, defender: FactionId, clearing: ClearingId, rng: Rng, ally: FactionId | null = null) {
  if (!canBattle(state, attacker, defender, clearing)) throw new Error('illegal battle')
  state.battle = {
    clearing, attacker, defender, step: 'ambush', ambushCard: null,
    rolled: { attacker: 0, defender: 0 }, extra: { attacker: 0, defender: 0 }, ignoreRolled: { attacker: false, defender: false },
    usedCards: [], despotScored: false, ally, allyHits: 0, itemHits: 0,
  }
  continueBattle(state, rng)
}

const ambushCards = (state: GameState, f: FactionId, c: ClearingId) =>
  (state.hands[f] ?? []).filter(card => cardDef(card).kind === 'ambush' && matchesSuit(card, suitOf(state, c)))

const has = (state: GameState, f: FactionId, id: string) => state.playAreas[f]!.some(c => cardDef(c).id === id)

/** Persistent battle cards `side` may still use after the roll (§4.3.4). */
function effectCards(state: GameState, b: BattleState, side: BattleSide): CardId[] {
  const f = b[side]
  return state.playAreas[f]!.filter(card => {
    if (b.usedCards.includes(card)) return false
    const id = cardDef(card).id
    return id === 'armorers' || (side === 'attacker' && id === 'brutal-tactics') || (side === 'defender' && id === 'sappers')
  })
}

/** Rolled-hit cap (§4.3.3.I): warriors in the clearing; the Vagabond counts undamaged swords (§9.2.6). */
function maxRolledHits(state: GameState, f: FactionId, c: ClearingId): number {
  if (f === 'vagabond') {
    const ally = state.battle?.attacker === 'vagabond' ? state.battle.ally : null // §9.2.9.II.c
    return state.factions.vagabond!.satchel.filter(i => i.type === 'sword').length + (ally ? warriorsAt(state, ally, c) : 0)
  }
  return warriorsAt(state, f, c)
}

/** Defenseless (§4.3.5.II): no warriors there; the Vagabond, no undamaged sword (§9.2.4). */
const defenseless = (state: GameState, f: FactionId, c: ClearingId) => maxRolledHits(state, f, c) === 0

const attackerRemains = (state: GameState, b: BattleState) => warriorsAt(state, b.attacker, b.clearing) > 0 || pawnAt(state, b.attacker, b.clearing)

/** Advances the battle until it needs a decision or ends. */
export function continueBattle(state: GameState, rng: Rng) {
  for (;;) {
    const b = state.battle
    // §4.3.6, §1.5.4: both sides' hits are dealt before the effects they trigger resolve.
    const dealing = b?.step === 'hits-attacker' && state.pending.every(isTriggeredEffect)
    if (!b || (state.pending.length && !dealing) || state.winner) return
    switch (b.step) {
      case 'ambush': // §4.3.1
        if (ambushCards(state, b.defender, b.clearing).length) {
          state.pending.push({ kind: 'ambush', player: b.defender, clearing: b.clearing, role: 'defender' })
          b.step = 'foil'
          return
        }
        b.step = 'roll'
        break
      case 'foil':
        if (!b.ambushCard) { b.step = 'roll'; break } // defender declined
        if (ambushCards(state, b.attacker, b.clearing).length) {
          state.pending.push({ kind: 'ambush', player: b.attacker, clearing: b.clearing, role: 'attacker' })
          b.step = 'ambush-hits'
          return
        }
        b.step = 'ambush-hits'
        break
      case 'ambush-hits': { // §4.3.1.II, unless foiled (b.ambushCard cleared) or Scouting Party (decisions/0004)
        const card = b.ambushCard
        b.step = 'ambush-check'
        if (!card) break
        b.ambushCard = null
        discardCard(state, card)
        if (!has(state, b.attacker, 'scouting-party')) dealHits(state, b.attacker, b.clearing, 2, { by: b.defender, inBattle: true })
        break
      }
      case 'ambush-check': // Field Hospitals may already have returned warriors at the keep (FAQ §4.3.1/§6.2.3)
        if (checkVictory(state)) return
        if (!attackerRemains(state, b)) { b.step = 'end'; break }
        b.step = 'roll'
        break
      case 'roll': { // §4.3.3
        const x = BATTLE_DIE[rng.int(BATTLE_DIE.length)]!, y = BATTLE_DIE[rng.int(BATTLE_DIE.length)]!
        const high = Math.max(x, y), low = Math.min(x, y)
        const guerrilla = b.defender === 'alliance' // §8.2.2
        b.rolled.attacker = Math.min(guerrilla ? low : high, maxRolledHits(state, b.attacker, b.clearing))
        b.rolled.defender = Math.min(guerrilla ? high : low, maxRolledHits(state, b.defender, b.clearing))
        if (b.attacker === 'eyrie' && state.factions.eyrie!.leader === 'commander') b.extra.attacker += 1 // §7.8.3
        state.lastRoll = { revision: state.meta.revision + 1, clearing: b.clearing, attacker: b.attacker, defender: b.defender, dice: [x, y], hits: { ...b.rolled } }
        b.step = 'effects-attacker'
        break
      }
      case 'effects-attacker': // §4.3.4, attacker first
      case 'effects-defender': {
        const side: BattleSide = b.step === 'effects-attacker' ? 'attacker' : 'defender'
        b.step = side === 'attacker' ? 'effects-defender' : 'hits-defender'
        if (effectCards(state, b, side).length) {
          state.pending.push({ kind: 'battle-effects', player: b[side], clearing: b.clearing })
          return
        }
        break
      }
      case 'hits-defender': { // §4.3.5–4.3.6: count, then deal
        const toDefender = (b.ignoreRolled.defender ? 0 : b.rolled.attacker) + b.extra.attacker + (defenseless(state, b.defender, b.clearing) ? 1 : 0)
        b.step = 'hits-attacker'
        // The defender's hits are counted now, before the defender loses warriors.
        b.rolled.defender = b.ignoreRolled.attacker ? 0 : b.rolled.defender
        dealHits(state, b.defender, b.clearing, toDefender, { by: b.attacker, inBattle: true })
        break
      }
      case 'hits-attacker':
        b.step = 'end'
        dealHits(state, b.attacker, b.clearing, b.rolled.defender + b.extra.defender, { by: b.defender, inBattle: true })
        break
      case 'end':
        // §9.2.9.II.d: more hits taken with Allied warriors than with items makes that faction Hostile.
        if (b.ally && b.allyHits > b.itemHits) state.factions.vagabond!.relationships[b.ally] = 'hostile'
        state.battle = null
        checkVictory(state)
        return
    }
  }
}

// ── Battle decisions ───────────────────────────────────────────────────────────

export function battleDecisionOptions(state: GameState): Action[] {
  const top = state.pending.at(-1)
  const b = state.battle
  if (!top) return []
  if (top.kind === 'ambush') {
    return [
      ...ambushCards(state, top.player, top.clearing).map((card): Action => ({ type: 'play-ambush', payload: { card } })),
      { type: 'decline-ambush', payload: {} },
    ]
  }
  if (top.kind === 'battle-effects' && b) {
    const side: BattleSide = top.player === b.attacker ? 'attacker' : 'defender'
    return [
      ...effectCards(state, b, side).map((card): Action => ({ type: 'use-battle-card', payload: { card } })),
      { type: 'end-battle-cards', payload: {} },
    ]
  }
  if (top.kind === 'take-hits') {
    return choices(hitPool(state, top.player, top.clearing), top.hits).map((remove): Action => ({ type: 'take-hits', payload: { remove } }))
  }
  return []
}

export function performBattleDecision(state: GameState, action: Action) {
  const top = state.pending.pop()!
  const b = state.battle
  if (action.type === 'play-ambush' && top.kind === 'ambush' && b) {
    takeFromHand(state, top.player, action.payload.card)
    if (top.role === 'defender') b.ambushCard = action.payload.card
    else { discardCard(state, action.payload.card); discardCard(state, b.ambushCard!); b.ambushCard = null } // foil: both discarded (decisions/0004)
  } else if (action.type === 'use-battle-card' && top.kind === 'battle-effects' && b) {
    const side: BattleSide = top.player === b.attacker ? 'attacker' : 'defender'
    const card = action.payload.card, id = cardDef(card).id
    b.usedCards.push(card)
    if (id === 'brutal-tactics') { b.extra.attacker += 1; award(state, b.defender, 1) } // stays in play
    else {
      if (id === 'sappers') b.extra.defender += 1
      if (id === 'armorers') b.ignoreRolled[side] = true
      state.playAreas[top.player] = state.playAreas[top.player]!.filter(c => c !== card)
      discardCard(state, card)
    }
    state.pending.push(top) // may use another card
  } else if (action.type === 'take-hits' && top.kind === 'take-hits') {
    applyHitChoice(state, top.player, top.clearing, action.payload.remove, { by: top.by, inBattle: !!b })
  }
  // decline-ambush and end-battle-cards only pop the decision
}

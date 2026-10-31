import { ALLIANCE } from '@root/game-data'
import type { Action } from '../actions.ts'
import { battleTargets, startBattle } from '../battle.ts'
import { adjacent, canPlaceIn, drawCards, mapOf, placeInSlot, placeWarriors } from '../board.ts'
import { requireDiscardDown } from '../common.ts'
import { craftActions, performCraft } from '../craft.ts'
import { moveOptions, moveWarriors } from '../move.ts'
import { dealHits, offerFieldHospital, removeAllEnemies, removeWarriors } from '../removal.ts'
import type { Rng } from '../rng.ts'
import { award, cardDef, discardCard, isBird, isEnemy, matchesSuit, suitOf, takeFromHand, warriorsAt } from '../rules.ts'
import type { SetupStep } from '../setup.ts'
import type { CardId, ClearingId, GameState, Suit } from '../state.ts'
import type { TurnStep } from '../turn.ts'

/** Alliance setup, §8.3. No choices: warriors, bases and sympathy start on the board, then three supporters. */
export const ALLIANCE_SETUP: SetupStep[] = [
  {
    id: '8.3',
    auto: (state, rng) => {
      state.factions.alliance = {
        warriorSupply: ALLIANCE.warriors, craftedItems: [], // §8.3.1
        basesOnBoard: { fox: null, rabbit: null, mouse: null }, // §8.3.2 bases sit in the Bases box
        sympathyOnTrack: ALLIANCE.sympathy, // §8.3.3
        officers: 0, operationsLeft: 0,
        supporters: drawCards(state, 3, rng), // §8.3.4
      }
    },
  },
]

// ── Turn (§8.4–8.6) ────────────────────────────────────────────────────────────

const SUPPORTER_LIMIT = ALLIANCE.supporterLimitWithoutBase // §8.2.3.I

const sympathyAt = (state: GameState, c: ClearingId) => state.map.clearings[c]!.tokens.some(t => t.type === 'sympathy')
const sympathyOnMap = (state: GameState) => ALLIANCE.sympathy - state.factions.alliance!.sympathyOnTrack
const baseCount = (state: GameState) => Object.values(state.factions.alliance!.basesOnBoard).filter(c => c !== null).length

/** Adds a card to the Supporters stack, or discards it when the stack is full and no base is on the map (§8.2.3.I). */
export function addSupporter(state: GameState, card: CardId) {
  const a = state.factions.alliance!
  if (!baseCount(state) && a.supporters.length >= SUPPORTER_LIMIT) discardCard(state, card)
  else a.supporters.push(card)
}

/** Ways to pay `n` supporters of `suit`: how many of them are birds (§2.1.1, §8.2.3). */
function supporterPayments(state: GameState, suit: Suit, n: number): number[] {
  const s = state.factions.alliance!.supporters
  const birds = s.filter(isBird).length, plain = s.filter(c => cardDef(c).suit === suit).length
  const out: number[] = []
  for (let b = 0; b <= Math.min(n, birds); b++) if (plain >= n - b) out.push(b)
  return out
}

function spendSupporters(state: GameState, suit: Suit, n: number, birds: number) {
  const a = state.factions.alliance!
  const take = (pick: (c: CardId) => boolean, k: number) => {
    for (let i = 0; i < k; i++) {
      const at = a.supporters.findIndex(pick)
      if (at < 0) throw new Error('not enough supporters')
      discardCard(state, a.supporters.splice(at, 1)[0]!)
    }
  }
  take(isBird, birds)
  take(c => cardDef(c).suit === suit, n - birds)
}

function placeSympathy(state: GameState, c: ClearingId) {
  const points = ALLIANCE.sympathyPoints[sympathyOnMap(state)]!
  state.factions.alliance!.sympathyOnTrack -= 1
  state.map.clearings[c]!.tokens.push({ faction: 'alliance', type: 'sympathy' })
  award(state, 'alliance', points)
}

/** A base can go in an open slot, or in one freed by removing enemy buildings in the Revolt. */
const revoltRoom = (state: GameState, c: ClearingId) =>
  state.map.clearings[c]!.slots.some(s => s === null || (s.kind === 'building' && s.faction !== 'alliance' && isEnemy(state, 'alliance', s.faction)))

function revoltActions(state: GameState): Action[] {
  const a = state.factions.alliance!
  const out: Action[] = []
  for (const { id: c, suit } of mapOf(state).clearings) {
    if (!sympathyAt(state, c) || a.basesOnBoard[suit] !== null || !revoltRoom(state, c)) continue // §8.4.1.I
    for (const birds of supporterPayments(state, suit, 2)) out.push({ type: 'alliance-revolt', payload: { clearing: c, birds } })
  }
  return out
}

function revolt(state: GameState, c: ClearingId, birds: number) {
  const a = state.factions.alliance!
  const suit = suitOf(state, c)
  spendSupporters(state, suit, 2, birds) // §8.4.1.II
  const removed = removeAllEnemies(state, c, 'alliance') // §8.4.1.III, scoring §3.2.1
  placeInSlot(state, c, { kind: 'building', faction: 'alliance', type: 'base', suit })
  a.basesOnBoard[suit] = c
  const n = mapOf(state).clearings.filter(x => x.suit === suit && sympathyAt(state, x.id)).length
  placeWarriors(state, 'alliance', c, n)
  if (a.warriorSupply > 0) { a.warriorSupply -= 1; a.officers += 1 }
  offerFieldHospital(state, c, removed.warriors.marquise ?? 0) // after every piece is removed (§1.5.4)
  if (removed.vagabondHit) dealHits(state, 'vagabond', c, 3, { by: null }) // §9.2.2.I
}

function spreadActions(state: GameState): Action[] {
  if (state.factions.alliance!.sympathyOnTrack < 1) return []
  const map = mapOf(state)
  const any = map.clearings.some(c => sympathyAt(state, c.id))
  const out: Action[] = []
  for (const { id: c, suit } of map.clearings) {
    if (sympathyAt(state, c) || !canPlaceIn(state, 'alliance', c)) continue
    if (any && !adjacent(map, c).some(x => sympathyAt(state, x))) continue // §8.4.2.I
    for (const birds of supporterPayments(state, suit, spreadCost(state, c))) out.push({ type: 'alliance-spread', payload: { clearing: c, birds } })
  }
  return out
}

/** §8.4.2.II, plus one under Martial Law: another player has three or more warriors there (§8.4.2.II.a). */
function spreadCost(state: GameState, c: ClearingId): number {
  const martial = state.seats.some(s => s.faction !== 'alliance' && (state.map.clearings[c]!.warriors[s.faction] ?? 0) >= 3)
  return ALLIANCE.sympathyCost[sympathyOnMap(state)]! + (martial ? 1 : 0)
}

function daylightActions(state: GameState): Action[] {
  const a = state.factions.alliance!
  const hand = state.hands.alliance!
  const out: Action[] = [...craftActions(state, 'alliance')]
  for (const card of hand) out.push({ type: 'alliance-mobilize', payload: { card } }) // §8.5.2
  if (a.warriorSupply > 0) { // §8.5.3
    const suits = (Object.entries(a.basesOnBoard) as [Suit, ClearingId | null][]).filter(([, c]) => c !== null).map(([s]) => s)
    for (const card of hand) if (suits.some(s => matchesSuit(card, s))) out.push({ type: 'alliance-train', payload: { card } })
  }
  return out
}

function operationActions(state: GameState): Action[] {
  const a = state.factions.alliance!
  if (a.operationsLeft < 1) return []
  const map = mapOf(state)
  const out: Action[] = moveOptions(state, 'alliance').map((payload): Action => ({ type: 'move', payload })) // §8.6.1.I
  for (const { id: clearing } of map.clearings)
    for (const defender of battleTargets(state, 'alliance', clearing)) out.push({ type: 'battle', payload: { clearing, defender } }) // II
  if (a.warriorSupply > 0)
    for (const c of Object.values(a.basesOnBoard)) if (c !== null && canPlaceIn(state, 'alliance', c)) out.push({ type: 'alliance-recruit', payload: { clearing: c } }) // III
  if (a.sympathyOnTrack > 0)
    for (const { id: c } of map.clearings)
      if (!sympathyAt(state, c) && warriorsAt(state, 'alliance', c) > 0 && canPlaceIn(state, 'alliance', c)) out.push({ type: 'alliance-organize', payload: { clearing: c } }) // IV
  return out
}

function applyOperation(state: GameState, action: Action, rng: Rng) {
  const a = state.factions.alliance!
  a.operationsLeft -= 1
  switch (action.type) {
    case 'move': moveWarriors(state, 'alliance', action.payload.from, action.payload.to, action.payload.warriors); return
    case 'battle': startBattle(state, 'alliance', action.payload.defender, action.payload.clearing, rng); return
    case 'alliance-recruit': placeWarriors(state, 'alliance', action.payload.clearing, 1); return
    case 'alliance-organize':
      removeWarriors(state, 'alliance', action.payload.clearing, 1)
      placeSympathy(state, action.payload.clearing)
      return
    default: throw new Error(`alliance cannot ${action.type} now`)
  }
}

export const ALLIANCE_TURN: TurnStep[] = [
  {
    id: 'revolt', phase: 'birdsong', optional: true, window: true, // §8.4.1
    options: revoltActions,
    apply: (state, action) => {
      if (action.type !== 'alliance-revolt') throw new Error(`alliance cannot ${action.type} now`)
      revolt(state, action.payload.clearing, action.payload.birds)
    },
  },
  {
    id: 'spread-sympathy', phase: 'birdsong', optional: true, window: true, // §8.4.2
    options: spreadActions,
    apply: (state, action) => {
      if (action.type !== 'alliance-spread') throw new Error(`alliance cannot ${action.type} now`)
      const c = action.payload.clearing
      spendSupporters(state, suitOf(state, c), spreadCost(state, c), action.payload.birds)
      placeSympathy(state, c)
    },
  },
  {
    id: 'actions', phase: 'daylight', optional: true, window: true, // §8.5
    options: daylightActions,
    apply: (state, action) => {
      const a = state.factions.alliance!
      if (action.type === 'craft') performCraft(state, 'alliance', action.payload.card)
      else if (action.type === 'alliance-mobilize') { takeFromHand(state, 'alliance', action.payload.card); addSupporter(state, action.payload.card) }
      else if (action.type === 'alliance-train') {
        takeFromHand(state, 'alliance', action.payload.card)
        discardCard(state, action.payload.card)
        a.warriorSupply -= 1
        a.officers += 1
      } else throw new Error(`alliance cannot ${action.type} now`)
    },
  },
  {
    id: 'military-operations', phase: 'evening', optional: true, // §8.6.1
    enter: state => { const a = state.factions.alliance!; a.operationsLeft = a.officers },
    options: operationActions,
    apply: applyOperation,
  },
  {
    id: 'draw', phase: 'evening', // §8.6.2
    enter: (state, rng) => {
      state.hands.alliance!.push(...drawCards(state, 1 + baseCount(state), rng))
      requireDiscardDown(state, 'alliance')
    },
  },
]

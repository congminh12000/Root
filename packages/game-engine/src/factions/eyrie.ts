import { EYRIE, type EyrieLeaderId } from '@root/game-data'
import type { Action } from '../actions.ts'
import { battleTargets, startBattle } from '../battle.ts'
import { canPlaceIn, corners, drawCards, mapOf, oppositeCorner, openSlots, placeInSlot, placeWarriors } from '../board.ts'
import { requireDiscardDown } from '../common.ts'
import { craftActions, performCraft } from '../craft.ts'
import { moveOptions, moveWarriors } from '../move.ts'
import type { Rng } from '../rng.ts'
import { award, cardDef, discardCard, isBird, rules, suitOf, takeFromHand } from '../rules.ts'
import type { SetupStep } from '../setup.ts'
import type { CardSuit, ClearingId, DecreeCard, DecreeColumn, EyrieState, GameState } from '../state.ts'
import { goto, type TurnStep } from '../turn.ts'

const LEADERS = Object.keys(EYRIE.leaders) as EyrieLeaderId[]

/** Corners where another faction started (§7.3.2). In the base game only the Marquise has one. */
const startingCorners = (state: GameState): ClearingId[] => {
  const keep = state.factions.marquise?.keep
  return keep === null || keep === undefined ? [] : [keep]
}

/** Eyrie setup, §7.3. */
export const EYRIE_SETUP: SetupStep[] = [
  {
    id: '7.3.1', // Gather Warriors
    auto: state => {
      const board: EyrieState = {
        warriorSupply: EYRIE.warriors, craftedItems: [], roostsOnTrack: EYRIE.roosts, leader: null, leadersFaceUp: [],
        decree: { recruit: [], move: [], battle: [], build: [] }, resolved: { recruit: [], move: [], battle: [], build: [] },
        added: { count: 0, bird: false }, deposing: false,
      }
      state.factions.eyrie = board
    },
  },
  {
    id: '7.3.2', // Place Roost and Starting Warriors in a free corner, diagonally opposite a starting corner if possible
    options: state => {
      const map = mapOf(state)
      const taken = startingCorners(state)
      const free = corners(map).filter(c => !taken.includes(c) && openSlots(state, c) > 0 && canPlaceIn(state, 'eyrie', c))
      const opposite = free.filter(c => taken.some(t => oppositeCorner(map, t) === c))
      return (opposite.length ? opposite : free).map((clearing): Action => ({ type: 'eyrie-place-roost', payload: { clearing } }))
    },
    apply: (state, action) => {
      if (action.type !== 'eyrie-place-roost') return false
      const { clearing } = action.payload
      placeInSlot(state, clearing, { kind: 'building', faction: 'eyrie', type: 'roost' })
      state.factions.eyrie!.roostsOnTrack -= 1 // §7.3.5 the other six fill the Roosts track
      placeWarriors(state, 'eyrie', clearing, 6)
      return true
    },
  },
  {
    id: '7.3.3', // Choose Leader; §7.3.4 Tuck Viziers into the leader's two columns
    options: () => LEADERS.map((leader): Action => ({ type: 'eyrie-choose-leader', payload: { leader } })),
    apply: (state, action) => {
      if (action.type !== 'eyrie-choose-leader') return false
      const board = state.factions.eyrie!
      board.leader = action.payload.leader
      board.leadersFaceUp = LEADERS.filter(l => l !== action.payload.leader)
      EYRIE.leaders[action.payload.leader].forEach((column, index) => board.decree[column].push({ kind: 'vizier', index: index as 0 | 1 }))
      return true
    },
  },
]

// ── Turn (§7.4–7.7) ────────────────────────────────────────────────────────────

const COLUMNS: DecreeColumn[] = ['recruit', 'move', 'battle', 'build'] // §7.5.2 left to right

/** Viziers are bird cards (§7.3.4, §7.7.1). */
const decreeSuit = (card: DecreeCard): CardSuit => (card.kind === 'vizier' ? 'bird' : cardDef(card.id).suit)
const fits = (suit: CardSuit, state: GameState, c: ClearingId) => suit === 'bird' || suitOf(state, c) === suit

const roostsOnMap = (state: GameState) => EYRIE.roosts - state.factions.eyrie!.roostsOnTrack
const hasRoost = (state: GameState, c: ClearingId) => state.map.clearings[c]!.slots.some(s => s?.kind === 'building' && s.type === 'roost')

/** The leftmost column with unresolved cards, if any (§7.5.2). */
function currentColumn(state: GameState): DecreeColumn | null {
  const e = state.factions.eyrie!
  return COLUMNS.find(col => e.decree[col].length > e.resolved[col].length) ?? null
}

/** Ways to resolve card `index` of `column` (§7.5.2.I–IV). */
function decreeActions(state: GameState, column: DecreeColumn, index: number): Action[] {
  const e = state.factions.eyrie!
  const suit = decreeSuit(e.decree[column][index]!)
  const clearings = mapOf(state).clearings.map(c => c.id).filter(c => fits(suit, state, c))
  switch (column) {
    case 'recruit':
      if (e.warriorSupply < 1) return []
      return clearings.filter(c => hasRoost(state, c) && canPlaceIn(state, 'eyrie', c))
        .map((clearing): Action => ({ type: 'eyrie-recruit', payload: { index, clearing } }))
    case 'move':
      return moveOptions(state, 'eyrie').filter(m => clearings.includes(m.from)).map((m): Action => ({ type: 'eyrie-move', payload: { index, ...m } }))
    case 'battle':
      return clearings.flatMap(clearing => battleTargets(state, 'eyrie', clearing).map((defender): Action => ({ type: 'eyrie-battle', payload: { index, clearing, defender } })))
    case 'build':
      if (e.roostsOnTrack < 1) return []
      return clearings.filter(c => rules(state, 'eyrie', c) && !hasRoost(state, c) && openSlots(state, c) > 0 && canPlaceIn(state, 'eyrie', c))
        .map((clearing): Action => ({ type: 'eyrie-build', payload: { index, clearing } }))
  }
}

function placeRoost(state: GameState, c: ClearingId) {
  placeInSlot(state, c, { kind: 'building', faction: 'eyrie', type: 'roost' })
  state.factions.eyrie!.roostsOnTrack -= 1
}

/** Turmoil (§7.7): Humiliate, Purge, then Depose in the `depose` step; Rest follows when it ends. */
export function turmoil(state: GameState, rng: Rng) {
  const e = state.factions.eyrie!
  const birds = COLUMNS.reduce((n, col) => n + e.decree[col].filter(c => decreeSuit(c) === 'bird').length, 0)
  const score = state.score.eyrie
  if (score !== null && score !== undefined) state.score.eyrie = Math.max(0, score - birds) // §7.7.1, decisions/0004 OQ-14
  for (const col of COLUMNS) {
    for (const card of e.decree[col]) if (card.kind === 'card') discardCard(state, card.id) // §7.7.2
    e.decree[col] = e.decree[col].filter(c => c.kind === 'vizier')
  }
  e.deposing = true
  goto(state, 'depose', rng)
}

function applyDecree(state: GameState, action: Action, rng: Rng) {
  const e = state.factions.eyrie!
  const column = currentColumn(state)!
  if (!('index' in action.payload)) throw new Error(`eyrie cannot ${action.type} now`)
  e.resolved[column].push(action.payload.index)
  switch (action.type) {
    case 'eyrie-recruit': { // §7.5.2.I, Charismatic places two (§7.8.2)
      const want = e.leader === 'charismatic' ? 2 : 1
      const placed = placeWarriors(state, 'eyrie', action.payload.clearing, want)
      if (placed < want) turmoil(state, rng) // placed as many as possible, but not fully (FAQ §7.7)
      return
    }
    case 'eyrie-move':
      moveWarriors(state, 'eyrie', action.payload.from, action.payload.to, action.payload.warriors)
      return
    case 'eyrie-battle':
      startBattle(state, 'eyrie', action.payload.defender, action.payload.clearing, rng)
      return
    case 'eyrie-build':
      placeRoost(state, action.payload.clearing)
      return
    default:
      throw new Error(`eyrie cannot ${action.type} now`)
  }
}

export const EYRIE_TURN: TurnStep[] = [
  {
    id: 'emergency-orders', phase: 'birdsong', // §7.4.1
    enter: (state, rng) => { if (!state.hands.eyrie!.length) state.hands.eyrie!.push(...drawCards(state, 1, rng)) },
  },
  {
    id: 'add-to-decree', phase: 'birdsong', // §7.4.2: one or two cards, at most one bird
    enter: state => { state.factions.eyrie!.added = { count: 0, bird: false } },
    options: state => {
      const { added } = state.factions.eyrie!
      if (added.count >= 2) return []
      const out: Action[] = []
      for (const card of state.hands.eyrie!) {
        if (added.bird && isBird(card)) continue
        for (const column of COLUMNS) out.push({ type: 'eyrie-add-card', payload: { card, column } })
      }
      if (added.count === 1) out.push({ type: 'end-step', payload: {} })
      return out
    },
    apply: (state, action) => {
      if (action.type !== 'eyrie-add-card') throw new Error(`eyrie cannot ${action.type} now`)
      const e = state.factions.eyrie!
      takeFromHand(state, 'eyrie', action.payload.card)
      e.decree[action.payload.column].push({ kind: 'card', id: action.payload.card })
      e.added.count += 1
      if (isBird(action.payload.card)) e.added.bird = true
    },
  },
  {
    id: 'new-roost', phase: 'birdsong', // §7.4.3, decisions/0004 OQ-13: all four pieces or nothing
    options: state => {
      if (roostsOnMap(state) > 0 || state.factions.eyrie!.warriorSupply < 3) return []
      const open = mapOf(state).clearings.map(c => c.id).filter(c => openSlots(state, c) > 0 && canPlaceIn(state, 'eyrie', c))
      const count = (c: ClearingId) => Object.values(state.map.clearings[c]!.warriors).reduce((a, b) => a + b, 0)
      const fewest = Math.min(...open.map(count))
      return open.filter(c => count(c) === fewest).map((clearing): Action => ({ type: 'eyrie-new-roost', payload: { clearing } }))
    },
    apply: (state, action) => {
      if (action.type !== 'eyrie-new-roost') throw new Error(`eyrie cannot ${action.type} now`)
      placeRoost(state, action.payload.clearing)
      placeWarriors(state, 'eyrie', action.payload.clearing, 3)
    },
  },
  {
    id: 'craft', phase: 'daylight', optional: true, window: true, // §7.5.1
    options: state => craftActions(state, 'eyrie'),
    apply: (state, action) => {
      if (action.type !== 'craft') throw new Error(`eyrie cannot ${action.type} now`)
      performCraft(state, 'eyrie', action.payload.card)
    },
  },
  {
    id: 'decree', phase: 'daylight', // §7.5.2
    options: state => {
      const column = currentColumn(state)
      if (!column) return []
      const e = state.factions.eyrie!
      return e.decree[column].flatMap((_, i) => (e.resolved[column].includes(i) ? [] : decreeActions(state, column, i)))
    },
    apply: applyDecree,
    stuck: (state, rng) => { if (currentColumn(state)) turmoil(state, rng) }, // a card that cannot be resolved
  },
  {
    id: 'depose', phase: 'daylight', // §7.7.3, then Rest (§7.7.4) by moving on to Evening
    enter: state => {
      const e = state.factions.eyrie!
      if (e.deposing && !e.leadersFaceUp.length) e.leadersFaceUp = [...LEADERS] // §7.7.3.I A New Clutch
    },
    options: state => {
      const e = state.factions.eyrie!
      return e.deposing ? e.leadersFaceUp.map((leader): Action => ({ type: 'eyrie-choose-leader', payload: { leader } })) : []
    },
    apply: (state, action) => {
      if (action.type !== 'eyrie-choose-leader') throw new Error(`eyrie cannot ${action.type} now`)
      const e = state.factions.eyrie!
      const leader = action.payload.leader
      e.leader = leader
      e.leadersFaceUp = e.leadersFaceUp.filter(l => l !== leader)
      for (const col of COLUMNS) e.decree[col] = []
      EYRIE.leaders[leader].forEach((column, index) => e.decree[column].push({ kind: 'vizier', index: index as 0 | 1 }))
      e.resolved = { recruit: [], move: [], battle: [], build: [] }
      e.deposing = false
    },
  },
  {
    id: 'score', phase: 'evening', // §7.6.1
    enter: state => { const n = roostsOnMap(state); if (n > 0) award(state, 'eyrie', EYRIE.roostPoints[n - 1]!) },
  },
  {
    id: 'draw', phase: 'evening', // §7.6.2
    enter: (state, rng) => {
      const n = roostsOnMap(state)
      const bonus = EYRIE.roostDrawBonusAt.filter(i => i < n).length
      state.hands.eyrie!.push(...drawCards(state, 1 + bonus, rng))
      requireDiscardDown(state, 'eyrie')
    },
  },
]

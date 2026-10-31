import { MARQUISE } from '@root/game-data'
import type { Action } from '../actions.ts'
import { battleTargets, startBattle } from '../battle.ts'
import { adjacent, canPlaceIn, corners, drawCards, mapOf, oppositeCorner, openSlots, placeInSlot, placeWarriors } from '../board.ts'
import { requireDiscardDown } from '../common.ts'
import { craftActions, performCraft } from '../craft.ts'
import { moveOptions, moveWarriors } from '../move.ts'
import { choices } from '../removal.ts'
import type { Rng } from '../rng.ts'
import { award, discardCard, isBird, matchesSuit, rules, suitOf, takeFromHand } from '../rules.ts'
import type { SetupStep } from '../setup.ts'
import type { ClearingId, GameState, MarquiseBuilding, MarquiseState } from '../state.ts'
import type { TurnStep } from '../turn.ts'

const BUILDINGS: MarquiseBuilding[] = ['sawmill', 'workshop', 'recruiter']

/** Marquise setup, §6.3. Step ids match the Law's steps. */
export const MARQUISE_SETUP: SetupStep[] = [
  {
    id: '6.3.1', // Gather Warriors and Wood
    auto: state => {
      const board: MarquiseState = {
        warriorSupply: MARQUISE.warriors, craftedItems: [], woodSupply: MARQUISE.wood,
        buildingsOnTrack: { sawmill: MARQUISE.buildingsPerType, workshop: MARQUISE.buildingsPerType, recruiter: MARQUISE.buildingsPerType },
        keep: null, recruitedThisTurn: false, actionsRemaining: 0, marching: 0, woodToPlace: 0,
      }
      state.factions.marquise = board
    },
  },
  {
    id: '6.3.2', // Place Keep: any corner; it becomes the starting clearing
    options: state => corners(mapOf(state)).map((clearing): Action => ({ type: 'marquise-place-keep', payload: { clearing } })),
    apply: (state, action) => {
      if (action.type !== 'marquise-place-keep') return false
      const { clearing } = action.payload
      state.factions.marquise!.keep = clearing
      state.map.clearings[clearing]!.tokens.push({ faction: 'marquise', type: 'keep' })
      return true
    },
  },
  {
    id: '6.3.3', // Garrison: one warrior everywhere except the corner opposite the keep
    auto: state => {
      const map = mapOf(state)
      const skip = oppositeCorner(map, state.factions.marquise!.keep!)
      for (const c of map.clearings) if (c.id !== skip) placeWarriors(state, 'marquise', c.id, 1)
    },
  },
  {
    id: '6.3.4', // Place Starting Buildings: one of each, in the keep's clearing or adjacent ones, in any combination
    options: state => {
      const board = state.factions.marquise!
      const keep = board.keep!
      const where = [keep, ...adjacent(mapOf(state), keep)].filter(c => openSlots(state, c) > 0 && canPlaceIn(state, 'marquise', c))
      return BUILDINGS.filter(b => board.buildingsOnTrack[b] === MARQUISE.buildingsPerType)
        .flatMap(building => where.map((clearing): Action => ({ type: 'marquise-place-building', payload: { building, clearing } })))
    },
    apply: (state, action) => {
      if (action.type !== 'marquise-place-building') return false
      const { building, clearing } = action.payload
      const board = state.factions.marquise!
      placeInSlot(state, clearing, { kind: 'building', faction: 'marquise', type: building })
      board.buildingsOnTrack[building] -= 1
      // §6.3.5 Fill Buildings Tracks: the remaining five of each type stay on the track, leftmost space empty.
      return BUILDINGS.every(b => board.buildingsOnTrack[b] < MARQUISE.buildingsPerType)
    },
  },
]

// ── Turn (§6.4–6.6) ────────────────────────────────────────────────────────────

/** Marquise buildings of one type in each clearing, as a pool keyed by clearing id. */
function buildingPool(state: GameState, type: MarquiseBuilding): Record<string, number> {
  const pool: Record<string, number> = {}
  for (const [c, clearing] of state.map.clearings.entries()) {
    const n = clearing.slots.filter(s => s?.kind === 'building' && s.faction === 'marquise' && s.type === type).length
    if (n) pool[c] = n
  }
  return pool
}

/** A pool choice as a sorted list of clearings, one entry per piece. */
const toClearings = (choice: Record<string, number>): ClearingId[] =>
  Object.entries(choice).flatMap(([c, n]) => Array.from({ length: n }, () => Number(c))).sort((a, b) => a - b)

const total = (pool: Record<string, number>) => Object.values(pool).reduce((a, b) => a + b, 0)

/** Places as many of `n` pieces as the supply allows; when short, every way of choosing where (§1.5.4). */
function placements(pool: Record<string, number>, supply: number): ClearingId[][] {
  if (supply <= 0 || !total(pool)) return []
  return choices(pool, Math.min(supply, total(pool))).map(toClearings)
}

/** Clearings connected to `c` through clearings the Marquise rules, `c` included (§6.5.4.II). */
function ruledNetwork(state: GameState, c: ClearingId): ClearingId[] {
  const map = mapOf(state)
  const seen = new Set([c])
  const queue = [c]
  while (queue.length) {
    for (const next of adjacent(map, queue.shift()!)) {
      if (seen.has(next) || !rules(state, 'marquise', next)) continue
      seen.add(next)
      queue.push(next)
    }
  }
  return [...seen]
}

const woodAt = (state: GameState, c: ClearingId) => state.map.clearings[c]!.tokens.filter(t => t.faction === 'marquise' && t.type === 'wood').length

function placeWood(state: GameState, c: ClearingId) {
  state.factions.marquise!.woodSupply -= 1
  state.map.clearings[c]!.tokens.push({ faction: 'marquise', type: 'wood' })
}

function buildActions(state: GameState): Action[] {
  const board = state.factions.marquise!
  const out: Action[] = []
  for (const { id: clearing } of mapOf(state).clearings) {
    if (!rules(state, 'marquise', clearing) || openSlots(state, clearing) < 1) continue
    const pool: Record<string, number> = {}
    for (const c of ruledNetwork(state, clearing)) { const w = woodAt(state, c); if (w) pool[c] = w }
    for (const building of BUILDINGS) {
      const left = board.buildingsOnTrack[building]
      if (left < 1) continue
      const cost = MARQUISE.woodCost[MARQUISE.buildingsPerType - left]!
      if (total(pool) < cost) continue
      for (const choice of choices(pool, cost)) out.push({ type: 'marquise-build', payload: { building, clearing, wood: toClearings(choice) } })
    }
  }
  return out
}

function actionOptions(state: GameState): Action[] {
  const board = state.factions.marquise!
  const hand = state.hands.marquise!
  if (board.marching > 0) {
    return [
      ...moveOptions(state, 'marquise').map((payload): Action => ({ type: 'move', payload })),
      { type: 'marquise-end-march', payload: {} },
    ]
  }
  const out: Action[] = hand.filter(isBird).map((card): Action => ({ type: 'marquise-spend-bird', payload: { card } }))
  if (board.actionsRemaining < 1) return out
  for (const { id: clearing } of mapOf(state).clearings)
    for (const defender of battleTargets(state, 'marquise', clearing)) out.push({ type: 'battle', payload: { clearing, defender } })
  for (const payload of moveOptions(state, 'marquise')) out.push({ type: 'move', payload })
  if (!board.recruitedThisTurn)
    for (const clearings of placements(buildingPool(state, 'recruiter'), board.warriorSupply)) out.push({ type: 'marquise-recruit', payload: { clearings } })
  out.push(...buildActions(state))
  if (board.woodSupply > 0) {
    for (const c of Object.keys(buildingPool(state, 'sawmill')).map(Number))
      for (const card of hand.filter(k => matchesSuit(k, suitOf(state, c)))) out.push({ type: 'marquise-overwork', payload: { clearing: c, card } })
  }
  return out
}

function applyAction(state: GameState, action: Action, rng: Rng) {
  const board = state.factions.marquise!
  switch (action.type) {
    case 'marquise-spend-bird': // §6.5: one extra action per bird card spent
      takeFromHand(state, 'marquise', action.payload.card)
      discardCard(state, action.payload.card)
      board.actionsRemaining += 1
      return
    case 'battle': // §6.5.1
      board.actionsRemaining -= 1
      startBattle(state, 'marquise', action.payload.defender, action.payload.clearing, rng)
      return
    case 'move': // §6.5.2 March: up to two moves, one action
      if (board.marching === 0) { board.actionsRemaining -= 1; board.marching = 2 }
      board.marching -= 1
      moveWarriors(state, 'marquise', action.payload.from, action.payload.to, action.payload.warriors)
      return
    case 'marquise-end-march':
      board.marching = 0
      return
    case 'marquise-recruit': // §6.5.3
      board.actionsRemaining -= 1
      board.recruitedThisTurn = true
      for (const c of action.payload.clearings) placeWarriors(state, 'marquise', c, 1)
      return
    case 'marquise-build': { // §6.5.4
      board.actionsRemaining -= 1
      const { building, clearing, wood } = action.payload
      for (const c of wood) {
        const tokens = state.map.clearings[c]!.tokens
        tokens.splice(tokens.findIndex(t => t.faction === 'marquise' && t.type === 'wood'), 1)
        board.woodSupply += 1
      }
      const onMap = MARQUISE.buildingsPerType - board.buildingsOnTrack[building]
      placeInSlot(state, clearing, { kind: 'building', faction: 'marquise', type: building })
      board.buildingsOnTrack[building] -= 1
      award(state, 'marquise', MARQUISE.points[building][onMap]!)
      return
    }
    case 'marquise-overwork': // §6.5.5
      board.actionsRemaining -= 1
      takeFromHand(state, 'marquise', action.payload.card)
      discardCard(state, action.payload.card)
      placeWood(state, action.payload.clearing)
      return
    default:
      throw new Error(`marquise cannot ${action.type} now`)
  }
}

export const MARQUISE_TURN: TurnStep[] = [
  {
    id: 'wood', phase: 'birdsong', // §6.4: one wood per sawmill; when short, the Marquise chooses (§1.5.4)
    enter: state => {
      const board = state.factions.marquise!
      const pool = buildingPool(state, 'sawmill')
      if (total(pool) <= board.woodSupply) { for (const c of toClearings(pool)) placeWood(state, c); return }
      board.woodToPlace = board.woodSupply
    },
    options: state => {
      const board = state.factions.marquise!
      if (board.woodToPlace < 1) return []
      return placements(buildingPool(state, 'sawmill'), board.woodToPlace).map((clearings): Action => ({ type: 'marquise-place-wood', payload: { clearings } }))
    },
    apply: (state, action) => {
      if (action.type !== 'marquise-place-wood') throw new Error(`marquise cannot ${action.type} now`)
      for (const c of action.payload.clearings) placeWood(state, c)
      state.factions.marquise!.woodToPlace = 0
    },
  },
  {
    id: 'craft', phase: 'daylight', optional: true, window: true, // §6.5 first, craft with workshops
    options: state => craftActions(state, 'marquise'),
    apply: (state, action) => {
      if (action.type !== 'craft') throw new Error(`marquise cannot ${action.type} now`)
      performCraft(state, 'marquise', action.payload.card)
    },
  },
  {
    id: 'actions', phase: 'daylight', optional: true, window: true, // §6.5 three actions plus one per bird
    enter: state => { Object.assign(state.factions.marquise!, { actionsRemaining: 3, marching: 0 }) },
    options: actionOptions,
    apply: applyAction,
    busy: state => state.factions.marquise!.marching > 0,
  },
  {
    id: 'draw', phase: 'evening', // §6.6: draw one plus uncovered bonuses, then discard down to five
    enter: (state, rng) => {
      const onMap = MARQUISE.buildingsPerType - state.factions.marquise!.buildingsOnTrack.recruiter
      const bonus = MARQUISE.drawBonusAt.recruiter.filter(i => i < onMap).length
      state.hands.marquise!.push(...drawCards(state, 1 + bonus, rng))
      requireDiscardDown(state, 'marquise')
    },
  },
]

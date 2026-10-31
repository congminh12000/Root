import { BASE_QUESTS, VAGABOND, type MapDef, type VagabondCharacterId } from '@root/game-data'
import type { Action } from '../actions.ts'
import { battleTargets, startBattle } from '../battle.ts'
import { adjacent, drawCards, mapOf } from '../board.ts'
import { requireDiscardDown } from '../common.ts'
import { canCraft, craft } from '../craft.ts'
import { moveWarriors } from '../move.ts'
import { choices, itemKey, otherPieces, removeType, removeWarriorsBy } from '../removal.ts'
import { shuffle, type Rng } from '../rng.ts'
import { award, cardDef, hasPieces, isEnemy, matchesSuit, suitOf, takeFromHand, warriorsAt } from '../rules.ts'
import type { SetupStep } from '../setup.ts'
import type { CardId, ClearingId, FactionId, ForestId, GameState, ItemType, PawnLocation, Relationship, SlotContent, VagabondItem, VagabondState } from '../state.ts'
import { goto, gotoPhase, type TurnStep } from '../turn.ts'

const QUESTS = new Map(BASE_QUESTS.map(q => [q.id, q]))
const ITEM_TYPES: ItemType[] = ['boots', 'sword', 'crossbow', 'torch', 'hammer', 'tea', 'coin', 'bag']
/** One card per design: copies of a design behave the same, so offering each once keeps choices short. */
const uniqueDesigns = (cards: CardId[]): CardId[] => {
  const seen = new Set<string>()
  return cards.filter(c => { const d = cardDef(c).id; if (seen.has(d)) return false; seen.add(d); return true })
}

const CHARACTERS = Object.keys(VAGABOND.characters) as VagabondCharacterId[]
const TRACKED = ['tea', 'coin', 'bag'] as const

/** Vagabond setup, §9.3. */
export const VAGABOND_SETUP: SetupStep[] = [
  {
    id: '9.3.1', // Choose Character
    options: () => CHARACTERS.map((character): Action => ({ type: 'vagabond-choose-character', payload: { character } })),
    apply: (state, action) => {
      if (action.type !== 'vagabond-choose-character') return false
      const board: VagabondState = {
        warriorSupply: 0, craftedItems: [], character: action.payload.character, pawn: null,
        satchel: [], tracks: { tea: 0, coin: 0, bag: 0 }, damaged: [],
        relationships: {}, aidThisTurn: {}, completedQuests: [], coalition: null, refreshLeft: 0,
      }
      state.factions.vagabond = board
      return true
    },
  },
  {
    id: '9.3.2', // Place Pawn in any forest
    options: state => mapOf(state).forests.map((_, forest): Action => ({ type: 'vagabond-place-pawn', payload: { forest } })),
    apply: (state, action) => {
      if (action.type !== 'vagabond-place-pawn') return false
      state.factions.vagabond!.pawn = { kind: 'forest', id: action.payload.forest }
      return true
    },
  },
  {
    id: '9.3.3', // Get Quests, Populate Ruins, Take Starting Items, Set Relationships (§9.3.3–9.3.6)
    auto: (state, rng) => {
      const board = state.factions.vagabond!
      state.questDeck = shuffle(BASE_QUESTS.map(q => q.id), rng)
      state.questsAvailable = state.questDeck.splice(0, 3)

      // One "R" item under each ruin, ruin stacks shuffled: a random assignment of items to ruin slots.
      const items = shuffle([...VAGABOND.ruinItems], rng)
      for (const clearing of state.map.clearings) for (const slot of clearing.slots)
        if (slot?.kind === 'ruin') slot.items = [items.shift()!]

      for (const type of VAGABOND.characters[board.character!].items) {
        if ((TRACKED as readonly string[]).includes(type)) board.tracks[type as (typeof TRACKED)[number]] += 1
        else board.satchel.push({ type, exhausted: false })
      }
      for (const seat of state.seats) if (seat.faction !== 'vagabond') board.relationships[seat.faction] = 0
    },
  },
]

// ── Items (§9.2.5) ─────────────────────────────────────────────────────────────

const isTracked = (t: ItemType): t is (typeof TRACKED)[number] => (TRACKED as readonly string[]).includes(t)
const vb = (state: GameState) => state.factions.vagabond!

/** Face-up, undamaged items of a type: in the Satchel or on its track. */
export function faceUp(state: GameState, type: ItemType): number {
  const v = vb(state)
  return v.satchel.filter(i => i.type === type && !i.exhausted).length + (isTracked(type) ? v.tracks[type] : 0)
}

/** Exhausts face-up items; an item leaving a track goes face down into the Satchel (§9.2.5.I). */
export function exhaust(state: GameState, type: ItemType, n = 1) {
  const v = vb(state)
  for (let k = 0; k < n; k++) {
    const item = v.satchel.find(i => i.type === type && !i.exhausted)
    if (item) item.exhausted = true
    else if (isTracked(type) && v.tracks[type] > 0) { v.tracks[type] -= 1; v.satchel.push({ type, exhausted: true }) }
    else throw new Error(`no face-up ${type} to exhaust`)
  }
}

/** An item enters the Satchel; face-up tea, coins and bags go to their track when there is room (§9.2.5). */
function gainItem(state: GameState, item: VagabondItem) {
  const v = vb(state)
  if (!item.exhausted && isTracked(item.type) && v.tracks[item.type] < VAGABOND.trackSize) v.tracks[item.type] += 1
  else v.satchel.push({ ...item })
}

function refreshItems(state: GameState, choice: Record<string, number>) {
  const v = vb(state)
  for (const [key, n] of Object.entries(choice)) {
    const type = key.split(':')[0] as ItemType
    for (let k = 0; k < n; k++) {
      const i = v.satchel.findIndex(x => x.type === type && x.exhausted)
      if (i < 0) throw new Error(`no exhausted ${type}`)
      v.satchel.splice(i, 1)
      gainItem(state, { type, exhausted: false })
    }
  }
}

const exhaustedPool = (state: GameState): Record<string, number> => {
  const pool: Record<string, number> = {}
  for (const i of vb(state).satchel) if (i.exhausted) pool[itemKey(i)] = (pool[itemKey(i)] ?? 0) + 1
  return pool
}

const damagedPool = (state: GameState): Record<string, number> => {
  const pool: Record<string, number> = {}
  for (const i of vb(state).damaged) pool[itemKey(i)] = (pool[itemKey(i)] ?? 0) + 1
  return pool
}

/** Repair (§9.5.7): a damaged item returns to the Satchel on the same face (face-up tea, coins, bags to tracks). */
function repairItems(state: GameState, choice: Record<string, number>) {
  const v = vb(state)
  for (const [key, n] of Object.entries(choice)) {
    for (let k = 0; k < n; k++) {
      const i = v.damaged.findIndex(x => itemKey(x) === key)
      if (i < 0) throw new Error(`no damaged ${key}`)
      gainItem(state, v.damaged.splice(i, 1)[0]!)
    }
  }
}

const sum = (pool: Record<string, number>) => Object.values(pool).reduce((a, b) => a + b, 0)
/** Pick exactly `n` from a pool, or everything when there is no real choice. */
const pickOptions = (pool: Record<string, number>, n: number) => choices(pool, Math.min(n, sum(pool)))

// ── Position and relationships ─────────────────────────────────────────────────

export const pawnClearing = (state: GameState): ClearingId | null => {
  const p = vb(state).pawn
  return p?.kind === 'clearing' ? p.id : null
}

const forestEdges = (map: MapDef, f: ForestId): string[] => {
  const ring = map.forests[f]!
  return ring.map((a, i) => [a, ring[(i + 1) % ring.length]!].sort((x, y) => x - y))
    .filter(([a, b]) => map.paths.some(([x, y]) => x === a && y === b)).map(e => e.join('-'))
}

/** Forests are adjacent to the clearings around them and to forests across one path (§2.4.1). */
export function slipTargets(state: GameState): PawnLocation[] {
  const map = mapOf(state)
  const p = vb(state).pawn!
  if (p.kind === 'clearing') {
    return [
      ...adjacent(map, p.id).map((id): PawnLocation => ({ kind: 'clearing', id })),
      ...map.forests.flatMap((ring, id) => (ring.includes(p.id) ? [{ kind: 'forest', id } as PawnLocation] : [])),
    ]
  }
  const mine = new Set(forestEdges(map, p.id))
  return [
    ...map.forests[p.id]!.map((id): PawnLocation => ({ kind: 'clearing', id })),
    ...map.forests.flatMap((_, id) => (id !== p.id && forestEdges(map, id).some(e => mine.has(e)) ? [{ kind: 'forest', id } as PawnLocation] : [])),
  ]
}

const hostile = (state: GameState, f: FactionId) => vb(state).relationships[f] === 'hostile'
const allied = (state: GameState): FactionId[] => state.seats.map(s => s.faction).filter(f => vb(state).relationships[f] === 3)
/** Moving into a clearing with warriors of any Hostile faction costs an extra boot (§9.2.9.III.b). */
const hostileClearing = (state: GameState, c: ClearingId) =>
  state.seats.some(s => hostile(state, s.faction) && warriorsAt(state, s.faction, c) > 0)

/** Aid (§9.2.9.I–II): steps the relationship toward Allied, or scores two with an ally; Hostile stays Hostile. */
function aided(state: GameState, f: FactionId) {
  const v = vb(state)
  const rel = v.relationships[f]
  if (rel === undefined || rel === 'hostile') return // §9.2.9.III.c
  if (rel === 3) { award(state, 'vagabond', VAGABOND.alliedAidPoints); return }
  const given = (v.aidThisTurn[f] ?? 0) + 1
  if (given >= VAGABOND.aidToAdvance[rel]!) {
    v.relationships[f] = (rel + 1) as Relationship
    v.aidThisTurn[f] = 0 // each Aid counts toward one improvement only (§9.2.9.I.a)
    award(state, 'vagabond', VAGABOND.advancePoints[rel]!)
  } else v.aidThisTurn[f] = given
}

// ── Daylight actions (§9.5) ────────────────────────────────────────────────────

function daylightActions(state: GameState): Action[] {
  const v = vb(state)
  const c = pawnClearing(state)
  const map = mapOf(state)
  const out: Action[] = []
  const has = (t: ItemType, n = 1) => faceUp(state, t) >= n

  // Move (§9.5.1): out of a forest into a clearing around it, or along a path; never into a forest.
  const destinations = c === null ? map.forests[v.pawn!.id]! : adjacent(map, c)
  for (const to of destinations) {
    if (!has('boots', hostileClearing(state, to) ? 2 : 1)) continue
    out.push({ type: 'vagabond-move', payload: { to } })
    if (c !== null) for (const faction of allied(state)) // §9.2.9.II.b
      for (let w = 1; w <= warriorsAt(state, faction, c); w++) out.push({ type: 'vagabond-move', payload: { to, ally: { faction, warriors: w } } })
  }
  if (c === null) return out // every other action needs a clearing

  if (has('sword')) // §9.5.2, §9.2.9.II.c
    for (const defender of battleTargets(state, 'vagabond', c)) {
      out.push({ type: 'vagabond-battle', payload: { defender } })
      for (const ally of allied(state)) if (ally !== defender && warriorsAt(state, ally, c) > 0) out.push({ type: 'vagabond-battle', payload: { defender, ally } })
    }

  if (has('torch') && state.map.clearings[c]!.slots.some(s => s?.kind === 'ruin' && s.items.length > 0)) out.push({ type: 'vagabond-explore', payload: {} }) // §9.5.3

  const suit = suitOf(state, c)
  const giveable = uniqueDesigns(state.hands.vagabond!.filter(k => matchesSuit(k, suit)))
  const exhaustable = ITEM_TYPES.filter(t => has(t))
  if (giveable.length && exhaustable.length) // §9.5.4
    for (const to of state.seats.map(s => s.faction).filter(f => f !== 'vagabond' && hasPieces(state, f, c))) {
      const takes: (ItemType | undefined)[] = [undefined, ...new Set(state.factions[to]!.craftedItems)]
      for (const card of giveable) for (const exhaust of exhaustable) for (const take of takes)
        out.push({ type: 'vagabond-aid', payload: take ? { to, card, exhaust, take } : { to, card, exhaust } })
    }

  for (const quest of state.questsAvailable) { // §9.5.5
    const def = QUESTS.get(quest)!
    if (def.suit !== suit) continue
    const [a, b] = def.items
    if (a === b ? has(a, 2) : has(a) && has(b))
      for (const reward of ['points', 'draw'] as const) out.push({ type: 'vagabond-quest', payload: { quest, reward } })
  }

  if (has('crossbow')) // §9.5.6
    for (const target of state.seats.map(s => s.faction).filter(f => isEnemy(state, 'vagabond', f))) {
      if (warriorsAt(state, target, c) > 0) out.push({ type: 'vagabond-strike', payload: { target, piece: 'warrior' } })
      else for (const piece of Object.keys(otherPieces(state, target, c))) out.push({ type: 'vagabond-strike', payload: { target, piece } })
    }

  if (has('hammer')) for (const item of Object.keys(damagedPool(state))) out.push({ type: 'vagabond-repair', payload: { item } }) // §9.5.7

  const hammers = faceUp(state, 'hammer') // §9.5.8: one hammer per icon, every icon matching the clearing
  if (hammers) {
    const pieces = Array.from({ length: hammers }, () => ({ id: 'vagabond' as const, suit }))
    for (const card of uniqueDesigns(state.hands.vagabond!)) if (canCraft(state, 'vagabond', card, pieces)) out.push({ type: 'craft', payload: { card } })
  }

  if (has('torch')) { // §9.5.9, App. V
    if (v.character === 'thief')
      for (const from of state.seats.map(s => s.faction).filter(f => f !== 'vagabond' && hasPieces(state, f, c) && state.hands[f]!.length))
        out.push({ type: 'vagabond-steal', payload: { from } })
    if (v.character === 'tinker')
      for (const card of uniqueDesigns(state.discard.filter(k => matchesSuit(k, suit)))) out.push({ type: 'vagabond-day-labor', payload: { card } })
    if (v.character === 'ranger')
      for (const items of pickOptions(damagedPool(state), 3)) out.push({ type: 'vagabond-hideout', payload: { items } })
  }
  return out
}

function applyDaylight(state: GameState, action: Action, rng: Rng) {
  const v = vb(state)
  const c = pawnClearing(state)
  switch (action.type) {
    case 'vagabond-move': {
      const to = action.payload.to
      exhaust(state, 'boots', hostileClearing(state, to) ? 2 : 1)
      const ally = action.payload.ally
      if (ally && c !== null) moveWarriors(state, ally.faction, c, to, ally.warriors, { forcedByVagabond: true })
      v.pawn = { kind: 'clearing', id: to }
      return
    }
    case 'vagabond-battle':
      exhaust(state, 'sword')
      startBattle(state, 'vagabond', action.payload.defender, c!, rng, action.payload.ally ?? null)
      return
    case 'vagabond-explore': { // §9.5.3
      exhaust(state, 'torch')
      const slots = state.map.clearings[c!]!.slots
      const i = slots.findIndex(s => s?.kind === 'ruin' && s.items.length > 0)
      const ruin = slots[i] as Extract<SlotContent, { kind: 'ruin' }>
      gainItem(state, { type: ruin.items.shift()!, exhausted: false })
      if (!ruin.items.length) slots[i] = null // the ruin is removed and its slot opens (§2.2.4)
      award(state, 'vagabond', 1)
      return
    }
    case 'vagabond-aid': { // §9.5.4
      const { to, card, take } = action.payload
      exhaust(state, action.payload.exhaust)
      takeFromHand(state, 'vagabond', card)
      state.hands[to]!.push(card)
      if (take) {
        const crafted = state.factions[to]!.craftedItems
        crafted.splice(crafted.indexOf(take), 1)
        gainItem(state, { type: take, exhausted: false })
      }
      aided(state, to)
      return
    }
    case 'vagabond-quest': { // §9.5.5
      const def = QUESTS.get(action.payload.quest)!
      for (const t of def.items) exhaust(state, t)
      state.questsAvailable = state.questsAvailable.filter(q => q !== def.id)
      v.completedQuests.push(def.id)
      if (action.payload.reward === 'points') award(state, 'vagabond', v.completedQuests.filter(q => QUESTS.get(q)!.suit === def.suit).length)
      else state.hands.vagabond!.push(...drawCards(state, 2, rng))
      const next = state.questDeck.shift()
      if (next) state.questsAvailable.push(next)
      return
    }
    case 'vagabond-strike': { // §9.5.6
      exhaust(state, 'crossbow')
      const { target, piece } = action.payload
      if (piece === 'warrior') removeWarriorsBy(state, target, c!, 1, { by: 'vagabond' })
      else removeType(state, target, c!, piece, 1, { by: 'vagabond' })
      return
    }
    case 'vagabond-repair':
      exhaust(state, 'hammer')
      repairItems(state, { [action.payload.item]: 1 })
      return
    case 'craft': {
      const def = cardDef(action.payload.card)
      exhaust(state, 'hammer', def.cost.length)
      craft(state, 'vagabond', action.payload.card, def.cost.map(() => ({ id: 'vagabond' as const, suit: suitOf(state, c!) })))
      return
    }
    case 'vagabond-steal': { // §V.1.2
      exhaust(state, 'torch')
      const hand = state.hands[action.payload.from]!
      state.hands.vagabond!.push(hand.splice(rng.int(hand.length), 1)[0]!)
      return
    }
    case 'vagabond-day-labor': // §V.2.2
      exhaust(state, 'torch')
      state.discard.splice(state.discard.indexOf(action.payload.card), 1)
      state.hands.vagabond!.push(action.payload.card)
      return
    case 'vagabond-hideout': // §V.3.2
      exhaust(state, 'torch')
      repairItems(state, action.payload.items)
      gotoPhase(state, 'evening', rng)
      return
    default:
      throw new Error(`vagabond cannot ${action.type} now`)
  }
}

export const VAGABOND_TURN: TurnStep[] = [
  {
    id: 'refresh', phase: 'birdsong', // §9.4.1: two per face-up tea, then three more; damaged items stay (OQ-17)
    enter: state => {
      const v = vb(state)
      const n = VAGABOND.refresh.base + VAGABOND.refresh.perTea * v.tracks.tea
      const pool = exhaustedPool(state)
      if (sum(pool) <= n) refreshItems(state, pool)
      else v.refreshLeft = n
    },
    options: state => {
      const v = vb(state)
      if (v.refreshLeft < 1) return []
      return choices(exhaustedPool(state), v.refreshLeft).map((items): Action => ({ type: 'vagabond-refresh', payload: { items } }))
    },
    apply: (state, action) => {
      if (action.type !== 'vagabond-refresh') throw new Error(`vagabond cannot ${action.type} now`)
      refreshItems(state, action.payload.items)
      vb(state).refreshLeft = 0
    },
  },
  {
    id: 'slip', phase: 'birdsong', optional: true, window: true, // §9.4.2
    options: state => slipTargets(state).map((to): Action => ({ type: 'vagabond-slip', payload: { to } })),
    apply: (state, action, rng) => {
      if (action.type !== 'vagabond-slip') throw new Error(`vagabond cannot ${action.type} now`)
      vb(state).pawn = action.payload.to
      goto(state, 'daylight-start', rng) // one slip, then Birdsong is over
    },
  },
  {
    id: 'actions', phase: 'daylight', optional: true, window: true, // §9.5
    options: daylightActions,
    apply: applyDaylight,
  },
  {
    id: 'rest', phase: 'evening', // §9.6.1: in a forest, every damaged item returns to the Satchel face up
    enter: state => {
      const v = vb(state)
      if (v.pawn?.kind !== 'forest') return
      const damaged = v.damaged
      v.damaged = []
      for (const item of damaged) gainItem(state, { type: item.type, exhausted: false })
    },
  },
  {
    id: 'draw', phase: 'evening', // §9.6.2–9.6.3
    enter: (state, rng) => {
      state.hands.vagabond!.push(...drawCards(state, VAGABOND.draw.base + VAGABOND.draw.perCoin * vb(state).tracks.coin, rng))
      requireDiscardDown(state, 'vagabond')
    },
  },
  {
    id: 'item-capacity', phase: 'evening', // §9.6.4: Satchel and Damaged over the limit lose items for good
    options: state => {
      const v = vb(state)
      const limit = VAGABOND.itemLimit.base + VAGABOND.itemLimit.perBag * v.tracks.bag
      const over = v.satchel.length + v.damaged.length - limit
      if (over < 1) return []
      const pool: Record<string, number> = { ...exhaustedPool(state) }
      for (const i of v.satchel) if (!i.exhausted) pool[itemKey(i)] = (pool[itemKey(i)] ?? 0) + 1
      for (const [k, n] of Object.entries(damagedPool(state))) pool[`damaged:${k}`] = n
      return choices(pool, over).map((items): Action => ({ type: 'vagabond-remove-items', payload: { items } }))
    },
    apply: (state, action) => {
      if (action.type !== 'vagabond-remove-items') throw new Error(`vagabond cannot ${action.type} now`)
      const v = vb(state)
      for (const [key, n] of Object.entries(action.payload.items)) {
        const damaged = key.startsWith('damaged:')
        const k = damaged ? key.slice('damaged:'.length) : key
        const list = damaged ? v.damaged : v.satchel
        for (let i = 0; i < n; i++) list.splice(list.findIndex(x => itemKey(x) === k), 1)
      }
    },
  },
]

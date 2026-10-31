import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AUTUMN, BASE_DECK, BASE_QUESTS } from '../src/index.ts'
import type { Suit } from '../src/types.ts'

const count = <T>(xs: T[], f: (x: T) => number) => xs.reduce((n, x) => n + f(x), 0)

test('deck has 54 cards with unique ids (§C.1.4)', () => {
  assert.equal(count(BASE_DECK, c => c.copies), 54)
  assert.equal(new Set(BASE_DECK.map(c => c.id)).size, BASE_DECK.length)
})

test('five ambush cards: one per suit plus two birds (§2.1.2)', () => {
  const ambush = BASE_DECK.filter(c => c.kind === 'ambush')
  assert.equal(count(ambush, c => c.copies), 5)
  assert.equal(ambush.find(c => c.suit === 'bird')?.copies, 2)
})

test('four dominance cards, one per suit (§2.1.3)', () => {
  const dom = BASE_DECK.filter(c => c.kind === 'dominance')
  assert.deepEqual(dom.map(c => c.suit).sort(), ['bird', 'fox', 'mouse', 'rabbit'])
  assert.ok(dom.every(c => c.copies === 1))
})

test('copies per crafting cost match the Root Crafting Chart (SRC-012)', () => {
  const byCost = new Map<string, number>()
  for (const c of BASE_DECK) if (c.cost.length) {
    const key = c.cost.join('+')
    byCost.set(key, (byCost.get(key) ?? 0) + c.copies)
  }
  assert.deepEqual(Object.fromEntries(byCost), {
    mouse: 11, rabbit: 4, fox: 5,
    'mouse+mouse': 2, 'rabbit+rabbit': 9, 'fox+fox': 5,
    'mouse+mouse+mouse': 3, 'rabbit+rabbit+rabbit': 1, 'fox+fox+fox': 1,
    'rabbit+fox+mouse': 3, 'any+any+any+any': 1,
  })
  assert.ok(BASE_DECK.every(c => c.copiesEvidence !== 'unverified'))
})

test('only craftable cards have a cost; only item cards carry an item and points', () => {
  for (const c of BASE_DECK) {
    const craftable = c.kind !== 'ambush' && c.kind !== 'dominance'
    assert.equal(c.cost.length > 0, craftable, c.id)
    assert.equal(c.item !== undefined, c.kind === 'item', c.id)
    assert.equal(c.vp !== undefined, c.kind === 'item', c.id)
  }
})

test('15 quests, five per suit (§C.1.4)', () => {
  assert.equal(BASE_QUESTS.length, 15)
  for (const s of ['fox', 'rabbit', 'mouse'] as Suit[]) assert.equal(BASE_QUESTS.filter(q => q.suit === s).length, 5, s)
})

test('Autumn: 12 clearings, four of each suit (§C.1.2 clearing markers)', () => {
  assert.equal(AUTUMN.clearings.length, 12)
  AUTUMN.clearings.forEach((c, i) => assert.equal(c.id, i))
  for (const s of ['fox', 'rabbit', 'mouse'] as Suit[]) assert.equal(AUTUMN.clearings.filter(c => c.suit === s).length, 4, s)
})

test('Autumn: four ruin slots, inside the printed slots (§5.1.4)', () => {
  assert.equal(count(AUTUMN.clearings, c => c.ruins), 4)
  for (const c of AUTUMN.clearings) assert.ok(c.slots >= 1 && c.slots <= 3 && c.ruins <= c.slots, `clearing ${c.id}`)
})

test('Autumn: paths are unique, ordered and connect every clearing', () => {
  const keys = AUTUMN.paths.map(([a, b]) => { assert.ok(a < b); return `${a}-${b}` })
  assert.equal(new Set(keys).size, keys.length)
  const seen = new Set([0]), stack = [0]
  while (stack.length) {
    const c = stack.pop()!
    for (const [a, b] of AUTUMN.paths) for (const [x, y] of [[a, b], [b, a]] as const)
      if (x === c && !seen.has(y)) { seen.add(y); stack.push(y) }
  }
  assert.equal(seen.size, 12)
})

test('Autumn: forests are the bounded faces of the path graph (§2.4)', () => {
  // Planar map: faces = paths - clearings + 2, one of which is the unbounded outside.
  assert.equal(AUTUMN.forests.length, AUTUMN.paths.length - AUTUMN.clearings.length + 1)
  const edge = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`
  const paths = new Set(AUTUMN.paths.map(([a, b]) => edge(a, b)))
  const uses = new Map<string, number>()
  for (const f of AUTUMN.forests) f.forEach((a, i) => {
    const e = edge(a, f[(i + 1) % f.length]!)
    assert.ok(paths.has(e), `forest border ${e} is not a path`)
    uses.set(e, (uses.get(e) ?? 0) + 1)
  })
  // Inner paths separate two forests; paths on the map's rim border one.
  for (const e of paths) assert.ok([1, 2].includes(uses.get(e) ?? 0), `path ${e}`)
})

test('Autumn: corners are distinct and the opposite pairs are not adjacent (§3.3.1.II)', () => {
  const { topLeft, topRight, bottomLeft, bottomRight } = AUTUMN.corners
  assert.equal(new Set([topLeft, topRight, bottomLeft, bottomRight]).size, 4)
  const adjacent = (a: number, b: number) => AUTUMN.paths.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
  assert.ok(!adjacent(topLeft, bottomRight) && !adjacent(topRight, bottomLeft))
})

test('Autumn item supply matches §5.1.5', () => {
  assert.deepEqual(AUTUMN.itemSupply, { bag: 2, boots: 2, crossbow: 1, hammer: 1, sword: 2, tea: 2, coin: 2 })
})

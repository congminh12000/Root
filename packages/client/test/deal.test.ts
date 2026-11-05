import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dealPlan, drawsBetween, handSlotClass, shouldDeal } from '../src/interaction/deal.ts'

// Opening deal replay (client only): round the table from the first seat, one card each, until hands are full.

test('cards go one at a time round the table, starting with the first seat', () => {
  const plan = dealPlan(['marquise', 'eyrie', 'alliance'], { marquise: 3, eyrie: 3, alliance: 3 })
  assert.equal(plan.length, 9)
  assert.deepEqual(plan.slice(0, 4).map(s => [s.faction, s.nth]), [['marquise', 0], ['eyrie', 0], ['alliance', 0], ['marquise', 1]])
  assert.deepEqual(plan.at(-1), { faction: 'alliance', nth: 2 })
})

test('a seat with fewer cards drops out of later rounds; an empty table deals nothing', () => {
  const plan = dealPlan(['eyrie', 'vagabond'], { eyrie: 2, vagabond: 1 })
  assert.deepEqual(plan.map(s => s.faction), ['eyrie', 'vagabond', 'eyrie'])
  assert.deepEqual(dealPlan(['eyrie'], {}), [])
})

test('the deal plays only during setup', () => {
  assert.equal(shouldDeal({ stage: 'setup' }), true)
  assert.equal(shouldDeal({ stage: 'play' }), false)
})

test('own hand slots wait until their card lands, and the newest one is set down', () => {
  assert.equal(handSlotClass('a#1', new Set(), null), '')
  assert.equal(handSlotClass('a#1', new Set(['a#1']), null), ' deal-wait')
  assert.equal(handSlotClass('a#1', new Set(), 'a#1'), ' deal-land')
  assert.equal(handSlotClass('b#1', new Set(), 'a#1'), '')
})

// Later draws: how many left the deck, and who gained them, from public counts only.
const seats = (['marquise', 'eyrie', 'alliance', 'vagabond'] as const).map(faction => ({ faction, kind: 'bot' as const }))
const at = (o: { deck: number; counts: Record<string, number>; hand?: string[]; supporters?: number; seat?: number }) => ({
  self: 'marquise' as const, deckCount: o.deck, hand: o.hand ?? [], handCounts: o.counts, supporterCount: o.supporters ?? 0, seats,
  turn: { seat: o.seat ?? 0, phase: 'evening' as const, step: 'draw', number: 3 },
})

test('your Evening draw flies your new cards face up; nothing else moved', () => {
  const prev = at({ deck: 30, counts: { marquise: 2, eyrie: 3 }, hand: ['a#1', 'b#1'] })
  const next = at({ deck: 28, counts: { marquise: 4, eyrie: 3 }, hand: ['a#1', 'b#1', 'c#1', 'd#2'] })
  assert.deepEqual(drawsBetween(prev, next), [{ faction: 'marquise', card: 'c#1' }, { faction: 'marquise', card: 'd#2' }])
})

test('an opponent draw flies face down, filled from the turn owner first', () => {
  const prev = at({ deck: 30, counts: { marquise: 2, eyrie: 3 }, seat: 1 })
  const next = at({ deck: 29, counts: { marquise: 2, eyrie: 4 }, seat: 1 })
  assert.deepEqual(drawsBetween(prev, next), [{ faction: 'eyrie', card: null }])
})

test('a card taken from a player or a Dominance card is not a draw: the deck did not shrink', () => {
  const prev = at({ deck: 30, counts: { marquise: 2, vagabond: 1 } })
  const next = at({ deck: 30, counts: { marquise: 1, vagabond: 2 } })
  assert.deepEqual(drawsBetween(prev, next), [])
})

test('a supporter drawn for the Alliance flies to its badge', () => {
  const prev = at({ deck: 30, counts: { alliance: 3 }, supporters: 2, seat: 2 })
  const next = at({ deck: 29, counts: { alliance: 3 }, supporters: 3, seat: 2 })
  assert.deepEqual(drawsBetween(prev, next), [{ faction: 'alliance', card: null }])
})

test('when the discard is shuffled into a new deck, every hand gain counts as a draw', () => {
  const prev = at({ deck: 1, counts: { eyrie: 0 }, seat: 1 })
  const next = at({ deck: 20, counts: { eyrie: 2 }, seat: 1 })
  assert.equal(drawsBetween(prev, next).length, 2)
})

test('when a card makes two players draw, the turn owner is filled first', () => {
  const prev = at({ deck: 30, counts: { marquise: 2, eyrie: 3 }, hand: ['a#1', 'b#1'], seat: 1 })
  const next = at({ deck: 28, counts: { marquise: 3, eyrie: 4 }, hand: ['a#1', 'b#1', 'c#1'], seat: 1 })
  assert.deepEqual(drawsBetween(prev, next), [{ faction: 'eyrie', card: null }, { faction: 'marquise', card: 'c#1' }])
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dealPlan, dealSlotClass, shouldDeal } from '../src/interaction/deal.ts'

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
  assert.equal(dealSlotClass(0, null), '')
  assert.equal(dealSlotClass(2, 1), ' deal-wait')
  assert.equal(dealSlotClass(0, 1), ' deal-land')
  assert.equal(dealSlotClass(0, 2), '')
})

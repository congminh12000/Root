import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ALLIANCE, AUTUMN, EYRIE, MARQUISE, VAGABOND } from '../src/index.ts'

test('Marquise tracks: six spaces per building type, matching the six buildings of each type (§C.1.2)', () => {
  assert.equal(MARQUISE.woodCost.length, MARQUISE.buildingsPerType)
  for (const pts of Object.values(MARQUISE.points)) assert.equal(pts.length, MARQUISE.buildingsPerType)
  assert.equal(MARQUISE.woodCost[0], 0)
  // Only recruiters give draw bonuses on the printed board.
  assert.deepEqual(MARQUISE.drawBonusAt.recruiter, [2, 4])
})

test('Marquise: building the full row of each type scores the printed totals', () => {
  const total = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0)
  assert.equal(total(MARQUISE.points.sawmill), 15)
  assert.equal(total(MARQUISE.points.workshop), 16)
  assert.equal(total(MARQUISE.points.recruiter), 13)
  assert.equal(total(MARQUISE.woodCost), 13)
})

test('Eyrie roost track has one space per roost (§C.1.2), never decreasing', () => {
  assert.equal(EYRIE.roostPoints.length, EYRIE.roosts)
  EYRIE.roostPoints.forEach((p, i) => assert.ok(i === 0 || p >= EYRIE.roostPoints[i - 1]!))
  assert.equal(Object.keys(EYRIE.leaders).length, 4)
})

test('Alliance sympathy track has ten spaces with costs 1–3 (§8.2.5)', () => {
  assert.equal(ALLIANCE.sympathyCost.length, ALLIANCE.sympathy)
  assert.equal(ALLIANCE.sympathyPoints.length, ALLIANCE.sympathy)
  assert.ok(ALLIANCE.sympathyCost.every(c => c >= 1 && c <= 3))
})

test('Vagabond relationships: three steps from Indifferent to Allied (§9.2.9)', () => {
  assert.equal(VAGABOND.aidToAdvance.length, 3)
  assert.equal(VAGABOND.advancePoints.length, 3)
})

test('Vagabond ruin items fill the four ruins of the map (§9.3.4)', () => {
  const ruins = AUTUMN.clearings.reduce((n, c) => n + c.ruins, 0)
  assert.equal(VAGABOND.ruinItems.length, ruins)
  for (const c of Object.values(VAGABOND.characters)) assert.equal(c.items.length, 4)
})

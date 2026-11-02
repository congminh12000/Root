import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AUTUMN } from '@root/game-data'
import { BRIDGES, CLEARINGS, CLIFFS, ITEMS, LAKE, PATHS, PLOTS, PLOT_HALF, RIVER, inClearing, inPlot, inside, pathDistance, riverDistance, treeAllowed, type Point } from '../src/autumn/layout.ts'

const footprint = (at: Point): Point[] => [-1, 0, 1].flatMap(x => [-1, 0, 1].map(y => [at[0] + x * PLOT_HALF, at[1] + y * PLOT_HALF] as Point))
const along = (line: readonly Point[], step = .004): Point[] => line.slice(1).flatMap((b, i) => {
  const a = line[i]!, n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)
  return Array.from({ length: n }, (_, k) => [a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n] as Point)
})

test('the Autumn diorama shows exactly the game-data map: clearings, suits, slots, ruins, paths, supply', () => {
  assert.equal(CLEARINGS.length, AUTUMN.clearings.length)
  for (const c of AUTUMN.clearings) {
    const d = CLEARINGS[c.id]!
    assert.deepEqual([d.suit, d.at], [c.suit, c.at], `clearing ${c.id + 1}`)
    assert.equal(d.plots.length, c.slots, `slots of ${c.id + 1}`)
    assert.equal(d.plots.filter(p => p.ruin).length, c.ruins, `ruins of ${c.id + 1}`)
  }
  assert.equal(new Set(PLOTS.map(p => p.id)).size, PLOTS.length)
  assert.equal(PLOTS.length, AUTUMN.clearings.reduce((n, c) => n + c.slots, 0))
  assert.deepEqual(PATHS.map(p => [p.a, p.b]), AUTUMN.paths, 'one drawn path per adjacency, no more')
  const counts: Record<string, number> = {}
  for (const row of ITEMS) for (const i of row) counts[i] = (counts[i] ?? 0) + 1
  assert.deepEqual(counts, AUTUMN.itemSupply)
})

test('slots stand on open ground: no water, river, rock, path, tree, house or other slot', () => {
  for (const p of PLOTS) {
    const c = CLEARINGS[p.clearing]!
    for (const q of PLOTS.filter(q => q.id !== p.id)) assert.ok(Math.abs(p.at[0] - q.at[0]) > PLOT_HALF * 2 || Math.abs(p.at[1] - q.at[1]) > PLOT_HALF * 2, `${p.id} overlaps ${q.id}`)
    for (const s of footprint(p.at)) {
      assert.ok(inClearing(s, c), `${p.id} leaves its clearing at ${s}`)
      assert.ok(!inside(s, LAKE) && riverDistance(s) > .004, `${p.id} in water at ${s}`)
      assert.ok(!CLIFFS.some(r => inside(s, r)), `${p.id} on rock at ${s}`)
      assert.ok(pathDistance(s) > .006, `${p.id} on a path at ${s}`)
      assert.equal(treeAllowed(s), false, `${p.id} admits trees`)
      for (const o of CLEARINGS) assert.ok(Math.hypot(s[0] - o.home[0], s[1] - o.home[1]) > .014, `${p.id} under the house of ${o.id + 1}`)
    }
  }
})

test('scenery keeps out of play: the river and houses avoid every clearing, paths only touch their own two', () => {
  for (const s of along(RIVER)) for (const c of CLEARINGS) assert.ok(!inClearing(s, c, .012), `river through clearing ${c.id + 1} at ${s}`)
  for (const c of CLEARINGS) {
    for (const o of CLEARINGS) assert.ok(!inClearing(c.home, o), `house of ${c.id + 1} inside clearing ${o.id + 1}`)
    assert.ok(riverDistance(c.home) > .01 && !inside(c.home, LAKE) && pathDistance(c.home) > .012 && !inPlot(c.home, .01), `house of ${c.id + 1}`)
  }
  for (const p of PATHS) for (const s of along(p.line)) for (const c of CLEARINGS.filter(c => c.id !== p.a && c.id !== p.b))
    assert.ok(!inClearing(s, c), `path ${p.a + 1}-${p.b + 1} crosses clearing ${c.id + 1}`)
  for (const p of PATHS) for (const s of along(p.line)) assert.ok(!inside(s, LAKE) && !CLIFFS.some(r => inside(s, r)), `path ${p.a + 1}-${p.b + 1} through water or rock at ${s}`)
  assert.ok(BRIDGES.length >= 2, `bridges where paths cross the river: ${BRIDGES.length}`)
})

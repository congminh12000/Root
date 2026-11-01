import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BUILDINGS, DOCKS, LAKE, PLOTS, PLOT_HALF, VILLAGES, changeDemo, hasRuin, inDock, initialDemo, inside, pathDistance, treeAllowed, type DemoState, type Point } from '../src/lake/layout.ts'

const footprint = (at: Point): Point[] => [-1,0,1].flatMap(x => [-1,0,1].map(y => [at[0]+x*PLOT_HALF,at[1]+y*PLOT_HALF] as Point))
test('Lake reference study has unique fixed slots and four explicitly occupied Ruin slots', () => {
  assert.equal(VILLAGES.length,12); assert.equal(PLOTS.length,22)
  assert.equal(new Set(PLOTS.map(p => p.id)).size,22)
  assert.deepEqual(PLOTS.filter(p => p.ruin).map(p => p.id), ['5.3','7.3','8.3','9.1'])
  for (const p of PLOTS) {
    assert.ok(p.at.every(n => n > PLOT_HALF && n < 1-PLOT_HALF))
    for (const q of PLOTS.filter(q => q.id !== p.id)) assert.ok(Math.abs(p.at[0]-q.at[0]) > PLOT_HALF*2 || Math.abs(p.at[1]-q.at[1]) > PLOT_HALF*2, `${p.id} overlaps ${q.id}`)
    for (const sample of footprint(p.at)) {
      assert.ok(!inside(sample,LAKE), `${p.id} under water at ${sample}`)
      assert.ok(!inDock(sample), `${p.id} overlaps dock`)
      assert.ok(pathDistance(sample) > .006, `${p.id} crosses path at ${sample}`)
      for (const c of VILLAGES) assert.ok(Math.hypot(sample[0]-c.home[0],sample[1]-c.home[1]) > .014, `${p.id} overlaps decorative house ${c.id}`)
      assert.equal(treeAllowed(sample),false, `${p.id} admits trees`)
    }
  }
  assert.equal(DOCKS.length,4)
})
test('all sample buildings can be placed, replaced and removed without altering a slot footprint', () => {
  const before = JSON.stringify(PLOTS)
  let s = changeDemo(initialDemo(), { type: 'select', id: '1.1' })
  for (const building of BUILDINGS) {
    s = changeDemo(s,{ type: 'place', building })
    assert.equal(s.buildings['1.1'],building)
    assert.equal(Object.keys(s.buildings).length,1)
  }
  s = changeDemo(s,{ type: 'remove' }); assert.deepEqual(s.buildings,{})
  assert.equal(JSON.stringify(PLOTS),before)
})
test('Ruin blocks placement, clearing exposes that same slot and reset restores every Ruin', () => {
  let s: DemoState = initialDemo()
  for (const p of PLOTS.filter(p => p.ruin)) {
    s = changeDemo(s,{ type:'select',id:p.id })
    assert.equal(changeDemo(s,{ type:'place',building:'base' }),s)
    assert.ok(hasRuin(s,p)); s=changeDemo(s,{ type:'clear' }); assert.ok(!hasRuin(s,p))
    const cleared = s; assert.equal(changeDemo(s,{ type:'clear' }),cleared)
    s=changeDemo(s,{ type:'place',building:'base' }); assert.equal(s.buildings[p.id],'base')
  }
  assert.deepEqual(changeDemo(s,{type:'reset'}),initialDemo())
  const empty=initialDemo()
  assert.equal(changeDemo(empty,{type:'select',id:'missing'}),empty)
  assert.equal(changeDemo(empty,{type:'place',building:'roost'}),empty)
  assert.equal(changeDemo(empty,{type:'clear'}),empty)
})

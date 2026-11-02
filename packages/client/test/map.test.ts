import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEPTH, WIDTH, CLEARING_RY } from '../src/autumn/layout.ts'
import { CLEARING_R, GROUND_X, GROUND_Z } from '../src/board/geo.ts'
import { MAX_ASPECT, MAX_POLAR, MIN_ASPECT, MIN_POLAR, apronRadius, baseHalfHeight, clampTarget, footprintRadius, zoomRange, type Bounds } from '../src/map/limits.ts'

const autumn: Bounds = { halfW: WIDTH / 2, halfD: DEPTH / 2 }
const classic: Bounds = { halfW: GROUND_X / 2, halfD: GROUND_Z / 2 }

for (const [name, b, depth] of [['Autumn diorama', autumn, 2 * CLEARING_RY * DEPTH], ['classic board', classic, 2 * CLEARING_R]] as const) {
  test(`no empty background: every allowed camera sees only ground inside the apron (${name})`, () => {
    const apron = apronRadius(b)
    let checked = 0
    for (let a = MIN_ASPECT; a <= MAX_ASPECT + 1e-9; a += .05) {
      const h = baseHalfHeight(b, a), [zMin, zMax] = zoomRange(b, a, depth)
      for (const zoom of [zMin, (zMin + zMax) / 2, zMax]) for (const polar of [MIN_POLAR, .5, MAX_POLAR]) for (const [tx, tz] of [[0, 0], [1e9, 1e9], [-1e9, 1e9], [1e9, -1e9], [-1e9, -1e9]]) {
        const [x, z] = clampTarget(b, tx!, tz!)
        // Any heading: the footprint is a rotated rectangle, so its corner distance bounds every point.
        assert.ok(Math.hypot(x, z) + footprintRadius(h, a, zoom, polar) < apron, `aspect ${a.toFixed(2)} zoom ${zoom} polar ${polar}`)
        checked++
      }
    }
    assert.ok(checked > 1000)
  })
}

test('zoom range: the farthest zoom shows the whole board, the closest one clearing at about 60% height', () => {
  for (const a of [MIN_ASPECT, 1, 16 / 9, MAX_ASPECT]) {
    const h = baseHalfHeight(autumn, a)
    assert.ok(h >= autumn.halfD && h * a >= autumn.halfW, `board fits at aspect ${a}`)
    const [zMin, zMax] = zoomRange(autumn, a, 2 * CLEARING_RY * DEPTH)
    assert.equal(zMin, 1)
    const share = (2 * CLEARING_RY * DEPTH) / (2 * h / zMax)
    assert.ok(share > .55 && share <= .61 || zMax === 1.5, `clearing share ${share.toFixed(2)} at aspect ${a}`)
  }
  assert.deepEqual(clampTarget(autumn, 99, -99), [autumn.halfW, -autumn.halfD])
})

test('map choice: the diorama by default, every choice a known theme, kept without storage too', async () => {
  const { MAPS, chooseMap, mapChoice } = await import('../src/map/choice.ts')
  assert.equal(mapChoice.value, 'autumn-diorama')
  assert.deepEqual(MAPS.map(m => m.id).sort(), ['autumn-diorama', 'classic'])
  chooseMap('classic')
  assert.equal(mapChoice.value, 'classic')
})

test('quality tiers: a touch device draws fewer pixels, a smaller shadow map and a thinner apron', async () => {
  const { qualityFor } = await import('../src/map/quality.ts')
  const tablet = qualityFor({ coarse: true, dpr: 2 }), laptop = qualityFor({ coarse: false, dpr: 2 })
  assert.equal(tablet.tier, 'tablet'); assert.equal(laptop.tier, 'full')
  assert.ok(tablet.pixelRatio < laptop.pixelRatio && tablet.shadowSize < laptop.shadowSize && tablet.apronTrees < laptop.apronTrees)
  assert.equal(qualityFor({ coarse: false, dpr: 3 }).pixelRatio, 2)
  assert.equal(qualityFor({ coarse: true, dpr: 1 }).pixelRatio, 1)
})

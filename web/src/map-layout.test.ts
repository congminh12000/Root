import { describe, expect, it } from 'vitest'
import { CLEARING_ANCHORS, FOREST_ANCHORS, MAP_SIZE, clearingPosition, forestPosition } from './map-layout'

describe('reference map projection', () => {
  it('places each region and forest inside the image bounds', () => {
    expect(CLEARING_ANCHORS).toHaveLength(12)
    expect(new Set(CLEARING_ANCHORS.map(p => `${p.x},${p.y}`)).size).toBe(12)
    for (const p of [...CLEARING_ANCHORS, ...FOREST_ANCHORS]) {
      expect(p.x).toBeGreaterThan(0)
      expect(p.x).toBeLessThan(MAP_SIZE.width)
      expect(p.y).toBeGreaterThan(0)
      expect(p.y).toBeLessThan(MAP_SIZE.height)
    }
  })
  it('aligns old replay IDs without changing replay data', () => {
    const old = { id: 11, x: 790, y: 630 }
    expect(clearingPosition(old)).toEqual({ x: 1079, y: 1058 })
    expect(old).toEqual({ id: 11, x: 790, y: 630 })
    expect(forestPosition(-1)).toEqual(FOREST_ANCHORS[0])
    expect(forestPosition(-9)).toEqual(FOREST_ANCHORS[8])
  })
})

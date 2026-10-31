import { describe, expect, it } from 'vitest'
import { buildLayout, PLATEAU, validateLayout } from './layout'
import { MAPS } from './spec'
import { PALETTES } from './palettes'

describe.each(Object.values(MAPS))('map $id', spec => {
  const layout = buildLayout(spec)

  it('passes the readability rules', () => {
    expect(validateLayout(spec, layout)).toEqual([])
  })

  it('has a palette for its season', () => {
    expect(PALETTES[spec.season]).toBeDefined()
  })

  it('is deterministic', () => {
    const again = buildLayout(spec)
    expect(again.trees.length).toBe(layout.trees.length)
    expect(again.trees[100]).toEqual(layout.trees[100])
    expect(again.bridges).toEqual(layout.bridges)
  })

  it('keeps trees off every plateau', () => {
    const blocked = layout.trees.filter(t => spec.clearings.some(c =>
      Math.hypot((t.x - c.x) / PLATEAU.rx, (t.y - c.y) / PLATEAU.ry) < 1.1))
    expect(blocked).toEqual([])
    expect(layout.trees.length).toBeGreaterThan(2000)
  })
})

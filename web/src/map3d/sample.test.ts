import { describe, expect, it } from 'vitest'
import { classify, Ground } from './sample'

// Colours measured on maps/lakeside.webp; the 3D board depends on these reading as the right ground.
describe('artwork classification', () => {
  it.each([
    ['lake', [45, 120, 180], Ground.Water],
    ['dirt road', [216, 180, 125], Ground.Dirt],
    ['meadow', [163, 153, 85], Ground.Grass],
    ['pine canopy', [40, 60, 50], Ground.Pine],
    ['orange maple', [215, 95, 45], Ground.Autumn],
    ['grey boulder', [140, 140, 135], Ground.Rock],
  ] as const)('reads %s', (_, [r, g, b], want) => {
    expect(classify(r, g, b)).toBe(want)
  })
})

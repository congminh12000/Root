import { describe, expect, it } from 'vitest'
import { appendFrames, nextIndex } from './playback'
import type { Snapshot } from './types'

describe('reconnect and replay sequencing', () => {
  it('merges reconnect duplicates and orders late frames', () => {
    const frame = (sequence: number) => ({ sequence }) as Snapshot
    expect(appendFrames([frame(2), frame(1)], [frame(2), frame(3)]).map(f => f.sequence)).toEqual([1, 2, 3])
  })
  it('stops at the end of a replay including empty buffers', () => {
    expect(nextIndex(2, 3)).toBe(2)
    expect(nextIndex(0, 0)).toBe(0)
  })
})

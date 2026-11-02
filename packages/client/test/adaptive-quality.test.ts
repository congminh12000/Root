import assert from 'node:assert/strict'
import { test } from 'node:test'
import { frameQuality } from '../src/map/quality.ts'

function run(m: ReturnType<typeof frameQuality>, start: number, fps: number, seconds: number, active = true) {
  const changes: string[] = []
  for (let i = 0; i <= fps * seconds; i++) {
    const tier = m.sample(start + i * 1000 / fps, active)
    if (tier) changes.push(tier)
  }
  return changes
}
test('sustained slow frames lower one tier at a time, never below low', () => {
  const m = frameQuality('full')
  assert.deepEqual(run(m, 0, 20, 5), ['tablet'])
  assert.deepEqual(run(m, 5100, 20, 5), ['low'])
  assert.deepEqual(run(m, 11000, 10, 10), [])
})
test('healthy frames, short stalls, idle, hidden and forced quality never trigger a downgrade', () => {
  assert.deepEqual(run(frameQuality('full'), 0, 60, 20), [])
  assert.deepEqual(run(frameQuality('tablet'), 0, 30, 20), [])
  assert.deepEqual(run(frameQuality('full', true), 0, 10, 20), [])
  assert.deepEqual(run(frameQuality('full'), 0, 10, 20, false), [])
  const m = frameQuality('full')
  assert.deepEqual(run(m, 0, 20, 2.5), [])
  m.sample(2600, false)
  assert.deepEqual(run(m, 3000, 20, 2.5), [])
  // A suspended tab or an isolated long task resets the observation window.
  assert.equal(m.sample(10000, false), null)
  assert.deepEqual(run(m, 10050, 60, 5), [])
})
test('a recovered window clears prior slow evidence; reset starts a fresh measurement', () => {
  const m = frameQuality('full')
  assert.deepEqual(run(m, 0, 20, 2.5), [])
  assert.deepEqual(run(m, 2550, 60, 3), [])
  assert.deepEqual(run(m, 5600, 20, 2.5), [])
  m.reset()
  assert.deepEqual(run(m, 8200, 20, 2.5), [])
})

test('very slow but continuous frames are not mistaken for an idle tab', () => {
  assert.deepEqual(run(frameQuality('full'), 0, 3, 5), ['tablet'])
  assert.deepEqual(run(frameQuality('full'), 0, .5, 6), ['tablet'])
})

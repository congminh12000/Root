import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Action } from '@root/game-engine'
import { MAP_FOCUS, marquiseButtons } from '../src/interaction/marquise-actions.ts'

// RD-M04: the six Marquise buttons are always there, in Root Digital's order, and enabled only by legal actions.

const a = (type: string, payload: object): Action => ({ type, payload }) as Action

test('six buttons in Root Digital order; enabled only when an action of that type is legal', () => {
  const legal = [a('move', { from: 0, to: 1, warriors: 1 }), a('marquise-recruit', { clearings: [0] }), a('end-step', {})]
  const b = marquiseButtons(legal)
  assert.deepEqual(b.map(x => x.type), ['move', 'marquise-build', 'marquise-recruit', 'battle', 'marquise-spend-bird', 'marquise-overwork'])
  assert.deepEqual(b.map(x => x.enabled), [true, false, true, false, false, false])
  assert.deepEqual(marquiseButtons([]).map(x => x.enabled), [false, false, false, false, false, false])
})

test('map actions focus the map; a single other choice is sent at once; several are listed', () => {
  const one = marquiseButtons([a('marquise-recruit', { clearings: [0] })]).find(x => x.type === 'marquise-recruit')!
  assert.equal(one.mode, 'send')
  const birds = marquiseButtons([a('marquise-spend-bird', { card: 'x#1' }), a('marquise-spend-bird', { card: 'y#1' })]).find(x => x.type === 'marquise-spend-bird')!
  assert.equal(birds.mode, 'list')
  for (const t of ['move', 'marquise-build', 'battle', 'marquise-overwork']) assert.ok(MAP_FOCUS.has(t), t)
  assert.equal(marquiseButtons([a('battle', { clearing: 0, defender: 'eyrie' })]).find(x => x.type === 'battle')!.mode, 'map')
})

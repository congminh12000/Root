import assert from 'node:assert/strict'
import { test } from 'node:test'
import { html } from 'htm/preact'
import { render } from 'preact-render-to-string'
import type { Action, PlayerView } from '@root/game-engine'
import { sampleView } from '../src/dev/sample.ts'
import { contextAction } from '../src/interaction/context-action.ts'
import { ContextButton } from '../src/ui/screens/context-button.ts'

const base = sampleView('marquise')
const view: PlayerView = { ...base, stage: 'play', turn: { ...base.turn, seat: base.seats.findIndex(s => s.faction === 'marquise'), phase: 'daylight', step: 'actions' } }
const end: Action = { type: 'end-step', payload: {} }
const march: Action = { type: 'marquise-end-march', payload: {} }

test('Marquise final Daylight step labels the exact server action Sang Evening', () => {
  const result = contextAction([end], view)
  assert.equal(result.label, 'Sang Evening')
  assert.equal(result.action, end)
  assert.equal(result.cancel, false)
  for (const v of [undefined, { ...view, stage: 'setup' as const }, { ...view, turn: { ...view.turn, step: 'craft' } }, { ...view, turn: { ...view.turn, phase: 'birdsong' as const } }, { ...view, turn: { ...view.turn, seat: view.seats.findIndex(s => s.faction === 'eyrie') } }]) {
    assert.equal(contextAction([end], v).label, 'Tiếp tục')
  }
})
test('March ends only with its own legal action; missing step cannot produce a command', () => {
  assert.deepEqual(contextAction([march], view), { label: 'Dừng March', action: march, cancel: false })
  assert.deepEqual(contextAction([], view), { label: 'Tiếp tục', action: null, cancel: false })
  assert.equal(contextAction([{ type: 'battle', payload: { clearing: 0, defender: 'eyrie' } }], view).action, null)
  const out = render(html`<${ContextButton} legal=${[]} view=${view} send=${() => { throw Error('no command') }} />`)
  assert.ok(out.includes('disabled'))
})
test('cancelling a map choice takes priority over ending Daylight and never returns a command', () => {
  assert.deepEqual(contextAction([end], view, true), { label: 'Huỷ', action: null, cancel: true })
  const out = render(html`<${ContextButton} legal=${[]} view=${view} send=${() => {}} onCancel=${() => {}} />`)
  assert.ok(out.includes('Huỷ'))
  assert.ok(!out.includes('disabled'))
})

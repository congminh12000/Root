import assert from 'node:assert/strict'
import { test } from 'node:test'
import { html } from 'htm/preact'
import { render } from 'preact-render-to-string'
import { sampleView } from '../src/dev/sample.ts'
import { HandStrip } from '../src/ui/screens/hud.ts'

test('hand exposes every own card immediately, without a drawer trigger', () => {
  const view = sampleView('vagabond')
  view.hand = ['ambush-bird#1', 'tax-collector#1']
  const out = render(html`<${HandStrip} view=${view} legal=${[]} seat="vagabond" />`)
  for (const card of view.hand) assert.ok(out.includes(`data-card="${card}"`))
  assert.ok(!out.includes('aria-expanded'))
  assert.ok(!out.includes('minicard usable'))
})

test('empty hand has no fake cards or card controls', () => {
  const view = sampleView('vagabond')
  view.hand = []
  const out = render(html`<${HandStrip} view=${view} legal=${[]} seat="vagabond" />`)
  assert.match(out, /Không có lá nào/)
  assert.ok(!out.includes('data-card='))
})

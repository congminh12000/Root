import assert from 'node:assert/strict'
import { test } from 'node:test'
import { html } from 'htm/preact'
import { render } from 'preact-render-to-string'
import { sampleView } from '../src/dev/sample.ts'
import { NO_CHANGES } from '../src/net/changes.ts'
import { HudFactions, HudPlayed, HudActions, HudChat } from '../src/ui/screens/hud.ts'

test('opponents follow engine seat order and own faction appears separately', () => {
  const view = sampleView('marquise')
  const seats = [...view.seats].reverse().map(s => ({ ...s, name: `player-${s.faction}`, connected: true }))
  const props = { view, seats, seat: 'marquise', changes: NO_CHANGES, open: null, onOpen: () => {} }
  const out = render(html`<${HudFactions} ...${props} />`)
  assert.ok(!out.includes('player-marquise'))
  const opponents = view.seats.filter(s => s.faction !== 'marquise')
  for (let i = 1; i < opponents.length; i++) assert.ok(out.indexOf(`player-${opponents[i-1]!.faction}`) < out.indexOf(`player-${opponents[i]!.faction}`))
  const own = render(html`<${HudFactions} ...${props} own />`)
  assert.ok(own.includes('player-marquise'))
  assert.ok(!own.includes('player-eyrie'))
})

test('last played card uses only public card events', () => {
  assert.equal(render(html`<${HudPlayed} log=${[{ type: 'alliance-mobilize', revision: 1, faction: 'alliance' }]} />`), '')
  const out = render(html`<${HudPlayed} log=${[
    { type: 'craft', revision: 1, faction: 'marquise', detail: { card: 'tax-collector#1' } },
    { type: 'move', revision: 2, faction: 'marquise', detail: { from: 1, to: 2 } },
  ]} />`)
  assert.ok(out.includes('data-card="tax-collector#1"'))
})

test('undo and continue require server permission and a legal step', () => {
  const out = render(html`<${HudActions} legal=${[]} canUndo=${false} undo=${() => {}} send=${() => {}} onOpen=${() => {}} />`)
  assert.equal((out.match(/disabled/g) ?? []).length, 3)
  const active = render(html`<${HudActions} legal=${[{ type: 'end-step', payload: {} }]} canUndo undo=${() => {}} send=${() => {}} onOpen=${() => {}} />`)
  assert.ok(!active.includes('disabled'))
})

test('chat escapes text and spectators cannot send', () => {
  const out = render(html`<${HudChat} entries=${[{ faction: 'marquise', text: '<script>alert(1)</script>', at: 1 }]} enabled=${false} send=${() => {}} />`)
  assert.ok(!out.includes('<script>'))
  assert.ok(out.includes('&lt;script'))
  assert.match(out, /input[^>]*disabled/)
})

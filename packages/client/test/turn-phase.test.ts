import assert from 'node:assert/strict'
import { test } from 'node:test'
import { html } from 'htm/preact'
import { render } from 'preact-render-to-string'
import { sampleView } from '../src/dev/sample.ts'
import { NO_CHANGES } from '../src/net/changes.ts'
import { HudFactions } from '../src/ui/screens/hud.ts'
import { PhaseMark, TurnNotice, turnOwner } from '../src/ui/screens/turn-phase.ts'

const view = sampleView('marquise')
test('turn marker stays on turn owner when a different faction answers an interrupt', () => {
  const v = { ...view, waitingOn: ['alliance' as const], turn: { ...view.turn, seat: view.seats.findIndex(s => s.faction === 'marquise') } }
  assert.equal(turnOwner(v), 'marquise')
  const seats = v.seats.map(s => ({ ...s, name: s.faction, connected: true }))
  const out = render(html`<${HudFactions} view=${v} seats=${seats} seat=${null} changes=${NO_CHANGES} open=${null} onOpen=${() => {}} />`)
  assert.equal((out.match(/class="phase-mark"/g) ?? []).length, 1)
  const marked = out.split('</button>').find(button => button.includes('phase-mark'))!
  assert.ok(marked.includes('>marquise</span>'))
  assert.ok(!marked.includes('>alliance</span>'))
})
test('setup and finished games do not announce a normal turn', () => {
  for (const v of [{ ...view, stage: 'setup' as const }, { ...view, winner: { factions: ['eyrie' as const], reason: 'points' as const } }]) {
    assert.equal(turnOwner(v), null)
    assert.equal(render(html`<${TurnNotice} view=${v} />`), '')
  }
})
test('phases have an icon and readable name; spectators see the same public turn', () => {
  for (const phase of ['birdsong', 'daylight', 'evening'] as const) {
    const out = render(html`<${PhaseMark} phase=${phase} />`)
    assert.ok(out.includes({ birdsong: 'Birdsong', daylight: 'Daylight', evening: 'Evening' }[phase]))
    assert.ok(out.includes('icon'))
  }
  assert.ok(render(html`<${TurnNotice} view=${{ ...view, self: null }} />`).includes('Lượt của'))
})

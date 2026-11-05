import assert from 'node:assert/strict'
import { test } from 'node:test'
import { html } from 'htm/preact'
import { render } from 'preact-render-to-string'
import { sampleView } from '../src/dev/sample.ts'
import { NO_CHANGES } from '../src/net/changes.ts'
import { HudFactions, HudPlayed, HudActions, HudChat, HudSun } from '../src/ui/screens/hud.ts'

test('opponents follow engine seat order and own faction appears separately', () => {
  const view = sampleView('marquise')
  const seats = [...view.seats].reverse().map(s => ({ ...s, name: `player-${s.faction}`, connected: true }))
  const props = { view, seats, seat: 'marquise', changes: NO_CHANGES, open: null, onOpen: () => {} }
  const out = render(html`<${HudFactions} ...${props} />`)
  assert.ok(!out.includes('player-marquise'))
  const opponents = view.seats.filter(s => s.faction !== 'marquise')
  for (let i = 1; i < opponents.length; i++) assert.ok(out.indexOf(`data-faction="${opponents[i-1]!.faction}"`) < out.indexOf(`data-faction="${opponents[i]!.faction}"`))
  const own = render(html`<${HudFactions} ...${props} own />`)
  assert.ok(own.includes('data-faction="marquise"'))
  assert.ok(!own.includes('data-faction="eyrie"'))
})

test('played cards already in the log on mount are not replayed', () => {
  assert.equal(render(html`<${HudPlayed} log=${[{ type: 'alliance-mobilize', revision: 1, faction: 'alliance' }]} />`), '')
  assert.equal(render(html`<${HudPlayed} log=${[
    { type: 'craft', revision: 1, faction: 'marquise', detail: { card: 'tax-collector#1' } },
  ]} />`), '')
})

test('faction badges carry their faction so a played card can fly out of them', () => {
  const view = sampleView('marquise')
  const seats = view.seats.map(s => ({ ...s, name: s.faction, connected: true }))
  const out = render(html`<${HudFactions} view=${view} seats=${seats} seat=${'marquise'} changes=${NO_CHANGES} open=${null} onOpen=${() => {}} />`)
  for (const s of view.seats.filter(s => s.faction !== 'marquise')) assert.ok(out.includes(`data-faction="${s.faction}"`))
})

test('undo and continue require server permission and a legal step', () => {
  const out = render(html`<${HudActions} legal=${[]} canUndo=${false} undo=${() => {}} send=${() => {}} onOpen=${() => {}} />`)
  assert.equal((out.match(/disabled/g) ?? []).length, 3)
  const active = render(html`<${HudActions} legal=${[{ type: 'end-step', payload: {} }]} canUndo undo=${() => {}} send=${() => {}} onOpen=${() => {}} />`)
  assert.ok(!active.includes('disabled'))
})

test('action panel counts legal choices as choices, not as actions, and shows the Marquise sun only when given', () => {
  const legal = [{ type: 'end-step', payload: {} }, { type: 'marquise-recruit', payload: { clearings: [1] } }]
  const plain = render(html`<${HudActions} legal=${legal} canUndo=${false} undo=${() => {}} send=${() => {}} onOpen=${() => {}} />`)
  assert.ok(plain.includes('Lựa chọn · 2'))
  assert.ok(plain.includes('aria-label="Xem 2 lựa chọn hợp lệ"'))
  assert.ok(!plain.includes('Hành động · '))
  assert.ok(!plain.includes('action-sun'))
  const sun = render(html`<${HudActions} actionsLeft=${2} legal=${legal} canUndo=${false} undo=${() => {}} send=${() => {}} onOpen=${() => {}} />`)
  assert.ok(sun.includes('class="action-sun"'))
  assert.ok(sun.includes('aria-label="Marquise còn 2 hành động Daylight"'))
  assert.ok(sun.includes('<b>2</b>'))
  assert.ok(render(html`<${HudActions} actionsLeft=${0} legal=${[]} canUndo=${false} undo=${() => {}} send=${() => {}} onOpen=${() => {}} />`).includes('còn 0 hành động'))
  assert.equal(render(html`<${HudSun} left=${null} />`), '')
  assert.ok(render(html`<${HudSun} left=${4} />`).includes('<b>4</b>'))
})

test('chat escapes text and spectators cannot send', () => {
  const out = render(html`<${HudChat} entries=${[{ faction: 'marquise', text: '<script>alert(1)</script>', at: 1 }]} enabled=${false} send=${() => {}} />`)
  assert.ok(!out.includes('<script>'))
  assert.ok(out.includes('&lt;script'))
  assert.match(out, /input[^>]*disabled/)
})

test('your own Marquise badge is the painted panel: score in the laurel, each count by its painted icon', () => {
  const view = sampleView('marquise')
  const seats = view.seats.map(s => ({ ...s, name: `player-${s.faction}`, connected: true }))
  const own = render(html`<${HudFactions} view=${view} seats=${seats} seat=${'marquise'} changes=${NO_CHANGES} open=${null} onOpen=${() => {}} own />`)
  assert.ok(own.includes('art-panel') && own.includes('marquise-panel.webp'))
  assert.ok(own.includes(`class="panel-score">${view.score.marquise}</b>`))
  const m = view.factions.marquise!
  for (const [row, value] of [[0, m.warriorSupply], [1, m.woodSupply], [2, view.handCounts.marquise ?? 0]] as const)
    assert.ok(own.includes(`--row:${row}`) && own.includes(`>${value}</b>`), `row ${row}`)
  assert.ok(!own.includes('player-marquise'), 'no name on your own painted panel')
  // Opponents keep the plain badge, and other factions' own badge too until they get a painting.
  const opp = render(html`<${HudFactions} view=${view} seats=${seats} seat=${'marquise'} changes=${NO_CHANGES} open=${null} onOpen=${() => {}} />`)
  assert.ok(!opp.includes('art-panel'))
  const eyrie = sampleView('eyrie')
  assert.ok(!render(html`<${HudFactions} view=${eyrie} seats=${eyrie.seats.map(s => ({ ...s, name: s.faction, connected: true }))} seat=${'eyrie'} changes=${NO_CHANGES} open=${null} onOpen=${() => {}} own />`).includes('art-panel'))
})

test('Alliance opponent portrait carries the live score without name or hand count text', () => {
  const view = sampleView('marquise')
  view.score.alliance = 23
  const seats = view.seats.map(s => ({ ...s, name: s.faction, connected: true }))
  const props = { view, seats, seat: 'marquise', changes: NO_CHANGES, open: 'alliance', onOpen: () => {} }
  const out = render(html`<${HudFactions} ...${props} />`)
  assert.ok(out.includes('alliance-opponent.png'))
  const alliance = out.match(/<button[^>]*data-faction="alliance"[\s\S]*?<\/button>/)![0]
  assert.ok(!alliance.includes('hud-player-name'))
  assert.ok(!alliance.includes('<small>'))
  assert.ok(out.includes('class="opponent-score">23</b>'))
  assert.ok(out.includes(`Woodland Alliance: 23 điểm, ${view.handCounts.alliance} lá`))
  assert.ok(out.includes('aria-pressed="true"'))
  const own = render(html`<${HudFactions} ...${props} seat=${'alliance'} own />`)
  assert.ok(!own.includes('alliance-opponent.png'))
  const others = render(html`<${HudFactions} ...${props} seat=${'alliance'} />`)
  assert.ok(!others.includes('opponent-score'))
})

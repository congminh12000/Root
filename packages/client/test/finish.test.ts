import assert from 'node:assert/strict'
import { test } from 'node:test'
import { html } from 'htm/preact'
import { render } from 'preact-render-to-string'
import { sampleView } from '../src/dev/sample.ts'
import { GameLog, GameResult, QuickGuide, logClearings } from '../src/ui/screens/finish.ts'

const entry = { revision: 1, faction: 'marquise' as const, type: 'move', detail: { from: 0, to: 4, warriors: 2 } }
test('public log locations include both ends, deduplicate and reject forests and invalid ids', () => {
  assert.deepEqual(logClearings(entry), [0, 4])
  assert.deepEqual(logClearings({ ...entry, detail: { clearing: 0, wood: [0, 2, -1, 12, '3'] } }), [0, 2])
  assert.deepEqual(logClearings({ ...entry, detail: { to: { kind: 'forest', id: 2 } } }), [])
  assert.deepEqual(logClearings({ ...entry, detail: { to: { kind: 'clearing', id: 2 } } }), [2])
  assert.deepEqual(logClearings({ ...entry, detail: undefined }), [])
})
test('results show engine winners for every reason, absent during play', () => {
  const v = sampleView()
  assert.equal(render(html`<${GameResult} view=${{ ...v, winner: null }} />`), '')
  for (const reason of ['points', 'dominance', 'coalition'] as const) {
    const out = render(html`<${GameResult} view=${{ ...v, winner: { factions: ['eyrie', 'vagabond'], reason } }} />`)
    assert.match(out, /Điểm cuối ván/)
    assert.match(out, /Eyrie Dynasties/)
    assert.match(out, /Vagabond/)
    assert.ok(!out.includes('undefined'))
  }
})
test('log has empty and selected states and keeps hidden payloads absent', () => {
  assert.match(render(html`<${GameLog} log=${[]} selected=${null} onSelect=${() => {}} />`), /Chưa có hành động/)
  const out = render(html`<${GameLog} log=${[entry, { ...entry, revision: 2, detail: undefined }]} selected=${1} onSelect=${() => {}} />`)
  assert.match(out, /aria-pressed="true"/)
  assert.match(out, /disabled/)
  assert.match(out, /ô 1 sang ô 5/)
  assert.match(render(html`<${QuickGuide} />`), /Hướng dẫn nhanh/)
})

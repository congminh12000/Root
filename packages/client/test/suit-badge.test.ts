import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BASE_DECK } from '@root/game-data'
import { html } from 'htm/preact'
import { render } from 'preact-render-to-string'
import { CardFace } from '../src/ui/card-face.ts'
import { SuitBadge, suitBadgeSvg } from '../src/ui/suit-badge.ts'
import { suitColor } from '../src/ui/tokens.ts'

// Suit badges (style-guide §3): one per suit, in its colour, drawn on cards, pips and clearing labels.

const SUITS = ['fox', 'rabbit', 'mouse', 'bird'] as const

test('every suit badge is a complete SVG in its own colour, with no stray values', () => {
  for (const s of SUITS) {
    const svg = suitBadgeSvg(s, 64)
    assert.match(svg, /^<svg[^>]*width="64"/)
    assert.ok(svg.includes(`fill="${suitColor[s]}"`), s)
    assert.ok(!/undefined|NaN/.test(svg), s)
    assert.equal(svg.split('<svg').length, 2)
  }
})

test('each badge copy has its own gradient and clip ids, so a hidden copy never breaks a visible one', () => {
  const ids = (svg: string) => [...svg.matchAll(/id="([^"]+)"/g)].map(m => m[1])
  const a = ids(suitBadgeSvg('fox')), b = ids(suitBadgeSvg('fox'))
  assert.equal(a.length, 2)
  assert.deepEqual(a.filter(id => b.includes(id)), [])
})

test('the component is labelled when it carries meaning and hidden when it is decoration', () => {
  assert.match(render(html`<${SuitBadge} suit="mouse" label="Chuột" />`), /role="img" aria-label="Chuột"/)
  assert.match(render(html`<${SuitBadge} suit="mouse" />`), /aria-hidden="true"/)
})

test('a card shows its suit badge in the head and one badge per suit in its cost', () => {
  const d = BASE_DECK.find(c => c.cost.length > 0 && !c.cost.includes('any'))!
  const out = render(html`<${CardFace} card=${`${d.id}#1`} size="full" />`)
  assert.equal(out.split('class="suit-badge"').length - 1, 1 + d.cost.length)
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BASE_DECK, BASE_QUESTS } from '@root/game-data'
import { html } from 'htm/preact'
import { render } from 'preact-render-to-string'
import { cardArt, MOTIF, questArt } from '../src/ui/card-art.ts'
import { cardText, questText } from '../src/ui/card-text.ts'
import { CardFace, QuestFace } from '../src/ui/card-face.ts'

// Card faces (docs/07-ui/style-guide.md §6): every card and quest has a face at both sizes, Vietnamese text and a
// seeded scene; nothing on a face is a rule of its own.

test('every card design and quest renders at both sizes, with nothing undefined', () => {
  for (const d of BASE_DECK) for (const size of ['mini', 'full'] as const) {
    const out = render(html`<${CardFace} card=${`${d.id}#1`} size=${size} />`)
    assert.match(out, new RegExp(d.name.replace(/[!?]/g, '.')), d.id)
    assert.ok(!/undefined|NaN|\[object/.test(out), `${d.id} ${size}`)
  }
  for (const q of BASE_QUESTS) for (const size of ['mini', 'full'] as const) {
    const out = render(html`<${QuestFace} quest=${q.id} size=${size} />`)
    assert.ok(out.includes(q.name) && !/undefined|NaN/.test(out), `${q.id} ${size}`)
  }
})

test('every design and quest has Vietnamese effect text citing a clause', () => {
  for (const d of BASE_DECK) {
    const t = cardText(d)
    assert.ok(t.length > 20 && /§\d/.test(t) && !t.includes('undefined'), d.id)
    if (d.kind === 'persistent' || d.kind === 'immediate') assert.ok(MOTIF[d.id], `${d.id} has a motif`)
  }
  for (const q of BASE_QUESTS) assert.match(questText(q), /§9\.5\.5/)
})

test('card scenes are seeded: the same card draws the same, its second copy differs, colours are tokens only', () => {
  for (const d of BASE_DECK) {
    assert.equal(cardArt(d, 1), cardArt(d, 1))
    if (d.copies > 1) assert.notEqual(cardArt(d, 1), cardArt(d, 2), d.id)
    assert.ok(!/#[0-9a-f]{3,6}\b/i.test(cardArt(d, 1).replace(/href="#i-[a-z-]+"/g, '')), d.id)
  }
  assert.notEqual(questArt(BASE_QUESTS[0]!), questArt(BASE_QUESTS[1]!))
})

test('ambush cards follow the printed layout: name in the band, where to play in italics, no cost or plaque (§4.3.1)', () => {
  const where = { bird: 'ô bất kỳ', fox: 'ô cáo', rabbit: 'ô thỏ', mouse: 'ô chuột' }
  for (const d of BASE_DECK.filter(c => c.kind === 'ambush')) {
    const full = render(html`<${CardFace} card=${`${d.id}#1`} size="full" />`)
    assert.match(full, /class="cf-head">.*<b class="cf-title">Ambush!<\/b>/s, d.id)
    assert.ok(full.includes(`<i>Có thể ambush ở ${where[d.suit]}.</i>`), d.id)
    assert.match(full, /<p>Đầu trận đánh.*khớp ô đó \(§4\.3\.1\)\.<\/p>/, d.id)
    assert.ok(!full.includes('cf-plaque') && !full.includes('cf-cost'), d.id)
    const mini = render(html`<${CardFace} card=${`${d.id}#1`} size="mini" />`)
    assert.ok(mini.includes('<i>') && !mini.includes('<p>'), `${d.id} mini keeps only the italic line`)
  }
  // The scene: an ambusher of the card's suit with a sword, a different scene for each suit.
  const scenes = BASE_DECK.filter(c => c.kind === 'ambush').map(d => cardArt(d, 1))
  for (const svg of scenes) assert.ok(svg.includes('#i-sword'))
  assert.equal(new Set(scenes).size, scenes.length)
  const other = render(html`<${CardFace} card="armorers#1" size="full" />`)
  assert.ok(other.includes('cf-plaque') && !other.includes('cf-title'), 'other cards keep their layout')
})

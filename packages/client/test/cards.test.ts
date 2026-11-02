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

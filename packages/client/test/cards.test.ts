import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BASE_DECK, BASE_QUESTS } from '@root/game-data'
import { html } from 'htm/preact'
import { render } from 'preact-render-to-string'
import { cardArt, questArt } from '../src/ui/card-art.ts'
import { WOODLAND_PANELS } from '../src/ui/woodland-art.ts'
import { cardText, questText } from '../src/ui/card-text.ts'
import { CardFace, QuestFace } from '../src/ui/card-face.ts'

// Card faces (docs/07-ui/style-guide.md §6): every card and quest has a face at both sizes, Vietnamese text and a
// seeded scene; nothing on a face is a rule of its own.

test('every card design and quest renders at both sizes, with nothing undefined', () => {
  for (const d of BASE_DECK) for (const size of ['mini', 'full'] as const) {
    const out = render(html`<${CardFace} card=${`${d.id}#1`} size=${size} />`)
    assert.match(out, new RegExp(d.name.replace(/[!?]/g, '.')), d.id)
    assert.ok(!out.includes('§'), d.id)
    assert.equal(out.includes('cf-paper-edge'), ['ambush', 'immediate', 'item'].includes(d.kind), d.id)
    assert.ok(!/undefined|NaN|\[object/.test(out), `${d.id} ${size}`)
  }
  for (const q of BASE_QUESTS) for (const size of ['mini', 'full'] as const) {
    const out = render(html`<${QuestFace} quest=${q.id} size=${size} />`)
    assert.ok(!out.includes('§'), q.id)
    assert.ok(out.includes(q.name) && !/undefined|NaN/.test(out), `${q.id} ${size}`)
  }
})

test('every design and quest has Vietnamese effect text citing a clause', () => {
  for (const d of BASE_DECK) {
    const t = cardText(d)
    assert.ok(t.length > 20 && /§\d/.test(t) && !t.includes('undefined'), d.id)
    if (d.kind === 'persistent' || d.kind === 'immediate') assert.ok(WOODLAND_PANELS[d.suit].includes(d.id), `${d.id} has a character illustration`)
  }
  for (const q of BASE_QUESTS) assert.match(questText(q), /§9\.5\.5/)
})

test('card scenes are deterministic, physical copies share artwork, procedural colours use tokens', () => {
  for (const d of BASE_DECK) {
    assert.equal(cardArt(d, 1), cardArt(d, 1))
    if (d.copies > 1) assert.equal(cardArt(d, 1), cardArt(d, 2), `${d.id}: physical copies share their illustration`)
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
    assert.match(full, /<p>Đầu trận đánh.*khớp ô\.<\/p>/, d.id)
    assert.ok(!full.includes('cf-plaque') && !full.includes('cf-cost'), d.id)
    const mini = render(html`<${CardFace} card=${`${d.id}#1`} size="mini" />`)
    assert.ok(mini.includes('<p>') && mini.includes('ambush full'), `${d.id} always shows the full effect`)
  }
  // Each suit selects a different panel of the approved generated painting.
  const scenes = BASE_DECK.filter(c => c.kind === 'ambush').map(d => cardArt(d, 1))
  for (const svg of scenes) assert.ok(svg.includes('ambush-woodland.webp') && svg.includes('<image '))
  const bird = BASE_DECK.find(d => d.id === 'ambush-bird')!
  assert.equal(cardArt(bird, 1), cardArt(bird, 2), 'both bird copies keep the approved painting')
  for (const d of BASE_DECK.filter(c => c.kind === 'dominance')) assert.ok(!cardArt(d).includes('<image '), d.id)
  assert.equal(new Set(scenes).size, scenes.length)
  const other = render(html`<${CardFace} card="armorers#1" size="full" />`)
  assert.ok(other.includes('standard') && other.includes('cf-title'), 'ordinary cards use the requested named header')
})

test('all 54 physical deck cards show the full effect even in the hand', () => {
  let count = 0
  for (const d of BASE_DECK) for (let copy = 1; copy <= d.copies; copy++) {
    const card = `${d.id}#${copy}`
    const face = render(html`<${CardFace} card=${card} size="mini" />`)
    assert.ok(face.includes('full'), card)
    assert.ok(face.includes('<p>') && !face.includes('<small>'), card)
    count++
  }
  assert.equal(count, 54)
})


test('ordinary cards put name in header, crafting suits on plaque and only effects in text', () => {
  for (const d of BASE_DECK.filter(d => ['item', 'immediate', 'persistent'].includes(d.kind))) {
    const out = render(html`<${CardFace} card=${`${d.id}#1`} size="full" />`)
    const header = out.match(/<div class="cf-head">(.*?)<div class="cf-art"/s)![1]!
    const plaque = out.match(/<div class="cf-plaque">(.*?)<div class="cf-text/s)![1]!
    const effect = out.slice(out.indexOf('<div class="cf-text'))
    assert.ok(header.includes(`<b class="cf-title">${d.name}</b>`), d.id)
    assert.ok(!header.includes('cf-cost'), d.id)
    assert.equal((plaque.match(/class="cf-pip /g) ?? []).length, d.cost.length, d.id)
    assert.ok(plaque.includes('Điều kiện chế tạo'), d.id)
    assert.ok(!effect.includes('cf-name') && !effect.includes(d.name), d.id)
    assert.ok(effect.includes('<p>'), d.id)
  }
})

test('dominance and quests keep header conditions and name in the lower panel', () => {
  for (const d of BASE_DECK.filter(d => d.kind === 'dominance')) {
    const out = render(html`<${CardFace} card=${`${d.id}#1`} size="full" />`)
    assert.ok(!out.includes(' standard'), d.id)
    assert.match(out, /cf-head.*cf-cost.*cf-art/s, d.id)
    assert.match(out, /cf-text.*cf-name/s, d.id)
  }
  const out = render(html`<${QuestFace} quest=${BASE_QUESTS[0]!.id} size="full" />`)
  assert.ok(!out.includes(' standard'))
  assert.match(out, /cf-head.*cf-cost.*cf-art/s)
  assert.match(out, /cf-text.*cf-name/s)
})


test('ordinary crafting/effect slips use intrinsic content size and pack larger costs in two columns', () => {
  for (const d of BASE_DECK.filter(d => ['item', 'persistent', 'immediate'].includes(d.kind))) {
    const out = render(html`<${CardFace} card=${`${d.id}#1`} size="full" />`)
    assert.ok(out.includes(`data-cost-count="${d.cost.length}"`), d.id)
    assert.ok(out.includes(`--cost-columns:${d.cost.length > 2 ? 2 : 1}`), d.id)
    assert.match(out, /cf-bottom.*cf-plaque.*cf-text/s, d.id)
  }
  const special = render(html`<${CardFace} card="dominance-fox#1" size="full" />`)
  assert.ok(!special.includes('cf-bottom'))
})

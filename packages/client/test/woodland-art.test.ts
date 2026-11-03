import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { BASE_DECK } from '@root/game-data'
import { WOODLAND_PANELS, woodlandArt } from '../src/ui/woodland-art.ts'
import { cardArt, questArt } from '../src/ui/card-art.ts'
import { BASE_QUESTS } from '@root/game-data'

const ordinary = BASE_DECK.filter(d => ['item', 'persistent', 'immediate'].includes(d.kind))

test('all 45 craftable cards map to exactly 34 distinct character paintings', () => {
  assert.equal(ordinary.length, 34)
  assert.equal(ordinary.reduce((n, d) => n + d.copies, 0), 45)
  const ids = Object.values(WOODLAND_PANELS).flat()
  assert.equal(new Set(ids).size, 34)
  assert.deepEqual([...ids].sort(), ordinary.map(d => d.id).sort())
  for (const d of ordinary) {
    const art = cardArt(d)
    assert.ok(art.includes(`data-design="${d.id}"`), d.id)
    assert.ok(art.includes(`woodland-${d.suit}.webp`), d.id)
    assert.ok(art.includes('clip-path=') && art.includes('preserveAspectRatio="none"'), d.id)
    for (let copy = 1; copy <= d.copies; copy++) assert.equal(cardArt(d, copy), art)
  }
})

test('sheets have exact grid dimensions and every design crops a separate panel', () => {
  for (const [suit, ids] of Object.entries(WOODLAND_PANELS)) {
    const bytes = readFileSync(new URL(`../src/assets/cards/woodland-${suit}.webp`, import.meta.url))
    assert.equal(bytes.subarray(8, 16).toString(), 'WEBPVP8X')
    assert.equal(bytes.readUIntLE(24, 3) + 1, 1254)
    assert.equal(bytes.readUIntLE(27, 3) + 1, 1254)
    const boxes = ids.map(id => {
      const d = ordinary.find(d => d.id === id)!
      const box = woodlandArt(id, d.suit).match(/viewBox="([^"]+)"/)![1]!
      const [x, y, w, h] = box.split(' ').map(Number) as [number, number, number, number]
      assert.ok(x >= 0 && y >= 0 && x + w <= 1254 && y + h <= 1254)
      return box
    })
    assert.equal(new Set(boxes).size, ids.length)
  }
})

test('special cards keep their existing art, invalid ordinary mapping fails visibly', () => {
  for (const d of BASE_DECK.filter(d => ['ambush', 'dominance'].includes(d.kind))) {
    assert.ok(!cardArt(d).includes('cf-woodland-art'))
    assert.equal(cardArt(d).includes('ambush-woodland.webp'), d.kind === 'ambush')
  }
  for (const q of BASE_QUESTS) assert.ok(!questArt(q).includes('cf-woodland-art'))
  assert.throws(() => woodlandArt('ambush-fox', 'fox'), /Missing woodland illustration/)
})

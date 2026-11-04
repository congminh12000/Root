// Cuts the owner's screenshots of the printed cards into one image per card face, for personal / LAN use only
// (docs/00-governance/licensing.md). Sources sit in the gitignored docs/01-official-sources/card-art/1.webp … 9.webp;
// output goes to the gitignored packages/client/src/assets/official-cards/<id>.webp, which the client shows when present.
// Each card is found as a bright rectangle on the dark screenshot background and is cropped as-is, nothing redrawn.
// Fails unless every deck design, quest, Eyrie leader and Vagabond character has exactly one face.
// Usage: npm run cards:crop
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'
import { BASE_DECK, BASE_QUESTS, EYRIE, VAGABOND } from '../../packages/game-data/src/index.ts'

const src = resolve(import.meta.dirname, '../../docs/01-official-sources/card-art')
const out = resolve(import.meta.dirname, '../../packages/client/src/assets/official-cards')

/** Cards in each screenshot, left to right then top to bottom. */
const SHEETS: string[][] = [
  ['royal-claim', 'sappers', 'scouting-party', 'smugglers-trail'],
  ['protection-racket', 'root-tea-rabbit', 'root-tea-fox', 'root-tea-mouse'],
  ['dominance-mouse', 'favor-of-the-foxes', 'favor-of-the-mice', 'favor-of-the-rabbits', 'foxfolk-steel', 'gently-used-knapsack', 'investments', 'mouse-in-a-sack'],
  ['cobbler', 'codebreakers', 'command-warren', 'crossbow-bird', 'crossbow-mouse', 'dominance-bird', 'dominance-rabbit', 'dominance-fox'],
  ['anvil', 'armorers', 'arms-trader', 'a-visit-to-friends', 'bake-sale', 'better-burrow-bank', 'birdy-bindle', 'brutal-tactics'],
  ['quest-guard-duty-mouse', 'quest-logistics-help-fox', 'quest-logistics-help-mouse', 'quest-repair-a-shed', 'ambush-bird', 'ambush-rabbit', 'ambush-fox', 'ambush-mouse'],
  ['quest-expel-bandits-rabbit', 'quest-expel-bandits-mouse', 'quest-fend-off-a-bear-rabbit', 'quest-fend-off-a-bear-mouse', 'quest-fundraising', 'quest-give-a-speech-rabbit', 'quest-give-a-speech-fox', 'quest-guard-duty-rabbit'],
  ['leader-commander', 'character-ranger', 'character-thief', 'character-tinker', 'leader-despot', 'quest-errand-rabbit', 'quest-errand-fox', 'quest-escort'],
  ['leader-builder', 'leader-charismatic', 'stand-and-deliver', 'sword', 'tax-collector', 'travel-gear-fox', 'travel-gear-mouse', 'woodland-runners'],
]

const expected = [
  ...BASE_DECK.map(d => d.id), ...BASE_QUESTS.map(q => `quest-${q.id}`),
  ...Object.keys(EYRIE.leaders).map(l => `leader-${l}`), ...Object.keys(VAGABOND.characters).map(c => `character-${c}`),
].sort()
const listed = SHEETS.flat().sort()
if (JSON.stringify(listed) !== JSON.stringify(expected)) {
  console.error('SHEETS khác game-data.\nthiếu:', expected.filter(i => !listed.includes(i)), '\nthừa:', listed.filter(i => !expected.includes(i)))
  process.exit(1)
}

const browser = await chromium.launch()
const page = await browser.newPage()
mkdirSync(out, { recursive: true })
let written = 0
for (const [n, ids] of SHEETS.entries()) {
  const file = resolve(src, `${n + 1}.webp`)
  if (!existsSync(file)) { console.error(`thiếu ${file}`); process.exit(1) }
  const data = `data:image/webp;base64,${readFileSync(file).toString('base64')}`
  // In the page: mark pixels clearly brighter than the background, split rows then columns on empty runs.
  const crops = await page.evaluate(async (url: string) => {
    const img = new Image(); img.src = url; await img.decode()
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const g = c.getContext('2d')!; g.drawImage(img, 0, 0)
    const px = g.getImageData(0, 0, c.width, c.height).data
    const bg = [px[0]!, px[1]!, px[2]!]
    const on = (x: number, y: number) => { const i = (y * c.width + x) * 4; return Math.abs(px[i]! - bg[0]!) + Math.abs(px[i + 1]! - bg[1]!) + Math.abs(px[i + 2]! - bg[2]!) > 36 }
    /** Runs of indices whose count of lit pixels is at least `min`, ignoring runs shorter than 60 px. */
    const runs = (len: number, count: (i: number) => number, min: number) => {
      const r: [number, number][] = []; let s = -1
      for (let i = 0; i <= len; i++) {
        const lit = i < len && count(i) >= min
        if (lit && s < 0) s = i
        if (!lit && s >= 0) { if (i - s >= 60) r.push([s, i]); s = -1 }
      }
      return r
    }
    const boxes: { x: number; y: number; w: number; h: number }[] = []
    let start = 0
    for (const [y0, y1] of runs(c.height, y => { let k = 0; for (let x = 0; x < c.width; x++) if (on(x, y)) k++; return k }, 40)) {
      for (const [x0, x1] of runs(c.width, x => { let k = 0; for (let y = y0; y < y1; y++) if (on(x, y)) k++; return k }, 40)) {
        // Tighten the row band to this card alone.
        const ys = runs(y1 - y0, i => { let k = 0; for (let x = x0; x < x1; x++) if (on(x, y0 + i)) k++; return k }, 20)
        boxes.push({ x: x0, y: y0 + ys[0]![0], w: x1 - x0, h: ys.at(-1)![1] - ys[0]![0] })
      }
      // Vagabond character faces are dark like the background below their tab: give a short box the height of the
      // tallest card in its row, which shares the same top and bottom in the screenshot.
      const row = boxes.slice(start), tall = row.reduce((a, b) => (b.h > a.h ? b : a))
      for (const b of row) if (b.h < tall.h * 0.9) { b.y = tall.y; b.h = tall.h }
      start = boxes.length
    }
    return boxes.map(b => {
      const o = document.createElement('canvas'); o.width = b.w; o.height = b.h
      o.getContext('2d')!.drawImage(c, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h)
      return { ...b, url: o.toDataURL('image/webp', 0.95) }
    })
  }, data)
  if (crops.length !== ids.length) { console.error(`${n + 1}.webp: tìm thấy ${crops.length} lá, cần ${ids.length}`); process.exit(1) }
  for (const [i, id] of ids.entries()) {
    const k = crops[i]!
    const ratio = k.w / k.h
    if (ratio < 0.66 || ratio > 0.78) { console.error(`${id}: tỉ lệ ${ratio.toFixed(3)} (${k.w}×${k.h}) không giống lá bài`); process.exit(1) }
    writeFileSync(resolve(out, `${id}.webp`), Buffer.from(k.url.split(',')[1]!, 'base64'))
    console.log(`${id}: ${k.w}×${k.h}`)
    written++
  }
}
await browser.close()
console.log(`đã cắt ${written} mặt bài (${BASE_DECK.length} mẫu bài, ${BASE_QUESTS.length} quest, ${Object.keys(EYRIE.leaders).length} leader, ${Object.keys(VAGABOND.characters).length} nhân vật) vào ${out}`)

import type { CardDef, CardSuit as Suit, ItemType, QuestDef } from '@root/game-data'
import type { IconName } from './icons.ts'

/**
 * The picture in the middle of a card face (docs/07-ui/style-guide.md §6): a small woodland scene drawn in code, in
 * the board's style (flat colour, ink outline, our own shapes; no official art, licensing.md). The background
 * belongs to the card's suit, the subject to its kind: the item on a stand, an animal leaping out of a bush for an ambush, a banner
 * for dominance, a motif for each persistent and immediate card. Seeded by the card's id, so every browser draws the
 * same card; the second copy of a design is mirrored with its trees moved, so two copies differ.
 *
 * Returns SVG markup (viewBox 120 × 90). Colours come from token variables only; icons are `<use>` of the sprite.
 */

type Subject = { kind: 'item'; item: ItemType } | { kind: 'ambush' } | { kind: 'dominance' } | { kind: 'motif'; icon: IconName; glow: boolean }
  | { kind: 'quest'; items: [ItemType, ItemType] }

/** The motif of each persistent and immediate design. */
export const MOTIF: Record<string, IconName> = {
  armorers: 'shield', 'brutal-tactics': 'mace', 'royal-claim': 'throne', sappers: 'pick', 'stand-and-deliver': 'mask',
  'tax-collector': 'scales', 'better-burrow-bank': 'chest', cobbler: 'boots', 'command-warren': 'horn', codebreakers: 'spyglass',
  'scouting-party': 'map', 'favor-of-the-foxes': 'flame', 'favor-of-the-rabbits': 'flame', 'favor-of-the-mice': 'flame',
}

const st = (fill: string, extra = '') => `style="fill:var(--${fill});stroke:var(--ink);stroke-width:1.2;stroke-linejoin:round${extra}"`
const flat = (fill: string, opacity = 1) => `style="fill:var(--${fill});fill-opacity:${opacity}"`
const line = (c = 'ink', w = 1.2) => `style="fill:none;stroke:var(--${c});stroke-width:${w};stroke-linecap:round;stroke-linejoin:round"`
const use = (icon: IconName, x: number, y: number, size: number, fill = 'paper-raised') =>
  `<use href="#i-${icon}" x="${x}" y="${y}" width="${size}" height="${size}" style="--icon-fill:var(--${fill})"/>`

function rng(seed: string) {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296 }
}

const pine = (x: number, y: number, s: number) =>
  `<path ${st('pine')} d="M${x} ${y - 16 * s} L${x + 6 * s} ${y - 6 * s} H${x + 3.5 * s} L${x + 7.5 * s} ${y} H${x - 7.5 * s} L${x - 3.5 * s} ${y - 6 * s} H${x - 6 * s} Z"/>`
const round = (x: number, y: number, s: number, c = 'pine-light') =>
  `<path ${line('wood', 1.6 * s)} d="M${x} ${y} V${y - 6 * s}"/><circle ${st(c)} cx="${x}" cy="${y - 10 * s}" r="${6 * s}"/>`

/** Sky, far hills, a row of trees and the suit's own setting: fox farmland, rabbit burrows, mouse fields, bird canopy. */
function background(suit: Suit, rand: () => number): string {
  const out: string[] = []
  const sunX = 18 + rand() * 30
  out.push(`<rect x="0" y="0" width="120" height="90" ${flat(suit === 'bird' ? 'water-shallow' : 'paper', suit === 'bird' ? .55 : 1)}/>`)
  out.push(`<circle cx="${sunX}" cy="18" r="11" ${flat(`suit-${suit}`, .45)}/>`)
  out.push(`<path ${st('meadow-light')} d="M-2 60 C18 44 34 48 52 54 C70 42 92 44 122 52 V92 H-2 Z"/>`)
  // A row of trees on the far hills, kept off the middle where the subject stands.
  for (let i = 0; i < 7; i++) {
    const x = 4 + i * 18 + rand() * 8
    if (x > 42 && x < 78) continue
    const y = 58 - rand() * 4, s = .7 + rand() * .45
    out.push(rand() < .7 ? pine(x, y, s) : round(x, y, s, rand() < .5 ? 'pine-light' : 'autumn-gold'))
  }
  if (suit === 'fox') {
    out.push(`<path ${st('paper-shade')} d="M88 50 H104 V62 H88 Z"/><path ${st('roof-red')} d="M85 51 L96 42 L107 51 Z"/><path ${st('wood')} d="M94 55 H98 V62 H94 Z"/>`)
    out.push(`<path ${line('wood', 1.6)} d="M4 66 H38 M4 70 H38"/>`, ...[6, 14, 22, 30, 38].map(x => `<path ${line('wood', 1.8)} d="M${x} 63 V74"/>`))
  } else if (suit === 'rabbit') {
    out.push(`<path ${st('pine-light')} d="M78 66 C82 52 104 50 112 66 Z"/><ellipse ${flat('ink')} cx="95" cy="63" rx="5" ry="3.6"/>`)
    for (let i = 0; i < 4; i++) out.push(`<path ${st('autumn-orange')} d="M${10 + i * 7} 70 l2 -5 l2 5 Z"/><path ${line('pine-light', 1.2)} d="M${12 + i * 7} 65 l-1.5 -3 M${12 + i * 7} 65 l1.5 -3"/>`)
  } else if (suit === 'mouse') {
    out.push(`<path ${st('paper-shade')} d="M92 64 L95 40 H101 L104 64 Z"/>`)
    const blades = rand() * 40
    for (let i = 0; i < 4; i++) out.push(`<path ${st('wood')} transform="rotate(${blades + i * 90} 98 42)" d="M98 42 L99 26 L102 27 L100 42 Z"/>`)
    for (let i = 0; i < 9; i++) { const x = 4 + i * 4 + rand() * 2; out.push(`<path ${line('path-edge', 1.1)} d="M${x} 76 C${x} 70 ${x + 1} 67 ${x + 2} 64"/><ellipse ${flat('path')} cx="${x + 2}" cy="63" rx="1.4" ry="2.6"/>`) }
  } else {
    out.push(`<ellipse ${st('paper-raised')} cx="${90 - rand() * 20}" cy="16" rx="12" ry="5"/><ellipse ${st('paper-raised')} cx="${66 + rand() * 10}" cy="9" rx="8" ry="3.5"/>`)
    out.push(`<path ${st('wood')} d="M2 90 V4 H11 V36 C20 30 32 30 40 32 L39 36 C30 35 20 36 11 44 V90 Z"/>`)
    out.push(`<circle ${st('pine-light')} cx="10" cy="6" r="12"/><circle ${st('pine-light')} cx="38" cy="30" r="7"/><circle ${st('meadow')} cx="28" cy="4" r="9"/>`)
  }
  out.push(`<path ${st('meadow')} d="M-2 68 C30 63 90 63 122 68 V92 H-2 Z"/>`)
  return out.join('')
}

/** Head colour of each animal in the ambush scenes. */
const HEAD: Record<Suit, string> = { fox: 'autumn-orange', rabbit: 'autumn-gold', mouse: 'path', bird: 'water' }

/** An animal's head, our own drawing: fox ears, rabbit ears, mouse ears or a bird's crest and beak; wide startled eyes. */
function head(kind: Suit, x: number, y: number, r: number): string {
  const c = HEAD[kind]
  const shape = kind === 'fox'
    ? `<path ${st(c)} d="M${x - r} ${y - r * .2} L${x - r * .9} ${y - r * 1.4} L${x - r * .3} ${y - r * .7} H${x + r * .3} L${x + r * .9} ${y - r * 1.4} L${x + r} ${y - r * .2} L${x} ${y + r} Z"/>`
    : kind === 'rabbit'
      ? `<ellipse ${st(c)} cx="${x - r * .4}" cy="${y - r * 1.4}" rx="${r * .3}" ry="${r * .9}"/><ellipse ${st(c)} cx="${x + r * .4}" cy="${y - r * 1.4}" rx="${r * .3}" ry="${r * .9}"/><circle ${st(c)} cx="${x}" cy="${y}" r="${r}"/>`
      : kind === 'mouse'
        ? `<circle ${st(c)} cx="${x - r * .8}" cy="${y - r * .8}" r="${r * .55}"/><circle ${st(c)} cx="${x + r * .8}" cy="${y - r * .8}" r="${r * .55}"/><circle ${st(c)} cx="${x}" cy="${y}" r="${r}"/>`
        : `<path ${st(c)} d="M${x - r * .3} ${y - r * .9} L${x - r * .1} ${y - r * 1.6} L${x + r * .25} ${y - r * .95} L${x + r * .6} ${y - r * 1.5} L${x + r * .6} ${y - r * .7} Z"/><circle ${st(c)} cx="${x}" cy="${y}" r="${r}"/>`
  const beak = kind === 'bird' ? `<path ${st('autumn-gold')} d="M${x - r * .3} ${y + r * .15} H${x + r * .3} L${x} ${y + r * .85} Z"/>` : ''
  const eyes = [-1, 1].map(side => `<ellipse ${st('paper-raised')} cx="${x + side * r * .4}" cy="${y - r * .15}" rx="${r * .28}" ry="${r * .34}"/><circle ${flat('ink')} cx="${x + side * r * .36}" cy="${y - r * .1}" r="${r * .13}"/>`).join('')
  return shape + eyes + beak
}

/**
 * The ambush (§4.3.1): an animal of the card's suit leaps out of a bush, sword up and shield out, while two others
 * look up, startled. Our own figures; bird is the wild suit, so its onlookers are a rabbit and a mouse.
 */
function ambushScene(suit: Suit): string {
  const onlookers: Suit[] = suit === 'rabbit' ? ['fox', 'mouse'] : suit === 'mouse' ? ['fox', 'rabbit'] : ['rabbit', 'mouse']
  const leaves = [[22, 16, 30], [92, 12, -20], [104, 30, 50], [16, 38, -40], [84, 40, 10], [38, 8, 70]]
    .map(([x, y, a], i) => `<ellipse ${st(i % 2 ? 'autumn-orange' : 'autumn-gold', ';stroke-width:.8')} transform="rotate(${a} ${x} ${y})" cx="${x}" cy="${y}" rx="2.6" ry="1.3"/>`).join('')
  const feet = suit === 'bird'
    ? `<path ${line('autumn-gold', 1.6)} d="M55 50 L50 58 M50 58 l-3 1 M50 58 l-1 3 M50 58 l2 2.6 M66 50 L71 57 M71 57 l3 1 M71 57 l1 3 M71 57 l-2 2.6"/>`
    : `<path ${line('ink', 2.4)} d="M55 50 L50 58 M66 50 L71 57"/><ellipse ${flat('ink')} cx="49" cy="58.5" rx="2.4" ry="1.3"/><ellipse ${flat('ink')} cx="72" cy="57.5" rx="2.4" ry="1.3"/>`
  return `<path ${st('pine')} d="M30 82 C26 70 36 62 46 66 C50 56 70 56 74 64 C84 60 96 68 90 82 Z"/>`
    + `<path ${line('paper-raised', 1.2)} d="M40 60 l-5 -5 M80 58 l5 -5 M60 58 v-5"/>`
    + feet
    + `<path ${st('pine-light')} d="M52 30 C56 27 66 27 70 31 L71 50 C64 53 57 53 51 50 Z"/><path ${line('wood', 1.4)} d="M51.5 43 C58 45.5 64 45.5 70.5 43"/>`
    + `<path ${line('ink', 2)} d="M69 33 L77 22"/>${use('sword', 70, 4, 20)}`
    + `<circle ${st('wood-light')} cx="50" cy="40" r="7.5"/><circle ${line('wood', 1)} cx="50" cy="40" r="4.6"/><circle ${flat('paper-raised')} cx="50" cy="40" r="1.4"/>`
    + head(suit, 61, 22, 7.5)
    + onlookers.map((k, i) => head(k, i === 0 ? 25 : 95, 58, 5.4)).join('')
    + `<ellipse ${flat('ink')} cx="25" cy="62" rx="1.4" ry="1.6"/><ellipse ${flat('ink')} cx="95" cy="62" rx="1.4" ry="1.6"/>`
    + leaves
}

function subject(s: Subject, suit: Suit): string {
  const ground = `<ellipse ${flat('path')} cx="60" cy="74" rx="24" ry="6"/><ellipse ${line('path-edge', 1)} cx="60" cy="74" rx="24" ry="6"/>`
  switch (s.kind) {
    case 'item':
      return `${ground}<path ${st('rock')} d="M46 74 L49 64 H71 L74 74 Z"/>${use(s.item, 43, 30, 34)}`
    case 'motif':
      return `${ground}${s.glow ? `<circle cx="60" cy="46" r="21" ${flat('autumn-gold', .45)}/>` : ''}<path ${st('wood-light')} d="M47 74 L50 66 H70 L73 74 Z"/>${use(s.icon, 43, 30, 34)}`
    case 'ambush': return ambushScene(suit)
    case 'dominance':
      return `<path ${st('meadow-light')} d="M30 80 C40 62 80 62 90 80 Z"/><path ${line('wood', 2.4)} d="M58 70 V18"/>`
        + `<path ${st(`suit-${suit}`)} d="M59 20 H90 L84 31 L90 42 H59 Z"/>${use('crown', 64, 22, 18, 'autumn-gold')}`
    case 'quest':
      return `<path ${line('wood', 3)} d="M42 80 V40 M78 80 V40"/><path ${st('paper-shade')} d="M36 30 H84 V62 H36 Z"/>`
        + `<circle ${flat('roof-red')} cx="40" cy="34" r="1.6"/><circle ${flat('roof-red')} cx="80" cy="34" r="1.6"/>`
        + `${use(s.items[0], 40, 34, 22)}${use(s.items[1], 58, 34, 22)}`
  }
}

const cache = new Map<string, string>()

function draw(key: string, suit: Suit, copy: number, s: Subject): string {
  let svg = cache.get(key)
  if (svg) return svg
  const rand = rng(key)
  const back = background(suit, rand)
  // Even copies mirror the setting; the subject stays the right way round.
  const mirrored = copy % 2 === 0 ? `<g transform="translate(120 0) scale(-1 1)">${back}</g>` : back
  // Painted light (style-guide §6): a warm glow from the top, shade towards the bottom, a soft shadow under the subject.
  const light = `<defs><linearGradient id="cf-light" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--paper-raised);stop-opacity:.45"/>`
    + `<stop offset=".45" style="stop-color:var(--paper-raised);stop-opacity:0"/><stop offset="1" style="stop-color:var(--ink);stop-opacity:.22"/></linearGradient></defs>`
  const shadow = `<ellipse cx="62" cy="76" rx="20" ry="4.5" style="fill:var(--ink);fill-opacity:.22"/>`
  svg = `<svg class="cf-scene" viewBox="0 0 120 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${light}${mirrored}${shadow}${subject(s, suit)}`
    + `<rect width="120" height="90" style="fill:url(#cf-light)"/></svg>`
  cache.set(key, svg)
  return svg
}

/** The scene of one physical card, e.g. "armorers#2" (the copy number picks the variant). */
export function cardArt(d: CardDef, copy = 1): string {
  const s: Subject = d.kind === 'item' ? { kind: 'item', item: d.item! }
    : d.kind === 'ambush' ? { kind: 'ambush' }
      : d.kind === 'dominance' ? { kind: 'dominance' }
        : { kind: 'motif', icon: MOTIF[d.id] ?? 'card', glow: d.kind === 'immediate' }
  return draw(`${d.id}#${copy}`, d.suit, copy, s)
}

export const questArt = (q: QuestDef) => draw(`quest:${q.id}`, q.suit, 1, { kind: 'quest', items: q.items })

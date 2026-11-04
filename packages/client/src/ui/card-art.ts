import type { CardDef, CardSuit as Suit, ItemType, QuestDef } from '@root/game-data'
import { woodlandArt } from './woodland-art.ts'
import type { IconName } from './icons.ts'

/**
 * Original generated character paintings for all 34 ordinary designs (45 physical cards).
 * Ambush and Dominance use their approved generated sheets; Quest retains its procedural scenes.
 * No official art is bundled. Every physical copy of a design shares the same illustration.
 */
type Subject = { kind: 'quest'; items: [ItemType, ItemType] }

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

// The approved generated sheet is reused verbatim; viewBoxes exclude its cream gutters.
// Order in the source artwork: bird, rabbit, fox, mouse. Both bird copies share the same painting.
const ambushSheet = new URL('../assets/cards/ambush-woodland.webp', import.meta.url).href
const AMBUSH_CROP: Record<Suit, string> = {
  bird: '10 10 522 704', rabbit: '553 10 522 704', fox: '1096 10 522 704', mouse: '1639 10 522 704',
}

function ambushArt(suit: Suit): string {
  return `<svg class="cf-scene cf-ambush-art" data-suit="${suit}" viewBox="${AMBUSH_CROP[suit]}" preserveAspectRatio="xMidYMin slice" aria-hidden="true"><image href="${ambushSheet}" width="2172" height="724"/></svg>`
}

// Complete indie faces approved on 04/11/2026. Crop within each face, excluding sheet gutters.
const dominanceSheet = new URL('../assets/cards/dominance-indie.png', import.meta.url).href
export const DOMINANCE_CROP: Record<Suit, string> = {
  bird: '13 15 493 684', rabbit: '524 15 493 684', fox: '1036 15 493 684', mouse: '1547 15 493 684',
}

function dominanceArt(suit: Suit): string {
  return `<svg class="cf-dominance-art" data-suit="${suit}" viewBox="${DOMINANCE_CROP[suit]}" preserveAspectRatio="none" aria-hidden="true"><image href="${dominanceSheet}" width="2048" height="715"/></svg>`
}

function subject(s: Subject): string {
  switch (s.kind) {
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
  svg = `<svg class="cf-scene" viewBox="0 0 120 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${light}${mirrored}${shadow}${subject(s)}`
    + `<rect width="120" height="90" style="fill:url(#cf-light)"/></svg>`
  cache.set(key, svg)
  return svg
}

/** The scene of one physical card, e.g. "armorers#2"; copies share the same approved painting. */
export function cardArt(d: CardDef, _copy = 1): string {
  if (d.kind === 'ambush') return ambushArt(d.suit)
  if (d.kind === 'item' || d.kind === 'persistent' || d.kind === 'immediate') return woodlandArt(d.id, d.suit)
  return dominanceArt(d.suit)
}

export const questArt = (q: QuestDef) => draw(`quest:${q.id}`, q.suit, 1, { kind: 'quest', items: q.items })

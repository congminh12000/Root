import { AUTUMN } from '@root/game-data'
import { seededRng, type FactionId, type PlayerView } from '@root/game-engine'
import type { Spot, Travel } from './motion.ts'
import { FACTION_COLOR, SUIT_COLOR } from './names.ts'
import { color } from './ui/tokens.ts'

/**
 * The Autumn map drawn from game-data only: our own simple shapes, no official art (licensing.md).
 * Clearing positions come from `ClearingDef.at`; clearings are labelled 1–12.
 */

const W = 1000, H = 820
const pos = (c: number): [number, number] => { const [x, y] = AUTUMN.clearings[c]!.at; return [x * W, y * H * 0.95 + 20] }
const svg = (tag: string, attrs: Record<string, string | number>, children = '') =>
  `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}>${children}</${tag}>`

/** One of our icons from the page's sprite (ui/icons.ts), filled with `fill`. */
const use = (name: string, x: number, y: number, size: number, fill: string) =>
  svg('use', { href: `#i-${name}`, x, y, width: size, height: size, style: `--icon-fill:${fill}`, 'pointer-events': 'none' })

/** Seeded decoration, drawn once: grass mottling and little pines inside each forest. */
const decoRng = seededRng('autumn-2d')
const r01 = () => decoRng.int(1_000_000) / 1_000_000
const MOTTLE = Array.from({ length: 160 }, () => svg('ellipse', { cx: (r01() * W).toFixed(0), cy: (r01() * H).toFixed(0), rx: (8 + r01() * 26).toFixed(0), ry: (6 + r01() * 16).toFixed(0),
  fill: r01() < 0.6 ? color.meadowLight : color.pineLight, opacity: (0.18 + r01() * 0.2).toFixed(2), 'pointer-events': 'none' }))
function inside(x: number, y: number, poly: [number, number][]) {
  let ins = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[i]!, [bx, by] = poly[j]!
    if ((ay > y) !== (by > y) && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) ins = !ins
  }
  return ins
}
const segDist = (x: number, y: number, [ax, ay]: [number, number], [bx, by]: [number, number]) => {
  const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(x - ax - t * dx, y - ay - t * dy)
}
const TREES = AUTUMN.forests.map(ring => {
  const poly = ring.map(pos)
  const out: string[] = []
  for (let k = 0; k < 90; k++) {
    const x = Math.min(...poly.map(p => p[0])) + r01() * (Math.max(...poly.map(p => p[0])) - Math.min(...poly.map(p => p[0])))
    const y = Math.min(...poly.map(p => p[1])) + r01() * (Math.max(...poly.map(p => p[1])) - Math.min(...poly.map(p => p[1])))
    if (!inside(x, y, poly) || AUTUMN.clearings.some(c => Math.hypot(x - pos(c.id)[0], y - pos(c.id)[1]) < 70)
      || AUTUMN.paths.some(([a, b]) => segDist(x, y, pos(a), pos(b)) < 20)) continue
    const s = 9 + r01() * 6
    out.push(svg('path', { d: `M${x.toFixed(0)} ${(y - s * 1.6).toFixed(0)} L${(x + s).toFixed(0)} ${(y + s * 0.6).toFixed(0)} L${(x - s).toFixed(0)} ${(y + s * 0.6).toFixed(0)} Z`,
      fill: r01() < 0.5 ? color.pine : color.pineLight, stroke: color.ink, 'stroke-width': 1.5, 'stroke-linejoin': 'round', 'pointer-events': 'none' }))
  }
  return out
})

const BUILDING_GLYPH: Record<string, string> = { sawmill: 'S', workshop: 'W', recruiter: 'R', roost: '▲', base: 'B' }
const TOKEN_GLYPH: Record<string, string> = { wood: '▪', keep: 'K', sympathy: '♥' }

export function forestCentre(f: number): [number, number] {
  const ring = AUTUMN.forests[f]!
  const pts = ring.map(pos)
  return [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length]
}

/** Clearings whose pieces differ between two views, including where the Vagabond pawn left or arrived. */
export function changedClearings(prev: PlayerView, next: PlayerView): number[] {
  const out = new Set<number>()
  next.map.clearings.forEach((c, i) => { if (JSON.stringify(c) !== JSON.stringify(prev.map.clearings[i])) out.add(i) })
  const a = prev.factions.vagabond?.pawn, b = next.factions.vagabond?.pawn
  if (JSON.stringify(a) !== JSON.stringify(b)) for (const p of [a, b]) if (p?.kind === 'clearing') out.add(p.id)
  return [...out].sort((x, y) => x - y)
}

const spotAt = (s: Spot): [number, number] => (s.kind === 'clearing' ? pos(s.id) : forestCentre(s.id))

/** Ghost pieces that slide along the path from where they left to where they arrived, then fade (style.css). */
function travelGhost(t: Travel): string {
  const [fx, fy] = spotAt(t.from), [x, y] = spotAt(t.to)
  const style = `--dx:${(fx - x).toFixed(1)};--dy:${(fy - y).toFixed(1)}`
  const body = t.pawn
    ? use('vagabond', x - 17, y - 17, 34, FACTION_COLOR.vagabond)
    : svg('circle', { cx: x, cy: y, r: 18, fill: FACTION_COLOR[t.faction], stroke: color.ink, 'stroke-width': 3 })
      + use(t.faction, x - 12, y - 12, 24, color.paperRaised)
      + (t.count > 1 ? svg('circle', { cx: x + 14, cy: y - 14, r: 9, fill: color.ink }) + svg('text', { x: x + 14, y: y - 10, 'text-anchor': 'middle', class: 'count' }, String(t.count)) : '')
  return svg('g', { class: 'travel', style }, body)
}

/**
 * Renders the board as an SVG string. `highlight` rings the chosen clearings strongly, `targets` lightly (they can be
 * clicked now); `changed` pulse once; `travels` slide along their paths once.
 */
export function renderBoard(view: PlayerView, highlight: number[] = [], changed: number[] = [], travels: Travel[] = [], targets: number[] = []): string {
  const parts: string[] = []
  const pop = (id: number) => (changed.includes(id) ? { class: 'pop' } : {})
  parts.push(svg('rect', { x: 2, y: 2, width: W - 4, height: H - 4, rx: 18, fill: color.meadow, stroke: color.ink, 'stroke-width': 4 }))
  parts.push(...MOTTLE)
  for (const [f, ring] of AUTUMN.forests.entries()) {
    const pts = ring.map(pos).map(p => p.join(',')).join(' ')
    parts.push(svg('polygon', { points: pts, fill: color.pine, opacity: 0.35 }))
    parts.push(...TREES[f]!)
    const [x, y] = forestCentre(f)
    parts.push(svg('text', { x, y: y + 5, 'text-anchor': 'middle', class: 'forest-label' }, `rừng ${f + 1}`))
  }
  for (const [width, stroke] of [[24, color.pathEdge], [17, color.path]] as const) {
    for (const [a, b] of AUTUMN.paths) {
      const [x1, y1] = pos(a), [x2, y2] = pos(b)
      parts.push(svg('line', { x1, y1, x2, y2, stroke, 'stroke-width': width, 'stroke-linecap': 'round' }))
    }
  }
  for (const def of AUTUMN.clearings) {
    const [x, y] = pos(def.id)
    const c = view.map.clearings[def.id]!
    if (highlight.includes(def.id)) parts.push(svg('circle', { cx: x, cy: y, r: 60, fill: 'none', stroke: color.autumnGold, 'stroke-width': 9 }))
    else if (targets.includes(def.id)) parts.push(svg('circle', { cx: x, cy: y, r: 58, fill: 'none', stroke: color.autumnGold, 'stroke-width': 4, 'stroke-dasharray': '10 7', class: 'target' }))
    parts.push(svg('circle', { cx: x, cy: y, r: 52, fill: color.meadowLight, stroke: color.ink, 'stroke-width': 3.5, 'data-clearing': def.id, class: 'clearing' }))
    parts.push(svg('circle', { cx: x, cy: y, r: 46, fill: 'none', stroke: SUIT_COLOR[def.suit], 'stroke-width': 5, 'pointer-events': 'none' }))
    if (changed.includes(def.id)) parts.push(svg('circle', { cx: x, cy: y, r: 52, class: 'pulse' }))
    // Number badge with the suit's own icon (colour and shape).
    parts.push(svg('rect', { x: x - 66, y: y - 58, width: 50, height: 26, rx: 13, fill: SUIT_COLOR[def.suit], stroke: color.ink, 'stroke-width': 2.5 }))
    parts.push(use(def.suit, x - 62, y - 56, 22, color.paperRaised))
    parts.push(svg('text', { x: x - 29, y: y - 39, 'text-anchor': 'middle', class: 'clearing-no' }, String(def.id + 1)))
    // Who rules the clearing (§2.5, from the engine's view): their icon on the top of the rim.
    const lord = view.rulers?.[def.id]
    if (lord) parts.push(svg('circle', { cx: x + 4, cy: y - 52, r: 13, fill: FACTION_COLOR[lord], stroke: color.ink, 'stroke-width': 2.5 }) + use(lord, x - 5, y - 61, 18, color.paperRaised))
    // Slots along the bottom of the clearing.
    c.slots.forEach((slot, i) => {
      const sx = x - (c.slots.length - 1) * 15 + i * 30 - 12, sy = y + 16
      const fill = slot === null ? color.paperShade : slot.kind === 'ruin' ? color.rock : FACTION_COLOR[slot.faction]
      parts.push(svg('rect', { x: sx, y: sy, width: 26, height: 26, rx: 5, fill, stroke: color.ink, 'stroke-width': 2, ...pop(def.id) }))
      const glyph = slot === null ? '' : slot.kind === 'ruin' ? 'R' : BUILDING_GLYPH[slot.type] ?? '?'
      if (glyph) parts.push(svg('text', { x: sx + 13, y: sy + 18, 'text-anchor': 'middle', class: 'glyph' }, glyph))
    })
    // Warriors: the faction's icon on its colour, with a count.
    const entries = Object.entries(c.warriors).filter(([, n]) => n && n > 0) as [FactionId, number][]
    entries.forEach(([f, n], i) => {
      const wx = x - (entries.length - 1) * 19 + i * 38, wy = y - 12
      parts.push(svg('g', pop(def.id), svg('circle', { cx: wx, cy: wy, r: 17, fill: FACTION_COLOR[f], stroke: color.ink, 'stroke-width': 2.5 })
        + use(f, wx - 12, wy - 12, 24, color.paperRaised)
        + (n > 1 ? svg('circle', { cx: wx + 13, cy: wy - 13, r: 9, fill: color.ink }) + svg('text', { x: wx + 13, y: wy - 9, 'text-anchor': 'middle', class: 'count' }, String(n)) : '')))
    })
    c.tokens.forEach((t, i) => {
      const tx = x + 38, ty = y - 28 + i * 24
      parts.push(svg('circle', { cx: tx, cy: ty, r: 11, fill: t.type === 'wood' ? color.woodLight : FACTION_COLOR[t.faction], stroke: color.ink, 'stroke-width': 2, ...pop(def.id) }))
      parts.push(svg('text', { x: tx, y: ty + 4, 'text-anchor': 'middle', class: 'token' }, TOKEN_GLYPH[t.type] ?? '?'))
    })
  }
  const pawn = view.factions.vagabond?.pawn
  if (pawn) {
    const [x, y] = pawn.kind === 'clearing' ? pos(pawn.id) : forestCentre(pawn.id)
    const [px, py] = pawn.kind === 'clearing' ? [x + 40, y + 34] : [x, y - 24]
    parts.push(use('vagabond', px - 17, py - 17, 34, FACTION_COLOR.vagabond))
  }
  parts.push(...travels.map(travelGhost))
  return svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'board', role: 'img', 'aria-label': 'Bản đồ Autumn' }, parts.join(''))
}

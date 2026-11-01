import { AUTUMN } from '@root/game-data'
import type { FactionId, PlayerView } from '@root/game-engine'
import type { Spot, Travel } from './motion.ts'
import { FACTION_COLOR, SUIT_COLOR } from './names.ts'
import { color, scene as palette } from './ui/tokens.ts'

const B = { ...palette.board2d, white: color.white }

/**
 * The Autumn map drawn from game-data only: our own simple shapes, no official art (licensing.md).
 * Clearing positions come from `ClearingDef.at`; clearings are labelled 1–12.
 */

const W = 1000, H = 820
const pos = (c: number): [number, number] => { const [x, y] = AUTUMN.clearings[c]!.at; return [x * W, y * H * 0.95 + 20] }
const svg = (tag: string, attrs: Record<string, string | number>, children = '') =>
  `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}>${children}</${tag}>`

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
    ? svg('path', { d: `M${x} ${y - 16} L${x + 11} ${y + 10} L${x - 11} ${y + 10} Z`, fill: FACTION_COLOR.vagabond, stroke: B.white, 'stroke-width': 2 })
    : svg('circle', { cx: x, cy: y, r: 17, fill: FACTION_COLOR[t.faction], stroke: B.white, 'stroke-width': 3 })
      + svg('text', { x, y: y + 5, 'text-anchor': 'middle', class: 'chip' }, String(t.count))
  return svg('g', { class: 'travel', style }, body)
}

/**
 * Renders the board as an SVG string. `highlight` rings clearings an action is about; `changed` pulse once;
 * `travels` slide along their paths once.
 */
export function renderBoard(view: PlayerView, highlight: number[] = [], changed: number[] = [], travels: Travel[] = []): string {
  const parts: string[] = []
  parts.push(svg('rect', { x: 0, y: 0, width: W, height: H, rx: 18, fill: B.felt }))
  for (const [f, ring] of AUTUMN.forests.entries()) {
    const pts = ring.map(pos).map(p => p.join(',')).join(' ')
    parts.push(svg('polygon', { points: pts, fill: B.forest, opacity: 0.55, stroke: B.forestEdge, 'stroke-width': 2 }))
    const [x, y] = forestCentre(f)
    parts.push(svg('text', { x, y: y + 5, 'text-anchor': 'middle', class: 'forest-label' }, `rừng ${f + 1}`))
  }
  for (const [a, b] of AUTUMN.paths) {
    const [x1, y1] = pos(a), [x2, y2] = pos(b)
    parts.push(svg('line', { x1, y1, x2, y2, stroke: B.path, 'stroke-width': 10, 'stroke-linecap': 'round' }))
  }
  for (const def of AUTUMN.clearings) {
    const [x, y] = pos(def.id)
    const c = view.map.clearings[def.id]!
    const lit = highlight.includes(def.id)
    parts.push(svg('circle', { cx: x, cy: y, r: 52, fill: palette.slot, stroke: lit ? B.lit : SUIT_COLOR[def.suit], 'stroke-width': lit ? 7 : 5, 'data-clearing': def.id, class: 'clearing' }))
    if (changed.includes(def.id)) parts.push(svg('circle', { cx: x, cy: y, r: 52, class: 'pulse' }))
    parts.push(svg('circle', { cx: x - 40, cy: y - 40, r: 14, fill: SUIT_COLOR[def.suit] }))
    parts.push(svg('text', { x: x - 40, y: y - 35, 'text-anchor': 'middle', class: 'clearing-no' }, String(def.id + 1)))
    // Slots along the bottom of the clearing.
    c.slots.forEach((slot, i) => {
      const sx = x - (c.slots.length - 1) * 15 + i * 30 - 12, sy = y + 18
      const fill = slot === null ? B.white : slot.kind === 'ruin' ? B.ruin : FACTION_COLOR[slot.faction]
      parts.push(svg('rect', { x: sx, y: sy, width: 24, height: 24, rx: 4, fill, stroke: B.slotEdge, 'stroke-width': 1.5, ...(changed.includes(def.id) ? { class: 'pop' } : {}) }))
      const glyph = slot === null ? '' : slot.kind === 'ruin' ? 'R' : BUILDING_GLYPH[slot.type] ?? '?'
      if (glyph) parts.push(svg('text', { x: sx + 12, y: sy + 17, 'text-anchor': 'middle', class: 'glyph' }, glyph))
    })
    // Warriors as coloured chips with counts.
    const entries = Object.entries(c.warriors).filter(([, n]) => n && n > 0) as [FactionId, number][]
    entries.forEach(([f, n], i) => {
      const wx = x - (entries.length - 1) * 17 + i * 34, wy = y - 10
      parts.push(svg('circle', { cx: wx, cy: wy, r: 15, fill: FACTION_COLOR[f], stroke: B.pieceEdge, 'stroke-width': 1.5, ...(changed.includes(def.id) ? { class: 'pop' } : {}) }))
      parts.push(svg('text', { x: wx, y: wy + 5, 'text-anchor': 'middle', class: 'chip' }, String(n)))
    })
    c.tokens.forEach((t, i) => {
      const tx = x + 36, ty = y - 30 + i * 22
      parts.push(svg('circle', { cx: tx, cy: ty, r: 10, fill: FACTION_COLOR[t.faction], stroke: B.pieceEdge }))
      parts.push(svg('text', { x: tx, y: ty + 4, 'text-anchor': 'middle', class: 'token' }, TOKEN_GLYPH[t.type] ?? '?'))
    })
  }
  const pawn = view.factions.vagabond?.pawn
  if (pawn) {
    const [x, y] = pawn.kind === 'clearing' ? pos(pawn.id) : forestCentre(pawn.id)
    const [px, py] = pawn.kind === 'clearing' ? [x + 40, y + 36] : [x, y - 22]
    parts.push(svg('path', { d: `M${px} ${py - 16} L${px + 11} ${py + 10} L${px - 11} ${py + 10} Z`, fill: FACTION_COLOR.vagabond, stroke: B.white, 'stroke-width': 2 }))
  }
  parts.push(...travels.map(travelGhost))
  return svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'board', role: 'img', 'aria-label': 'Bản đồ Autumn' }, parts.join(''))
}

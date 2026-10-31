import type { ClearingSpec, MapSpec, Pt, Suit } from './spec'

/** Raised clearing plateau, shared by the painter and the live token layer. */
export const PLATEAU = { rx: 62, ry: 44, depth: 10 }
export const SLOT = { y: 24, gap: 26, size: 18 }
// Trees keep clear of this ellipse so they never hide tokens; it sits lower to protect the name ribbon.
const CLEAR = { rx: 80, ry: 66, dy: 10 }

/** Centre of every building slot of a clearing, shared by the painter and the live token layer. */
export function plotPositions(c: ClearingSpec): Pt[] {
  return c.plots ?? Array.from({ length: c.slots }, (_, k) => [c.x + (k - (c.slots - 1) / 2) * SLOT.gap, c.y + SLOT.y])
}

export interface Lane { a: number; b: number; points: Pt[] }
export interface Bridge { x: number; y: number; angle: number; span: number }
export interface Rock { x: number; y: number; r: number; seed: number }
export interface Tree { x: number; y: number; h: number; group: 'conifer' | 'mixed' | Suit; v: number }
export interface MapLayout {
  lanes: Lane[]; rivers: { width: number; points: Pt[] }[]; lakes: Pt[][]
  bridges: Bridge[]; rocks: Rock[]; trees: Tree[]
}

export function random(seed: number) {
  let n = seed >>> 0
  return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296 }
}

export function catmull(points: Pt[], closed = false, steps = 10): Pt[] {
  const n = points.length, out: Pt[] = []
  const at = (i: number) => closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))]
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2)
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t
      const axis = (k: 0 | 1) => .5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2
        + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t3)
      out.push([axis(0), axis(1)])
    }
  }
  if (!closed) out.push(points[n - 1])
  return out
}

function segmentDistance(p: Pt, a: Pt, b: Pt) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = dx * dx + dy * dy
  const t = len ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len)) : 0
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
}

export function polylineDistance(p: Pt, points: Pt[]) {
  let best = Infinity
  for (let i = 1; i < points.length; i++) best = Math.min(best, segmentDistance(p, points[i - 1], points[i]))
  return best
}

function intersect(a: Pt, b: Pt, c: Pt, d: Pt): Pt | null {
  const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0])
  if (!den) return null
  const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den
  const u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])] : null
}

function firstCrossing(p: Pt[], q: Pt[]): { at: Pt; angle: number } | null {
  for (let i = 1; i < p.length; i++) for (let j = 1; j < q.length; j++) {
    const at = intersect(p[i - 1], p[i], q[j - 1], q[j])
    if (at) return { at, angle: Math.atan2(p[i][1] - p[i - 1][1], p[i][0] - p[i - 1][0]) }
  }
  return null
}

export function inside(p: Pt, poly: Pt[]) {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

/** Turns a map file into deterministic geometry: curved lanes, smoothed water, bridges and tree placement. */
export function buildLayout(spec: MapSpec): MapLayout {
  const rand = random(spec.seed)
  const { clearings, terrain } = spec
  const lanes: Lane[] = []
  clearings.forEach((c, a) => c.paths.filter(b => b > a).forEach(b => {
    const d = clearings[b], len = Math.hypot(d.x - c.x, d.y - c.y), bend = (rand() - .5) * .12 * len
    const mx = (c.x + d.x) / 2 - (d.y - c.y) / len * bend, my = (c.y + d.y) / 2 + (d.x - c.x) / len * bend
    const points: Pt[] = []
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, u = 1 - t
      points.push([u * u * c.x + 2 * u * t * mx + t * t * d.x, u * u * c.y + 2 * u * t * my + t * t * d.y])
    }
    lanes.push({ a, b, points })
  }))
  const rivers = terrain.rivers.map(r => ({ width: r.width, points: catmull(r.points) }))
  const lakes = terrain.lakes.map(l => catmull(l.points, true))
  const bridges: Bridge[] = []
  lanes.forEach(lane => rivers.forEach(river => {
    const hit = firstCrossing(lane.points, river.points)
    if (hit) bridges.push({ x: hit.at[0], y: hit.at[1], angle: hit.angle, span: river.width })
  }))
  const rocks = terrain.rocks.map((r, i) => ({ ...r, seed: spec.seed + i * 97 }))
  const trees: Tree[] = []
  const s = terrain.treeSpacing, [w, h] = spec.size
  for (let gy = -s; gy < h + 2 * s; gy += s) for (let gx = -s; gx < w + s; gx += s) {
    // Draw every random number before any early exit so edits elsewhere never reshuffle the forest.
    const p: Pt = [gx + rand() * s, gy + rand() * s], v = rand(), roll = rand(), size = rand()
    let near = Infinity, suit: Suit = 'fox'
    for (const c of clearings) {
      const d = Math.hypot((p[0] - c.x) / CLEAR.rx, (p[1] - c.y - CLEAR.dy) / CLEAR.ry)
      if (d < near) { near = d; suit = c.suit }
    }
    if (near < 1 || lanes.some(l => polylineDistance(p, l.points) < 13)) continue
    if (rivers.some(r => polylineDistance(p, r.points) < r.width / 2 + 6)) continue
    if (lakes.some(l => inside(p, l) || polylineDistance(p, l) < 6)) continue
    if (rocks.some(r => Math.hypot(p[0] - r.x, (p[1] - r.y) * 1.4) < r.r * 1.25)) continue
    const riverside = rivers.some(r => polylineDistance(p, r.points) < r.width / 2 + 22)
    const group = near < 1.6 && roll < (1.6 - near) * .95 ? suit : (riverside && roll < .3) || roll < .04 ? 'mixed' : 'conifer'
    trees.push({ x: p[0], y: p[1], h: group === 'conifer' ? 21 + size * 14 : 15 + size * 7, group, v })
  }
  return { lanes, rivers, lakes, bridges, rocks, trees }
}

/** Readability rules every map must pass; run by the map tests. */
export function validateLayout(spec: MapSpec, layout: MapLayout): string[] {
  const problems: string[] = []
  const { clearings } = spec
  const near = (p: Pt, c: { x: number; y: number }, pad: number) =>
    Math.hypot((p[0] - c.x) / (PLATEAU.rx + pad), (p[1] - c.y) / (PLATEAU.ry + pad)) < 1
  const plot = spec.plotSize ?? SLOT.size
  clearings.forEach((c, i) => {
    const plots = plotPositions(c)
    if (plots.length !== c.slots) problems.push(`${c.name} has ${plots.length} plots for ${c.slots} slots`)
    plots.forEach((a, k) => plots.slice(k + 1).forEach(b => {
      if (Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) < plot + 4) problems.push(`${c.name} plots overlap`)
    }))
    if (plots.some(([x, y]) => x < plot / 2 || y < plot / 2 || x > spec.size[0] - plot / 2 || y > spec.size[1] - plot / 2)) {
      problems.push(`${c.name} has a plot off the board`)
    }
    c.paths.forEach(j => { if (!clearings[j]?.paths.includes(i)) problems.push(`path ${c.name} → ${j} is not mutual`) })
    clearings.forEach((d, j) => {
      if (j > i && Math.hypot((c.x - d.x) / (2 * CLEAR.rx), (c.y - d.y) / (2 * CLEAR.ry)) < 1) problems.push(`${c.name} overlaps ${d.name}`)
    })
    layout.rivers.forEach(r => { if (r.points.some(p => near(p, c, r.width / 2 + 8))) problems.push(`river touches ${c.name}`) })
    layout.lakes.forEach(l => { if (inside([c.x, c.y], l) || l.some(p => near(p, c, 12))) problems.push(`lake touches ${c.name}`) })
    layout.rocks.forEach(k => { if (near([k.x, k.y], c, k.r + 6)) problems.push(`rock ${k.x},${k.y} touches ${c.name}`) })
  })
  layout.lanes.forEach(l => {
    clearings.forEach((c, i) => {
      if (i !== l.a && i !== l.b && l.points.some(p => near(p, c, 4))) problems.push(`path ${l.a}-${l.b} crosses ${c.name}`)
    })
    layout.rocks.forEach(k => { if (polylineDistance([k.x, k.y], l.points) < k.r + 8) problems.push(`rock ${k.x},${k.y} blocks path ${l.a}-${l.b}`) })
    layout.lanes.forEach(m => {
      if (m.a > l.a || (m.a === l.a && m.b > l.b)) {
        if (![m.a, m.b].some(x => x === l.a || x === l.b) && firstCrossing(l.points, m.points)) problems.push(`paths ${l.a}-${l.b} and ${m.a}-${m.b} cross`)
      }
    })
  })
  return problems
}

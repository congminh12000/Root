import { AUTUMN } from '@root/game-data'
import type { ItemType } from '@root/game-engine'

/**
 * The Autumn board as a diorama (UI-7). Clearings, suits, slots, ruins, paths and the item supply come from
 * game-data (AUTUMN); only the scenery around them (river, lake, cliffs, bridges, houses, trees) is traced from the
 * manager's reference image, kept off git (docs/07-ui/autumn-preview.md). Coordinates are 0..1 from the top left,
 * the same frame as `ClearingDef.at`.
 */
export type Point = readonly [number, number]
export type Suit = 'fox' | 'rabbit' | 'mouse'
export interface Plot { id: string; clearing: number; at: Point; ruin: boolean }
export interface Clearing { id: number; suit: Suit; at: Point; home: Point; plots: Plot[] }

export const WIDTH = 28, DEPTH = 25.7
export const PLOT_HALF = .019
/** Half-axes of a clearing's open ground. */
export const CLEARING_RX = .078, CLEARING_RY = .07

/** Slots sit across the back of a clearing so warriors and tokens have the front (style-guide: room for pieces). */
const SLOT_OFFSETS: Record<number, Point[]> = {
  1: [[0, -.024]],
  2: [[-.025, -.024], [.025, -.024]],
  3: [[-.045, -.008], [0, -.034], [.045, -.008]],
}

const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1])
export function segmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
}
const lineDistance = (p: Point, line: readonly Point[]) => Math.min(...line.slice(1).map((b, i) => segmentDistance(p, line[i]!, b)))
export function inside(p: Point, polygon: readonly Point[]): boolean {
  let hit = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!, b = polygon[j]!
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit
  }
  return hit
}
/** Inside a clearing's open ground, `grow` widening it. */
export const inClearing = (p: Point, c: { at: Point }, grow = 0) =>
  Math.hypot((p[0] - c.at[0]) / (CLEARING_RX + grow), (p[1] - c.at[1]) / (CLEARING_RY + grow)) < 1

// ── Water and rock, traced from the reference and routed around every clearing ──────────────────────────────
/** The river enters at the top, runs past the mill clearing and turns west into the lake on the left edge. */
export const RIVER: Point[] = [
  [.66, -.01], [.645, .06], [.62, .12], [.60, .17], [.54, .215], [.51, .26], [.53, .33], [.58, .37], [.55, .42], [.52, .48],
  [.53, .55], [.52, .62], [.47, .67], [.40, .69], [.30, .68], [.22, .69], [.15, .67], [.09, .64], [.045, .63],
]
export const RIVER_HALF = .011
/** A strip of lake along the left edge, west of the path from clearing 5 to 9; the river crosses that path on a bridge. */
export const LAKE: Point[] = [[.004, .50], [.03, .52], [.052, .57], [.058, .63], [.05, .69], [.03, .725], [.004, .74]]
export const CLIFFS: Point[][] = [
  [[.006, .006], [.20, .006], [.17, .035], [.10, .05], [.03, .06], [.006, .055]],
  [[.85, .006], [.994, .006], [.994, .09], [.95, .11], [.90, .07]],
  [[.955, .26], [.994, .25], [.994, .41], [.95, .39], [.94, .33]],
  [[.955, .61], [.994, .59], [.994, .73], [.95, .72], [.94, .66]],
]
export const ITEM_ROW_Y = [.03, .068] as const
export const ITEM_X0 = .225, ITEM_STEP = .036
export const SCORE_Y = .978

// ── Game-data: clearings, slots, ruins, paths ──────────────────────────────────────────────────────────────
const SUPPLY_ORDER: ItemType[][] = [['bag', 'boots', 'crossbow', 'sword', 'tea', 'coin'], ['bag', 'boots', 'hammer', 'sword', 'tea', 'coin']]
/** The two printed supply rows, checked against AUTUMN.itemSupply in test/autumn.test.ts. */
export const ITEMS = SUPPLY_ORDER

/** Paths drawn from clearing edge to edge, bowed a little for a hand-drawn line. One per AUTUMN.paths pair. */
export const PATHS: { a: number; b: number; line: Point[] }[] = AUTUMN.paths.map(([a, b], i) => {
  const A = AUTUMN.clearings[a]!.at, B = AUTUMN.clearings[b]!.at
  const d = dist(A, B), ux = (B[0] - A[0]) / d, uy = (B[1] - A[1]) / d
  const edge = (P: Point, s: number): Point => {
    const k = 1 / Math.hypot(ux / CLEARING_RX, uy / CLEARING_RY)
    return [P[0] + s * ux * k * .92, P[1] + s * uy * k * .92]
  }
  const start = edge(A, 1), end = edge(B, -1)
  const bow = (i % 2 ? 1 : -1) * Math.min(.012, d * .05)
  const mid: Point = [(start[0] + end[0]) / 2 - uy * bow, (start[1] + end[1]) / 2 + ux * bow]
  return { a, b, line: [start, mid, end] }
})

/** A decorative house per clearing: the spot just outside it that is furthest from paths, river and slots. */
function homeFor(c: { at: Point; id: number }, plots: Plot[]): Point {
  let best: Point = c.at, score = -1
  for (let k = 0; k < 24; k++) {
    const a = k / 24 * Math.PI * 2
    const p: Point = [c.at[0] + Math.cos(a) * (CLEARING_RX + .022), c.at[1] + Math.sin(a) * (CLEARING_RY + .02)]
    if (p[0] < .03 || p[0] > .97 || p[1] < .1 || p[1] > .93) continue
    if (inside(p, LAKE) || CLIFFS.some(r => inside(p, r))) continue
    const s = Math.min(lineDistance(p, RIVER) - RIVER_HALF, ...PATHS.map(x => lineDistance(p, x.line)), ...plots.map(q => dist(p, q.at)),
      ...AUTUMN.clearings.filter(o => o.id !== c.id).map(o => dist(p, o.at) - CLEARING_RX))
    if (s > score) { score = s; best = p }
  }
  return best
}

export const CLEARINGS: Clearing[] = AUTUMN.clearings.map(c => {
  // Printed ruins are on the last slot of their clearing in this layout; §2.2.4 only fixes how many.
  const plots = SLOT_OFFSETS[c.slots]!.map((o, i): Plot => ({
    id: `${c.id + 1}.${i + 1}`, clearing: c.id, at: [c.at[0] + o[0], c.at[1] + o[1]], ruin: c.ruins > 0 && i === c.slots - 1,
  }))
  return { id: c.id, suit: c.suit, at: c.at, plots, home: homeFor(c, plots) }
})
export const PLOTS = CLEARINGS.flatMap(c => c.plots)

/** Where a path crosses the river: a bridge, laid along the path. */
export const BRIDGES: { at: Point; angle: number }[] = PATHS.flatMap(({ line }) => {
  const out: { at: Point; angle: number }[] = []
  for (let i = 0; i < line.length - 1; i++) for (let j = 0; j < RIVER.length - 1; j++) {
    const [p, q] = [line[i]!, line[i + 1]!], [r, s] = [RIVER[j]!, RIVER[j + 1]!]
    const den = (q[0] - p[0]) * (s[1] - r[1]) - (q[1] - p[1]) * (s[0] - r[0])
    if (Math.abs(den) < 1e-9) continue
    const t = ((r[0] - p[0]) * (s[1] - r[1]) - (r[1] - p[1]) * (s[0] - r[0])) / den
    const u = ((r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0])) / den
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) out.push({ at: [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])], angle: Math.atan2(q[1] - p[1], q[0] - p[0]) })
  }
  return out
})

export const riverDistance = (p: Point) => lineDistance(p, RIVER) - RIVER_HALF
export const pathDistance = (p: Point) => Math.min(...PATHS.map(x => lineDistance(p, x.line)))
export const inPlot = (p: Point, margin = 0) => PLOTS.some(s => Math.abs(p[0] - s.at[0]) < PLOT_HALF + margin && Math.abs(p[1] - s.at[1]) < PLOT_HALF + margin)
const inItems = (p: Point) => p[0] > ITEM_X0 - .03 && p[0] < ITEM_X0 + 5 * ITEM_STEP + .03 && p[1] < ITEM_ROW_Y[1] + .03
/** Trees grow anywhere but on open ground, water, rock, paths, the supply and the score track. */
export const treeAllowed = (p: Point) => !CLEARINGS.some(c => inClearing(p, c, .006)) && !inside(p, LAKE) && riverDistance(p) > .012
  && !CLIFFS.some(r => inside(p, r)) && pathDistance(p) > .016 && !inPlot(p, .018) && !CLEARINGS.some(c => dist(p, c.home) < .03)
  && !inItems(p) && p[1] < SCORE_Y - .03 && p[1] > .015
/** The suit of the clearing a tree stands near, to tint its leaves the way the reference does (fox red, mouse orange, rabbit yellow). */
export const nearSuit = (p: Point): Suit | null => {
  const c = CLEARINGS.find(c => inClearing(p, c, .028))
  return c ? c.suit : null
}

export const world = ([x, y]: Point): [number, number, number] => [(x - .5) * WIDTH, 0, (y - .5) * DEPTH]

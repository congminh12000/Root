import type { MapSpec, Pt } from '../map/spec'
import { CELL, Ground, type ArtGrid } from './sample'

/**
 * Finds where each gameplay path runs in the artwork: the cheapest walk between two clearings, where the painted
 * dirt roads are cheap, open ground costs more, forest much more and the lake is nearly closed.
 * The result is a smooth polyline in artwork pixels, so the trail drawn in 3D follows the road the art already shows.
 */
const COST: Record<number, number> = {
  [Ground.Dirt]: 1, [Ground.Grass]: 5, [Ground.Leaf]: 8, [Ground.Autumn]: 8, [Ground.Rock]: 10, [Ground.Pine]: 14, [Ground.Water]: 80,
}

export interface Route { a: number; b: number; points: Pt[] }

class Heap {
  private keys: number[] = []; private vals: number[] = []
  get size() { return this.keys.length }
  push(key: number, val: number) {
    const k = this.keys, v = this.vals
    let i = k.length
    k.push(key); v.push(val)
    while (i > 0) {
      const p = (i - 1) >> 1
      if (k[p] <= key) break
      k[i] = k[p]; v[i] = v[p]; i = p
    }
    k[i] = key; v[i] = val
  }
  pop() {
    const k = this.keys, v = this.vals, top = v[0], lastK = k.pop()!, lastV = v.pop()!
    if (k.length) {
      let i = 0
      for (;;) {
        let c = 2 * i + 1
        if (c >= k.length) break
        if (c + 1 < k.length && k[c + 1] < k[c]) c++
        if (k[c] >= lastK) break
        k[i] = k[c]; v[i] = v[c]; i = c
      }
      k[i] = lastK; v[i] = lastV
    }
    return top
  }
}

function walk(grid: ArtGrid, from: number, to: number) {
  const { cols, rows, cls } = grid, dist = new Float32Array(cls.length).fill(Infinity), prev = new Int32Array(cls.length).fill(-1)
  const heap = new Heap(), tx = to % cols, ty = (to / cols) | 0
  dist[from] = 0
  heap.push(0, from)
  while (heap.size) {
    const c = heap.pop()
    if (c === to) break
    const x = c % cols, y = (c / cols) | 0
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy
      if ((!dx && !dy) || xx < 0 || yy < 0 || xx >= cols || yy >= rows) continue
      const n = yy * cols + xx, d = dist[c] + COST[cls[n]] * (dx && dy ? Math.SQRT2 : 1)
      if (d < dist[n]) {
        dist[n] = d
        prev[n] = c
        heap.push(d + Math.hypot(xx - tx, yy - ty), n)
      }
    }
  }
  const cells: number[] = []
  for (let c = to; c !== -1; c = prev[c]) cells.push(c)
  return cells.reverse()
}

/** Chaikin corner cutting keeps the ends fixed and rounds the stair-steps of the grid walk. */
function smooth(points: Pt[], passes: number): Pt[] {
  let out = points
  for (let p = 0; p < passes; p++) {
    const next: Pt[] = [out[0]]
    for (let i = 0; i < out.length - 1; i++) {
      const [ax, ay] = out[i], [bx, by] = out[i + 1]
      next.push([ax * .75 + bx * .25, ay * .75 + by * .25], [ax * .25 + bx * .75, ay * .25 + by * .75])
    }
    next.push(out[out.length - 1])
    out = next
  }
  return out
}

export function traceRoutes(grid: ArtGrid, spec: MapSpec): Route[] {
  const cell = (x: number, y: number) => Math.min(grid.rows - 1, (y / CELL) | 0) * grid.cols + Math.min(grid.cols - 1, (x / CELL) | 0)
  const routes: Route[] = []
  spec.clearings.forEach((c, a) => c.paths.filter(b => b > a).forEach(b => {
    const d = spec.clearings[b], cells = walk(grid, cell(c.x, c.y), cell(d.x, d.y))
    const coarse = cells.filter((_, i) => i % 3 === 0 || i === cells.length - 1)
      .map(n => [(n % grid.cols + .5) * CELL, (((n / grid.cols) | 0) + .5) * CELL] as Pt)
    coarse[0] = [c.x, c.y]
    coarse[coarse.length - 1] = [d.x, d.y]
    routes.push({ a, b, points: smooth(coarse, 3) })
  }))
  return routes
}

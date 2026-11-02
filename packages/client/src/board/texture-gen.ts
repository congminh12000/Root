/**
 * The tabletop look's surfaces (style-guide §3), generated from seeded noise so nothing is downloaded and every
 * browser draws the same: wood grain, model-railway flock, foam tree clumps, packed sand, stone, resin ripples, card
 * fibre. Each is a small tileable square, as RGBA bytes: `color` maps are greys that multiply a material's colour,
 * `normal` maps give the relief. Pure; board/textures.worker.ts runs it off the main thread.
 */

export const SURFACES = ['wood', 'flock', 'foam', 'sand', 'stone', 'ripple', 'card'] as const
export type Surface = typeof SURFACES[number]
export interface SurfaceMaps { size: number; color: Uint8Array; normal: Uint8Array }

function rng(seed: number) {
  let s = seed >>> 0
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
}

/** Tileable value noise, `octaves` layers from `cells` across, in 0–1 with `contrast` around the middle. */
export function noise(size: number, cells: number, octaves: number, contrast: number, seed: number): Float32Array {
  const rand = rng(seed)
  const layers = Array.from({ length: octaves }, (_, o) => { const n = cells << o; return { n, w: 1 / (1 << o), g: Float32Array.from({ length: n * n }, rand) } })
  const out = new Float32Array(size * size)
  const smooth = (t: number) => t * t * (3 - 2 * t)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0, sum = 0
    for (const { n, g, w } of layers) {
      const fx = x / size * n, fy = y / size * n, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = smooth(fx - x0), ty = smooth(fy - y0)
      const x1 = (x0 + 1) % n, y1 = (y0 + 1) % n
      const a = g[y0 * n + x0]! + (g[y0 * n + x1]! - g[y0 * n + x0]!) * tx
      const b = g[y1 * n + x0]! + (g[y1 * n + x1]! - g[y1 * n + x0]!) * tx
      v += (a + (b - a) * ty) * w; sum += w
    }
    out[y * size + x] = Math.min(1, Math.max(0, (v / sum - .5) * contrast + .5))
  }
  return out
}

function toNormal(h: Float32Array, size: number, strength: number): Uint8Array {
  const out = new Uint8Array(size * size * 4)
  const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)]!
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength, dy = (at(x, y + 1) - at(x, y - 1)) * strength, len = Math.hypot(dx, dy, 1), k = (y * size + x) * 4
    out[k] = (-dx / len * .5 + .5) * 255; out[k + 1] = (dy / len * .5 + .5) * 255; out[k + 2] = (1 / len * .5 + .5) * 255; out[k + 3] = 255
  }
  return out
}

function toGrey(h: Float32Array, size: number, lo: number, hi: number): Uint8Array {
  const out = new Uint8Array(size * size * 4)
  for (let i = 0; i < size * size; i++) { const v = Math.min(255, (lo + (hi - lo) * h[i]!) * 255); out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = v; out[i * 4 + 3] = 255 }
  return out
}

/** One surface's maps, from its fixed seed. */
export function surface(name: Surface): SurfaceMaps {
  switch (name) {
    case 'wood': {
      // Growth rings: stretched sine bands bent by noise.
      const size = 256, n = noise(size, 4, 4, 1, 101), h = new Float32Array(size * size)
      for (let i = 0; i < size * size; i++) { const v = Math.sin(((i / size | 0) / size * 24 + n[i]! * 9) * Math.PI); h[i] = .5 + .5 * v * v }
      return { size, color: toGrey(h, size, .8, 1), normal: toNormal(h, size, 1.2) }
    }
    case 'flock': { const size = 256, h = noise(size, 32, 3, 2.2, 202); return { size, color: toGrey(h, size, .84, 1.04), normal: toNormal(h, size, 3) } }
    case 'foam': { const size = 128, h = noise(size, 16, 3, 2.6, 303); return { size, color: toGrey(h, size, .72, 1.04), normal: toNormal(h, size, 5) } }
    case 'sand': { const size = 256, h = noise(size, 64, 2, 2, 404); return { size, color: toGrey(h, size, .9, 1.02), normal: toNormal(h, size, 2) } }
    case 'stone': { const size = 128, h = noise(size, 8, 4, 1.8, 505); return { size, color: toGrey(h, size, .78, 1.05), normal: toNormal(h, size, 3) } }
    case 'ripple': { const size = 256, h = noise(size, 6, 4, 1.4, 606); return { size, color: toGrey(h, size, .95, 1.02), normal: toNormal(h, size, 4) } }
    case 'card': { const size = 128, h = noise(size, 48, 2, 1.6, 707); return { size, color: toGrey(h, size, .95, 1.01), normal: toNormal(h, size, 1) } }
  }
}

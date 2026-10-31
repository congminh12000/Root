/**
 * Reads the illustrated map into a coarse grid of ground classes, so the 3D scene follows the artwork:
 * water and roads become terrain, pine and broadleaf patches become forests, grey blobs become rocks.
 */
export const CELL = 4

export const Ground = { Grass: 0, Water: 1, Dirt: 2, Pine: 3, Leaf: 4, Autumn: 5, Rock: 6 } as const
export type Ground = typeof Ground[keyof typeof Ground]
const CLASSES = 7

export interface ArtGrid {
  cols: number; rows: number
  /** Majority class per cell. */
  cls: Uint8Array
  /** Mean artwork colour per cell (RGB, 0–255), used to tint foliage. */
  rgb: Uint8Array
}

export function classify(r: number, g: number, b: number): Ground {
  const hi = Math.max(r, g, b), lo = Math.min(r, g, b), l = r * .3 + g * .59 + b * .11
  if (b > r + 25 && b > g - 12) return Ground.Water
  if (r > 175 && r > g + 45 && r - b > 120) return Ground.Autumn
  if (r > 200 && g > 150 && b < 70 && r >= g && r - b > 140) return Ground.Autumn
  if (hi - lo < 22 && l > 85 && l < 200) return Ground.Rock
  if (l < 78) return Ground.Pine
  if (r > 160 && r - g > 20 && b > 90) return Ground.Dirt
  if (g > r + 5 && b < g - 30) return Ground.Leaf
  return Ground.Grass
}

export function sampleArt(image: HTMLImageElement, width: number, height: number): ArtGrid {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(image, 0, 0, width, height)
  const data = ctx.getImageData(0, 0, width, height).data
  const cols = Math.ceil(width / CELL), rows = Math.ceil(height / CELL)
  const votes = new Uint16Array(cols * rows * CLASSES), sums = new Float32Array(cols * rows * 3), counts = new Uint16Array(cols * rows)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4, c = ((y / CELL) | 0) * cols + ((x / CELL) | 0)
    votes[c * CLASSES + classify(data[i], data[i + 1], data[i + 2])]++
    sums[c * 3] += data[i]; sums[c * 3 + 1] += data[i + 1]; sums[c * 3 + 2] += data[i + 2]
    counts[c]++
  }
  const cls = new Uint8Array(cols * rows), rgb = new Uint8Array(cols * rows * 3)
  for (let c = 0; c < cols * rows; c++) {
    let best = 0
    for (let k = 1; k < CLASSES; k++) if (votes[c * CLASSES + k] > votes[c * CLASSES + best]) best = k
    cls[c] = best
    for (let k = 0; k < 3; k++) rgb[c * 3 + k] = sums[c * 3 + k] / Math.max(1, counts[c])
  }
  return { cols, rows, cls, rgb }
}

/** Fraction of each cell's 3×3 neighbourhood blurred `passes` times; used for soft shores and road edges. */
export function field(grid: ArtGrid, test: (c: number) => boolean, passes: number) {
  const { cols, rows } = grid
  let a = new Float32Array(cols * rows), b = new Float32Array(cols * rows)
  for (let i = 0; i < a.length; i++) a[i] = test(grid.cls[i]) ? 1 : 0
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      let s = 0, n = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy
        if (xx >= 0 && yy >= 0 && xx < cols && yy < rows) { s += a[yy * cols + xx]; n++ }
      }
      b[y * cols + x] = s / n
    }
    [a, b] = [b, a]
  }
  return a
}

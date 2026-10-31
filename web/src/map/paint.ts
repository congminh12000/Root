import { PLATEAU, SLOT, plotPositions, random, type Bridge, type MapLayout, type Rock, type Tree } from './layout'
import { PALETTES, type Palette } from './palettes'
import type { ClearingSpec, MapSpec, Pt, Suit } from './spec'

type Ctx = CanvasRenderingContext2D
const TAU = Math.PI * 2
const INK = 'rgba(32,28,21,.78)'
const SOFT_INK = 'rgba(32,28,21,.38)'
const SHADOW = 'rgba(14,20,12,.3)'

function rgb(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
}
function mix(a: string, b: string, t: number) {
  const x = rgb(a), y = rgb(b)
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')
}
const pick = (list: string[], v: number) => list[Math.floor(v * list.length) % list.length]

function trace(ctx: Ctx, points: Pt[], closed = false) {
  ctx.beginPath()
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))
  if (closed) ctx.closePath()
}
function stroke(ctx: Ctx, points: Pt[], color: string, width: number, alpha = 1, closed = false) {
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = width
  trace(ctx, points, closed)
  ctx.stroke()
  ctx.globalAlpha = 1
}
function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, rotation = 0) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, rotation, 0, TAU)
}
function normal(points: Pt[], i: number): Pt {
  const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)]
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  return [-(b[1] - a[1]) / len, (b[0] - a[0]) / len]
}
function offset(points: Pt[], d: number): Pt[] {
  return points.map((p, i) => { const n = normal(points, i); return [p[0] + n[0] * d, p[1] + n[1] * d] })
}
/** Even spacing, so hand-drawn wobble and hatching look the same along any curve. */
function resample(points: Pt[], step: number): Pt[] {
  const out: Pt[] = [points[0]]
  let carry = 0
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i], len = Math.hypot(bx - ax, by - ay)
    for (let t = step - carry; t <= len; t += step) out.push([ax + (bx - ax) * t / len, ay + (by - ay) * t / len])
    carry = (carry + len) % step
  }
  return out
}
/** Displaces a line along its normal with layered sine noise: a steady hand, not a ruler. */
function wobble(points: Pt[], amp: number, seed: number): Pt[] {
  const rand = random(seed), ph = [rand() * TAU, rand() * TAU, rand() * TAU]
  let along = 0
  return points.map((p, i) => {
    if (i) along += Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1])
    const k = (Math.sin(along / 11 + ph[0]) * .5 + Math.sin(along / 27 + ph[1]) * .35 + Math.sin(along / 4.7 + ph[2]) * .15) * amp
    const n = normal(points, i)
    return [p[0] + n[0] * k, p[1] + n[1] * k]
  })
}
/** A pen line drawn twice, slightly off, the way an illustrator goes over an edge. */
function inkLine(ctx: Ctx, points: Pt[], width: number, seed: number, closed = false) {
  ctx.lineCap = ctx.lineJoin = 'round'
  stroke(ctx, wobble(points, .9, seed), INK, width, 1, closed)
  stroke(ctx, wobble(points, 1.3, seed + 1), SOFT_INK, width * .45, 1, closed)
}
/** Short strokes perpendicular to an edge, on one side of it. */
function hatchEdge(ctx: Ctx, points: Pt[], from: number, to: number, every: number, rand: () => number, alpha = .4) {
  ctx.strokeStyle = INK
  ctx.lineWidth = .55
  ctx.globalAlpha = alpha
  ctx.beginPath()
  points.forEach((p, i) => {
    if (i % every) return
    const n = normal(points, i), len = to - from + (rand() - .5) * 2
    ctx.moveTo(p[0] + n[0] * from, p[1] + n[1] * from)
    ctx.lineTo(p[0] + n[0] * (from + len), p[1] + n[1] * (from + len))
  })
  ctx.stroke()
  ctx.globalAlpha = 1
}

function ground(ctx: Ctx, spec: MapSpec, p: Palette, rand: () => number) {
  const [w, h] = spec.size
  const g = ctx.createLinearGradient(0, 0, w * .35, h)
  g.addColorStop(0, p.floorLight)
  g.addColorStop(.55, p.floor)
  g.addColorStop(1, p.floorDark)
  ctx.fillStyle = g
  ctx.fillRect(-20, -20, w + 40, h + 40)
  for (let i = 0; i < 900; i++) {
    const r = 6 + rand() * 26
    ctx.globalAlpha = .07 + rand() * .1
    ctx.fillStyle = rand() < .5 ? p.floorDark : p.floorLight
    ellipse(ctx, rand() * w, rand() * h, r, r * .7)
    ctx.fill()
  }
  // Pen stipple across the forest floor.
  ctx.fillStyle = p.ink
  for (let i = 0; i < 9000; i++) {
    ctx.globalAlpha = .1 + rand() * .2
    ctx.fillRect(rand() * w, rand() * h, .7, .7)
  }
  ctx.globalAlpha = 1
}

function lanes(ctx: Ctx, layout: MapLayout, p: Palette, rand: () => number) {
  ctx.lineCap = ctx.lineJoin = 'round'
  const lines = layout.lanes.map(l => resample(l.points, 2))
  lines.forEach(l => stroke(ctx, l.map(([x, y]) => [x + 2, y + 3]), p.floorDark, 18, .4))
  lines.forEach(l => stroke(ctx, l, p.dirtDark, 13))
  lines.forEach(l => stroke(ctx, l, p.dirt, 9))
  lines.forEach(l => stroke(ctx, offset(l, -1.2), p.dirtLight, 3.5, .5))
  lines.forEach((l, i) => {
    stroke(ctx, wobble(offset(l, 6.4), .7, 300 + i), SOFT_INK, .7)
    stroke(ctx, wobble(offset(l, -6.4), .7, 400 + i), SOFT_INK, .7)
  })
  // The trail itself: a line of pale dots down the middle.
  lines.forEach(l => resample(l, 6.5).forEach(([x, y]) => {
    const jx = (rand() - .5) * .8, jy = (rand() - .5) * .8
    ctx.fillStyle = 'rgba(60,45,28,.5)'
    ellipse(ctx, x + jx + .5, y + jy + .8, 1.75, 1.4)
    ctx.fill()
    ctx.fillStyle = p.trail
    ellipse(ctx, x + jx, y + jy, 1.65, 1.35)
    ctx.fill()
  }))
}

function river(ctx: Ctx, r: { width: number; points: Pt[] }, i: number, p: Palette, rand: () => number) {
  const w = r.width, pts = resample(r.points, 2)
  ctx.lineCap = ctx.lineJoin = 'round'
  stroke(ctx, pts, p.bank, w + 12)
  stroke(ctx, offset(pts, 2.5), p.dirtDark, w + 3, .6)
  stroke(ctx, pts, p.water, w)
  stroke(ctx, offset(pts, 1.5), p.waterDeep, w * .42, .6)
  stroke(ctx, offset(pts, -w / 2 + 3), p.waterLight, 2.4, .75)
  stroke(ctx, offset(pts, w / 2 - 3), p.waterLight, 1.6, .5)
  // The near bank throws a thin shadow onto the water.
  stroke(ctx, offset(pts, -w / 2 + 1.2), 'rgba(20,40,40,.45)', 2.2)
  ctx.setLineDash([10, 15])
  stroke(ctx, wobble(offset(pts, w * .16), 1.2, 500 + i), p.waterLight, 1, .9)
  ctx.lineDashOffset = 12
  stroke(ctx, wobble(offset(pts, -w * .1), 1.2, 600 + i), p.waterLight, .9, .7)
  ctx.setLineDash([])
  ctx.lineDashOffset = 0
  inkLine(ctx, offset(pts, w / 2), 1.3, 700 + i)
  inkLine(ctx, offset(pts, -w / 2), 1.3, 800 + i)
  hatchEdge(ctx, pts, w / 2 + 1.5, w / 2 + 5, 3, rand)
  hatchEdge(ctx, pts, -w / 2 - 1.5, -w / 2 - 5, 3, rand)
}

function lake(ctx: Ctx, points: Pt[], i: number, p: Palette, rand: () => number) {
  const shore = resample([...points, points[0]], 2)
  ctx.lineJoin = 'round'
  stroke(ctx, shore, p.bank, 14, 1, true)
  ctx.save()
  trace(ctx, shore, true)
  ctx.clip()
  ctx.fillStyle = p.waterDeep
  ctx.fill()
  for (const [width, color, alpha] of [[70, p.water, .7], [36, p.water, 1], [12, p.waterLight, .6]] as const) {
    stroke(ctx, shore, color, width, alpha, true)
  }
  // Contour lines following the shore, a classic hand-drawn water convention.
  for (const d of [8, 15, 23]) for (const s of [-1, 1]) stroke(ctx, wobble(offset(shore, d * s), 1, 900 + d), p.waterLight, .9, .8 - d / 40, true)
  ctx.restore()
  inkLine(ctx, shore, 1.4, 1000 + i, true)
  hatchEdge(ctx, shore, 2, 6, 3, rand)
  hatchEdge(ctx, shore, -2, -6, 3, rand)
}

function bridge(ctx: Ctx, b: Bridge, p: Palette) {
  const L = b.span + 24, W = 12
  ctx.save()
  ctx.translate(b.x, b.y)
  // Shadow falls in world space, so it is offset before rotating.
  ctx.fillStyle = 'rgba(15,30,30,.42)'
  ctx.save()
  ctx.translate(4, 6)
  ctx.rotate(b.angle)
  ctx.fillRect(-L / 2, -W / 2, L, W)
  ctx.restore()
  ctx.save()
  ctx.translate(0, 3)
  ctx.rotate(b.angle)
  ctx.fillStyle = p.woodDark
  ctx.fillRect(-L / 2, -W / 2, L, W)
  ctx.restore()
  ctx.rotate(b.angle)
  ctx.fillStyle = p.wood
  ctx.fillRect(-L / 2, -W / 2, L, W)
  ctx.strokeStyle = INK
  ctx.lineWidth = .6
  for (let x = -L / 2 + 3; x < L / 2; x += 3.4) {
    ctx.beginPath()
    ctx.moveTo(x, -W / 2)
    ctx.lineTo(x + .4, W / 2)
    ctx.stroke()
  }
  ctx.fillStyle = p.woodDark
  for (const side of [-1, 1]) {
    ctx.fillRect(-L / 2, side * W / 2 - 1.2, L, 2.4)
    for (const x of [-L / 2, -L / 6, L / 6, L / 2]) ctx.fillRect(x - 1.6, side * W / 2 - 1.6, 3.2, 3.2)
  }
  ctx.strokeStyle = INK
  ctx.lineWidth = 1
  ctx.strokeRect(-L / 2 - 1, -W / 2 - 1, L + 2, W + 2)
  ctx.restore()
}

function rock(ctx: Ctx, k: Rock, p: Palette) {
  const rand = random(k.seed), n = 10, depth = k.r * .78
  const top: Pt[] = Array.from({ length: n }, (_, i) => {
    const a = i / n * TAU + rand() * .35, r = k.r * (.7 + rand() * .4)
    return [k.x + Math.cos(a) * r, k.y - depth * .35 + Math.sin(a) * r * .6]
  })
  const shift = (d: number) => top.map(([x, y]) => [x, y + d] as Pt)
  ctx.fillStyle = SHADOW
  ellipse(ctx, k.x + k.r * .6, k.y + depth * .6 + k.r * .3, k.r * 1.2, k.r * .5)
  ctx.fill()
  // Extrude the outline downward to give the boulder a solid side wall.
  trace(ctx, shift(depth), true)
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.8
  ctx.stroke()
  for (let d = depth; d > 0; d -= .7) {
    ctx.fillStyle = mix(p.rockDark, p.rock, (1 - d / depth) * .45)
    trace(ctx, shift(d), true)
    ctx.fill()
  }
  ctx.strokeStyle = 'rgba(30,27,20,.45)'
  ctx.lineWidth = .6
  top.forEach(([x, y]) => {
    if (y < k.y - depth * .35) return
    for (let j = 0; j < 3; j++) {
      ctx.beginPath()
      ctx.moveTo(x + j * 1.6 - 1.6, y + 1)
      ctx.lineTo(x + j * 1.6 - 1.6 + (rand() - .5), y + depth * (.5 + rand() * .4))
      ctx.stroke()
    }
  })
  const g = ctx.createLinearGradient(k.x - k.r, k.y - k.r, k.x + k.r, k.y + k.r * .6)
  g.addColorStop(0, p.rockLight)
  g.addColorStop(1, p.rock)
  ctx.fillStyle = g
  trace(ctx, top, true)
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.1
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,250,232,.35)'
  trace(ctx, top.map(([x, y]) => [k.x - k.r * .12 + (x - k.x) * .55, k.y - depth * .35 - k.r * .1 + (y - k.y + depth * .35) * .55] as Pt), true)
  ctx.fill()
  ctx.strokeStyle = 'rgba(40,36,28,.55)'
  ctx.lineWidth = .7
  for (let i = 0; i < 2 + k.r / 12; i++) {
    const x = k.x + (rand() - .5) * k.r, y = k.y - depth * .35 + (rand() - .5) * k.r * .5
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + (rand() - .3) * k.r * .35, y + rand() * k.r * .3)
    ctx.stroke()
  }
  ctx.fillStyle = p.moss
  for (let i = 0; i < k.r / 3; i++) {
    ellipse(ctx, k.x + (rand() - .6) * k.r, k.y - depth * .35 - rand() * k.r * .4, 1.2 + rand() * 1.8, 1 + rand())
    ctx.fill()
  }
}

function conifer(ctx: Ctx, t: Tree, p: Palette, height: number) {
  const { x, y, h } = t, w = h * .5
  const base = mix(pick(p.conifer, t.v), p.haze, (1 - y / height) * .12)
  const dark = mix(base, p.coniferShade, .55), light = mix(base, '#eef3cf', .22)
  ctx.fillStyle = SHADOW
  ellipse(ctx, x + h * .3, y + 1, w * .8, w * .26, .35)
  ctx.fill()
  ctx.fillStyle = p.trunk
  ctx.fillRect(x - .9, y - 4, 1.8, 4.5)
  for (let i = 0; i < 4; i++) {
    const yb = y - 2.5 - i * h * .18, ya = yb - h * (.42 - i * .03), hw = w * (.5 - i * .09)
    const skirt: Pt[] = Array.from({ length: 7 }, (_, k) => [x - hw + 2 * hw * k / 6, yb + (k % 2 ? -1.6 : .7)])
    const tier: Pt[] = [[x, ya], ...skirt]
    ctx.fillStyle = base
    trace(ctx, tier, true)
    ctx.fill()
    ctx.fillStyle = dark
    trace(ctx, [[x, ya], [x + hw * .08, yb - .4], ...skirt.slice(4)], true)
    ctx.fill()
    ctx.strokeStyle = INK
    ctx.lineWidth = .62
    trace(ctx, tier, true)
    ctx.stroke()
    ctx.strokeStyle = light
    ctx.lineWidth = .75
    ctx.beginPath()
    ctx.moveTo(x - .6, ya + 1.5)
    ctx.lineTo(x - hw * .7, yb - 1.4)
    ctx.stroke()
  }
}

const CROWN = [[-.45, .15, .62], [.45, .18, .6], [0, -.35, .7], [-.15, .32, .6], [.28, -.08, .56]]
function broadleaf(ctx: Ctx, t: Tree, p: Palette, height: number) {
  const { x, y } = t, r = t.h * .5, cy = y - r * 1.25
  const base = mix(pick(p.leaves[t.group as Suit | 'mixed'], t.v), p.haze, (1 - y / height) * .12)
  const dark = mix(base, '#2a1a12', .42), light = mix(base, '#fff2c2', .3)
  ctx.fillStyle = SHADOW
  ellipse(ctx, x + r * .8, y + 1, r * 1.15, r * .42, .3)
  ctx.fill()
  ctx.strokeStyle = p.trunk
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y - r)
  ctx.stroke()
  // Outline first, then fill over its inner half, so only the crisp outer edge stays.
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.4
  CROWN.forEach(([dx, dy, s]) => { ellipse(ctx, x + dx * r, cy + dy * r, s * r, s * r); ctx.stroke() })
  ctx.fillStyle = dark
  CROWN.forEach(([dx, dy, s]) => { ellipse(ctx, x + dx * r, cy + dy * r, s * r, s * r); ctx.fill() })
  ctx.fillStyle = base
  CROWN.forEach(([dx, dy, s]) => { ellipse(ctx, x + dx * r - r * .1, cy + dy * r - r * .12, s * r * .86, s * r * .86); ctx.fill() })
  ctx.fillStyle = light
  for (const [dx, dy, s] of [[-.35, -.3, .24], [.05, -.58, .18], [-.6, .05, .14]]) {
    ellipse(ctx, x + dx * r, cy + dy * r, s * r, s * r)
    ctx.fill()
  }
  // Little leaf ticks inside the crown.
  ctx.strokeStyle = dark
  ctx.lineWidth = .6
  for (const [dx, dy] of [[.3, .2], [-.25, .35], [.45, -.2], [-.05, -.1]]) {
    ctx.beginPath()
    ctx.arc(x + dx * r, cy + dy * r, r * .16, .2 * Math.PI, .9 * Math.PI)
    ctx.stroke()
  }
}

/** An irregular outline for a clearing, so it reads as worn ground rather than a stamped disc. */
function blob(c: ClearingSpec, rx: number, ry: number, rand: () => number): Pt[] {
  const ph = [rand() * TAU, rand() * TAU, rand() * TAU]
  return Array.from({ length: 96 }, (_, i) => {
    const a = i / 96 * TAU, k = 1 + .032 * Math.sin(3 * a + ph[0]) + .022 * Math.sin(5 * a + ph[1]) + .012 * Math.sin(11 * a + ph[2])
    return [c.x + Math.cos(a) * rx * k, c.y + Math.sin(a) * ry * k] as Pt
  })
}

function plateau(ctx: Ctx, c: ClearingSpec, i: number, lanes: Pt[][], p: Palette, scale: number, rand: () => number) {
  const { rx, ry, depth } = PLATEAU, top = blob(c, rx, ry, rand)
  const shift = (d: number) => top.map(([x, y]) => [x, y + d] as Pt)
  ctx.save()
  ctx.shadowColor = 'rgba(12,18,8,.6)'
  ctx.shadowBlur = 16 * scale
  ctx.shadowOffsetX = 8 * scale
  ctx.shadowOffsetY = 10 * scale
  ctx.fillStyle = p.plateauSide
  trace(ctx, shift(depth), true)
  ctx.fill()
  ctx.restore()
  for (let d = depth; d > 0; d -= 1) {
    ctx.fillStyle = mix(p.plateauSide, p.dirtDark, 1 - d / depth)
    trace(ctx, shift(d), true)
    ctx.fill()
  }
  inkLine(ctx, shift(depth), 1.2, 1100 + i, true)
  // Hatching down the exposed earth wall.
  ctx.strokeStyle = INK
  ctx.lineWidth = .55
  ctx.globalAlpha = .55
  ctx.beginPath()
  top.forEach(([x, y], k) => {
    if (y < c.y + ry * .1 || k % 2) return
    ctx.moveTo(x, y + 1)
    ctx.lineTo(x + (rand() - .5) * .8, y + depth * (.55 + rand() * .4))
  })
  ctx.stroke()
  ctx.globalAlpha = 1
  const fill = ctx.createRadialGradient(c.x - rx * .35, c.y - ry * .45, 4, c.x, c.y, rx * 1.12)
  fill.addColorStop(0, p.meadowLight)
  fill.addColorStop(.55, p.meadow)
  fill.addColorStop(1, p.dirt)
  ctx.fillStyle = fill
  trace(ctx, top, true)
  ctx.fill()
  ctx.save()
  trace(ctx, top, true)
  ctx.clip()
  for (let k = 0; k < 16; k++) {
    const a = rand() * TAU, d = rand() * .8, r = 7 + rand() * 14
    ctx.globalAlpha = .1 + rand() * .1
    ctx.fillStyle = [p.dirtDark, p.grass, p.meadowLight][k % 3]
    ellipse(ctx, c.x + Math.cos(a) * rx * d, c.y + Math.sin(a) * ry * d, r, r * .6)
    ctx.fill()
  }
  // Lanes fade into the clearing as worn tracks instead of stopping at the rim.
  lanes.forEach(points => {
    const rim = points.filter(([x, y]) => {
      const d = Math.hypot((x - c.x) / rx, (y - c.y) / ry)
      return d > .45 && d < 1.15
    })
    stroke(ctx, rim, p.dirtDark, 9, .3)
    stroke(ctx, rim, p.dirt, 5, .45)
  })
  ctx.fillStyle = p.ink
  for (let k = 0; k < 70; k++) {
    const a = rand() * TAU, d = Math.sqrt(rand()) * .95
    ctx.globalAlpha = .15 + rand() * .2
    ctx.fillRect(c.x + Math.cos(a) * rx * d, c.y + Math.sin(a) * ry * d, .7, .7)
  }
  ctx.restore()
  ctx.globalAlpha = 1
  stroke(ctx, top.slice(48, 70).map(([x, y]) => [x + 2, y + 2]), 'rgba(255,248,222,.75)', 1.4)
  ctx.strokeStyle = p.grass
  ctx.lineWidth = .8
  for (let k = 0; k < 46; k++) {
    const a = rand() * TAU, d = Math.sqrt(rand()) * .9, x = c.x + Math.cos(a) * rx * d, y = c.y + Math.sin(a) * ry * d
    if (d < .55 && rand() < .7) continue
    ctx.globalAlpha = .55 + rand() * .35
    ctx.beginPath()
    ctx.moveTo(x - 1.6, y - 2.2)
    ctx.lineTo(x, y)
    ctx.lineTo(x + 1.4, y - 2.6)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  inkLine(ctx, top, 1.2, 1200 + i, true)
  slots(ctx, c, p)
}

function slots(ctx: Ctx, c: ClearingSpec, p: Palette) {
  const s = SLOT.size
  for (let k = 0; k < c.slots; k++) {
    const x = c.x + (k - (c.slots - 1) / 2) * SLOT.gap - s / 2, y = c.y + SLOT.y - s / 2
    ctx.fillStyle = SHADOW
    ctx.fillRect(x + 2.5, y + 4, s, s)
    ctx.fillStyle = p.woodDark
    ctx.beginPath()
    ctx.roundRect(x, y + 2.5, s, s, 3)
    ctx.fill()
    ctx.fillStyle = p.parchment
    ctx.beginPath()
    ctx.roundRect(x, y, s, s, 3)
    ctx.fill()
    ctx.strokeStyle = INK
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.strokeStyle = p.parchmentDark
    ctx.lineWidth = .8
    ctx.strokeRect(x + 3, y + 3, s - 6, s - 6)
  }
}

const LOT_INK = '#2b1d12'
/** Lot colours, kept light so empty plots stand out from grass, roads and shade (same palette as the 3D board). */
const LOT = {
  halo: '#e8cf96', haloGlow: 'rgba(236,212,156,.95)', side: '#a27a4c', curb: '#f4c35c',
  gravel: ['#fbf3dc', '#e6d7b0'], specks: ['#c9b78f', '#fbf3dc', '#a8977a', '#fff8e6'], stones: ['#d2cbb8', '#e2d8bf'],
  wood: '#a87443', woodLit: '#d6a56c', woodTop: '#e9c08a', rail: ['#a87443', '#d6a56c'],
}

/** A wooden fence post standing on (x, y), lit from the upper left like the rest of the board. */
function post(ctx: Ctx, x: number, y: number, height: number) {
  ctx.fillStyle = 'rgba(20,16,8,.35)'
  ellipse(ctx, x + 2.2, y + .8, 2.6, 1.1, .3)
  ctx.fill()
  ctx.fillStyle = LOT.wood
  ctx.fillRect(x - 1.5, y - height, 3, height)
  ctx.fillStyle = LOT.woodLit
  ctx.fillRect(x - 1.5, y - height, 1.3, height)
  ctx.strokeStyle = LOT_INK
  ctx.lineWidth = .8
  ctx.strokeRect(x - 1.5, y - height, 3, height)
  ctx.fillStyle = LOT.woodTop
  ellipse(ctx, x, y - height, 1.5, .7)
  ctx.fill()
}

/** One weathered rail between two posts; `sag` keeps rails from looking ruled. */
function rail(ctx: Ctx, a: Pt, b: Pt, lift: number, sag: number) {
  const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - lift + sag]
  for (const [color, width] of [[LOT_INK, 2.6], [LOT.rail[0], 1.5], [LOT.rail[1], .5]] as const) {
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.moveTo(a[0], a[1] - lift - (color === LOT.rail[1] ? .4 : 0))
    ctx.quadraticCurveTo(mid[0], mid[1], b[0], b[1] - lift)
    ctx.stroke()
  }
}

/**
 * An empty building lot that belongs to the painted world: a trampled clearing in the grass, a raised bed of gravel
 * and stones seen at the board's tilt, a golden stone curb, and a sparse wooden fence with a gap at the front.
 * Back fence → ground → side and front fence are drawn in depth order so the lot reads as an object in the scene.
 */
function dirtPlot(ctx: Ctx, cx: number, cy: number, size: number, rand: () => number) {
  const w = size / 2, d = size * .36, lip = 3.2, fence = 7.5
  const blob = (rx: number, ry: number, jitter: number, dy = 0) =>
    Array.from({ length: 18 }, (_, k) => {
      const a = k / 18 * TAU, r = 1 + (rand() - .5) * jitter
      return [cx + Math.cos(a) * rx * r, cy + dy + Math.sin(a) * ry * r] as Pt
    })
  // Trampled earth, the same tone as the painted roads, clears the grass and foliage around the lot.
  // The blur is in device pixels, so it follows the paint scale.
  ctx.save()
  ctx.shadowColor = LOT.haloGlow
  ctx.shadowBlur = 8 * ctx.getTransform().a
  ctx.fillStyle = LOT.halo
  trace(ctx, blob(w * 1.4, d * 1.85, .14, 2), true)
  ctx.fill()
  ctx.restore()
  ctx.fillStyle = 'rgba(246,230,190,.6)'
  trace(ctx, blob(w * 1.05, d * 1.35, .1, 1), true)
  ctx.fill()
  const corners: Pt[] = [[cx - w, cy - d], [cx + w, cy - d], [cx + w, cy + d], [cx - w, cy + d]]
  const along = (i: number, t: number): Pt => {
    const p = corners[i], q = corners[(i + 1) % 4]
    return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]
  }
  // Sparse fence: posts at the corners and a few between, some rails missing, an open gate in the front.
  const fenceSide = (i: number) => {
    const stops = i === 0 ? [0, .5, 1] : i === 2 ? [0, .32, .68, 1] : [0, 1]
    const posts = stops.map(t => along(i, t))
    posts.forEach((pt, k) => {
      if (k === 0 || (i === 2 && k === 2)) return
      if (rand() < .85) rail(ctx, posts[k - 1], pt, fence * .66, rand() * .7)
      if (rand() < .35) rail(ctx, posts[k - 1], pt, fence * .3, rand() * .5)
    })
    posts.forEach(pt => post(ctx, pt[0], pt[1], fence + (rand() - .5) * 1.4))
  }
  fenceSide(0)
  // Raised gravel bed: a darker earthen lip in front, a lit top face, then scattered stones.
  const bed = (dy: number, extra: number) => {
    const pts: Pt[] = []
    for (let k = 0; k < 4; k++) for (let j = 0; j < 4; j++) {
      const [x, y] = along(k, j / 4)
      pts.push([x + (cx - x) * .07 + (rand() - .5) * 1.2, y + (cy - y) * .1 + dy + (y > cy ? extra : 0) + (rand() - .5) * .8])
    }
    return pts
  }
  const top = bed(0, 0)
  trace(ctx, bed(0, lip), true)
  ctx.fillStyle = LOT.side
  ctx.fill()
  ctx.strokeStyle = LOT_INK
  ctx.lineWidth = 1
  ctx.stroke()
  const lit = ctx.createLinearGradient(cx - w, cy - d, cx + w, cy + d)
  lit.addColorStop(0, LOT.gravel[0])
  lit.addColorStop(1, LOT.gravel[1])
  trace(ctx, top, true)
  ctx.fillStyle = lit
  ctx.fill()
  ctx.save()
  ctx.clip()
  for (let k = 0; k < size * 4; k++) {
    ctx.fillStyle = LOT.specks[k % 4]
    ctx.fillRect(cx - w + rand() * size, cy - d + rand() * d * 2, .9, .7)
  }
  const stones = Array.from({ length: 9 }, () => ({
    x: cx + (rand() - .5) * (size - 7), y: cy + (rand() - .5) * (d * 2 - 4), r: 1 + rand() * 1.7, t: rand(),
  })).sort((a, b) => a.y - b.y)
  for (const s of stones) {
    ctx.fillStyle = 'rgba(30,24,14,.25)'
    ellipse(ctx, s.x + .9, s.y + .8, s.r, s.r * .6)
    ctx.fill()
    ctx.fillStyle = LOT.stones[s.t < .5 ? 0 : 1]
    ellipse(ctx, s.x, s.y, s.r, s.r * .7)
    ctx.fill()
    ctx.strokeStyle = LOT_INK
    ctx.lineWidth = .6
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,248,230,.6)'
    ellipse(ctx, s.x - s.r * .3, s.y - s.r * .25, s.r * .45, s.r * .25)
    ctx.fill()
  }
  // The back fence shades the far edge of the bed.
  const shade = ctx.createLinearGradient(0, cy - d, 0, cy - d + 5)
  shade.addColorStop(0, 'rgba(40,28,14,.25)')
  shade.addColorStop(1, 'rgba(40,28,14,0)')
  ctx.fillStyle = shade
  ctx.fillRect(cx - w, cy - d, size, 5)
  ctx.restore()
  // Golden curb on the bed's rim, inked on both sides so it reads against pale gravel and the road colour alike.
  trace(ctx, top, true)
  ctx.strokeStyle = LOT_INK
  ctx.lineWidth = 3.4
  ctx.stroke()
  ctx.strokeStyle = LOT.curb
  ctx.lineWidth = 2
  ctx.stroke()
  fenceSide(3)
  fenceSide(1)
  fenceSide(2)
}

function suitGlyph(ctx: Ctx, suit: Suit, x: number, y: number) {
  ctx.beginPath()
  if (suit === 'fox') {
    ctx.moveTo(x - 6, y - 3)
    ctx.lineTo(x - 4.2, y - 8)
    ctx.lineTo(x - 1.5, y - 4.2)
    ctx.lineTo(x + 1.5, y - 4.2)
    ctx.lineTo(x + 4.2, y - 8)
    ctx.lineTo(x + 6, y - 3)
    ctx.lineTo(x, y + 6)
    ctx.closePath()
  } else if (suit === 'rabbit') {
    ctx.ellipse(x - 2.6, y - 4, 1.8, 4.8, -.18, 0, TAU)
    ctx.moveTo(x + 4.4, y - 4)
    ctx.ellipse(x + 2.6, y - 4, 1.8, 4.8, .18, 0, TAU)
    ctx.moveTo(x + 4.2, y + 3)
    ctx.arc(x, y + 3, 4.2, 0, TAU)
  } else {
    ctx.arc(x, y + 1.8, 4.6, 0, TAU)
    ctx.moveTo(x - 1.6, y - 3.2)
    ctx.arc(x - 4.6, y - 3.2, 3, 0, TAU)
    ctx.moveTo(x + 7.6, y - 3.2)
    ctx.arc(x + 4.6, y - 3.2, 3, 0, TAU)
  }
  ctx.fill()
}

function marker(ctx: Ctx, c: ClearingSpec, p: Palette, x = c.x, y = c.y - PLATEAU.ry - 2) {
  ctx.fillStyle = SHADOW
  ellipse(ctx, x + 2.5, y + 3.5, 12.5, 12.5)
  ctx.fill()
  ctx.fillStyle = p.woodDark
  ellipse(ctx, x, y + 1.5, 12.5, 12.5)
  ctx.fill()
  ctx.fillStyle = p.suits[c.suit]
  ellipse(ctx, x, y, 11, 11)
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,246,220,.7)'
  ctx.lineWidth = 1
  ellipse(ctx, x, y, 8.6, 8.6)
  ctx.stroke()
  ctx.fillStyle = p.parchment
  suitGlyph(ctx, c.suit, x, y)
}

/** The suit badge alone on a transparent canvas, for renderers that place it themselves. */
export function suitBadge(c: ClearingSpec, p: Palette, scale = 4): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 32 * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  marker(ctx, c, p, 15, 15)
  return canvas
}

function ribbon(ctx: Ctx, c: ClearingSpec, p: Palette) {
  const text = c.name.toUpperCase(), spacing = 1.3
  ctx.font = "600 9px Georgia, 'Times New Roman', serif"
  const tw = [...text].reduce((sum, ch) => sum + ctx.measureText(ch).width + spacing, -spacing)
  const w = tw + 18, h = 14, x = c.x, y = c.y + PLATEAU.ry + 17
  ctx.fillStyle = SHADOW
  ctx.fillRect(x - w / 2 + 2, y - h / 2 + 3, w, h)
  ctx.fillStyle = p.parchmentDark
  ctx.strokeStyle = INK
  ctx.lineWidth = .8
  for (const s of [-1, 1]) {
    trace(ctx, [[x + s * (w / 2 - 3), y - h / 2 + 3], [x + s * (w / 2 + 8), y - h / 2 + 3], [x + s * (w / 2 + 4), y + 2.5],
      [x + s * (w / 2 + 8), y + h / 2 + 3], [x + s * (w / 2 - 3), y + h / 2 + 3]], true)
    ctx.fill()
    ctx.stroke()
  }
  ctx.fillStyle = p.parchment
  ctx.beginPath()
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = p.ink
  ctx.textBaseline = 'middle'
  let cx = x - tw / 2
  for (const ch of text) {
    ctx.fillText(ch, cx, y + .5)
    cx += ctx.measureText(ch).width + spacing
  }
}

function atmosphere(ctx: Ctx, spec: MapSpec) {
  const [w, h] = spec.size
  ctx.globalCompositeOperation = 'soft-light'
  const key = ctx.createLinearGradient(0, 0, w, h)
  key.addColorStop(0, 'rgba(255,226,160,.55)')
  key.addColorStop(.5, 'rgba(255,255,255,0)')
  key.addColorStop(1, 'rgba(10,25,40,.5)')
  ctx.fillStyle = key
  ctx.fillRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'source-over'
  const haze = ctx.createLinearGradient(0, 0, 0, h * .35)
  haze.addColorStop(0, 'rgba(228,224,200,.14)')
  haze.addColorStop(1, 'rgba(228,224,200,0)')
  ctx.fillStyle = haze
  ctx.fillRect(0, 0, w, h)
  const vignette = ctx.createRadialGradient(w / 2, h * .55, h * .45, w / 2, h * .55, h)
  vignette.addColorStop(0, 'rgba(16,20,12,0)')
  vignette.addColorStop(1, 'rgba(16,20,12,.38)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, w, h)
}

/** Printed-paper finish: a warm multiply wash and a fine grain kept at one texel per device pixel. */
function paper(ctx: Ctx, spec: MapSpec, p: Palette, scale: number, rand: () => number) {
  const [w, h] = spec.size, tile = document.createElement('canvas')
  tile.width = tile.height = 256
  const t = tile.getContext('2d')!
  const data = t.createImageData(256, 256)
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 200 + rand() * 55
    data.data[i] = data.data[i + 1] = data.data[i + 2] = v
    data.data[i + 3] = 255
  }
  t.putImageData(data, 0, 0)
  t.strokeStyle = 'rgba(150,130,100,.25)'
  for (let i = 0; i < 60; i++) {
    const x = rand() * 256, y = rand() * 256, a = rand() * TAU
    t.beginPath()
    t.moveTo(x, y)
    t.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9)
    t.stroke()
  }
  ctx.globalCompositeOperation = 'multiply'
  ctx.fillStyle = p.paper
  ctx.globalAlpha = .28
  ctx.fillRect(0, 0, w, h)
  const grain = ctx.createPattern(tile, 'repeat')!
  grain.setTransform(new DOMMatrix([1 / scale, 0, 0, 1 / scale, 0, 0]))
  ctx.fillStyle = grain
  ctx.globalAlpha = .55
  ctx.fillRect(0, 0, w, h)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

type Item = { key: number; draw: () => void }

/**
 * Paints the static board at `scale` device pixels per map unit.
 * Order: ground → lanes → water → bridges → depth-sorted trees, rocks and plateaus → light and paper → markers.
 */
export function paintMap(spec: MapSpec, layout: MapLayout, scale: number, art?: HTMLImageElement): HTMLCanvasElement {
  const p = PALETTES[spec.season], [w, h] = spec.size
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  if (art) {
    // Illustrated maps keep the artwork untouched; only slots, suit markers and names go on top.
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(art, 0, 0, w, h)
    const size = spec.plotSize ?? SLOT.size
    spec.clearings.forEach((c, i) => {
      const plots = plotPositions(c)
      plots.forEach(([x, y], k) => dirtPlot(ctx, x, y, size, random(spec.seed + i * 31 + k)))
      // The suit badge sits beside the leftmost lot so it never covers the painted buildings.
      const [x, y] = plots.reduce((a, b) => b[0] < a[0] ? b : a)
      marker(ctx, c, p, x - size / 2 - 14, y)
    })
    return canvas
  }
  const rand = random(spec.seed + 7)
  ground(ctx, spec, p, rand)
  lanes(ctx, layout, p, rand)
  layout.rivers.forEach((r, i) => river(ctx, r, i, p, rand))
  layout.lakes.forEach((l, i) => lake(ctx, l, i, p, rand))
  layout.bridges.forEach(b => bridge(ctx, b, p))
  const items: Item[] = [
    ...layout.trees.map(t => ({ key: t.y, draw: () => (t.group === 'conifer' ? conifer : broadleaf)(ctx, t, p, h) })),
    ...layout.rocks.map(k => ({ key: k.y + k.r * .5, draw: () => rock(ctx, k, p) })),
    ...spec.clearings.map((c, i) => ({
      key: c.y + PLATEAU.ry + PLATEAU.depth,
      draw: () => plateau(ctx, c, i, layout.lanes.filter(l => l.a === i || l.b === i).map(l => l.points), p, scale,
        random(spec.seed + i * 131)),
    })),
  ]
  items.sort((a, b) => a.key - b.key).forEach(item => item.draw())
  atmosphere(ctx, spec)
  paper(ctx, spec, p, scale, rand)
  spec.clearings.forEach(c => { marker(ctx, c, p); ribbon(ctx, c, p) })
  return canvas
}

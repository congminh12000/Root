import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import props from '../../../maps/lakeside.scene.json'
import { random, plotPositions, SLOT } from '../map/layout'
import { suitBadge } from '../map/paint'
import { PALETTES } from '../map/palettes'
import type { MapSpec, Pt } from '../map/spec'
import { traceRoutes, type Route } from './routes'
import { CELL, field, Ground, sampleArt, type ArtGrid } from './sample'

/**
 * Three.js rebuild of an illustrated map. The artwork drives the layout (water, roads, forest and rocks are read from
 * its colours), hand-placed props add the buildings, and every mesh is cel-shaded with ink outlines to match the art.
 * Frame: one world unit per artwork pixel, x to the right, z downwards on the image, y up; light from the upper left.
 */

export type DebugMode = 'none' | 'classes' | 'height'
export interface SceneOptions {
  debug?: DebugMode
  /** Floats each clearing's number (1-based: clearing index + 1) above it, for talking about the board and its paths. */
  labels?: boolean
}

interface House { x: number; y: number; w: number; d: number; h: number; roof: string; wall: string; rot?: number; spire?: boolean }
interface Rect { x: number; y: number; w: number; d: number; rot?: number }
interface Placed { x: number; y: number; rot: number }
const PROPS = props as { houses: House[]; docks: Rect[]; boats: Placed[]; logs: Placed[] }

/** Parameters grouped by what they change on screen. */
const LOOK = {
  terrain: { waterLevel: -3, lakeBed: -11, roadDip: .9, forestRise: 2.2 },
  ground: { grass: '#a39a58', forestFloor: '#5d6337', road: '#d4b47c', shore: '#bfa66e', bed: '#3a6c6c' },
  water: { shallow: '#6cc2dc', deep: '#2b76b6', foam: '#e8f6f4' },
  forest: { pineStep: 12, leafStep: 13, pine: '#3f6149', ink: '#16241c' },
  lot: { gravel: '#efe3bf', specks: ['#c9b78f', '#fbf3dc', '#a8977a', '#fff8e6'], curb: '#f4c35c', side: '#a27a4c', wood: '#c08a50', glow: .35 },
  ruin: { stone: '#aaa48f', dark: '#77725f', moss: '#6f8a3e', glyph: '#8ff0dc' },
  trail: { width: 16, edge: 2.6, earth: '#f0d9a2', border: '#3e2a1a', stone: '#e4ddcb', stoneEvery: 12 },
  ink: '#24190f',
  light: { sun: '#fff0d4', sky: '#fff6e2', groundBounce: '#4f5c38' },
}

const toonRamp = (() => {
  const tex = new THREE.DataTexture(new Uint8Array([110, 170, 225, 255]), 4, 1, THREE.RedFormat)
  tex.minFilter = tex.magFilter = THREE.NearestFilter
  tex.needsUpdate = true
  return tex
})()
const toon = (color: THREE.ColorRepresentation, extra: THREE.MeshToonMaterialParameters = {}) =>
  new THREE.MeshToonMaterial({ color, gradientMap: toonRamp, ...extra })
const inkLines = new THREE.LineBasicMaterial({ color: LOOK.ink })

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

/**
 * The artwork paints boats, piers and their shadows over the lake; left alone they would rise as islands.
 * Small dry patches enclosed by water and the ground under hand-placed docks and boats are returned to the lake.
 */
function reclaimLake(grid: ArtGrid, docks: Rect[], boats: Placed[]) {
  const { cols, rows, cls } = grid, seen = new Uint8Array(cls.length)
  for (let start = 0; start < cls.length; start++) {
    if (seen[start] || cls[start] === Ground.Water) continue
    const stack = [start], cells: number[] = []
    let edge = false
    seen[start] = 1
    while (stack.length && cells.length <= 40) {
      const c = stack.pop()!, x = c % cols, y = (c / cols) | 0
      cells.push(c)
      if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) edge = true
      for (const n of [c - 1, c + 1, c - cols, c + cols]) {
        if (n >= 0 && n < cls.length && !seen[n] && cls[n] !== Ground.Water) { seen[n] = 1; stack.push(n) }
      }
    }
    if (!edge && !stack.length && cells.length <= 40) for (const c of cells) cls[c] = Ground.Water
  }
  const wet = (cx: number, cy: number, r: number) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx, y = cy + dy
      if (x >= 0 && y >= 0 && x < cols && y < rows && cls[y * cols + x] === Ground.Water) return true
    }
    return false
  }
  const flood = (px: number, py: number, rx: number, ry: number) => {
    const marks: number[] = []
    for (let y = Math.floor((py - ry) / CELL); y <= (py + ry) / CELL; y++) for (let x = Math.floor((px - rx) / CELL); x <= (px + rx) / CELL; x++) {
      if (x >= 0 && y >= 0 && x < cols && y < rows && wet(x, y, 3)) marks.push(y * cols + x)
    }
    for (const c of marks) cls[c] = Ground.Water
  }
  for (const d of docks) flood(d.x, d.y, d.w / 2 + 2, d.d / 2 + 2)
  for (const b of boats) flood(b.x, b.y, 16, 10)
}

/** Terrain heights per grid vertex, plus a bilinear lookup in artwork pixels. */
function terrainHeights(grid: ArtGrid) {
  const { terrain } = LOOK
  const land = field(grid, c => c !== Ground.Water, 3)
  const road = field(grid, c => c === Ground.Dirt, 1)
  const forest = field(grid, c => c === Ground.Pine, 2)
  const h = new Float32Array(land.length)
  for (let i = 0; i < h.length; i++) {
    const t = THREE.MathUtils.smoothstep(land[i], .15, .7)
    h[i] = THREE.MathUtils.lerp(terrain.lakeBed, 0, t) - road[i] * terrain.roadDip * t + forest[i] * terrain.forestRise * t
  }
  const at = (px: number, py: number) => {
    const gx = THREE.MathUtils.clamp(px / CELL - .5, 0, grid.cols - 1.001), gy = THREE.MathUtils.clamp(py / CELL - .5, 0, grid.rows - 1.001)
    const x0 = gx | 0, y0 = gy | 0, fx = gx - x0, fy = gy - y0, i = y0 * grid.cols + x0
    const top = h[i] * (1 - fx) + h[i + 1] * fx, bottom = h[i + grid.cols] * (1 - fx) + h[i + grid.cols + 1] * fx
    return top * (1 - fy) + bottom * fy
  }
  return { h, land, road, forest, at }
}

const CLASS_COLORS = ['#a39a58', '#2b76b6', '#d4b47c', '#1f3a2a', '#7cbf55', '#e07a2a', '#9a9a9a']

function buildTerrain(grid: ArtGrid, t: ReturnType<typeof terrainHeights>, width: number, height: number, debug: DebugMode) {
  const geo = new THREE.PlaneGeometry(width, height, grid.cols - 1, grid.rows - 1)
  geo.rotateX(-Math.PI / 2)
  geo.translate(width / 2, 0, height / 2)
  const pos = geo.attributes.position, colors = new Float32Array(pos.count * 3)
  const g = LOOK.ground, rand = random(41)
  const grass = new THREE.Color(g.grass), floor = new THREE.Color(g.forestFloor), road = new THREE.Color(g.road)
  const shore = new THREE.Color(g.shore), bed = new THREE.Color(g.bed), c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, t.h[i])
    if (debug === 'classes') c.set(CLASS_COLORS[grid.cls[i]])
    else if (debug === 'height') c.setScalar(THREE.MathUtils.clamp((t.h[i] + 12) / 16, 0, 1))
    else {
      c.copy(grass).lerp(floor, Math.min(1, t.forest[i] * 1.3)).lerp(road, THREE.MathUtils.smoothstep(t.road[i], .25, .6))
      const edge = t.land[i] > .2 && t.land[i] < .8 ? 1 - Math.abs(t.land[i] - .5) * 3.3 : 0
      c.lerp(shore, Math.max(0, edge)).lerp(bed, THREE.MathUtils.smoothstep(-t.h[i], 3.5, 8))
      c.multiplyScalar(.95 + rand() * .1)
    }
    c.toArray(colors, i * 3)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(geo, toon('#ffffff', { vertexColors: true }))
  mesh.receiveShadow = true
  return mesh
}

function buildWater(grid: ArtGrid, t: ReturnType<typeof terrainHeights>, width: number, height: number) {
  const level = LOOK.terrain.waterLevel, data = new Float32Array(grid.cols * grid.rows)
  for (let r = 0; r < grid.rows; r++) for (let q = 0; q < grid.cols; q++) {
    data[(grid.rows - 1 - r) * grid.cols + q] = level - t.h[r * grid.cols + q]
  }
  const depth = new THREE.DataTexture(data, grid.cols, grid.rows, THREE.RedFormat, THREE.FloatType)
  depth.minFilter = depth.magFilter = THREE.LinearFilter
  depth.needsUpdate = true
  const w = LOOK.water
  const material = new THREE.ShaderMaterial({
    uniforms: {
      depth: { value: depth }, time: { value: 0 }, size: { value: new THREE.Vector2(width, height) },
      shallow: { value: new THREE.Color(w.shallow) }, deep: { value: new THREE.Color(w.deep) }, foam: { value: new THREE.Color(w.foam) },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `
      uniform sampler2D depth; uniform float time; uniform vec2 size; uniform vec3 shallow, deep, foam;
      varying vec2 vUv;
      void main() {
        float d = texture2D(depth, vUv).r;
        if (d <= 0.) discard;
        vec2 p = vUv * size;
        vec3 col = mix(shallow, deep, smoothstep(.4, 5.5, d));
        // Painted wave curls: short bright dashes drifting slowly, kept away from the shore.
        float band = sin(p.y * .55 + sin(p.x * .045 + time * .5) * 2.2);
        float dash = smoothstep(.55, .9, sin(p.x * .09 + p.y * .02 + time * .25));
        float curl = smoothstep(.992, 1., band) * dash * step(.75, fract(sin(floor(p.y * .09) * 12.9898) * 43758.5)) * smoothstep(4., 7., d);
        float rim = 1. - smoothstep(.15, 1.1, d);
        col = mix(col, foam, max(curl * .8, rim * .75));
        gl_FragColor = vec4(col, 1.);
        #include <colorspace_fragment>
      }`,
  })
  const geo = new THREE.PlaneGeometry(width, height)
  geo.rotateX(-Math.PI / 2)
  geo.translate(width / 2, level, height / 2)
  return new THREE.Mesh(geo, material)
}

/** A shared ink hull: the same instances drawn slightly larger, back faces only, in dark ink. */
function hull(source: THREE.InstancedMesh, geometry: THREE.BufferGeometry, color: string) {
  const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }), source.count)
  mesh.instanceMatrix = source.instanceMatrix
  return mesh
}

function pineGeometry(scale: number) {
  const parts = [[12, 15, 5], [9.5, 13, 13], [6.6, 12, 21]].map(([r, h, y]) => {
    const cone = new THREE.ConeGeometry(r * scale, h * scale, 7, 1)
    cone.translate(0, (y + h / 2) * scale - (scale - 1) * 6, 0)
    return cone
  })
  return mergeGeometries(parts)!
}

function leafGeometry(scale: number) {
  const blobs = [[0, 17, 0, 10], [6.5, 13, 3, 7], [-6.5, 13.5, -1, 7.5], [1, 22, -2, 7], [-2, 14, 6, 6.5]].map(([x, y, z, r]) => {
    const ball = new THREE.IcosahedronGeometry(r * scale, 0)
    ball.translate(x, y - (scale - 1) * 10, z)
    return ball
  })
  return mergeGeometries(blobs)!
}

interface Blocker { x: number; y: number; rx: number; ry: number }
const blocked = (blockers: Blocker[], x: number, y: number) =>
  blockers.some(b => Math.abs(x - b.x) < b.rx && Math.abs(y - b.y) < b.ry)

function buildForest(grid: ArtGrid, t: ReturnType<typeof terrainHeights>, width: number, height: number, blockers: Blocker[]) {
  const rand = random(2026), f = LOOK.forest
  const cellAt = (x: number, y: number) => ((y / CELL) | 0) * grid.cols + ((x / CELL) | 0)
  const pines: THREE.Matrix4[] = [], pineTints: THREE.Color[] = []
  const leaves: THREE.Matrix4[] = [], leafTints: THREE.Color[] = []
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0)
  for (let gy = 0; gy < height; gy += f.pineStep) for (let gx = 0; gx < width; gx += f.pineStep) {
    const x = gx + rand() * f.pineStep, y = gy + rand() * f.pineStep, s = .8 + rand() * .5, turn = rand() * Math.PI * 2, v = rand()
    if (x >= width || y >= height || grid.cls[cellAt(x, y)] !== Ground.Pine || blocked(blockers, x, y)) continue
    if (t.at(x, y) < LOOK.terrain.waterLevel + 1) continue
    m.compose(new THREE.Vector3(x, t.at(x, y) - 1, y), q.setFromAxisAngle(up, turn), new THREE.Vector3(s, s * (.95 + v * .2), s))
    pines.push(m.clone())
    pineTints.push(new THREE.Color(f.pine).offsetHSL((v - .5) * .04, 0, (v - .5) * .12))
  }
  for (let gy = 0; gy < height; gy += f.leafStep) for (let gx = 0; gx < width; gx += f.leafStep) {
    const x = gx + rand() * f.leafStep, y = gy + rand() * f.leafStep, s = .85 + rand() * .35, turn = rand() * Math.PI * 2
    if (x >= width || y >= height || blocked(blockers, x, y)) continue
    const c = cellAt(x, y), kind = grid.cls[c]
    if ((kind !== Ground.Leaf && kind !== Ground.Autumn) || t.at(x, y) < LOOK.terrain.waterLevel + 1) continue
    m.compose(new THREE.Vector3(x, t.at(x, y) - .5, y), q.setFromAxisAngle(up, turn), new THREE.Vector3(s, s, s))
    leaves.push(m.clone())
    // Foliage takes the artwork's own hue for that spot, pushed a little brighter for the toon ramp.
    const tint = new THREE.Color(`rgb(${grid.rgb[c * 3]},${grid.rgb[c * 3 + 1]},${grid.rgb[c * 3 + 2]})`)
    const hsl = { h: 0, s: 0, l: 0 }
    tint.getHSL(hsl)
    leafTints.push(tint.setHSL(hsl.h, Math.min(1, hsl.s * 1.25), Math.min(.62, hsl.l * 1.3 + .08)))
  }
  const group = new THREE.Group()
  const instanced = (geo: THREE.BufferGeometry, outline: THREE.BufferGeometry, mats: THREE.Matrix4[], tints: THREE.Color[]) => {
    const mesh = new THREE.InstancedMesh(geo, toon('#ffffff'), mats.length)
    mats.forEach((mat, i) => { mesh.setMatrixAt(i, mat); mesh.setColorAt(i, tints[i]) })
    mesh.castShadow = mesh.receiveShadow = true
    group.add(mesh, hull(mesh, outline, f.ink))
    const trunk = new THREE.CylinderGeometry(1.6, 2.2, 8, 6)
    trunk.translate(0, 3, 0)
    const trunks = new THREE.InstancedMesh(trunk, toon('#5a3d26'), mats.length)
    mats.forEach((mat, i) => trunks.setMatrixAt(i, mat))
    trunks.castShadow = true
    group.add(trunks)
  }
  instanced(pineGeometry(1), pineGeometry(1.1), pines, pineTints)
  instanced(leafGeometry(1), leafGeometry(1.12), leaves, leafTints)
  return { group, counts: { pines: pines.length, leaves: leaves.length } }
}

function buildRocks(grid: ArtGrid, t: ReturnType<typeof terrainHeights>) {
  const { cols, rows, cls } = grid, seen = new Uint8Array(cls.length), rand = random(77)
  const found: { x: number; y: number; r: number }[] = []
  for (let start = 0; start < cls.length; start++) {
    if (seen[start] || cls[start] !== Ground.Rock) continue
    const stack = [start], cells: number[] = []
    seen[start] = 1
    while (stack.length) {
      const c = stack.pop()!, x = c % cols, y = (c / cols) | 0
      cells.push(c)
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy, n = yy * cols + xx
        if (xx >= 0 && yy >= 0 && xx < cols && yy < rows && !seen[n] && cls[n] === Ground.Rock) { seen[n] = 1; stack.push(n) }
      }
    }
    if (cells.length < 8) continue
    const cx = cells.reduce((s, c) => s + c % cols, 0) / cells.length, cy = cells.reduce((s, c) => s + ((c / cols) | 0), 0) / cells.length
    found.push({ x: (cx + .5) * CELL, y: (cy + .5) * CELL, r: Math.min(30, Math.sqrt(cells.length) * CELL * .55) })
  }
  // Shoreline stones, as in the artwork's rocky lake edge.
  for (let c = 0; c < cls.length; c++) {
    const l = t.land[c]
    if (l > .4 && l < .62 && rand() < .16) found.push({ x: (c % cols + rand()) * CELL, y: (((c / cols) | 0) + rand()) * CELL, r: 2.5 + rand() * 3.5 })
  }
  const geo = new THREE.IcosahedronGeometry(1, 1), p = geo.attributes.position
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (.85 + rand() * .3), Math.max(-.2, p.getY(i)) * (.85 + rand() * .3), p.getZ(i) * (.85 + rand() * .3))
  geo.computeVertexNormals()
  const mesh = new THREE.InstancedMesh(geo, toon('#ffffff'), found.length)
  const m = new THREE.Matrix4(), q = new THREE.Quaternion()
  found.forEach((k, i) => {
    m.compose(new THREE.Vector3(k.x, Math.max(t.at(k.x, k.y), LOOK.terrain.waterLevel - 1), k.y),
      q.setFromEuler(new THREE.Euler(0, rand() * 6.3, 0)), new THREE.Vector3(k.r, k.r * .62, k.r * .85))
    mesh.setMatrixAt(i, m)
    mesh.setColorAt(i, new THREE.Color('#9b988c').multiplyScalar(.8 + rand() * .3))
  })
  mesh.castShadow = mesh.receiveShadow = true
  const outline = new THREE.IcosahedronGeometry(1.12, 1)
  return new THREE.Group().add(mesh, hull(mesh, outline, LOOK.ink))
}

function outlined(geo: THREE.BufferGeometry, material: THREE.Material | THREE.Material[]) {
  const mesh = new THREE.Mesh(geo, material)
  mesh.castShadow = mesh.receiveShadow = true
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), inkLines))
  return mesh
}

/** Shingle courses, one dark line every few units along the roof slope (Extrude side UVs run in world units). */
const shingles = (() => {
  const c = document.createElement('canvas')
  c.width = c.height = 16
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 16, 16)
  ctx.fillStyle = 'rgba(40,24,14,.55)'
  ctx.fillRect(14, 0, 2, 16)
  ctx.fillStyle = 'rgba(40,24,14,.25)'
  ctx.fillRect(0, 7, 14, 1)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(1 / 4.5, 1 / 6)
  tex.magFilter = THREE.LinearFilter
  return tex
})()

function buildHouse(house: House, ground: number) {
  const { w, d, h } = house, g = new THREE.Group()
  const walls = new THREE.BoxGeometry(w, h, d)
  walls.translate(0, h / 2, 0)
  g.add(outlined(walls, toon(house.wall)))
  const roofMat = toon(house.roof, { map: shingles })
  if (house.spire) {
    const spire = new THREE.ConeGeometry(w * .75, h * .9, 4)
    spire.rotateY(Math.PI / 4)
    spire.translate(0, h + h * .45, 0)
    g.add(outlined(spire, roofMat))
  } else {
    const over = 3.5, rise = d * .72, shape = new THREE.Shape([
      new THREE.Vector2(-d / 2 - over, 0), new THREE.Vector2(d / 2 + over, 0), new THREE.Vector2(0, rise)])
    const roof = new THREE.ExtrudeGeometry(shape, { depth: w + over * 2, bevelEnabled: false })
    roof.rotateY(Math.PI / 2)
    roof.translate(-(w + over * 2) / 2, h - 1, 0)
    g.add(outlined(roof, roofMat))
    const ridge = new THREE.BoxGeometry(w + over * 2 + 1, 2, 2.4)
    ridge.translate(0, h - 1 + rise, 0)
    g.add(outlined(ridge, toon(new THREE.Color(house.roof).multiplyScalar(.6))))
    if (w > 40) {
      const chimney = new THREE.BoxGeometry(5, 12, 5)
      chimney.translate(w * .28, h + rise * .55, -d * .12)
      g.add(outlined(chimney, toon('#8a5a40')))
    }
  }
  // Door and windows on the face turned to the viewer.
  const dark = toon('#3e2a1c'), glass = toon('#3d5470')
  const door = new THREE.BoxGeometry(Math.min(8, w * .18), Math.min(12, h * .55), 1)
  door.translate(0, Math.min(12, h * .55) / 2, d / 2 + .4)
  g.add(new THREE.Mesh(door, dark))
  for (const side of [-1, 1]) {
    if (w < 34) continue
    const frame = new THREE.BoxGeometry(9, 9, .8)
    frame.translate(side * w * .3, h * .55, d / 2 + .3)
    g.add(new THREE.Mesh(frame, toon('#f4ecd8')))
    const win = new THREE.BoxGeometry(6.5, 6.5, 1)
    win.translate(side * w * .3, h * .55, d / 2 + .6)
    g.add(outlined(win, glass))
  }
  g.position.set(house.x, ground, house.y)
  g.rotation.y = -(house.rot ?? 0)
  return g
}

function plankTexture() {
  const c = document.createElement('canvas')
  c.width = 64; c.height = 64
  const ctx = c.getContext('2d')!
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#94683c' : '#a8794a'
    ctx.fillRect(0, i * 8, 64, 8)
    ctx.fillStyle = '#4a311c'
    ctx.fillRect(0, i * 8 + 7, 64, 1)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

function buildDocks(rects: Rect[]) {
  const g = new THREE.Group(), deckY = LOOK.terrain.waterLevel + 3, planks = plankTexture()
  const postGeo = new THREE.CylinderGeometry(1.6, 1.6, 9, 6), postMat = toon('#5e4026')
  for (const r of rects) {
    const dock = new THREE.Group()
    const deck = new THREE.BoxGeometry(r.w, 2.4, r.d)
    // Planks run across the dock's long side.
    const tex = planks.clone()
    tex.repeat.set(Math.max(r.w, r.d) / 16, 1)
    tex.rotation = r.w > r.d ? Math.PI / 2 : 0
    tex.needsUpdate = true
    dock.add(outlined(deck, toon('#ffffff', { map: tex })))
    const long = Math.max(r.w, r.d), n = Math.max(1, Math.round(long / 24))
    for (let k = 0; k <= n; k++) for (const side of [-1, 1]) {
      const along = -long / 2 + long * k / n, across = side * (Math.min(r.w, r.d) / 2 - 1)
      const post = new THREE.Mesh(postGeo, postMat)
      post.position.set(r.w > r.d ? along : across, 1, r.w > r.d ? across : along)
      post.castShadow = true
      dock.add(post)
    }
    dock.position.set(r.x, deckY, r.y)
    dock.rotation.y = -(r.rot ?? 0)
    g.add(dock)
  }
  return g
}

function buildBoats(boats: Placed[]) {
  const g = new THREE.Group(), shape = new THREE.Shape()
  shape.moveTo(-13, 0)
  shape.quadraticCurveTo(-6, 5.5, 4, 5)
  shape.quadraticCurveTo(13, 4, 14, 0)
  shape.quadraticCurveTo(13, -4, 4, -5)
  shape.quadraticCurveTo(-6, -5.5, -13, 0)
  const hullGeo = new THREE.ExtrudeGeometry(shape, { depth: 4, bevelEnabled: true, bevelSize: .8, bevelThickness: .8, bevelSegments: 1 })
  hullGeo.rotateX(-Math.PI / 2)
  const inner = new THREE.ShapeGeometry(shape)
  inner.rotateX(-Math.PI / 2)
  inner.scale(.8, 1, .7)
  for (const b of boats) {
    const boat = new THREE.Group()
    boat.add(outlined(hullGeo, toon('#7c4c2a')))
    const floor = new THREE.Mesh(inner, toon('#4a2f1a'))
    floor.position.y = 4.9
    boat.add(floor)
    boat.position.set(b.x, LOOK.terrain.waterLevel - 1.5, b.y)
    boat.rotation.y = -b.rot
    g.add(boat)
  }
  return g
}

function buildLogs(logs: Placed[], at: (x: number, y: number) => number) {
  const g = new THREE.Group(), geo = new THREE.CylinderGeometry(3.2, 3.2, 26, 9)
  geo.rotateZ(Math.PI / 2)
  for (const l of logs) {
    const log = outlined(geo, toon('#7a5634'))
    log.position.set(l.x, at(l.x, l.y) + 3, l.y)
    log.rotation.y = -l.rot
    g.add(log)
  }
  return g
}

function gravelTexture(seed: number) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!, rand = random(seed)
  ctx.fillStyle = LOOK.lot.gravel
  ctx.fillRect(0, 0, 128, 128)
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = LOOK.lot.specks[i % 4]
    ctx.fillRect(rand() * 128, rand() * 128, 2, 1.6)
  }
  for (let i = 0; i < 9; i++) {
    const x = 10 + rand() * 108, y = 10 + rand() * 108, r = 3 + rand() * 4
    ctx.fillStyle = 'rgba(30,24,14,.25)'
    ctx.beginPath(); ctx.ellipse(x + 1.5, y + 1.5, r, r * .7, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = rand() < .5 ? '#d2cbb8' : '#e2d8bf'
    ctx.beginPath(); ctx.ellipse(x, y, r, r * .7, 0, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#2b1d12'; ctx.lineWidth = 1; ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function haloTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!, grad = ctx.createRadialGradient(64, 64, 20, 64, 64, 64)
  grad.addColorStop(0, 'rgba(236,212,156,1)')
  grad.addColorStop(.7, 'rgba(230,204,146,.9)')
  grad.addColorStop(1, 'rgba(230,204,146,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * A building lot: a pale trampled-earth halo, a raised gravel bed with a light stone curb and a sparse fence with a
 * gate at the front. The bed and curb carry a little self-light so a lot stays bright in shadow and under the canopy.
 * A lot that still holds a ruin shows the ruin on a flagstone plinth instead, with no fence.
 */
function buildLot(x: number, y: number, size: number, ground: number, seed: number, halo: THREE.Texture, ruin = false) {
  const g = new THREE.Group(), rand = random(seed), w = size, d = size * .8
  const patch = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({ map: halo, transparent: true, depthWrite: false }))
  patch.rotation.x = -Math.PI / 2
  patch.scale.set(w * 1.15, d * 1.3, 1)
  patch.position.y = .35
  patch.renderOrder = 1
  g.add(patch)
  g.position.set(x, ground, y)
  if (ruin) return g.add(buildRuin(size, seed))
  const l = LOOK.lot, bed = new THREE.BoxGeometry(w, 3.2, d), gravel = gravelTexture(seed)
  bed.translate(0, 1.6, 0)
  const top = toon('#ffffff', { map: gravel, emissive: '#ffffff', emissiveMap: gravel, emissiveIntensity: l.glow }), side = toon(l.side)
  g.add(outlined(bed, [side, side, top, side, side, side]))
  const curb = toon(l.curb, { emissive: l.curb, emissiveIntensity: l.glow })
  for (const [cw, cd, cx, cz] of [[w, 2.4, 0, -d / 2 + 1.2], [w, 2.4, 0, d / 2 - 1.2], [2.4, d - 4.8, -w / 2 + 1.2, 0], [2.4, d - 4.8, w / 2 - 1.2, 0]]) {
    const stone = outlined(new THREE.BoxGeometry(cw, 1, cd), curb)
    stone.position.set(cx, 3.7, cz)
    g.add(stone)
  }
  const wood = toon(l.wood), post = new THREE.BoxGeometry(2.4, 11, 2.4)
  post.translate(0, 5.5, 0)
  const corners: [number, number][] = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]
  corners.forEach(([ax, az], i) => {
    const [bx, bz] = corners[(i + 1) % 4], stops = i === 2 ? [0, .33, .67, 1] : i === 0 ? [0, .5, 1] : [0, 1]
    const pts = stops.map(s => [ax + (bx - ax) * s, az + (bz - az) * s] as const)
    pts.forEach(([px, pz], k) => {
      if (k < pts.length - 1 || i === 3) {
        const p = outlined(post, wood)
        p.position.set(px, 0, pz)
        p.scale.y = .9 + rand() * .2
        g.add(p)
      }
      if (k === 0 || (i === 2 && k === 2)) return
      const [qx, qz] = pts[k - 1], len = Math.hypot(px - qx, pz - qz)
      for (const lift of [8.5, 5]) {
        if (rand() > (lift > 5 ? .85 : .4)) continue
        const rail = outlined(new THREE.BoxGeometry(len, 1.4, 1.2), wood)
        rail.position.set((px + qx) / 2, lift, (pz + qz) / 2)
        rail.rotation.y = -Math.atan2(pz - qz, px - qx)
        g.add(rail)
      }
    })
  })
  return g
}

function glyphTexture() {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 128
  const ctx = c.getContext('2d')!
  ctx.fillStyle = LOOK.ruin.dark
  ctx.fillRect(0, 0, 64, 128)
  ctx.strokeStyle = LOOK.ruin.glyph
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.shadowColor = LOOK.ruin.glyph
  ctx.shadowBlur = 10
  ctx.beginPath()
  ctx.moveTo(32, 18); ctx.lineTo(32, 110)
  ctx.moveTo(14, 36); ctx.lineTo(32, 56); ctx.lineTo(50, 36)
  ctx.moveTo(16, 92); ctx.lineTo(32, 76); ctx.lineTo(48, 92)
  ctx.stroke()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * An ancient ruin standing on a lot: crumbled stone walls along the back and left, a broken colonnade, a fallen drum
 * and a rune stone glowing in the middle. It fills the slot until a faction explores it.
 */
function buildRuin(size: number, seed: number) {
  const g = new THREE.Group(), rand = random(seed), r = LOOK.ruin, w = size, d = size * .8, base = 3
  const stone = toon(r.stone), dark = toon(r.dark), moss = toon(r.moss)
  const plinth = new THREE.BoxGeometry(w + 4, base, d + 4)
  plinth.translate(0, base / 2, 0)
  g.add(outlined(plinth, dark))
  const block = (bx: number, bz: number, bw: number, bh: number, bd: number, y = base, mat = stone) => {
    const geo = new THREE.BoxGeometry(bw, bh, bd)
    geo.translate(0, bh / 2, 0)
    const m = outlined(geo, mat)
    m.position.set(bx, y, bz)
    m.rotation.y = (rand() - .5) * .12
    g.add(m)
    return m
  }
  // Back wall then left wall, each a run of blocks whose height breaks off towards the open corner.
  const course = (from: [number, number], to: [number, number], tall: number) => {
    const n = 5, along = Math.hypot(to[0] - from[0], to[1] - from[1]) / n - .5
    const horizontal = Math.abs(to[0] - from[0]) > Math.abs(to[1] - from[1])
    for (let i = 0; i < n; i++) {
      const t = (i + .5) / n, h = Math.max(2.5, tall * (1 - t * .8) * (.7 + rand() * .5))
      const x = from[0] + (to[0] - from[0]) * t, z = from[1] + (to[1] - from[1]) * t
      block(x, z, horizontal ? along : 4, h, horizontal ? 4 : along)
      if (rand() < .55) block(x + (rand() - .5) * 2, z + (rand() - .5) * 1.5, 2.6, 1.1, 2.6, base + h, moss)
    }
  }
  course([-w / 2 + 2, -d / 2 + 2], [w / 2 - 2, -d / 2 + 2], 22)
  course([-w / 2 + 2, -d / 2 + 6], [-w / 2 + 2, d / 2 - 2], 16)
  // Broken colonnade at the front right, and one drum that has fallen over.
  const column = new THREE.CylinderGeometry(2.3, 2.7, 1, 8)
  for (const [cx, cz, h] of [[w / 2 - 3, d / 2 - 3, 24], [w / 2 - 3, -d / 2 + 8, 10]] as const) {
    const m = outlined(column, stone)
    m.scale.y = h
    m.position.set(cx, base + h / 2, cz)
    g.add(m)
    block(cx, cz, 6.4, 1.8, 6.4, base + h, dark)
  }
  const drum = outlined(column, stone)
  drum.scale.y = 9
  drum.rotation.set(0, .5, Math.PI / 2)
  drum.position.set(w / 8, base + 2.4, d / 2 - 3)
  g.add(drum)
  for (let i = 0; i < 6; i++) block((rand() - .3) * w * .7, (rand() - .2) * d * .7, 1.6 + rand() * 1.8, 1 + rand(), 1.6 + rand() * 1.8)
  // The rune stone: a dark slab whose carved glyph glows on both faces.
  const face = toon('#ffffff', { map: glyphTexture(), emissive: r.glyph, emissiveIntensity: .5 })
  const slab = new THREE.BoxGeometry(8, 20, 3)
  slab.translate(0, 10, 0)
  const rune = outlined(slab, [dark, dark, dark, dark, face, face])
  rune.position.set(-1, base, 1)
  rune.rotation.set(0, -.25, .07)
  g.add(rune)
  return g
}

/** A flat strip draped on the terrain along `points`, `width` wide, lifted `lift` above the ground. */
function ribbon(points: Pt[], width: number, lift: number, at: (x: number, y: number) => number) {
  const pos: number[] = [], index: number[] = []
  points.forEach(([x, y], i) => {
    const [px, py] = points[Math.max(0, i - 1)], [nx, ny] = points[Math.min(points.length - 1, i + 1)]
    const len = Math.hypot(nx - px, ny - py) || 1, ox = -(ny - py) / len * width / 2, oy = (nx - px) / len * width / 2
    for (const s of [-1, 1]) {
      const vx = x + ox * s, vy = y + oy * s
      pos.push(vx, Math.max(at(vx, vy), LOOK.terrain.waterLevel + .5) + lift, vy)
    }
    if (i) index.push(2 * i - 2, 2 * i, 2 * i - 1, 2 * i - 1, 2 * i, 2 * i + 1)
  })
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(index)
  geo.computeVertexNormals()
  return geo
}

/**
 * Movement paths drawn as board-game trails: a dark inked border, a bright packed-earth band on top of the painted
 * road, and a line of stepping stones down the middle, so every legal move between clearings reads at a glance.
 */
function buildTrails(routes: Route[], at: (x: number, y: number) => number) {
  const g = new THREE.Group(), t = LOOK.trail
  const flat = (color: string, offset: number) => toon(color, { side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: offset, polygonOffsetUnits: offset })
  const border = flat(t.border, -2), earth = flat(t.earth, -4)
  const stones: THREE.Matrix4[] = [], m = new THREE.Matrix4(), q = new THREE.Quaternion()
  for (const r of routes) {
    const border3d = new THREE.Mesh(ribbon(r.points, t.width + t.edge * 2, 1.4, at), border)
    const earth3d = new THREE.Mesh(ribbon(r.points, t.width, 1.9, at), earth)
    border3d.receiveShadow = earth3d.receiveShadow = true
    g.add(border3d, earth3d)
    let walked = 0, next = t.stoneEvery * 2.5
    r.points.forEach(([x, y], i) => {
      if (!i) return
      const [px, py] = r.points[i - 1]
      walked += Math.hypot(x - px, y - py)
      if (walked < next) return
      next += t.stoneEvery
      const turn = Math.atan2(y - py, x - px)
      m.compose(new THREE.Vector3(x, Math.max(at(x, y), LOOK.terrain.waterLevel + .5) + 2.6, y),
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -turn), new THREE.Vector3(1, 1, 1))
      stones.push(m.clone())
    })
  }
  const stone = new THREE.CylinderGeometry(3.2, 3.5, 2.4, 8)
  stone.scale(1.25, 1, .9)
  const mesh = new THREE.InstancedMesh(stone, toon(t.stone, { polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8 }), stones.length)
  stones.forEach((mat, i) => mesh.setMatrixAt(i, mat))
  mesh.receiveShadow = true
  const outline = new THREE.CylinderGeometry(3.9, 4.2, 1, 8)
  outline.scale(1.25, 1, .9)
  g.add(mesh, hull(mesh, outline, LOOK.ink))
  return g
}

/** A round ink-rimmed tag with the clearing's number, drawn over everything so it never hides behind a roof. */
function numberTag(n: number) {
  const size = 128, c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2)
  ctx.fillStyle = '#fbf3dc'
  ctx.fill()
  ctx.lineWidth = 9
  ctx.strokeStyle = LOOK.ink
  ctx.stroke()
  ctx.fillStyle = LOOK.ink
  ctx.font = `bold ${n > 9 ? 62 : 74}px Georgia, serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(n), size / 2, size / 2 + 4)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }))
  tag.renderOrder = 10
  tag.scale.set(46, 46, 1)
  return tag
}

export interface MapScene {
  dispose: () => void
  stats: Record<string, number>
  /** Points the camera at artwork pixel (x, y) from `distance` away; used by previews and checks. */
  look: (x: number, y: number, distance: number, tiltDeg?: number) => void
}

export async function createMapScene(host: HTMLElement, spec: MapSpec, options: SceneOptions = {}): Promise<MapScene> {
  if (!spec.background) throw new Error(`map ${spec.id} has no artwork to rebuild in 3D`)
  const [width, height] = spec.size, debug = options.debug ?? 'none'
  const image = await loadImage(spec.background)
  const grid = sampleArt(image, width, height)
  reclaimLake(grid, PROPS.docks, PROPS.boats)
  const terrain = terrainHeights(grid)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  host.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#1d2117')

  const sun = new THREE.DirectionalLight(LOOK.light.sun, 2.1)
  sun.position.set(width * .5 - 700, 900, height * .5 - 600)
  sun.target.position.set(width / 2, 0, height / 2)
  sun.castShadow = true
  sun.shadow.mapSize.set(4096, 4096)
  Object.assign(sun.shadow.camera, { left: -900, right: 900, top: 900, bottom: -900, near: 100, far: 2600 })
  sun.shadow.bias = -.0004
  sun.shadow.normalBias = .6
  scene.add(sun, sun.target, new THREE.HemisphereLight(LOOK.light.sky, LOOK.light.groundBounce, 1.5))

  const plotSize = spec.plotSize ?? SLOT.size
  const blockers: Blocker[] = [
    ...PROPS.houses.map(h => ({ x: h.x, y: h.y, rx: (h.rot ? h.d : h.w) / 2 + 8, ry: (h.rot ? h.w : h.d) / 2 + 10 })),
    ...PROPS.docks.map(r => ({ x: r.x, y: r.y, rx: r.w / 2 + 4, ry: r.d / 2 + 4 })),
    ...spec.clearings.flatMap(c => plotPositions(c).map(([x, y]) => ({ x, y, rx: plotSize * .95, ry: plotSize * .85 }))),
  ]
  const routes = traceRoutes(grid, spec)
  // Trees stay off the trails so a path is never hidden under the canopy.
  for (const r of routes) r.points.forEach(([x, y], i) => { if (i % 2 === 0) blockers.push({ x, y, rx: 12, ry: 12 }) })
  const forest = buildForest(grid, terrain, width, height, blockers)
  scene.add(buildTrails(routes, terrain.at))
  scene.add(buildTerrain(grid, terrain, width, height, debug), buildWater(grid, terrain, width, height), forest.group,
    buildRocks(grid, terrain), buildDocks(PROPS.docks), buildBoats(PROPS.boats), buildLogs(PROPS.logs, terrain.at))
  for (const h of PROPS.houses) scene.add(buildHouse(h, Math.max(terrain.at(h.x, h.y), LOOK.terrain.waterLevel + 2)))
  const halo = haloTexture(), palette = PALETTES[spec.season]
  spec.clearings.forEach((c, i) => {
    const plots = plotPositions(c)
    plots.forEach(([x, y], k) =>
      scene.add(buildLot(x, y, plotSize, terrain.at(x, y), spec.seed + i * 31 + k, halo, c.ruin && k === plots.length - 1)))
    const [bx, by] = plots.reduce((a, b) => b[0] < a[0] ? b : a)
    const badgeTex = new THREE.CanvasTexture(suitBadge(c, palette))
    badgeTex.colorSpace = THREE.SRGBColorSpace
    const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex }))
    badge.scale.set(30, 30, 1)
    badge.position.set(bx - plotSize / 2 - 16, terrain.at(bx, by) + 14, by)
    scene.add(badge)
    if (options.labels) {
      const tag = numberTag(i + 1)
      tag.position.set(c.x, Math.max(terrain.at(c.x, c.y), 0) + 60, c.y)
      scene.add(tag)
    }
  })

  const camera = new THREE.PerspectiveCamera(30, 1, 10, 8000)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(width / 2, 0, height / 2)
  controls.enableDamping = true
  controls.maxPolarAngle = 1.15
  controls.minDistance = 250
  controls.maxDistance = 4000
  const tilt = THREE.MathUtils.degToRad(34)
  // Frame the whole board like the artwork: seen from the south, tilted slightly off vertical.
  const frame = () => {
    const w = host.clientWidth || 800, h = host.clientHeight || 600
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    const half = THREE.MathUtils.degToRad(camera.fov / 2)
    const fitH = (height / 2) / Math.tan(half), fitW = (width / 2) / (Math.tan(half) * camera.aspect)
    return Math.max(fitH, fitW) * 1.04
  }
  const distance = frame()
  camera.position.set(width / 2, Math.cos(tilt) * distance, height / 2 + Math.sin(tilt) * distance)
  controls.update()
  const observer = new ResizeObserver(() => frame())
  observer.observe(host)

  const water = scene.children.find(o => o instanceof THREE.Mesh && o.material instanceof THREE.ShaderMaterial) as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const clock = new THREE.Clock()
  renderer.setAnimationLoop(() => {
    if (!reduced) water.material.uniforms.time.value = clock.getElapsedTime()
    controls.update()
    renderer.render(scene, camera)
  })
  return {
    stats: { ...forest.counts, routes: routes.length },
    look: (x, y, d, deg = 34) => {
      const a = THREE.MathUtils.degToRad(deg)
      controls.target.set(x, 0, y)
      camera.position.set(x, Math.cos(a) * d, y + Math.sin(a) * d)
      controls.update()
    },
    dispose: () => {
      renderer.setAnimationLoop(null)
      observer.disconnect()
      controls.dispose()
      scene.traverse(o => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
          o.geometry.dispose()
          for (const m of [o.material].flat()) m.dispose()
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}

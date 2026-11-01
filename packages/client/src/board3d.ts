import { AUTUMN } from '@root/game-data'
import { seededRng, type FactionId, type PlayerView } from '@root/game-engine'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Spot, Travel } from './motion.ts'
import { FACTION_COLOR, SUIT_COLOR } from './names.ts'

/**
 * The Autumn map as a 3D tabletop diorama, built only from game-data and our own procedural shapes (licensing.md:
 * no official art). Static scenery (table, ground, paths, forests, clearings) is built once; pieces are rebuilt on
 * every update. Positions come from `ClearingDef.at`; all randomness is seeded, so every browser draws the same board.
 */

const SPAN_X = 22, SPAN_Z = 18
const CLEARING_R = 1.45
/** Pieces are drawn larger than life so they read from the default camera. */
const PIECE_SCALE = 1.6
const world = (c: number): THREE.Vector3 => {
  const [x, y] = AUTUMN.clearings[c]!.at
  return new THREE.Vector3((x - 0.5) * SPAN_X, 0, (y - 0.5) * SPAN_Z)
}
const forestCentre = (f: number) => {
  const ring = AUTUMN.forests[f]!.map(world)
  return ring.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / ring.length)
}

/** Gentle rolling ground, flattened under clearings so pieces stand level. */
function groundHeight(x: number, z: number): number {
  let h = 0.18 * Math.sin(x * 0.55 + 1.3) * Math.cos(z * 0.47 - 0.4) + 0.08 * Math.sin(x * 1.7 + z * 1.3)
  for (const c of AUTUMN.clearings) {
    const p = world(c.id)
    const d = Math.hypot(x - p.x, z - p.z)
    h *= Math.min(1, Math.max(0, (d - CLEARING_R) / 1.2))
  }
  return h
}

function pointInPolygon(x: number, z: number, poly: THREE.Vector3[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!, b = poly[j]!
    if ((a.z > z) !== (b.z > z) && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside
  }
  return inside
}

function distToSegment(px: number, pz: number, a: THREE.Vector3, b: THREE.Vector3): number {
  const dx = b.x - a.x, dz = b.z - a.z
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / (dx * dx + dz * dz)))
  return Math.hypot(px - (a.x + t * dx), pz - (a.z + t * dz))
}

/** A text label as a camera-facing sprite. */
function label(text: string, opts: { size?: number; color?: string; bg?: string } = {}): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 128; canvas.height = 128
  const g = canvas.getContext('2d')!
  if (opts.bg) { g.fillStyle = opts.bg; g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.fill() }
  g.fillStyle = opts.color ?? '#fff'
  g.font = 'bold 72px system-ui, sans-serif'
  g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText(text, 64, 68)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }))
  sprite.scale.setScalar(opts.size ?? 0.7)
  sprite.renderOrder = 10
  return sprite
}

const mat = (color: string | number, rough = 0.8) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 })

// ── Static scenery ─────────────────────────────────────────────────────────────

function buildScenery(scene: THREE.Scene): THREE.Mesh[] {
  const rng = seededRng('autumn-scenery')
  const rand = () => rng.int(1_000_000) / 1_000_000

  // Table and board edge.
  const table = new THREE.Mesh(new THREE.BoxGeometry(SPAN_X + 4, 0.6, SPAN_Z + 4), mat('#6b4426', 0.6))
  table.position.y = -0.75 // top at -0.45, below the lowest ground
  table.receiveShadow = true
  scene.add(table)

  // Ground: a displaced, vertex-coloured plane (grass with autumn patches).
  const ground = new THREE.PlaneGeometry(SPAN_X + 3.4, SPAN_Z + 3.4, 140, 115)
  ground.rotateX(-Math.PI / 2)
  const pos = ground.attributes.position!
  const colors: number[] = []
  const grass = new THREE.Color('#9db86b'), dry = new THREE.Color('#c9b26a'), moss = new THREE.Color('#7fa35a')
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i)
    pos.setY(i, groundHeight(x, z))
    const n = 0.5 + 0.5 * Math.sin(x * 0.9 + Math.cos(z * 0.7) * 2) * Math.cos(z * 1.1 - x * 0.3)
    const c = grass.clone().lerp(n > 0.6 ? dry : moss, Math.abs(n - 0.5))
    colors.push(c.r, c.g, c.b)
  }
  ground.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  ground.computeVertexNormals()
  const groundMesh = new THREE.Mesh(ground, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }))
  groundMesh.receiveShadow = true
  scene.add(groundMesh)

  // Paths: flat dirt ribbons that follow the ground.
  const dirt = mat('#a9825a', 1)
  for (const [a, b] of AUTUMN.paths) {
    const pa = world(a), pb = world(b)
    const len = pa.distanceTo(pb)
    const strip = new THREE.PlaneGeometry(0.55, len, 1, Math.ceil(len * 3))
    strip.rotateX(-Math.PI / 2)
    const sp = strip.attributes.position!
    const dir = new THREE.Vector3().subVectors(pb, pa).normalize()
    const side = new THREE.Vector3(-dir.z, 0, dir.x)
    for (let i = 0; i < sp.count; i++) {
      const along = -sp.getZ(i) / len + 0.5, across = sp.getX(i)
      const p = pa.clone().lerp(pb, along).addScaledVector(side, across)
      sp.setXYZ(i, p.x, groundHeight(p.x, p.z) + 0.03, p.z)
    }
    strip.computeVertexNormals()
    const m = new THREE.Mesh(strip, dirt)
    m.receiveShadow = true
    scene.add(m)
  }

  // Forests: instanced low-poly trees scattered inside each forest, away from clearings and paths.
  const trunks: THREE.Matrix4[] = [], crowns: { m: THREE.Matrix4; c: THREE.Color }[] = []
  const leaf = ['#d9622b', '#e8a33a', '#b8452a', '#8a9a3c', '#f0c24b', '#5f8a3a'].map(c => new THREE.Color(c))
  for (const ring of AUTUMN.forests) {
    const poly = ring.map(world)
    const xs = poly.map(p => p.x), zs = poly.map(p => p.z)
    const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]
    for (let k = 0; k < 130; k++) {
      const x = x0 + rand() * (x1 - x0), z = z0 + rand() * (z1 - z0)
      if (!pointInPolygon(x, z, poly)) continue
      if (AUTUMN.clearings.some(c => world(c.id).distanceTo(new THREE.Vector3(x, 0, z)) < CLEARING_R + 0.7)) continue
      if (AUTUMN.paths.some(([a, b]) => distToSegment(x, z, world(a), world(b)) < 0.8)) continue
      const s = 0.55 + rand() * 0.6, y = groundHeight(x, z)
      trunks.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y + 0.25 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)))
      crowns.push({
        m: new THREE.Matrix4().compose(new THREE.Vector3(x, y + 0.85 * s, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6), new THREE.Vector3(s, s * (0.9 + rand() * 0.5), s)),
        c: leaf[rng.int(leaf.length)]!.clone().offsetHSL(0, 0, (rand() - 0.5) * 0.08),
      })
    }
  }
  const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.09, 0.5, 6), mat('#5b3a22'), trunks.length)
  trunks.forEach((m, i) => trunkMesh.setMatrixAt(i, m))
  const crownMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(0.32, 0.9, 7), mat('#ffffff', 0.85), crowns.length)
  crowns.forEach(({ m, c }, i) => { crownMesh.setMatrixAt(i, m); crownMesh.setColorAt(i, c) })
  for (const m of [trunkMesh, crownMesh]) { m.castShadow = true; m.receiveShadow = true; scene.add(m) }

  // Clearings: a stone ring in the suit colour around a trodden floor, with its number.
  const pickables: THREE.Mesh[] = []
  for (const c of AUTUMN.clearings) {
    const p = world(c.id)
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(CLEARING_R, CLEARING_R * 1.04, 0.12, 40), mat('#e3d3ad', 1))
    floor.position.set(p.x, 0.04, p.z)
    floor.receiveShadow = true
    floor.userData.clearing = c.id
    scene.add(floor)
    pickables.push(floor)
    const rim = new THREE.Mesh(new THREE.TorusGeometry(CLEARING_R, 0.09, 8, 48), mat(SUIT_COLOR[c.suit], 0.6))
    rim.rotation.x = Math.PI / 2
    rim.position.set(p.x, 0.12, p.z)
    rim.castShadow = true
    scene.add(rim)
    const no = label(String(c.id + 1), { bg: SUIT_COLOR[c.suit], size: 0.6 })
    no.position.set(p.x - CLEARING_R * 0.8, 0.9, p.z - CLEARING_R * 0.8)
    scene.add(no)
  }
  for (const [f] of AUTUMN.forests.entries()) {
    const tag = label(`r${f + 1}`, { color: '#3d5a2a', size: 0.5 })
    const c = forestCentre(f)
    tag.position.set(c.x, 1.6, c.z)
    scene.add(tag)
  }
  return pickables
}

// ── Pieces ─────────────────────────────────────────────────────────────────────

function warrior(color: string): THREE.Group {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.32, 10), mat(color, 0.5))
  body.position.y = 0.16
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), mat(color, 0.5))
  head.position.y = 0.4
  const earL = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.09, 6), mat(color, 0.5))
  earL.position.set(-0.06, 0.5, 0)
  const earR = earL.clone(); earR.position.x = 0.06
  g.add(body, head, earL, earR)
  g.traverse(o => { o.castShadow = true })
  return g
}

function building(type: string, color: string): THREE.Group {
  const g = new THREE.Group()
  if (type === 'roost') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.45, 8), mat('#6b4a2c'))
    trunk.position.y = 0.22
    const nest = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.07, 8, 16), mat(color, 0.6))
    nest.rotation.x = Math.PI / 2; nest.position.y = 0.47
    g.add(trunk, nest)
  } else if (type === 'base') {
    const tent = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 4), mat(color, 0.7))
    tent.position.y = 0.25; tent.rotation.y = Math.PI / 4
    g.add(tent)
  } else {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.38), mat(color, 0.7))
    box.position.y = 0.14
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.22, 4), mat('#7a3b22', 0.8))
    roof.position.y = 0.39; roof.rotation.y = Math.PI / 4
    g.add(box, roof)
    const glyph = label(type === 'sawmill' ? 'S' : type === 'workshop' ? 'W' : 'R', { size: 0.32 })
    glyph.position.y = 0.72
    g.add(glyph)
  }
  g.traverse(o => { o.castShadow = true })
  return g
}

function ruin(): THREE.Group {
  const g = new THREE.Group()
  for (const [x, h] of [[-0.1, 0.35], [0.1, 0.22]] as const) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, h, 7), mat('#9a9a92'))
    pillar.position.set(x, h / 2, 0)
    pillar.castShadow = true
    g.add(pillar)
  }
  return g
}

function token(type: string, color: string): THREE.Object3D {
  if (type === 'wood') {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 8), mat('#8a5a2b'))
    log.rotation.z = Math.PI / 2; log.position.y = 0.08; log.castShadow = true
    return log
  }
  if (type === 'keep') {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.5, 8), mat(color, 0.6))
    tower.position.y = 0.25; tower.castShadow = true
    return tower
  }
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 20), mat(color, 0.5))
  disc.position.y = 0.04; disc.castShadow = true
  return disc
}

function pawn(): THREE.Group {
  const g = new THREE.Group()
  const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 10), mat(FACTION_COLOR.vagabond, 0.6))
  cloak.position.y = 0.28
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), mat('#c8b08a'))
  head.position.y = 0.62
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.1), mat('#7a5a3a'))
  pack.position.set(0, 0.36, -0.14)
  g.add(cloak, head, pack)
  g.traverse(o => { o.castShadow = true })
  return g
}

/** Pieces for one view. Objects in `changed` clearings are listed in `pop`, plus one fading ring each in `pulse`. */
function buildPieces(view: PlayerView, highlight: number[], changed: number[]): { root: THREE.Group; pop: THREE.Object3D[]; pulse: THREE.Mesh[] } {
  const root = new THREE.Group()
  const pop: THREE.Object3D[] = [], pulse: THREE.Mesh[] = []
  for (const [id, c] of view.map.clearings.entries()) {
    const p = world(id)
    const fresh = changed.includes(id)
    const add = (o: THREE.Object3D) => { root.add(o); if (fresh) pop.push(o) }
    // Slots on an arc at the back of the clearing.
    c.slots.forEach((slot, i) => {
      const a = Math.PI * (1.15 + (i + 0.5) / c.slots.length * 0.7)
      const sx = p.x + Math.cos(a) * 0.85, sz = p.z + Math.sin(a) * 0.85
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.04, 0.66), mat('#f6efdc', 1))
      pad.position.set(sx, 0.12, sz)
      pad.receiveShadow = true
      root.add(pad)
      if (!slot) return
      const obj = slot.kind === 'ruin' ? ruin() : building(slot.type, FACTION_COLOR[slot.faction])
      obj.scale.setScalar(PIECE_SCALE)
      obj.position.set(sx, 0.14, sz)
      add(obj)
    })
    // Warriors in rows at the front; large groups become a stack with a count.
    const groups = Object.entries(c.warriors).filter(([, n]) => n && n > 0) as [FactionId, number][]
    groups.forEach(([f, n], gi) => {
      const baseX = p.x - (groups.length - 1) * 0.5 + gi * 1.0, baseZ = p.z + 0.5
      const shown = Math.min(n, 4)
      for (let k = 0; k < shown; k++) {
        const w = warrior(FACTION_COLOR[f])
        w.scale.setScalar(PIECE_SCALE)
        w.position.set(baseX + (k % 2) * 0.36 - 0.18, 0.12, baseZ + Math.floor(k / 2) * 0.32 - 0.16)
        add(w)
      }
      if (n > 1) {
        const tag = label(String(n), { bg: FACTION_COLOR[f], size: 0.5 })
        tag.position.set(baseX, 1.3, baseZ)
        root.add(tag)
      }
    })
    c.tokens.forEach((t, i) => {
      const obj = token(t.type, FACTION_COLOR[t.faction])
      obj.scale.setScalar(PIECE_SCALE)
      obj.position.add(new THREE.Vector3(p.x + 1.05, 0.12, p.z - 0.35 + i * 0.5))
      add(obj)
    })
    if (fresh) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(CLEARING_R, 0.09, 8, 48), new THREE.MeshBasicMaterial({ color: '#f2b705', transparent: true }))
      ring.rotation.x = Math.PI / 2
      ring.position.set(p.x, 0.22, p.z)
      root.add(ring)
      pulse.push(ring)
    }
    if (highlight.includes(id)) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(CLEARING_R + 0.18, 0.06, 8, 48), new THREE.MeshBasicMaterial({ color: '#fff36b' }))
      ring.rotation.x = Math.PI / 2
      ring.position.set(p.x, 0.2, p.z)
      root.add(ring)
    }
  }
  const where = view.factions.vagabond?.pawn
  if (where) {
    const fig = pawn()
    fig.scale.setScalar(PIECE_SCALE)
    const p = where.kind === 'clearing' ? world(where.id).add(new THREE.Vector3(0.6, 0, 0.6)) : forestCentre(where.id)
    fig.position.set(p.x, (where.kind === 'clearing' ? 0.12 : groundHeight(p.x, p.z)), p.z)
    root.add(fig)
    if (where.kind === 'clearing' && changed.includes(where.id)) pop.push(fig)
  }
  return { root, pop, pulse }
}

/** A piece standing on a spot: clearings are flat, forests follow the ground. */
const spotPoint = (s: Spot): THREE.Vector3 => {
  const p = s.kind === 'clearing' ? world(s.id) : forestCentre(s.id)
  p.y = s.kind === 'clearing' ? 0.12 : groundHeight(p.x, p.z)
  return p
}

/** One figure per travel (with its count), hopping along the path; hidden once it lands (see `animate`). */
function buildMovers(travels: Travel[]): { o: THREE.Object3D; from: THREE.Vector3; to: THREE.Vector3 }[] {
  return travels.map(t => {
    const o = new THREE.Group()
    const fig = t.pawn ? pawn() : warrior(FACTION_COLOR[t.faction])
    fig.scale.setScalar(PIECE_SCALE * 1.15)
    o.add(fig)
    if (t.count > 1) {
      const tag = label(String(t.count), { bg: FACTION_COLOR[t.faction], size: 0.5 })
      tag.position.y = 1.25
      o.add(tag)
    }
    return { o, from: spotPoint(t.from), to: spotPoint(t.to) }
  })
}

const POP_MS = 380, PULSE_MS = 1200, TRAVEL_MS = 750
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2)
/** Overshoots a little, then settles at 1 (easeOutBack). */
const easeOutBack = (x: number) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2



// ── The view ───────────────────────────────────────────────────────────────────

export interface Board3D {
  /** Redraws the pieces; clearings in `changed` pulse once and their pieces pop in; `travels` hop along their paths. */
  update(view: PlayerView, highlight: number[], changed?: number[], travels?: Travel[]): void
  dispose(): void
}

/** Mounts the 3D board in `host`. `onPick` receives a clearing id when one is clicked (without dragging). */
export function mountBoard3D(host: HTMLElement, onPick: (clearing: number) => void): Board3D {
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.outputColorSpace = THREE.SRGBColorSpace
  host.append(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#e7dcc0')
  scene.fog = new THREE.Fog('#e7dcc0', 40, 70)
  scene.add(new THREE.HemisphereLight('#fff6e0', '#6d5a3a', 1.1))
  const sun = new THREE.DirectionalLight('#ffe2b0', 2.2)
  sun.position.set(-9, 16, 7)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 13, bottom: -13, near: 1, far: 50 })
  sun.shadow.bias = -0.0005
  scene.add(sun)

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200)
  camera.position.set(0, 21, 15)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 0, 1)
  controls.enableDamping = true
  controls.maxPolarAngle = Math.PI * 0.42
  controls.minDistance = 8
  controls.maxDistance = 40

  const pickables = buildScenery(scene)
  let pieces: THREE.Group | null = null
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  type Mover = ReturnType<typeof buildMovers>[number]
  let anim: { start: number; pop: { o: THREE.Object3D; scale: number }[]; pulse: THREE.Mesh[]; movers: Mover[] } | null = null

  const resize = () => {
    const w = host.clientWidth || 800, h = Math.max(360, Math.round(w * 0.72))
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()

  // Click (not drag) picks a clearing.
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2()
  let down: [number, number] | null = null
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY] })
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return
    const r = renderer.domElement.getBoundingClientRect()
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(pointer, camera)
    const hit = ray.intersectObjects(pickables)[0]
    if (hit) onPick(hit.object.userData.clearing as number)
  })

  function animate(ms: number) {
    const a = anim!
    const k = easeOutBack(Math.min(1, ms / POP_MS))
    for (const { o, scale } of a.pop) o.scale.setScalar(scale * Math.max(0.05, k))
    const f = Math.min(1, ms / PULSE_MS)
    for (const ring of a.pulse) {
      ring.scale.setScalar(1 + 0.45 * f)
      ;(ring.material as THREE.MeshBasicMaterial).opacity = 1 - f
      ring.visible = f < 1
    }
    const t = Math.min(1, ms / TRAVEL_MS), e = easeInOut(t)
    for (const m of a.movers) {
      m.o.position.lerpVectors(m.from, m.to, e)
      m.o.position.y += Math.sin(Math.PI * e) * (0.6 + 0.08 * m.from.distanceTo(m.to))
      m.o.visible = t < 1
    }
    if (ms >= Math.max(POP_MS, PULSE_MS, a.movers.length ? TRAVEL_MS : 0)) anim = null
  }

  let running = true
  const tick = () => {
    if (!running) return
    controls.update()
    if (anim) animate(performance.now() - anim.start)
    renderer.render(scene, camera)
    requestAnimationFrame(tick)
  }
  tick()

  return {
    update(view, highlight, changed = [], travels = []) {
      if (pieces) {
        scene.remove(pieces)
        pieces.traverse(o => { if (o instanceof THREE.Mesh) o.geometry.dispose() })
      }
      const built = buildPieces(view, highlight, reduceMotion ? [] : changed)
      const movers = reduceMotion ? [] : buildMovers(travels)
      for (const m of movers) built.root.add(m.o)
      pieces = built.root
      scene.add(pieces)
      anim = built.pop.length || built.pulse.length || movers.length
        ? { start: performance.now(), pop: built.pop.map(o => ({ o, scale: o.scale.x })), pulse: built.pulse, movers }
        : null
      if (anim) animate(0)
    },
    dispose() {
      running = false
      observer.disconnect()
      controls.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}

/** Whether this browser can draw WebGL; the 2D board is used otherwise. */
export function webglAvailable(): boolean {
  try { return !!document.createElement('canvas').getContext('webgl2') } catch { return false }
}

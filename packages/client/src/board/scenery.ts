import { AUTUMN } from '@root/game-data'
import { seededRng } from '@root/game-engine'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { SUIT_COLOR } from '../names.ts'
import { alpha, color } from '../ui/tokens.ts'
import { CLEARING_R, forestCentre, GROUND_X, GROUND_Z, groundHeight, nearClearing, nearPath, pointInPolygon, SPAN_X, SPAN_Z, world } from './geo.ts'
import { badge, outline, toon } from './toon.ts'

/**
 * The static board, built once: a painted ground (meadow, forest floor, dirt paths), forests of pines and round
 * autumn trees, rocks, and the clearings with their suit ring and number. Our own shapes only (licensing.md); every
 * random choice is seeded, so every browser draws the same board.
 */

const TEX_W = 2048, TEX_H = Math.round(TEX_W * GROUND_Z / GROUND_X)
const px = (x: number) => (x / GROUND_X + 0.5) * TEX_W
const pz = (z: number) => (z / GROUND_Z + 0.5) * TEX_H
const PX_PER_UNIT = TEX_W / GROUND_X

/** The ground painted on a canvas: mottled meadow, darker forest floor, dirt paths with a darker edge. */
function paintGround(rand: () => number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = TEX_W; canvas.height = TEX_H
  const g = canvas.getContext('2d')!
  g.fillStyle = color.meadow
  g.fillRect(0, 0, TEX_W, TEX_H)
  // Mottled grass: soft blobs a shade lighter or darker.
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = alpha(rand() < 0.6 ? color.meadowLight : color.pineLight, 0.12 + rand() * 0.14)
    g.beginPath()
    g.ellipse(rand() * TEX_W, rand() * TEX_H, 12 + rand() * 46, 8 + rand() * 30, rand() * Math.PI, 0, Math.PI * 2)
    g.fill()
  }
  // Forest floor under the trees.
  for (const ring of AUTUMN.forests) {
    g.fillStyle = alpha(color.pine, 0.45)
    g.beginPath()
    ring.map(world).forEach((p, i) => (i ? g.lineTo(px(p.x), pz(p.z)) : g.moveTo(px(p.x), pz(p.z))))
    g.closePath(); g.fill()
  }
  // Paths: a darker edge under a dirt ribbon, then pebbles.
  const path = (width: number, style: string) => {
    g.strokeStyle = style; g.lineWidth = width * PX_PER_UNIT; g.lineCap = 'round'
    for (const [a, b] of AUTUMN.paths) {
      const pa = world(a), pb = world(b)
      g.beginPath(); g.moveTo(px(pa.x), pz(pa.z)); g.lineTo(px(pb.x), pz(pb.z)); g.stroke()
    }
  }
  path(0.78, color.pathEdge)
  path(0.62, color.path)
  for (const [a, b] of AUTUMN.paths) {
    const pa = world(a), pb = world(b)
    for (let i = 0; i < 26; i++) {
      const t = rand(), off = (rand() - 0.5) * 0.45
      const nx = -(pb.z - pa.z), nz = pb.x - pa.x, len = Math.hypot(nx, nz)
      g.fillStyle = alpha(rand() < 0.5 ? color.pathEdge : color.paperShade, 0.55)
      g.beginPath()
      g.arc(px(pa.x + (pb.x - pa.x) * t + nx / len * off), pz(pa.z + (pb.z - pa.z) * t + nz / len * off), 2 + rand() * 3, 0, Math.PI * 2)
      g.fill()
    }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

/** Pines: three stacked cones. Round trees: three merged blobs. Each with a trunk. */
const pineCrown = () => mergeGeometries([
  new THREE.ConeGeometry(0.36, 0.55, 9).translate(0, 0.5, 0),
  new THREE.ConeGeometry(0.29, 0.5, 9).translate(0, 0.8, 0),
  new THREE.ConeGeometry(0.22, 0.46, 9).translate(0, 1.08, 0),
  new THREE.ConeGeometry(0.13, 0.42, 9).translate(0, 1.34, 0),
])!
const roundCrown = () => mergeGeometries([
  new THREE.IcosahedronGeometry(0.36, 1).translate(0, 0.72, 0),
  new THREE.IcosahedronGeometry(0.27, 1).translate(0.22, 0.6, 0.08),
  new THREE.IcosahedronGeometry(0.25, 1).translate(-0.2, 0.62, -0.06),
])!
const trunkGeo = () => new THREE.CylinderGeometry(0.06, 0.09, 0.45, 6).translate(0, 0.22, 0)

interface Tree { x: number; z: number; s: number; turn: number; kind: 'pine' | 'round'; tint: string }

/** Trees inside each forest, kept off clearings and paths; a few more along the board's edge. */
function plantTrees(rand: () => number): Tree[] {
  const trees: Tree[] = []
  const pick = (r: number): Tree['kind'] => (r < 0.8 ? 'pine' : 'round')
  const tint = (kind: Tree['kind']) => kind === 'pine'
    ? (rand() < 0.45 ? color.pine : color.pineLight)
    : [color.pineLight, color.meadow, color.meadowLight, color.autumnOrange, color.autumnGold, color.pineLight, color.meadow][Math.floor(rand() * 7)]!
  const fits = (x: number, z: number, clear: number) => nearClearing(x, z) > CLEARING_R + clear && nearPath(x, z) > 0.62
  const place = (x: number, z: number) => {
    if (trees.some(t => Math.hypot(t.x - x, t.z - z) < 0.42)) return
    const kind = pick(rand())
    trees.push({ x, z, s: 0.75 + rand() * 0.5, turn: rand() * Math.PI * 2, kind, tint: tint(kind) })
  }
  for (const ring of AUTUMN.forests) {
    const poly = ring.map(world)
    const xs = poly.map(p => p.x), zs = poly.map(p => p.z)
    const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]
    for (let k = 0; k < 420; k++) {
      const x = x0 + rand() * (x1 - x0), z = z0 + rand() * (z1 - z0)
      if (pointInPolygon(x, z, poly) && fits(x, z, 0.55)) place(x, z)
    }
  }
  // A ragged tree line around the edge of the map, outside the playing area.
  for (let k = 0; k < 900; k++) {
    const x = (rand() - 0.5) * (GROUND_X - 0.6), z = (rand() - 0.5) * (GROUND_Z - 0.6)
    const edge = Math.max(Math.abs(x) - SPAN_X / 2, Math.abs(z) - SPAN_Z / 2)
    if (edge > -0.6 && fits(x, z, 0.9)) place(x, z)
  }
  return trees
}

function instanced(trees: Tree[], crown: THREE.BufferGeometry, scene: THREE.Object3D) {
  const crowns = new THREE.InstancedMesh(crown, toon(color.white), trees.length)
  const trunks = new THREE.InstancedMesh(trunkGeo(), toon(color.wood), trees.length)
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0)
  trees.forEach((t, i) => {
    m.compose(new THREE.Vector3(t.x, groundHeight(t.x, t.z), t.z), q.setFromAxisAngle(up, t.turn), new THREE.Vector3(t.s, t.s, t.s))
    crowns.setMatrixAt(i, m); trunks.setMatrixAt(i, m)
    crowns.setColorAt(i, new THREE.Color(t.tint))
  })
  for (const mesh of [crowns, trunks]) { mesh.castShadow = true; mesh.receiveShadow = true; scene.add(outline(mesh, 0.035)) }
}

function rocks(rand: () => number, scene: THREE.Object3D) {
  const geo = new THREE.DodecahedronGeometry(0.22, 0)
  for (let k = 0, n = 0; k < 400 && n < 26; k++) {
    const x = (rand() - 0.5) * (SPAN_X + 1), z = (rand() - 0.5) * (SPAN_Z + 1)
    if (nearClearing(x, z) < CLEARING_R + 0.4 || nearPath(x, z) < 0.6) continue
    const rock = new THREE.Mesh(geo, toon(color.rock))
    rock.position.set(x, groundHeight(x, z) + 0.05, z)
    rock.scale.set(0.8 + rand() * 1.2, 0.5 + rand() * 0.6, 0.8 + rand() * 1.0)
    rock.rotation.y = rand() * Math.PI
    rock.castShadow = true; rock.receiveShadow = true
    scene.add(outline(rock, 0.05))
    n++
  }
}

/**
 * The classic board (map/classic-theme.ts): the ground, rocks and clearings; `plantTrees` adds the forests' meshes
 * later, after the first frame. Tree positions are drawn up front, in the original order of random numbers.
 */
export function buildClassicScenery(parent: THREE.Scene): { picking: THREE.Mesh[]; plantTrees(): void; dispose(): void } {
  const rng = seededRng('autumn-scenery')
  const rand = () => rng.int(1_000_000) / 1_000_000
  const scene = new THREE.Group()
  parent.add(scene)

  // The ground: a gently rolling plane with the painted texture.
  const ground = new THREE.PlaneGeometry(GROUND_X, GROUND_Z, 160, 130)
  ground.rotateX(-Math.PI / 2)
  const pos = ground.attributes.position!
  for (let i = 0; i < pos.count; i++) pos.setY(i, groundHeight(pos.getX(i), pos.getZ(i)))
  ground.computeVertexNormals()
  const groundMesh = new THREE.Mesh(ground, toon(color.white, { map: paintGround(rand) }))
  groundMesh.receiveShadow = true
  scene.add(groundMesh)

  // Where trees stand is drawn now, in the original order of random numbers; their meshes come later.
  const trees = plantTrees(rand)
  rocks(rand, scene)

  // Clearings: a trodden floor with an ink rim, a ring in the suit colour, and a badge with the suit and number.
  const pickables: THREE.Mesh[] = []
  const floorGeo = new THREE.CylinderGeometry(CLEARING_R, CLEARING_R * 1.03, 0.1, 48)
  const ringGeo = new THREE.TorusGeometry(CLEARING_R - 0.14, 0.07, 8, 56)
  for (const c of AUTUMN.clearings) {
    const p = world(c.id)
    const floor = new THREE.Mesh(floorGeo, toon(color.meadowLight))
    floor.position.set(p.x, 0.04, p.z)
    floor.receiveShadow = true
    floor.userData.clearing = c.id
    scene.add(outline(floor, 0.045))
    pickables.push(floor)
    const ring = new THREE.Mesh(ringGeo, toon(SUIT_COLOR[c.suit]))
    ring.rotation.x = Math.PI / 2
    ring.position.set(p.x, 0.1, p.z)
    scene.add(ring)
    const mark = badge(String(c.id + 1), { bg: SUIT_COLOR[c.suit], icon: c.suit, iconFill: color.paperRaised, size: 0.5 })
    mark.position.set(p.x - CLEARING_R * 0.78, 0.85, p.z - CLEARING_R * 0.78)
    scene.add(mark)
  }
  for (const [f] of AUTUMN.forests.entries()) {
    const c = forestCentre(f)
    const tag = badge(`r${f + 1}`, { bg: color.pine, fg: color.paperRaised, size: 0.38 })
    tag.position.set(c.x, 1.9, c.z)
    scene.add(tag)
  }
  const plant = () => {
    instanced(trees.filter(t => t.kind === 'pine'), pineCrown(), scene)
    instanced(trees.filter(t => t.kind === 'round'), roundCrown(), scene)
  }
  return {
    picking: pickables,
    plantTrees: plant,
    dispose() {
      // Materials are shared through toon()'s cache and stay; geometry and the painted ground go.
      scene.traverse(o => { if (!(o instanceof THREE.Sprite)) (o as THREE.Mesh).geometry?.dispose() })
      groundMesh.material.map?.dispose()
      parent.remove(scene)
    },
  }
}

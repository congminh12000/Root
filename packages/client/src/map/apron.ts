import * as THREE from 'three'
import { mat } from '../board/look.ts'
import { alpha, color } from '../ui/tokens.ts'
import type { Bounds } from './limits.ts'

/** A point on the ground in world units (x, z). */
export type XZ = readonly [number, number]

/** What a map continues into beyond its board: rivers flowing on, lakes opening out, all world units. */
export interface ApronSpec {
  bounds: Bounds
  radius: number
  seed: number
  rivers: { line: XZ[]; half: number }[]
  lakes: XZ[][]
  /** Height of the apron's ground, just under the board's lowest point (default -0.03). */
  ground?: number
}

const insidePoly = (x: number, z: number, poly: readonly XZ[]) => {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!, b = poly[j]!
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit
  }
  return hit
}
const segDist = (x: number, z: number, a: XZ, b: XZ) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)))
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz)
}

/** True where the apron is water: a river channel or a lake. */
export function apronWater(spec: ApronSpec, x: number, z: number, margin = 0): boolean {
  return spec.lakes.some(l => insidePoly(x, z, l)) || spec.rivers.some(r => r.line.slice(1).some((b, i) => segDist(x, z, r.line[i]!, b) < r.half + margin))
}

/**
 * The world around the board, out to `radius` (map/limits.ts), so no empty background ever shows: a painted forest
 * floor with glades, the map's rivers and lakes carried on, a dense band of outlined trees hiding the board's edge,
 * and lighter trees further out. Off the board only; nothing here is part of play.
 */
export function buildApron(scene: THREE.Scene, spec: ApronSpec, opts: { trees: number }): () => void {
  const { bounds: b, radius: R } = spec
  let seed = spec.seed
  const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
  const disposables: { dispose(): void }[] = []
  const onBoard = (x: number, z: number, pad = 0) => Math.abs(x) < b.halfW + pad && Math.abs(z) < b.halfD + pad

  // Painted ground: forest canopy over a darker floor, meadow glades, water.
  const size = 2048, canvas = document.createElement('canvas'); canvas.width = canvas.height = size
  const g = canvas.getContext('2d')!
  const px = (v: number) => (v / (2 * R) + .5) * size
  g.fillStyle = color.pine; g.fillRect(0, 0, size, size)
  // Meadow fading out from the board's edge, so the board blends into the land instead of sitting on it.
  const band = (pad: number, fill: string, blur: number) => {
    g.filter = `blur(${blur}px)`; g.fillStyle = fill
    g.fillRect(px(-b.halfW - pad), px(-b.halfD - pad), px(b.halfW + pad) - px(-b.halfW - pad), px(b.halfD + pad) - px(-b.halfD - pad))
    g.filter = 'none'
  }
  band(7, color.pineLight, 22)
  band(3, color.meadow, 10)
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = alpha([color.pineLight, color.meadow, color.ink][i % 7 === 0 ? 2 : i % 3 === 0 ? 1 : 0]!, .25 + rand() * .3)
    g.beginPath(); g.arc(rand() * size, rand() * size, 2 + rand() * 7, 0, Math.PI * 2); g.fill()
  }
  for (let i = 0; i < 60; i++) {
    const x = (rand() - .5) * 2 * R, z = (rand() - .5) * 2 * R
    if (onBoard(x, z, 4)) continue
    g.fillStyle = alpha(color.meadow, .85); g.beginPath()
    g.ellipse(px(x), px(z), 8 + rand() * 18, 6 + rand() * 12, rand() * 3, 0, Math.PI * 2); g.fill()
  }
  g.lineJoin = g.lineCap = 'round'
  for (const r of spec.rivers) {
    const path = () => { g.beginPath(); r.line.forEach(([x, z], i) => (i ? g.lineTo(px(x), px(z)) : g.moveTo(px(x), px(z)))) }
    const w = (r.half * 2 / (2 * R)) * size
    path(); g.lineWidth = w + 6; g.strokeStyle = color.pathEdge; g.stroke()
    path(); g.lineWidth = w; g.strokeStyle = color.water; g.stroke()
  }
  for (const l of spec.lakes) {
    g.beginPath(); l.forEach(([x, z], i) => (i ? g.lineTo(px(x), px(z)) : g.moveTo(px(x), px(z)))); g.closePath()
    g.lineWidth = 6; g.strokeStyle = color.pathEdge; g.stroke(); g.fillStyle = color.water; g.fill()
  }
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4
  const groundMat = mat('flock', color.white, { map: tex, repeat: 90 }), plane = new THREE.PlaneGeometry(2 * R, 2 * R)
  const ground = new THREE.Mesh(plane, groundMat); ground.rotation.x = -Math.PI / 2; ground.position.y = spec.ground ?? -.03; ground.receiveShadow = true
  scene.add(ground); disposables.push(tex, plane)

  // Trees: a dense outlined band at the board's edge, then sparser and plainer outwards.
  const near: { x: number; z: number; s: number; round: boolean }[] = [], far: typeof near = []
  for (let i = 0; i < opts.trees * 6 && near.length + far.length < opts.trees; i++) {
    const inBand = rand() < .45, reach = inBand ? 9 : R * .8
    const x = (rand() - .5) * 2 * (b.halfW + reach), z = (rand() - .5) * 2 * (b.halfD + reach)
    if (onBoard(x, z, .2) || apronWater(spec, x, z, .4)) continue
    ;(onBoard(x, z, 9) ? near : far).push({ x, z, s: .7 + rand() * .7, round: rand() < .07 })
  }
  const dummy = new THREE.Object3D()
  const plant = (list: typeof near, withInk: boolean) => {
    const pines = list.filter(t => !t.round), rounds = list.filter(t => t.round)
    const add = (items: typeof near, geo: THREE.BufferGeometry, c: string, lift: number) => {
      const mesh = new THREE.InstancedMesh(geo, mat('foam', c, { repeat: 2 }), items.length)
      items.forEach((t, i) => { dummy.position.set(t.x, (spec.ground ?? 0) + lift * t.s, t.z); dummy.scale.setScalar(t.s); dummy.rotation.set(0, i * 1.3, 0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix) })
      mesh.castShadow = withInk; mesh.receiveShadow = true
      scene.add(withInk ? mesh : mesh); disposables.push(geo)
    }
    for (let tier = 0; tier < 3; tier++) add(pines, new THREE.ConeGeometry(.32 - tier * .065, .5, withInk ? 7 : 5), tier === 1 ? color.pineLight : color.pine, .5 + tier * .23)
    add(rounds, new THREE.IcosahedronGeometry(.36, withInk ? 1 : 0), withInk ? color.meadow : color.pineLight, .73)
  }
  plant(near, true)
  plant(far, false)
  return () => disposables.forEach(d => d.dispose())
}

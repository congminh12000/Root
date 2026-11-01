import { AUTUMN } from '@root/game-data'
import * as THREE from 'three'
import type { Spot } from '../motion.ts'

/** Where things are on the 3D board: positions come from `ClearingDef.at` in game-data, nothing else. */

export const SPAN_X = 22, SPAN_Z = 18
/** The ground plane, a little larger than the span of the clearings. */
export const GROUND_X = SPAN_X + 3.4, GROUND_Z = SPAN_Z + 3.4
export const CLEARING_R = 1.45
/** Pieces are drawn larger than life so they read from the default camera. */
export const PIECE_SCALE = 1.6

export const world = (c: number): THREE.Vector3 => {
  const [x, y] = AUTUMN.clearings[c]!.at
  return new THREE.Vector3((x - 0.5) * SPAN_X, 0, (y - 0.5) * SPAN_Z)
}
export const forestCentre = (f: number) => {
  const ring = AUTUMN.forests[f]!.map(world)
  return ring.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / ring.length)
}

/** Gentle rolling ground, flattened under clearings so pieces stand level. */
export function groundHeight(x: number, z: number): number {
  let h = 0.14 * Math.sin(x * 0.55 + 1.3) * Math.cos(z * 0.47 - 0.4) + 0.06 * Math.sin(x * 1.7 + z * 1.3)
  for (const c of AUTUMN.clearings) {
    const p = world(c.id)
    const d = Math.hypot(x - p.x, z - p.z)
    h *= Math.min(1, Math.max(0, (d - CLEARING_R) / 1.2))
  }
  return h
}

export function pointInPolygon(x: number, z: number, poly: THREE.Vector3[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!, b = poly[j]!
    if ((a.z > z) !== (b.z > z) && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside
  }
  return inside
}

export function distToSegment(px: number, pz: number, a: THREE.Vector3, b: THREE.Vector3): number {
  const dx = b.x - a.x, dz = b.z - a.z
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / (dx * dx + dz * dz)))
  return Math.hypot(px - (a.x + t * dx), pz - (a.z + t * dz))
}

/** Distance from a point to the nearest path, and whether it is inside a clearing (plus a margin). */
export const nearPath = (x: number, z: number) => Math.min(...AUTUMN.paths.map(([a, b]) => distToSegment(x, z, world(a), world(b))))
export const nearClearing = (x: number, z: number) => Math.min(...AUTUMN.clearings.map(c => Math.hypot(x - world(c.id).x, z - world(c.id).z)))

/** A piece standing on a spot: clearings are flat, forests follow the ground. */
export const spotPoint = (s: Spot): THREE.Vector3 => {
  const p = s.kind === 'clearing' ? world(s.id) : forestCentre(s.id)
  p.y = s.kind === 'clearing' ? 0.12 : groundHeight(p.x, p.z)
  return p
}

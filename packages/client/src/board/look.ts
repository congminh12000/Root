import * as THREE from 'three'
import { color, factionColor, suitColor } from '../ui/tokens.ts'
import type { Surface, SurfaceMaps } from './texture-gen.ts'

/**
 * The tabletop look (docs/07-ui/style-guide.md §3): every 3D thing is made of a real model-making material, picked by
 * what it is. Painted wood for pieces and buildings, raw wood for bridges and logs, flock for grass, foam for tree
 * crowns, packed sand for paths and clearings, plaster stone, resin water, printed card. Materials are physically
 * based and cached, so pieces rebuilt on every update allocate nothing new on the GPU.
 *
 * Surfaces start as flat 1×1 placeholders and are filled in place once board/textures.worker.ts has generated them,
 * so the first frame never waits for them and no shader is compiled twice.
 */
export type Role = 'painted-wood' | 'raw-wood' | 'flock' | 'foam' | 'sand' | 'stone' | 'resin' | 'card'

const SURFACE: Record<Role, Surface> = { 'painted-wood': 'wood', 'raw-wood': 'wood', flock: 'flock', foam: 'foam', sand: 'sand', stone: 'stone', resin: 'ripple', card: 'card' }
const ROUGH: Record<Role, number> = { 'painted-wood': .42, 'raw-wood': .7, flock: 1, foam: 1, sand: 1, stone: .95, resin: .06, card: .85 }
const BUMP: Record<Role, number> = { 'painted-wood': .12, 'raw-wood': .6, flock: 1, foam: 1.4, sand: .9, stone: 1.2, resin: .35, card: .3 }

// ── Surfaces ──────────────────────────────────────────────────────────────────────────────────────────────────────
const textures: { surface: Surface; kind: 'color' | 'normal'; tex: THREE.DataTexture }[] = []
const loaded = new Map<Surface, SurfaceMaps>()

function surfaceTexture(surface: Surface, kind: 'color' | 'normal', repeat: number): THREE.DataTexture {
  const found = textures.find(t => t.surface === surface && t.kind === kind && t.tex.repeat.x === repeat)
  if (found) return found.tex
  const maps = loaded.get(surface)
  const tex = maps
    ? new THREE.DataTexture(maps[kind], maps.size, maps.size)
    : new THREE.DataTexture(kind === 'color' ? new Uint8Array([255, 255, 255, 255]) : new Uint8Array([128, 128, 255, 255]), 1, 1)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeat, repeat)
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.anisotropy = 8
  if (kind === 'color') tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  textures.push({ surface, kind, tex })
  return tex
}

/** Fills every surface texture in place with its generated maps; no material changes, so nothing recompiles. */
export function applySurfaces(list: (SurfaceMaps & { name: Surface })[]) {
  for (const s of list) loaded.set(s.name, s)
  for (const t of textures) {
    const s = loaded.get(t.surface)
    if (!s) continue
    // The GPU copy was allocated at 1×1: drop it, so the next frame uploads the full size (same material, no recompile).
    t.tex.dispose()
    t.tex.image = { data: s[t.kind], width: s.size, height: s.size }
    t.tex.needsUpdate = true
  }
}

let pending: Promise<void> | null = null
/** Starts generating the surfaces off the main thread (once); resolves when they are applied. */
export function loadSurfaces(): Promise<void> {
  if (pending) return pending
  pending = new Promise(resolve => {
    const worker = new Worker(new URL('./textures.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<(SurfaceMaps & { name: Surface })[]>) => {
      performance.mark('map:textures-start')
      applySurfaces(e.data)
      performance.measure('map:textures', 'map:textures-start')
      worker.terminate()
      resolve()
    }
    worker.postMessage(null)
  })
  return pending
}

// ── Motion ───────────────────────────────────────────────────────────────────────────────────────────────────────
/** Shared clock for the live scene (map/live.ts): foam crowns sway around their trunk, resin ripples drift. */
const time = { value: 0 }
/** Bends a tree crown with height, each instance out of step with its neighbours; still when the clock stands. */
function sway(m: THREE.MeshStandardMaterial) {
  m.onBeforeCompile = shader => {
    shader.uniforms.uTime = time
    shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 rootAt = instanceMatrix[3].xyz;
      #else
        vec3 rootAt = vec3(0.0);
      #endif
      float bend = max(0.0, position.y) * 0.05;
      transformed.x += sin(uTime * 1.3 + rootAt.x * 0.7 + rootAt.z * 0.4) * bend;
      transformed.z += cos(uTime * 1.1 + rootAt.z * 0.6) * bend * 0.6;`)
  }
  m.customProgramCacheKey = () => 'foam-sway'
}
/** Advances the live scene to `seconds`. */
export function tickLook(seconds: number) {
  time.value = seconds
  for (const t of textures) if (t.surface === 'ripple' && t.kind === 'normal') t.tex.offset.set(seconds * .012, seconds * .007)
}

// ── Materials ─────────────────────────────────────────────────────────────────────────────────────────────────────
const cache = new Map<string, THREE.MeshStandardMaterial>()

/**
 * The material for a `role` in colour `c`. `map` keeps a painted canvas (the boards' ground) under the surface's
 * relief; `repeat` is how often the surface tiles across the mesh's UVs (large for the ground, 1 for pieces).
 */
export function mat(role: Role, c: string = color.white, opts: { map?: THREE.Texture; repeat?: number } = {}): THREE.MeshStandardMaterial {
  const repeat = opts.repeat ?? 1
  const key = `${role}|${c}|${opts.map?.uuid ?? ''}|${repeat}`
  let m = cache.get(key)
  if (m) return m
  const surface = SURFACE[role]
  const base = {
    color: c, map: opts.map ?? (role === 'resin' ? null : surfaceTexture(surface, 'color', repeat)),
    normalMap: surfaceTexture(surface, 'normal', repeat), normalScale: new THREE.Vector2(BUMP[role], BUMP[role]), roughness: ROUGH[role],
  }
  m = role === 'resin'
    ? new THREE.MeshPhysicalMaterial({ ...base, color: new THREE.Color(c).multiplyScalar(.75), clearcoat: 1, clearcoatRoughness: .04 })
    : new THREE.MeshStandardMaterial(base)
  if (role === 'foam') sway(m)
  cache.set(key, m)
  return m
}

/**
 * A printed surface (stickers, the printed track): its own picture on card stock. Same shader as every other
 * material here, so printing adds no program to compile before the first frame.
 */
export function printed(map: THREE.Texture): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ map, normalMap: surfaceTexture('card', 'normal', 1), normalScale: new THREE.Vector2(BUMP.card, BUMP.card), roughness: ROUGH.card })
}

const hex = (c: string) => c.toLowerCase()
const PAINTED = new Set([...Object.values(factionColor), ...Object.values(suitColor), color.roofRed, color.roofBlue, color.white, color.paperRaised].map(hex))
const RAW = new Set([color.wood, color.woodLight].map(hex)), STONE = new Set([color.rock, color.inkSoft].map(hex))
const SAND = new Set([color.path, color.pathEdge, color.paperShade].map(hex)), WATER = new Set([color.water, color.waterShallow].map(hex))

/** What a thing of colour `c` is made of, when the caller only knows its colour (scenery written before roles). */
export function roleOf(c: string): Role {
  const h = hex(c)
  return PAINTED.has(h) ? 'painted-wood' : RAW.has(h) ? 'raw-wood' : STONE.has(h) ? 'stone' : SAND.has(h) ? 'sand' : WATER.has(h) ? 'resin' : 'flock'
}

/** A material by colour alone: the role is inferred (roleOf); with a painted `map` it is flocked ground. */
export const material = (c: string, opts: { map?: THREE.Texture; repeat?: number } = {}) => mat(opts.map ? 'flock' : roleOf(c), c, opts)

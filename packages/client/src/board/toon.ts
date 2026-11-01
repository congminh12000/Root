import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { color, font } from '../ui/tokens.ts'
import { iconSvg, type IconName } from '../ui/icons.ts'

/**
 * The hand-drawn look of style-guide §3: flat colour in three light steps (toon) and an ink outline that keeps its
 * width (an inverted hull pushed out along smoothed normals). Materials and hull geometries are cached, so pieces
 * rebuilt on every update allocate nothing new on the GPU.
 */

/** Three light steps, no smooth gradient. */
const RAMP = (() => {
  const t = new THREE.DataTexture(new Uint8Array([150, 205, 255]), 3, 1, THREE.RedFormat)
  t.minFilter = t.magFilter = THREE.NearestFilter
  t.generateMipmaps = false
  t.needsUpdate = true
  return t
})()

const toonCache = new Map<string, THREE.MeshToonMaterial>()
/** A flat toon material in one colour (or white, for per-instance colours). */
export function toon(c: string, opts: { map?: THREE.Texture } = {}): THREE.MeshToonMaterial {
  const key = `${c}|${opts.map?.uuid ?? ''}`
  let m = toonCache.get(key)
  if (!m) toonCache.set(key, m = new THREE.MeshToonMaterial({ color: c, gradientMap: RAMP, map: opts.map ?? null }))
  return m
}

const hullCache = new Map<number, THREE.MeshBasicMaterial>()
/** Back faces in ink, pushed out by `width` object units along the normal. */
function hullMaterial(width: number): THREE.MeshBasicMaterial {
  let m = hullCache.get(width)
  if (m) return m
  m = new THREE.MeshBasicMaterial({ color: color.ink, side: THREE.BackSide })
  m.onBeforeCompile = shader => {
    shader.uniforms.outlineWidth = { value: width }
    shader.vertexShader = `uniform float outlineWidth;\n${shader.vertexShader}`
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(normal) * outlineWidth;')
  }
  hullCache.set(width, m)
  return m
}

const hullGeometry = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>()
/** The same shape with welded vertices and smooth normals, so the pushed-out hull has no cracks at hard edges. */
function smoothed(g: THREE.BufferGeometry): THREE.BufferGeometry {
  let h = hullGeometry.get(g)
  if (!h) {
    const copy = new THREE.BufferGeometry()
    copy.setAttribute('position', g.getAttribute('position'))
    if (g.index) copy.setIndex(g.index)
    h = mergeVertices(copy, 1e-4)
    h.computeVertexNormals()
    hullGeometry.set(g, h)
  }
  return h
}

/** Gives every mesh under `root` an ink outline `width` object units thick (instanced meshes too). */
export function outline<T extends THREE.Object3D>(root: T, width: number): T {
  const meshes: THREE.Mesh[] = []
  root.traverse(o => { if (o instanceof THREE.Mesh && !o.userData.hull) meshes.push(o) })
  for (const m of meshes) {
    const hull = m instanceof THREE.InstancedMesh
      ? Object.assign(new THREE.InstancedMesh(smoothed(m.geometry), hullMaterial(width), m.count), { instanceMatrix: m.instanceMatrix, frustumCulled: false })
      : new THREE.Mesh(smoothed(m.geometry), hullMaterial(width))
    hull.userData.hull = true
    hull.raycast = () => {}
    m.add(hull)
  }
  return root
}

const geoCache = new Map<string, THREE.BufferGeometry>()
/** One geometry per shape, built once. */
export function shape(key: string, build: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = geoCache.get(key)
  if (!g) geoCache.set(key, g = build())
  return g
}

/** A mesh from the shape cache in a toon colour, placed and casting a shadow. */
export function part(key: string, build: () => THREE.BufferGeometry, c: string, at: [number, number, number] = [0, 0, 0], rot?: [number, number, number]): THREE.Mesh {
  const m = new THREE.Mesh(shape(key, build), toon(c))
  m.position.set(...at)
  if (rot) m.rotation.set(...rot)
  m.castShadow = true
  return m
}

// ── Labels ─────────────────────────────────────────────────────────────────────

const iconImages = new Map<string, Promise<HTMLImageElement>>()
/** One of our icons as an image, for drawing on canvas labels. */
function iconImage(name: IconName, fill: string): Promise<HTMLImageElement> {
  const key = `${name}|${fill}`
  let p = iconImages.get(key)
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSvg(name, fill, 96))}`
    })
    iconImages.set(key, p)
  }
  return p
}

const labelCache = new Map<string, THREE.SpriteMaterial>()
/**
 * A camera-facing badge: an ink-bordered pill in `bg` with an optional icon and text in the display font. Redrawn
 * once the font and icon have loaded; cached by content.
 */
export function badge(text: string, opts: { bg?: string; fg?: string; icon?: IconName; iconFill?: string; size?: number } = {}): THREE.Sprite {
  const key = JSON.stringify([text, opts.bg, opts.fg, opts.icon, opts.iconFill])
  let mat = labelCache.get(key)
  if (!mat) {
    const canvas = document.createElement('canvas')
    const withIcon = !!opts.icon
    canvas.width = withIcon ? 224 : 128; canvas.height = 128
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    const draw = (img?: HTMLImageElement) => {
      const g = canvas.getContext('2d')!
      g.clearRect(0, 0, canvas.width, canvas.height)
      g.fillStyle = opts.bg ?? color.paperRaised
      g.strokeStyle = color.ink
      g.lineWidth = 10
      g.beginPath()
      g.roundRect(8, 8, canvas.width - 16, 112, 56)
      g.fill(); g.stroke()
      if (img) g.drawImage(img, 22, 16, 96, 96)
      g.fillStyle = opts.fg ?? color.ink
      g.font = `76px ${font.display}`
      g.textAlign = 'center'; g.textBaseline = 'middle'
      g.fillText(text, withIcon ? 158 : 64, 70)
      tex.needsUpdate = true
    }
    draw()
    void document.fonts.load(`76px ${font.display}`, text).then(() => draw())
    if (opts.icon) void iconImage(opts.icon, opts.iconFill ?? color.paperRaised).then(img => { void document.fonts.load(`76px ${font.display}`, text).then(() => draw(img)) })
    labelCache.set(key, mat = new THREE.SpriteMaterial({ map: tex, depthTest: false }))
  }
  const sprite = new THREE.Sprite(mat)
  const s = opts.size ?? 0.6
  sprite.scale.set(s * (opts.icon ? 224 / 128 : 1), s, 1)
  sprite.renderOrder = 10
  return sprite
}

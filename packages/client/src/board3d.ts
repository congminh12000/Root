import type { PlayerView } from '@root/game-engine'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { buildMovers, buildPieces, disposePieces } from './board/pieces.ts'
import { buildScenery } from './board/scenery.ts'
import type { Travel } from './motion.ts'
import { color, motion } from './ui/tokens.ts'

/**
 * The Autumn map as a hand-drawn tabletop diorama (docs/07-ui/style-guide.md): toon shading, ink outlines, a painted
 * ground, built only from game-data and our own shapes (licensing.md). Scenery is built once (board/scenery.ts);
 * pieces are rebuilt on every update from cached shapes and materials (board/pieces.ts).
 */

const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2)
/** Overshoots a little, then settles at 1 (easeOutBack). */
const easeOutBack = (x: number) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2
/** Default view: high above the table, tilted like the style reference (style-guide §4). */
const HOME = { position: new THREE.Vector3(0, 23, 10.5), target: new THREE.Vector3(0, 0, 0.6) }
const CAMERA_MS = 400

export interface Board3D {
  /** Redraws the pieces; clearings in `changed` pulse once and their pieces pop in; `travels` hop along their paths. */
  update(view: PlayerView, highlight: number[], changed?: number[], travels?: Travel[], targets?: number[]): void
  /** Glides the camera back to the default view. */
  resetCamera(): void
  /** Renders `frames` frames back to back while orbiting, waits for the GPU each time; average ms per frame (board-kit). */
  measure(frames: number): number
  dispose(): void
}

/** Mounts the 3D board in `host`. `onPick` receives a clearing id when one is clicked (without dragging). */
export function mountBoard3D(host: HTMLElement, onPick: (clearing: number) => void, opts: { autoRotate?: boolean } = {}): Board3D {
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  // Flat colours straight from the palette: no filmic tone curve.
  renderer.toneMapping = THREE.NoToneMapping
  renderer.outputColorSpace = THREE.SRGBColorSpace
  host.append(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(color.paper)
  // One warm sun from the top left, a soft sky above (style-guide §4).
  scene.add(new THREE.HemisphereLight(color.paperRaised, color.pine, 1.5))
  const sun = new THREE.DirectionalLight(color.paperRaised, 2.1)
  sun.position.set(-10, 18, -7)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 14, bottom: -14, near: 1, far: 50 })
  sun.shadow.bias = -0.0006
  sun.shadow.radius = 3
  scene.add(sun)

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200)
  camera.position.copy(HOME.position)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.copy(HOME.target)
  controls.enableDamping = true
  controls.maxPolarAngle = Math.PI * 0.42
  controls.minDistance = 8
  controls.maxDistance = 40
  controls.autoRotate = !!opts.autoRotate

  const pickables = buildScenery(scene)
  let pieces: THREE.Group | null = null
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  type Mover = ReturnType<typeof buildMovers>[number]
  let anim: { start: number; pop: { o: THREE.Object3D; scale: number }[]; pulse: THREE.Mesh[]; movers: Mover[] } | null = null
  let glide: { start: number; from: THREE.Vector3; to: THREE.Vector3; fromTarget: THREE.Vector3 } | null = null

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
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; glide = null })
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return
    const r = renderer.domElement.getBoundingClientRect()
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(pointer, camera)
    const hit = ray.intersectObjects(pickables, false)[0]
    if (hit) onPick(hit.object.userData.clearing as number)
  })

  function animate(ms: number) {
    const a = anim!
    const k = easeOutBack(Math.min(1, ms / motion.pop))
    for (const { o, scale } of a.pop) o.scale.setScalar(scale * Math.max(0.05, k))
    const f = Math.min(1, ms / motion.pulse)
    for (const ring of a.pulse) {
      ring.scale.setScalar(1 + 0.45 * f)
      ;(ring.material as THREE.MeshBasicMaterial).opacity = 1 - f
      ring.visible = f < 1
    }
    const t = Math.min(1, ms / motion.travel), e = easeInOut(t)
    for (const m of a.movers) {
      m.o.position.lerpVectors(m.from, m.to, e)
      m.o.position.y += Math.sin(Math.PI * e) * (0.6 + 0.08 * m.from.distanceTo(m.to))
      m.o.visible = t < 1
    }
    if (ms >= Math.max(motion.pop, motion.pulse, a.movers.length ? motion.travel : 0)) anim = null
  }

  let running = true
  const tick = () => {
    if (!running) return
    if (glide) {
      const e = easeInOut(Math.min(1, (performance.now() - glide.start) / CAMERA_MS))
      camera.position.lerpVectors(glide.from, glide.to, e)
      controls.target.lerpVectors(glide.fromTarget, HOME.target, e)
      if (e >= 1) glide = null
    }
    controls.update()
    if (anim) animate(performance.now() - anim.start)
    renderer.render(scene, camera)
    requestAnimationFrame(tick)
  }
  tick()

  return {
    update(view, highlight, changed = [], travels = [], targets = []) {
      if (pieces) { scene.remove(pieces); disposePieces(pieces) }
      const built = buildPieces(view, highlight, reduceMotion ? [] : changed, targets)
      const movers = reduceMotion ? [] : buildMovers(travels)
      for (const m of movers) built.root.add(m.o)
      pieces = built.root
      scene.add(pieces)
      anim = built.pop.length || built.pulse.length || movers.length
        ? { start: performance.now(), pop: built.pop.map(o => ({ o, scale: o.scale.x })), pulse: built.pulse, movers }
        : null
      if (anim) animate(0)
    },
    resetCamera() {
      if (reduceMotion) { camera.position.copy(HOME.position); controls.target.copy(HOME.target); return }
      glide = { start: performance.now(), from: camera.position.clone(), to: HOME.position.clone(), fromTarget: controls.target.clone() }
    },
    measure(frames) {
      const gl = renderer.getContext()
      const t0 = performance.now()
      for (let i = 0; i < frames; i++) {
        camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.02)
        controls.update()
        renderer.render(scene, camera)
        gl.finish()
      }
      return (performance.now() - t0) / frames
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

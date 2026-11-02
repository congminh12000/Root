import type { PlayerView } from '@root/game-engine'
import * as THREE from 'three'
import { buildMovers, buildPieces, disposePieces } from '../board/pieces.ts'
import type { Travel } from '../motion.ts'
import { color, motion } from '../ui/tokens.ts'
import { createRig } from './camera-rig.ts'
import type { MapTheme } from './theme.ts'

const easeInOut = (x: number) => (x < .5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2)
/** Overshoots a little, then settles at 1 (easeOutBack). */
const easeOutBack = (x: number) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2

export interface MapStage {
  /** Redraws the pieces; clearings in `changed` pulse once and their pieces pop in; `travels` hop along their paths. */
  update(view: PlayerView, highlight: number[], changed?: number[], travels?: Travel[], targets?: number[]): void
  resetCamera(top?: boolean): void
  /** The camera now, for tests and the review page: zoom with its limits, tilt from vertical, look-at point. */
  camera(): { zoom: number; min: number; max: number; polar: number; target: [number, number] }
  /** Renders `frames` frames back to back while orbiting, waiting for the GPU each time; average ms per frame. */
  measure(frames: number): number
  dispose(): void
}

/**
 * The game's map, full screen (docs/07-ui/gameplay-map-only.md): a theme's scenery and apron, the pieces of the
 * current view, and a camera that never shows empty background. It draws only when something changes. Clicking
 * (not dragging) a clearing or one of its slots calls `onPick`.
 */
export function mountMap(host: HTMLElement, theme: MapTheme, onPick: (clearing: number) => void): MapStage {
  performance.mark('map:mount-start')
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.domElement.setAttribute('aria-label', `Bản đồ ${theme.name}: bấm một ô để chọn, kéo để di, cuộn hoặc chụm để phóng to`)
  renderer.domElement.style.touchAction = 'none'
  host.append(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(theme.background)
  scene.add(new THREE.HemisphereLight(color.paperRaised, color.wood, 2.1))
  const sun = new THREE.DirectionalLight(color.paperRaised, 3)
  sun.position.set(-12, 25, -12); sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 20, bottom: -20, near: 1, far: 70 })
  sun.shadow.bias = -.001
  scene.add(sun)

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 400)
  let frame = 0, disposed = false, ready = false
  const draw = () => { if (!disposed && !frame) frame = requestAnimationFrame(tick) }
  const rig = createRig(camera, renderer.domElement, theme.bounds, theme.clearingDepth, draw)
  const built = theme.build(scene)
  performance.measure('map:build', 'map:mount-start')

  let pieces: THREE.Group | null = null
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  type Mover = ReturnType<typeof buildMovers>[number]
  let anim: { start: number; pop: { o: THREE.Object3D; scale: number }[]; pulse: THREE.Mesh[]; movers: Mover[] } | null = null

  function animate(ms: number) {
    const a = anim!
    const k = easeOutBack(Math.min(1, ms / motion.pop))
    for (const { o, scale } of a.pop) o.scale.setScalar(scale * Math.max(.05, k))
    const f = Math.min(1, ms / motion.pulse)
    for (const ring of a.pulse) {
      ring.scale.set(ring.userData.base[0] * (1 + .45 * f), ring.userData.base[1] * (1 + .45 * f), 1)
      ;(ring.material as THREE.MeshBasicMaterial).opacity = 1 - f
      ring.visible = f < 1
    }
    const t = Math.min(1, ms / motion.travel), e = easeInOut(t)
    for (const m of a.movers) {
      m.o.position.lerpVectors(m.from, m.to, e)
      m.o.position.y += Math.sin(Math.PI * e) * (.6 + .08 * m.from.distanceTo(m.to))
      m.o.visible = t < 1
    }
    if (ms >= Math.max(motion.pop, motion.pulse, a.movers.length ? motion.travel : 0)) anim = null
  }
  function tick() {
    frame = 0
    if (disposed) return
    if (anim) { animate(performance.now() - anim.start); if (anim) draw() }
    if (ready) renderer.render(scene, camera)
  }

  const resize = () => {
    const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight
    renderer.setSize(w, h, false)
    rig.resize(w, h)
    draw()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  rig.home()
  resize()
  // Compile every shader off the main thread first (KHR_parallel_shader_compile where the browser has it), so opening
  // a game never freezes the page; the first frame follows as soon as the programs are ready.
  // Then decoration arrives one task per frame, each compiled the same way before it shows.
  void (async () => {
    await renderer.compileAsync(scene, camera)
    if (disposed) return
    performance.measure('map:compile', 'map:mount-start')
    ready = true
    renderer.render(scene, camera)
    performance.measure('map:first-frame', 'map:mount-start')
    for (const task of built.later) {
      await new Promise(r => setTimeout(r, 0))
      if (disposed) return
      task()
      await renderer.compileAsync(scene, camera)
      if (disposed) return
      draw()
    }
    performance.measure('map:complete', 'map:mount-start')
  })()
  // Canvas labels redraw once their font and icons load.
  void document.fonts.ready.then(draw)
  const later = [300, 900, 1800].map(ms => setTimeout(draw, ms))

  // A click or tap (not a drag) picks the clearing under it.
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2()
  let down: [number, number] | null = null
  const press = (e: PointerEvent) => { down = [e.clientX, e.clientY] }
  const release = (e: PointerEvent) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) { down = null; return }
    down = null
    const r = renderer.domElement.getBoundingClientRect()
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(pointer, camera)
    const hit = ray.intersectObjects(built.picking, false)[0]
    if (hit) onPick(hit.object.userData.clearing as number)
  }
  renderer.domElement.addEventListener('pointerdown', press)
  renderer.domElement.addEventListener('pointerup', release)

  return {
    update(view, highlight, changed = [], travels = [], targets = []) {
      if (pieces) { scene.remove(pieces); disposePieces(pieces) }
      const made = buildPieces(view, highlight, reduceMotion ? [] : changed, targets, theme.placement)
      const movers = reduceMotion ? [] : buildMovers(travels, theme.placement)
      for (const m of movers) made.root.add(m.o)
      for (const ring of made.pulse) ring.userData.base = [ring.scale.x, ring.scale.y]
      pieces = made.root
      scene.add(pieces)
      anim = made.pop.length || made.pulse.length || movers.length
        ? { start: performance.now(), pop: made.pop.map(o => ({ o, scale: o.scale.x })), pulse: made.pulse, movers }
        : null
      if (anim) animate(0)
      draw()
    },
    resetCamera(top = false) { rig.home(top) },
    camera() {
      const c = rig.controls
      return { zoom: camera.zoom, min: c.minZoom, max: c.maxZoom, polar: c.getPolarAngle(), target: [c.target.x, c.target.z] }
    },
    measure(frames) {
      const gl = renderer.getContext(), axis = new THREE.Vector3(0, 1, 0), t0 = performance.now()
      for (let i = 0; i < frames; i++) {
        camera.position.sub(rig.controls.target).applyAxisAngle(axis, .02).add(rig.controls.target)
        camera.lookAt(rig.controls.target); renderer.render(scene, camera); gl.finish()
      }
      return (performance.now() - t0) / frames
    },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); later.forEach(clearTimeout); observer.disconnect(); rig.dispose()
      renderer.domElement.removeEventListener('pointerdown', press); renderer.domElement.removeEventListener('pointerup', release)
      if (pieces) disposePieces(pieces)
      built.dispose(); renderer.dispose(); renderer.domElement.remove()
    },
  }
}

/** Whether this browser can draw WebGL 2; the map needs it (there is no 2D board any more). */
export function webglAvailable(): boolean {
  try { return !!document.createElement('canvas').getContext('webgl2') } catch { return false }
}

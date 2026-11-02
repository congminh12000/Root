import type { PlayerView } from '@root/game-engine'
import * as THREE from 'three'
import { buildMovers, buildPieces, disposePieces } from '../board/pieces.ts'
import type { Travel } from '../motion.ts'
import { lightTable } from '../board/light.ts'
import { effect } from '@preact/signals'
import { loadSurfaces, tickLook } from '../board/look.ts'
import { liveScene } from './live.ts'
import { motion } from '../ui/tokens.ts'
import { createRig } from './camera-rig.ts'
import type { Post } from './post.ts'
import { facePlacards } from '../board/toon.ts'
import { deviceQuality, frameQuality, qualityFor } from './quality.ts'
import type { MapTheme } from './theme.ts'

const easeInOut = (x: number) => (x < .5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2)
/** Overshoots a little, then settles at 1 (easeOutBack). */
const easeOutBack = (x: number) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2

export interface MapStage {
  /** Redraws the pieces; clearings in `changed` pulse once and their pieces pop in; `travels` hop along their paths. */
  update(view: PlayerView, highlight: number[], changed?: number[], travels?: Travel[], targets?: number[]): void
  resetCamera(top?: boolean): void
  /** Screen position (px from the host's top left) of a clearing's centre, to anchor menus on the map. */
  project(clearing: number): [number, number]
  /** Called whenever the view moves (camera or size), so anchored menus follow. Returns an unsubscribe. */
  onView(listener: () => void): () => void
  /** Clearings a drag may start from (they have moves); a drag from one of them moves pieces instead of panning. */
  setDraggable(clearings: number[]): void
  /** The camera now, for tests and the review page: zoom with its limits, tilt from vertical, look-at point. */
  camera(): { zoom: number; min: number; max: number; polar: number; target: [number, number] }
  /** Points the camera at a clearing (or the middle) with a zoom, tilt and turn, within the usual limits (review pages). */
  look(clearing: number | null, zoom: number, polar: number, azimuth?: number): void
  /** Renders `frames` frames back to back while orbiting, waiting for the GPU each time; average ms per frame. */
  measure(frames: number): number
  dispose(): void
}

/**
 * The game's map, full screen (docs/07-ui/gameplay-map-only.md): a theme's scenery and apron, the pieces of the
 * current view, and a camera that never shows empty background. It draws only when something changes. Clicking
 * (not dragging) a clearing or one of its slots calls `onPick`.
 */
export interface MapHandlers {
  /** A click or tap (not a drag) on a clearing or one of its slots. */
  pick(clearing: number): void
  /** Pieces dragged from one clearing and dropped on another (only from `setDraggable` clearings). */
  drag?(from: number, to: number): void
  /** While dragging: the clearing under the pointer, or null. */
  dragOver?(from: number, to: number | null): void
  /** Mouse resting over a clearing (null when it leaves every clearing). */
  hover?(clearing: number | null): void
  /** Touch held still on a clearing for half a second; the following release does not pick. */
  hold?(clearing: number): void
}

export function mountMap(host: HTMLElement, theme: MapTheme, handlers: MapHandlers): MapStage {
  performance.mark('map:mount-start')
  // The tabletop surfaces are generated off the main thread meanwhile (board/look.ts).
  const surfaces = loadSurfaces()
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  let quality = deviceQuality(renderer.getContext())
  const monitor = frameQuality(quality.tier, ['full', 'tablet', 'low'].includes(new URLSearchParams(location.search).get('quality') ?? ''))
  renderer.setPixelRatio(quality.pixelRatio)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.domElement.setAttribute('aria-label', `Bản đồ ${theme.name}: bấm một ô để chọn, kéo để di, cuộn hoặc chụm để phóng to`)
  renderer.domElement.style.touchAction = 'none'
  renderer.domElement.dataset.quality = quality.tier
  host.append(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(theme.background)
  const table = lightTable(renderer, scene, { shadowSize: quality.shadowSize, half: [26, 24], fog: true, deferEnvironment: true })

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 400)
  camera.layers.enableAll()
  let frame = 0, disposed = false, ready = false, dirty = true, post: Post | null = null
  const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(tick) }
  const draw = () => { dirty = true; schedule() }
  const viewListeners = new Set<() => void>()
  let lastView = -Infinity, sampleAfter = Infinity, viewDirty = false, wasActive = false
  const viewChanged = () => { lastView = performance.now(); viewDirty = true; draw(); viewListeners.forEach(l => l()) }
  const rig = createRig(camera, renderer.domElement, theme.bounds, theme.clearingDepth, viewChanged)
  const built = theme.build(scene, quality)
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
  // The live scene (map/live.ts) keeps a frame every 1/30 s once the map has finished loading, so it never competes
  // with opening a game; otherwise the map draws only on change.
  let live = false, lastLive = 0, complete = false
  // Never on the `low` tier: without a GPU every frame costs the whole machine.
  const stopLive = effect(() => { live = liveScene.value && !reduceMotion && quality.tier !== 'low'; draw() })
  function lowerQuality(tier: 'tablet' | 'low') {
    quality = qualityFor({ coarse: false, dpr: devicePixelRatio, force: tier })
    renderer.domElement.dataset.quality = tier
    renderer.setPixelRatio(quality.pixelRatio)
    table.sun.shadow.mapSize.set(quality.shadowSize, quality.shadowSize)
    table.sun.shadow.map?.dispose(); table.sun.shadow.map = null
    if (!quality.post) { post?.dispose(); post = null }
    else post?.setAO(false)
    live = liveScene.value && !reduceMotion && tier !== 'low'
    resize()
    sampleAfter = performance.now() + 5000
  }
  function tick() {
    frame = 0
    if (disposed) return
    if (document.hidden) { monitor.reset(); return }
    const now = performance.now()
    const active = !!anim || live && complete || viewDirty || now - lastView < 150
    viewDirty = false
    // The interval ending now includes the previous frame's work, even if that work delayed input events.
    const measuring = active || wasActive
    wasActive = active
    const next = monitor.sample(now, measuring && complete && now >= sampleAfter && !document.hidden)
    if (next === 'tablet' || next === 'low') lowerQuality(next)
    if (measuring && !document.hidden) schedule()
    if (live && complete) {
      const now = performance.now()
      schedule()
      if (now - lastLive < 30) return
      lastLive = now
      tickLook(now / 1000); dirty = true
    }
    if (anim) { dirty = true; animate(performance.now() - anim.start); if (anim) schedule() }
    if (!ready || !dirty) return
    dirty = false
    facePlacards(scene, camera)
    if (post) post.render(); else renderer.render(scene, camera)
  }

  const resize = () => {
    const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight
    renderer.setSize(w, h, false)
    post?.setSize(w, h)
    rig.resize(w, h)
    viewChanged()
  }
  const visibility = () => { monitor.reset(); wasActive = false; if (!document.hidden) draw() }
  document.addEventListener('visibilitychange', visibility)
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  rig.home()
  resize()
  // Compile every shader off the main thread first (KHR_parallel_shader_compile where the browser has it), so opening
  // a game never freezes the page; the first frame follows as soon as the programs are ready.
  // Then decoration arrives one task per frame, each compiled the same way before it shows.
  // A game update can swap the pieces while programs compile; that only means the next frame compiles what is left.
  const compile = async () => { try { await renderer.compileAsync(scene, camera) } catch { /* scene changed mid-compile */ } }
  void (async () => {
    await compile()
    if (disposed) return
    performance.measure('map:compile', 'map:mount-start')
    ready = true
    facePlacards(scene, camera)
    renderer.render(scene, camera)
    performance.measure('map:first-frame', 'map:mount-start')
    viewListeners.forEach(l => l())
    void surfaces.then(draw)
    // The photo treatment comes after the first frame, its shaders compiled off the main thread (map/post.ts).
    const decoration = [table.addEnvironment, ...built.later, ...(quality.post ? [async () => {
      const m = await import('./post.ts')
      const p = await m.createPost(renderer, scene, camera, quality)
      if (disposed) p.dispose(); else post = p
    }] : [])]
    for (const task of decoration) {
      await new Promise(r => setTimeout(r, 0))
      if (disposed) return
      await task()
      await compile()
      if (disposed) return
      draw()
    }
    performance.measure('map:complete', 'map:mount-start')
    complete = true; sampleAfter = performance.now() + 5000; draw()
  })()
  // Canvas labels redraw once their font and icons load.
  void document.fonts.ready.then(draw)
  const later = [300, 900, 1800].map(ms => setTimeout(draw, ms))

  // A click or tap (not a drag) picks the clearing under it. A drag that starts on a draggable clearing moves pieces:
  // the camera ignores that gesture, and dropping on another clearing reports the move.
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2()
  const clearingAt = (e: PointerEvent): number | null => {
    const r = renderer.domElement.getBoundingClientRect()
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(pointer, camera)
    const hit = ray.intersectObjects(built.picking, false)[0]
    return hit ? hit.object.userData.clearing as number : null
  }
  let draggable = new Set<number>(), dragging: { from: number; over: number | null; id: number } | null = null
  let down: [number, number] | null = null, holdTimer = 0, held = false, hovered: number | null = null, lastHover = 0
  const press = (e: PointerEvent) => {
    down = [e.clientX, e.clientY]; held = false; clearTimeout(holdTimer)
    if (e.pointerType !== 'mouse' && handlers.hold) {
      const c = clearingAt(e)
      if (c !== null) holdTimer = window.setTimeout(() => { if (down) { held = true; handlers.hold!(c) } }, 500)
    }
    if (e.button !== 0 || !handlers.drag) return
    const from = clearingAt(e)
    if (from === null || !draggable.has(from)) return
    dragging = { from, over: null, id: e.pointerId }
    rig.controls.enabled = false
    renderer.domElement.setPointerCapture(e.pointerId)
  }
  const move = (e: PointerEvent) => {
    if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) clearTimeout(holdTimer)
    if (e.pointerType === 'mouse' && e.buttons === 0 && handlers.hover && e.timeStamp - lastHover > 60) {
      lastHover = e.timeStamp
      const c = clearingAt(e)
      if (c !== hovered) { hovered = c; handlers.hover(c) }
    }
    if (!dragging || e.pointerId !== dragging.id || !down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 6) return
    const over = clearingAt(e), next = over === dragging.from ? null : over
    if (next !== dragging.over) { dragging.over = next; handlers.dragOver?.(dragging.from, next) }
  }
  const release = (e: PointerEvent) => {
    const moved = !down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6
    down = null; clearTimeout(holdTimer)
    if (held) { held = false; return }
    if (dragging) {
      const d = dragging; dragging = null; rig.controls.enabled = true
      if (moved) {
        handlers.dragOver?.(d.from, null)
        const to = clearingAt(e)
        if (to !== null && to !== d.from) handlers.drag?.(d.from, to)
        return
      }
    }
    if (moved) return
    const c = clearingAt(e)
    if (c !== null) handlers.pick(c)
  }
  renderer.domElement.addEventListener('pointerdown', press, { capture: true })
  renderer.domElement.addEventListener('pointermove', move)
  renderer.domElement.addEventListener('pointerup', release)
  const leave = () => { if (hovered !== null) { hovered = null; handlers.hover?.(null) } }
  renderer.domElement.addEventListener('pointerleave', leave)
  const projected = new THREE.Vector3()

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
    look(clearing, zoom, polar, azimuth = 0) {
      const t = clearing === null ? new THREE.Vector3() : theme.placement.centre(clearing).setY(0)
      rig.controls.target.copy(t)
      camera.position.copy(t).add(new THREE.Vector3().setFromSphericalCoords(60, polar, azimuth))
      rig.setZoom(zoom); rig.controls.update(); viewChanged()
    },
    project(c) {
      // The camera's matrices are otherwise only refreshed by a render, and the overlay may ask before the first one.
      camera.updateMatrixWorld()
      projected.copy(theme.placement.centre(c)).project(camera)
      return [(projected.x + 1) / 2 * host.clientWidth, (1 - projected.y) / 2 * host.clientHeight]
    },
    onView(listener) { viewListeners.add(listener); return () => viewListeners.delete(listener) },
    setDraggable(clearings) { draggable = new Set(clearings) },
    camera() {
      const c = rig.controls
      return { zoom: camera.zoom, min: c.minZoom, max: c.maxZoom, polar: c.getPolarAngle(), target: [c.target.x, c.target.z] }
    },
    measure(frames) {
      const gl = renderer.getContext(), axis = new THREE.Vector3(0, 1, 0), t0 = performance.now()
      for (let i = 0; i < frames; i++) {
        camera.position.sub(rig.controls.target).applyAxisAngle(axis, .02).add(rig.controls.target)
        camera.lookAt(rig.controls.target); facePlacards(scene, camera); if (post) post.render(); else renderer.render(scene, camera); gl.finish()
      }
      return (performance.now() - t0) / frames
    },
    dispose() {
      disposed = true; document.removeEventListener('visibilitychange', visibility); cancelAnimationFrame(frame); later.forEach(clearTimeout); observer.disconnect(); rig.dispose()
      renderer.domElement.removeEventListener('pointerdown', press, { capture: true }); renderer.domElement.removeEventListener('pointermove', move)
      renderer.domElement.removeEventListener('pointerup', release); renderer.domElement.removeEventListener('pointerleave', leave)
      clearTimeout(holdTimer); viewListeners.clear()
      if (pieces) disposePieces(pieces)
      stopLive(); post?.dispose(); table.dispose()
      built.dispose(); renderer.dispose(); renderer.domElement.remove()
    },
  }
}

/** Whether this browser can draw WebGL 2; the map needs it (there is no 2D board any more). */
export function webglAvailable(): boolean {
  try { return !!document.createElement('canvas').getContext('webgl2') } catch { return false }
}

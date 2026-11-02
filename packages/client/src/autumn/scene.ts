import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { building, ruin } from '../board/pieces.ts'
import { badge } from '../board/toon.ts'
import { color } from '../ui/tokens.ts'
import { hasRuin, type DemoState } from './demo.ts'
import { PLOTS, world } from './layout.ts'
import { buildAutumnScenery } from './scenery.ts'

export interface AutumnScene {
  update(state: DemoState, labels: boolean): void
  home(top?: boolean): void
  focus(id: string): void
  measure(frames: number): number
  dispose(): void
}

/**
 * The Autumn board in the approved Lake style (docs/07-ui/lake-preview.md): orthographic, toon, ink outlines, every
 * shape built from code. It shows demo state for review, never authoritative game state.
 */
export function mountAutumn(host: HTMLElement, select: (id: string) => void): AutumnScene {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(color.paper)
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  host.append(renderer.domElement)
  renderer.domElement.setAttribute('aria-label', 'Autumn 3D — chọn slot bằng danh sách bên cạnh hoặc bấm nền đất')
  const camera = new THREE.OrthographicCamera(-17, 17, 14, -14, .1, 100)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = false
  controls.enablePan = false
  controls.minZoom = .8; controls.maxZoom = 2.8
  controls.minPolarAngle = .03; controls.maxPolarAngle = Math.PI * .43
  scene.add(new THREE.HemisphereLight(color.paperRaised, color.wood, 2.1))
  const sun = new THREE.DirectionalLight(color.paperRaised, 3)
  sun.position.set(-12, 25, -12); sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 19, bottom: -19, near: 1, far: 65 })
  sun.shadow.bias = -.001
  scene.add(sun)

  const scenery = buildAutumnScenery(scene, { slab: true })
  const { picking, pads, labels, earthMat, selectedMat } = scenery
  const contents = new THREE.Group()
  scene.add(contents)
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2()
  let start: [number, number] | null = null
  const down = (e: PointerEvent) => { start = [e.clientX, e.clientY] }
  const up = (e: PointerEvent) => {
    if (!start || Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 5) { start = null; return }
    start = null
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1)
    ray.setFromCamera(pointer, camera)
    const hit = ray.intersectObjects(picking, false)[0]
    if (hit) select(hit.object.userData.plotId as string)
  }
  renderer.domElement.addEventListener('pointerdown', down)
  renderer.domElement.addEventListener('pointerup', up)
  let frame = 0, disposed = false
  const draw = () => {
    if (disposed || frame) return
    frame = requestAnimationFrame(() => { frame = 0; if (!disposed) renderer.render(scene, camera) })
  }
  controls.addEventListener('change', draw)
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight
    const half = Math.max(14, 15 / (w / h))
    camera.left = -half * w / h; camera.right = half * w / h; camera.top = half; camera.bottom = -half; camera.updateProjectionMatrix()
    renderer.setSize(w, h, false); draw()
  }
  const observer = new ResizeObserver(resize); observer.observe(host); resize()
  const home = (top = false) => { camera.position.set(0, top ? 36 : 31, top ? .01 : 17); camera.zoom = 1; camera.updateProjectionMatrix(); controls.target.set(0, 0, 0); controls.update() }
  home()
  draw()
  void document.fonts.ready.then(draw)
  const iconsReady = setTimeout(draw, 600)
  return {
    home,
    focus(id) {
      const plot = PLOTS.find(p => p.id === id)
      if (!plot) return
      const [x,, z] = world(plot.at)
      controls.target.set(x, 0, z); camera.position.set(x, 31, z + 17); camera.zoom = 2.5
      camera.updateProjectionMatrix(); controls.update(); draw()
    },
    update(state, showLabels) {
      labels.visible = showLabels
      for (const [id, pad] of pads) pad.material = id === state.selected ? selectedMat : earthMat
      contents.clear()
      for (const plot of PLOTS) {
        const [x,, z] = world(plot.at), type = state.buildings[plot.id]
        if (hasRuin(state, plot)) {
          const model = ruin(); model.scale.setScalar(2); model.position.set(x, .07, z); contents.add(model)
          const r = badge('R', { bg: color.rock, fg: color.paperRaised, size: .65 }); r.position.set(x, .85, z); contents.add(r)
        } else if (type) {
          const model = building(type, type === 'base' ? 'alliance' : type === 'roost' ? 'eyrie' : 'marquise')
          model.scale.setScalar(1.8); model.position.set(x, .07, z); contents.add(model)
        }
      }
      draw()
    },
    measure(frames) {
      const original = camera.position.clone()
      const offset = original.clone().sub(controls.target)
      const t0 = performance.now()
      for (let i = 0; i < frames; i++) {
        camera.position.copy(offset).applyAxisAngle(new THREE.Vector3(0, 1, 0), i * .012).add(controls.target)
        camera.lookAt(controls.target); renderer.render(scene, camera); renderer.getContext().finish()
      }
      const ms = (performance.now() - t0) / frames
      camera.position.copy(original); camera.lookAt(controls.target); draw()
      return ms
    },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); clearTimeout(iconsReady); observer.disconnect(); controls.removeEventListener('change', draw); controls.dispose()
      renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointerup', up)
      scenery.dispose()
      renderer.dispose(); renderer.domElement.remove()
    },
  }
}

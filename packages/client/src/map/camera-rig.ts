import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MAX_ASPECT, MAX_POLAR, MIN_ASPECT, MIN_POLAR, baseHalfHeight, clampTarget, zoomRange, type Bounds } from './limits.ts'

const typing = (e: KeyboardEvent) => e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement
const DISTANCE = 60, HOME_POLAR = .5

/**
 * The game camera (docs/07-ui/gameplay-map-only.md §2): orthographic, held inside the limits of map/limits.ts so the
 * apron always fills the screen. Mouse: left drag pans, right drag (or Shift + drag) turns, wheel zooms toward the
 * cursor. Touch: one finger pans, two fingers pinch to zoom and twist to turn. Keys: arrows pan, + and − zoom, 0 home.
 */
export function createRig(camera: THREE.OrthographicCamera, dom: HTMLElement, bounds: Bounds, clearingDepth: number, onChange: () => void) {
  const controls = new OrbitControls(camera, dom)
  controls.enableDamping = false
  controls.screenSpacePanning = false
  controls.zoomToCursor = true
  controls.minPolarAngle = MIN_POLAR
  controls.maxPolarAngle = MAX_POLAR
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }
  controls.keyPanSpeed = 25

  // Keep the look-at point on the board; move the camera with it so the view does not swing.
  const clamp = () => {
    const t = controls.target, [x, z] = clampTarget(bounds, t.x, t.z), dx = x - t.x, dz = z - t.z
    if (dx || dz) { t.x += dx; t.z += dz; camera.position.x += dx; camera.position.z += dz }
    onChange()
  }
  controls.addEventListener('change', clamp)
  // Shift + left drag turns, for trackpads without a right button.
  const shift = (e: PointerEvent) => { controls.mouseButtons.LEFT = e.shiftKey ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN }
  dom.addEventListener('pointerdown', shift, { capture: true })

  const setZoom = (z: number) => { camera.zoom = Math.max(controls.minZoom, Math.min(controls.maxZoom, z)); camera.updateProjectionMatrix(); onChange() }
  const home = (top = false) => {
    const polar = top ? MIN_POLAR : HOME_POLAR
    controls.target.set(0, 0, 0)
    camera.position.set(0, DISTANCE * Math.cos(polar), DISTANCE * Math.sin(polar))
    camera.zoom = 1; camera.updateProjectionMatrix(); controls.update()
  }
  const keys = (e: KeyboardEvent) => {
    if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return
    if (e.key === '+' || e.key === '=') setZoom(camera.zoom * 1.25)
    else if (e.key === '-' || e.key === '_') setZoom(camera.zoom / 1.25)
    else if (e.key === '0') home()
  }
  window.addEventListener('keydown', keys)
  controls.listenToKeyEvents(window)

  return {
    controls,
    home,
    setZoom,
    /** New viewport size: the farthest zoom fits the whole board, the closest shows one clearing large. */
    resize(width: number, height: number) {
      const aspect = width / Math.max(1, height), fit = Math.max(MIN_ASPECT, Math.min(MAX_ASPECT, aspect))
      const h = baseHalfHeight(bounds, fit)
      camera.top = h; camera.bottom = -h; camera.left = -h * aspect; camera.right = h * aspect
      const [min, max] = zoomRange(bounds, fit, clearingDepth)
      controls.minZoom = min; controls.maxZoom = max
      setZoom(camera.zoom)
    },
    dispose() {
      controls.removeEventListener('change', clamp); controls.stopListenToKeyEvents(); controls.dispose()
      window.removeEventListener('keydown', keys); dom.removeEventListener('pointerdown', shift, { capture: true })
    },
  }
}

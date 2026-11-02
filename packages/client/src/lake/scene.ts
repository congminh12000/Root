import * as THREE from 'three'
import { lightTable } from '../board/light.ts'
import { loadSurfaces } from '../board/look.ts'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { building, ruin } from '../board/pieces.ts'
import { badge, part } from '../board/toon.ts'
import { material } from '../board/look.ts'
import { color } from '../ui/tokens.ts'
import { DOCKS, DEPTH, LAKE, PATHS, PLOTS, PLOT_HALF, VILLAGES, WIDTH, hasRuin, inside, treeAllowed, world, type DemoState, type Point } from './layout.ts'

export interface LakeScene {
  update(state: DemoState, labels: boolean): void
  home(top?: boolean): void
  focus(id: string): void
  measure(frames: number): number
  dispose(): void
}
/** Independent diorama. It accepts demo state, never authoritative game state. */
export function mountLake(host: HTMLElement, select: (id: string) => void): LakeScene {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(color.paper)
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  host.append(renderer.domElement)
  renderer.domElement.setAttribute('aria-label', 'Lake 3D — chọn slot bằng danh sách bên cạnh hoặc bấm nền đất')
  const camera = new THREE.OrthographicCamera(-17, 17, 14, -14, .1, 100)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = false
  controls.enablePan = false
  controls.minZoom = .8; controls.maxZoom = 2.8
  controls.minPolarAngle = .03; controls.maxPolarAngle = Math.PI * .43
  const table = lightTable(renderer, scene, { shadowSize: 2048, half: [22, 20] })
  void loadSurfaces().then(() => draw())
  const geometries: THREE.BufferGeometry[] = [], materials: THREE.Material[] = [], textures: THREE.Texture[] = []
  const ownGeo = <T extends THREE.BufferGeometry>(g: T) => { geometries.push(g); return g }
  const basic = (c: string) => { const m = new THREE.MeshBasicMaterial({ color: c }); materials.push(m); return m }
  const addMesh = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) => {
    const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.receiveShadow = true; parent.add(o); return o
  }
  let seed = 7631
  const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
  const canvas = document.createElement('canvas'); canvas.width = 1792; canvas.height = 1600
  const ctx = canvas.getContext('2d')!
  const X = (v: number) => v * canvas.width, Y = (v: number) => v * canvas.height
  ctx.fillStyle = color.meadow; ctx.fillRect(0, 0, canvas.width, canvas.height)
  for (let i = 0; i < 18000; i++) {
    ctx.globalAlpha = .16; ctx.fillStyle = i % 3 ? color.pineLight : color.meadowLight
    ctx.beginPath(); ctx.ellipse(rand() * canvas.width, rand() * canvas.height, 3 + rand() * 10, 2 + rand() * 5, rand() * 6, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1
  for (const c of VILLAGES) {
    ctx.beginPath()
    for (let i = 0; i <= 32; i++) {
      const a = i / 32 * Math.PI * 2, r = 1 + Math.sin(a * 3 + c.id) * .12 + Math.cos(a * 5) * .08
      const x = X(c.at[0] + Math.cos(a) * .074 * r), y = Y(c.at[1] + Math.sin(a) * .065 * r)
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y)
    }
    ctx.closePath(); ctx.fillStyle = color.meadowLight; ctx.fill()
  }
  ctx.lineJoin = ctx.lineCap = 'round'
  for (const path of PATHS) {
    ctx.beginPath(); path.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])))
    ctx.lineWidth = 22; ctx.strokeStyle = color.pathEdge; ctx.stroke()
    ctx.lineWidth = 16; ctx.strokeStyle = color.path; ctx.stroke()
    ctx.setLineDash([1, 11]); ctx.lineWidth = 2; ctx.strokeStyle = color.paperShade; ctx.stroke(); ctx.setLineDash([])
  }
  ctx.beginPath(); LAKE.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])))
  ctx.closePath(); ctx.lineWidth = 17; ctx.strokeStyle = color.pathEdge; ctx.stroke()
  ctx.lineWidth = 10; ctx.strokeStyle = color.rock; ctx.stroke(); ctx.fillStyle = color.water; ctx.fill()
  const groundTex = new THREE.CanvasTexture(canvas); groundTex.colorSpace = THREE.SRGBColorSpace; groundTex.anisotropy = 8; textures.push(groundTex)
  const groundMat = new THREE.MeshToonMaterial({ map: groundTex }); materials.push(groundMat)
  const ground = addMesh(ownGeo(new THREE.PlaneGeometry(WIDTH, DEPTH)), groundMat, 0, 0, 0); ground.rotation.x = -Math.PI / 2
  const slab = addMesh(ownGeo(new THREE.BoxGeometry(WIDTH + .18, .4, DEPTH + .18)), material(color.wood), 0, -.26, 0)
  slab
  // Water surface with hand-drawn, static ripples. No reflective post-processing.
  const water = new THREE.Shape(LAKE.map(p => { const w = world(p); return new THREE.Vector2(w[0], -w[2]) }))
  const waterMesh = addMesh(ownGeo(new THREE.ShapeGeometry(water)), material(color.water), 0, .012, 0); waterMesh.rotation.x = -Math.PI / 2
  const ripplePositions: number[] = []
  for (let i = 0; i < 450; i++) {
    const p: Point = [rand(), rand()]
    if (!inside(p, LAKE)) continue
    const [x,,z] = world(p), len = .10 + rand() * .18
    ripplePositions.push(x, .025, z, x + len, .025, z + .02)
  }
  const ripplesGeo = ownGeo(new THREE.BufferGeometry()); ripplesGeo.setAttribute('position', new THREE.Float32BufferAttribute(ripplePositions, 3))
  const rippleMat = new THREE.LineBasicMaterial({ color: color.waterShallow }); materials.push(rippleMat)
  scene.add(new THREE.LineSegments(ripplesGeo, rippleMat))
  // Tiny fishing boats and rocky coves, modelled rather than painted into a background.
  for (const [i, p] of ([[.40,.47],[.55,.57],[.59,.67],[.76,.77]] as Point[]).entries()) {
    const [x,,z] = world(p), boat = new THREE.Group()
    boat.add(part('lake-hull', () => new THREE.CylinderGeometry(.16,.09,.10,4),color.wood,[0,.06,0],[0,Math.PI/4,0]),
      part('lake-seat', () => new THREE.BoxGeometry(.16,.025,.045),color.paperShade,[0,.12,0]))
    boat.scale.set(1.4,1,.6); boat.rotation.y=i*.7; boat.position.set(x,.02,z); scene.add(boat)
  }
  // Trees share geometry and are drawn in instances. Every exclusion is derived from the visual layout.
  const trees: { x: number; z: number; scale: number; autumn: boolean; round: boolean }[] = []
  for (let i = 0; i < 12000 && trees.length < 2100; i++) {
    const p: Point = [.015 + rand() * .97, .025 + rand() * .91]
    if (!treeAllowed(p)) continue
    const [x,,z] = world(p)
    trees.push({ x, z, scale: .6 + rand() * .6, autumn: rand() < .09, round: rand() < .17 })
  }
  const dummy = new THREE.Object3D()
  const pine = trees.filter(t => !t.round), round = trees.filter(t => t.round)
  const instances = (list: typeof trees, geo: THREE.BufferGeometry, c: string, lift: number) => {
    const mesh = new THREE.InstancedMesh(geo, material(c), list.length)
    list.forEach((t, i) => { dummy.position.set(t.x, lift * t.scale, t.z); dummy.scale.setScalar(t.scale); dummy.rotation.set(0, i * 1.7, 0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix) })
    mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh)
  }
  instances(trees, ownGeo(new THREE.CylinderGeometry(.035, .055, .6, 5)), color.wood, .3)
  for (let tier = 0; tier < 3; tier++) instances(pine, ownGeo(new THREE.ConeGeometry(.32 - tier * .065, .5, 7)), tier === 1 ? color.pineLight : color.pine, .5 + tier * .23)
  for (const [list, c] of [[round.filter(t => t.autumn), color.autumnOrange], [round.filter(t => !t.autumn), color.meadowLight]] as const)
    instances(list, ownGeo(new THREE.IcosahedronGeometry(.36, 1)), c, .73)
  // Smaller decorative villages, outside every building plot.
  for (const c of VILLAGES) {
    const [x,,z] = world(c.home), g = new THREE.Group()
    g.add(part('lake-house-wall', () => new THREE.BoxGeometry(.46,.34,.36), color.paperShade, [0,.17,0]),
      part('lake-house-roof', () => new THREE.ConeGeometry(.38,.27,4), c.id % 2 ? color.roofRed : color.roofBlue, [0,.45,0], [0,Math.PI/4,0]),
      part('lake-house-door', () => new THREE.BoxGeometry(.10,.18,.018), color.wood, [0,.09,.19]))
    g.position.set(x,.025,z); g.rotation.y = c.id * .4; scene.add(g)
  }
  // Wooden piers: all separate from the building plots.
  for (const d of DOCKS) {
    const [x,,z] = world(d.at), width = d.w * WIDTH
    for (let i = 0; i < 14; i++) {
      const plank = addMesh(ownGeo(new THREE.BoxGeometry(width / 14 - .014,.06,d.h * DEPTH)), material(i % 3 ? color.woodLight : color.wood), x - width / 2 + (i + .5) * width / 14,.06,z)
      plank.castShadow = true
    }
    for (const dx of [-width*.4,width*.4]) addMesh(ownGeo(new THREE.CylinderGeometry(.035,.04,.28,6)), material(color.wood),x+dx,.05,z)
  }
  // Modelled score spaces and two item rows, using our own icons.
  for (let i = 0; i <= 30; i++) {
    const [x,,z] = world([.035 + i * .031, .962])
    addMesh(ownGeo(new THREE.BoxGeometry(.80,.05,.54)), material(color.paperShade),x,.035,z)
    const label = badge(String(i), { size: .52, bg: color.paperRaised }); label.position.set(x,.10,z); scene.add(label)
  }
  const items = ['bag','boots','crossbow','sword','tea','hammer'] as const
  for (let row = 0; row < 2; row++) items.forEach((icon, i) => {
    const [x,,z] = world([.17 + i * .035,.035 + row * .035])
    addMesh(ownGeo(new THREE.BoxGeometry(.78,.06,.7)),material(color.paperShade),x,.04,z)
    const label = badge('',{ icon, iconFill: color.ink, bg: color.paperRaised, size: .52 }); label.position.set(x,.16,z); scene.add(label)
  })
  // Permanent earth footprints; changing demo contents never rebuilds or moves them.
  const picking: THREE.Object3D[] = [], contents = new THREE.Group(), labels = new THREE.Group()
  scene.add(contents, labels)
  const pads = new Map<string, THREE.Mesh>()
  const padGeo = ownGeo(new THREE.CircleGeometry(1, 8))
  const earthMat = basic(color.path), selectedMat = basic(color.autumnGold)
  const stoneGeo = ownGeo(new THREE.DodecahedronGeometry(.065, 0))
  for (const plot of PLOTS) {
    const [x,,z] = world(plot.at)
    const pad = addMesh(padGeo,earthMat,x,.026,z); pad.rotation.x = -Math.PI / 2
    pad.scale.set(PLOT_HALF * WIDTH, PLOT_HALF * DEPTH, 1)
    pad.userData.plotId = plot.id; picking.push(pad); pads.set(plot.id,pad)
    for (let i = 0; i < 12; i++) {
      if (i === 2 || i === 3 || i === 4) continue // Open entrance at the front.
      const a = i / 12 * Math.PI * 2
      addMesh(stoneGeo,material(i % 3 ? color.pathEdge : color.paperShade), x + Math.cos(a) * .51,.065,z + Math.sin(a) * .45)
    }
    const label = badge(plot.id, { size: .36 }); label.position.set(x,.9,z); labels.add(label)
  }
  for (const c of VILLAGES) {
    const label = badge(String(c.id), { size: .5, bg: color.autumnGold })
    const [x,,z] = world([c.at[0]-.045,c.at[1]-.045]); label.position.set(x,1.2,z); labels.add(label)
  }
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2()
  let start: [number,number] | null = null
  const down = (e: PointerEvent) => { start = [e.clientX,e.clientY] }
  const up = (e: PointerEvent) => {
    if (!start || Math.hypot(e.clientX-start[0],e.clientY-start[1]) > 5) { start = null; return }
    start = null
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1)
    ray.setFromCamera(pointer,camera)
    const hit = ray.intersectObjects(picking,false)[0]
    if (hit) select(hit.object.userData.plotId as string)
  }
  renderer.domElement.addEventListener('pointerdown',down)
  renderer.domElement.addEventListener('pointerup',up)
  let frame = 0, disposed = false
  const draw = () => {
    if (disposed || frame) return
    frame = requestAnimationFrame(() => { frame = 0; if (!disposed) renderer.render(scene,camera) })
  }
  controls.addEventListener('change',draw)
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight
    const half = Math.max(14, 15 / (w/h))
    camera.left = -half * w/h; camera.right = half * w/h; camera.top = half; camera.bottom = -half; camera.updateProjectionMatrix()
    renderer.setSize(w,h,false); draw()
  }
  const observer = new ResizeObserver(resize); observer.observe(host); resize()
  const home = (top = false) => { camera.position.set(0,top ? 36 : 31,top ? .01 : 17); camera.zoom = 1; camera.updateProjectionMatrix(); controls.target.set(0,0,0); controls.update() }
  home()
  draw()
  void document.fonts.ready.then(draw)
  const iconsReady = setTimeout(draw, 600)
  return {
    home,
    focus(id) {
      const plot = PLOTS.find(p => p.id === id)
      if (!plot) return
      const [x,,z] = world(plot.at)
      controls.target.set(x,0,z); camera.position.set(x,31,z+17); camera.zoom = 2.5
      camera.updateProjectionMatrix(); controls.update(); draw()
    },
    update(state, showLabels) {
      labels.visible = showLabels
      draw()
      for (const [id,pad] of pads) pad.material = id === state.selected ? selectedMat : earthMat
      contents.clear()
      for (const plot of PLOTS) {
        const [x,,z] = world(plot.at), type = state.buildings[plot.id]
        if (hasRuin(state,plot)) {
          const model = ruin(); model.scale.setScalar(2); model.position.set(x,.07,z); contents.add(model)
          const r = badge('R',{ bg: color.rock, fg: color.paperRaised, size: .65 }); r.position.set(x,.85,z); contents.add(r)
        } else if (type) {
          const model = building(type,type === 'base' ? 'alliance' : type === 'roost' ? 'eyrie' : 'marquise')
          model.scale.setScalar(1.8); model.position.set(x,.07,z); model.rotation.y = plot.angle; contents.add(model)
        }
      }
    },
    measure(frames) {
      const original = camera.position.clone()
      const offset = original.clone().sub(controls.target)
      const start = performance.now()
      for (let i = 0; i < frames; i++) {
        camera.position.copy(offset).applyAxisAngle(new THREE.Vector3(0,1,0), i * .012).add(controls.target)
        camera.lookAt(controls.target); renderer.render(scene,camera); renderer.getContext().finish()
      }
      const ms = (performance.now()-start)/frames
      camera.position.copy(original); camera.lookAt(controls.target); draw()
      return ms
    },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); clearTimeout(iconsReady); observer.disconnect(); controls.removeEventListener('change',draw); controls.dispose()
      renderer.domElement.removeEventListener('pointerdown',down); renderer.domElement.removeEventListener('pointerup',up)
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose())
      table.dispose(); renderer.dispose(); renderer.domElement.remove()
    },
  }
}

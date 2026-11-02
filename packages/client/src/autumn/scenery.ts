import * as THREE from 'three'
import { badge, outline, part, toon } from '../board/toon.ts'
import { color, suitColor } from '../ui/tokens.ts'
import {
  BRIDGES, CLEARINGS, CLEARING_RX, CLEARING_RY, CLIFFS, DEPTH, ITEMS, ITEM_ROW_Y, ITEM_STEP, ITEM_X0, LAKE, PATHS, PLOTS, PLOT_HALF,
  RIVER, RIVER_HALF, scoreSpace, WIDTH, inside, nearSuit, treeAllowed, world, type Point,
} from './layout.ts'

export interface AutumnScenery {
  /** Slot footprints, `userData.plotId` set; clicking one picks that slot. */
  picking: THREE.Object3D[]
  pads: Map<string, THREE.Mesh>
  /** Clearing numbers and slot ids, shown on request. */
  labels: THREE.Group
  earthMat: THREE.Material
  selectedMat: THREE.Material
  /** Plants the forest when `deferTrees` was set (once); otherwise it is already planted and this does nothing. */
  plantTrees(): void
  dispose(): void
}

/**
 * The Autumn board's scenery in the approved Lake style (docs/07-ui/autumn-preview.md): painted ground, river,
 * lake, cliffs, trees, houses, bridges, item supply, score track and slot footprints. With `deferTrees` the forest is
 * planted by a later call, so the game shows its first frame sooner. Used by the review page and
 * the game's map stage. `slab` adds the wooden board edge of the review page; the game blends into its apron instead.
 */
export function buildAutumnScenery(scene: THREE.Scene, opts: { slab: boolean; deferTrees?: boolean }): AutumnScenery {
  const geometries: THREE.BufferGeometry[] = [], materials: THREE.Material[] = [], textures: THREE.Texture[] = []
  const ownGeo = <T extends THREE.BufferGeometry>(g: T) => { geometries.push(g); return g }
  const basic = (c: string) => { const m = new THREE.MeshBasicMaterial({ color: c }); materials.push(m); return m }
  const addMesh = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) => {
    const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.receiveShadow = true; parent.add(o); return o
  }
  let seed = 41017
  const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }

  // ── Painted ground: meadow, trodden clearings, dotted paths, river banks, lake, rock ──
  const canvas = document.createElement('canvas'); canvas.width = 1792; canvas.height = Math.round(1792 * DEPTH / WIDTH)
  const ctx = canvas.getContext('2d')!
  const X = (v: number) => v * canvas.width, Y = (v: number) => v * canvas.height
  const trace = (pts: readonly Point[], close = false) => {
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])))); if (close) ctx.closePath()
  }
  ctx.fillStyle = color.meadow; ctx.fillRect(0, 0, canvas.width, canvas.height)
  for (let i = 0; i < 18000; i++) {
    ctx.globalAlpha = .16; ctx.fillStyle = i % 3 ? color.pineLight : color.meadowLight
    ctx.beginPath(); ctx.ellipse(rand() * canvas.width, rand() * canvas.height, 3 + rand() * 10, 2 + rand() * 5, rand() * 6, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1
  for (const c of CLEARINGS) {
    ctx.beginPath()
    for (let i = 0; i <= 32; i++) {
      const a = i / 32 * Math.PI * 2, r = 1 + Math.sin(a * 3 + c.id) * .07 + Math.cos(a * 5) * .05
      const x = X(c.at[0] + Math.cos(a) * CLEARING_RX * r), y = Y(c.at[1] + Math.sin(a) * CLEARING_RY * r)
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y)
    }
    ctx.closePath(); ctx.fillStyle = color.meadowLight; ctx.fill()
  }
  for (const r of CLIFFS) { trace(r, true); ctx.fillStyle = color.rock; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = color.ink; ctx.stroke() }
  ctx.lineJoin = ctx.lineCap = 'round'
  for (const { line } of PATHS) {
    trace(line)
    ctx.lineWidth = 22; ctx.strokeStyle = color.pathEdge; ctx.stroke()
    ctx.lineWidth = 16; ctx.strokeStyle = color.path; ctx.stroke()
    ctx.setLineDash([1, 12]); ctx.lineWidth = 4; ctx.strokeStyle = color.paperRaised; ctx.stroke(); ctx.setLineDash([])
  }
  // River and lake share one water colour; banks are earth with a rock lip.
  trace(LAKE, true); ctx.lineWidth = 17; ctx.strokeStyle = color.pathEdge; ctx.stroke(); ctx.lineWidth = 10; ctx.strokeStyle = color.rock; ctx.stroke()
  trace(RIVER); const riverPx = RIVER_HALF * 2 * canvas.width
  ctx.lineWidth = riverPx + 16; ctx.strokeStyle = color.pathEdge; ctx.stroke()
  ctx.lineWidth = riverPx + 8; ctx.strokeStyle = color.rock; ctx.stroke()
  ctx.lineWidth = riverPx; ctx.strokeStyle = color.water; ctx.stroke()
  trace(LAKE, true); ctx.fillStyle = color.water; ctx.fill()
  trace(RIVER); ctx.lineWidth = riverPx * .25; ctx.setLineDash([18, 26]); ctx.strokeStyle = color.waterShallow; ctx.stroke(); ctx.setLineDash([])
  const groundTex = new THREE.CanvasTexture(canvas); groundTex.colorSpace = THREE.SRGBColorSpace; groundTex.anisotropy = 8; textures.push(groundTex)
  const groundMat = new THREE.MeshToonMaterial({ map: groundTex }); materials.push(groundMat)
  const ground = addMesh(ownGeo(new THREE.PlaneGeometry(WIDTH, DEPTH)), groundMat, 0, 0, 0); ground.rotation.x = -Math.PI / 2
  if (opts.slab) outline(addMesh(ownGeo(new THREE.BoxGeometry(WIDTH + .18, .4, DEPTH + .18)), toon(color.wood), 0, -.26, 0), .035)

  // Lake ripples and two fishing boats.
  const ripples: number[] = []
  for (let i = 0; i < 160; i++) {
    const p: Point = [rand() * .06, .5 + rand() * .25]
    if (!inside(p, LAKE)) continue
    const [x,, z] = world(p), len = .1 + rand() * .15
    ripples.push(x, .025, z, x + len, .025, z + .02)
  }
  const ripplesGeo = ownGeo(new THREE.BufferGeometry()); ripplesGeo.setAttribute('position', new THREE.Float32BufferAttribute(ripples, 3))
  const rippleMat = new THREE.LineBasicMaterial({ color: color.waterShallow }); materials.push(rippleMat)
  scene.add(new THREE.LineSegments(ripplesGeo, rippleMat))
  for (const [i, p] of ([[.025, .58], [.03, .68]] as Point[]).entries()) {
    const [x,, z] = world(p), boat = new THREE.Group()
    boat.add(part('lake-hull', () => new THREE.CylinderGeometry(.16, .09, .10, 4), color.wood, [0, .06, 0], [0, Math.PI / 4, 0]),
      part('lake-seat', () => new THREE.BoxGeometry(.16, .025, .045), color.paperShade, [0, .12, 0]))
    boat.scale.set(1.4, 1, .6); boat.rotation.y = i * .9 + .3; boat.position.set(x, .02, z); scene.add(outline(boat, .012))
  }

  // Cliffs: stacked boulders inside each rock area.
  const boulder = ownGeo(new THREE.DodecahedronGeometry(.32, 0))
  for (const r of CLIFFS) {
    const xs = r.map(p => p[0]), ys = r.map(p => p[1])
    for (let k = 0; k < 160; k++) {
      const p: Point = [Math.min(...xs) + rand() * (Math.max(...xs) - Math.min(...xs)), Math.min(...ys) + rand() * (Math.max(...ys) - Math.min(...ys))]
      if (!inside(p, r)) continue
      const [x,, z] = world(p), s = .6 + rand() * 1.1
      const rock = addMesh(boulder, toon(rand() < .3 ? color.inkSoft : color.rock), x, .1 * s, z)
      rock.scale.set(s, s * (.6 + rand() * .9), s); rock.rotation.set(rand(), rand() * 6, rand() * .5); rock.castShadow = true
      outline(rock, .03)
    }
  }

  // Trees come last of everything random, so planting them later (deferTrees) draws exactly the same forest.
  const plantTrees = () => {
    // Trees: instanced pines and round trees. Round trees by a clearing take its suit colour, as in the reference.
    const trees: { x: number; z: number; scale: number; round: boolean; tint: string }[] = []
    for (let i = 0; i < 16000 && trees.length < 2300; i++) {
      const p: Point = [.008 + rand() * .984, .01 + rand() * .93]
      if (!treeAllowed(p)) continue
      const [x,, z] = world(p), suit = nearSuit(p)
      const round = suit ? rand() < .55 : rand() < .05
      const tint = suit && round ? suitColor[suit] : round ? color.pineLight : ''
      trees.push({ x, z, scale: .6 + rand() * .6, round, tint })
    }
    const dummy = new THREE.Object3D()
    const instances = (list: typeof trees, geo: THREE.BufferGeometry, c: string, lift: number, tinted = false) => {
      const mesh = new THREE.InstancedMesh(geo, toon(tinted ? color.white : c), list.length)
      list.forEach((t, i) => {
        dummy.position.set(t.x, lift * t.scale, t.z); dummy.scale.setScalar(t.scale); dummy.rotation.set(0, i * 1.7, 0); dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix); if (tinted) mesh.setColorAt(i, new THREE.Color(t.tint))
      })
      mesh.castShadow = true; mesh.receiveShadow = true; scene.add(outline(mesh, .012))
    }
    const pines = trees.filter(t => !t.round), rounds = trees.filter(t => t.round)
    instances(trees, ownGeo(new THREE.CylinderGeometry(.035, .055, .6, 5)), color.wood, .3)
    for (let tier = 0; tier < 3; tier++) instances(pines, ownGeo(new THREE.ConeGeometry(.32 - tier * .065, .5, 7)), tier === 1 ? color.pineLight : color.pine, .5 + tier * .23)
    instances(rounds, ownGeo(new THREE.IcosahedronGeometry(.36, 1)), '', .73, true)
  }
  if (!opts.deferTrees) plantTrees()

  // Decorative houses beside each clearing, never on a slot.
  for (const c of CLEARINGS) {
    const [x,, z] = world(c.home), g = new THREE.Group()
    g.add(part('lake-house-wall', () => new THREE.BoxGeometry(.46, .34, .36), color.paperShade, [0, .17, 0]),
      part('lake-house-roof', () => new THREE.ConeGeometry(.38, .27, 4), c.id % 2 ? color.roofRed : color.roofBlue, [0, .45, 0], [0, Math.PI / 4, 0]),
      part('lake-house-door', () => new THREE.BoxGeometry(.10, .18, .018), color.wood, [0, .09, .19]))
    g.position.set(x, .025, z); g.rotation.y = c.id * .4; scene.add(outline(g, .018))
  }
  // Plank bridges where a path crosses the river.
  for (const b of BRIDGES) {
    const [x,, z] = world(b.at), g = new THREE.Group(), span = RIVER_HALF * 2 * WIDTH + .5
    for (let i = 0; i < 7; i++) g.add(part('autumn-plank', () => new THREE.BoxGeometry(span / 7 - .02, .06, .5), i % 2 ? color.woodLight : color.wood, [-span / 2 + (i + .5) * span / 7, .07, 0]))
    for (const s of [-1, 1]) g.add(part('autumn-rail', () => new THREE.BoxGeometry(span, .05, .04), color.wood, [0, .2, s * .24]))
    g.position.set(x, 0, z); g.rotation.y = -b.angle; scene.add(outline(g, .012))
  }
  // The item supply (two printed rows) and the 0–30 score track, with our own icons.
  ITEMS.forEach((row, r) => row.forEach((icon, i) => {
    const [x,, z] = world([ITEM_X0 + i * ITEM_STEP, ITEM_ROW_Y[r]!])
    addMesh(ownGeo(new THREE.BoxGeometry(.78, .06, .7)), toon(color.paperShade), x, .04, z)
    const label = badge('', { icon, iconFill: color.ink, bg: color.paperRaised, size: .52 }); label.position.set(x, .16, z); scene.add(label)
  }))
  for (let i = 0; i <= 30; i++) {
    const [x,, z] = world(scoreSpace(i))
    addMesh(ownGeo(new THREE.BoxGeometry(.80, .05, .54)), toon(color.paperShade), x, .035, z)
    const label = badge(String(i), { size: .52, bg: color.paperRaised }); label.position.set(x, .10, z); scene.add(label)
  }

  // Slots: permanent earth footprints. The suit badge is always shown (it matters for play); numbers are optional.
  const picking: THREE.Object3D[] = [], labels = new THREE.Group()
  scene.add(labels)
  const pads = new Map<string, THREE.Mesh>()
  const padGeo = ownGeo(new THREE.CircleGeometry(1, 8)), stoneGeo = ownGeo(new THREE.DodecahedronGeometry(.065, 0))
  const earthMat = basic(color.path), selectedMat = basic(color.autumnGold)
  for (const plot of PLOTS) {
    const [x,, z] = world(plot.at)
    const pad = addMesh(padGeo, earthMat, x, .026, z); pad.rotation.x = -Math.PI / 2
    pad.scale.set(PLOT_HALF * WIDTH, PLOT_HALF * DEPTH, 1)
    pad.userData.plotId = plot.id; picking.push(pad); pads.set(plot.id, pad)
    for (let i = 0; i < 12; i++) {
      if (i === 2 || i === 3 || i === 4) continue // Open entrance at the front.
      const a = i / 12 * Math.PI * 2
      addMesh(stoneGeo, toon(i % 3 ? color.pathEdge : color.paperShade), x + Math.cos(a) * .51, .065, z + Math.sin(a) * .45)
    }
    const label = badge(plot.id, { size: .36 }); label.position.set(x, .9, z); labels.add(label)
  }
  for (const c of CLEARINGS) {
    const [x,, z] = world([c.at[0] - CLEARING_RX * .82, c.at[1] - CLEARING_RY * .82])
    const suit = badge('', { icon: c.suit, iconFill: color.paperRaised, bg: suitColor[c.suit], size: .78 }); suit.position.set(x, 1.1, z); scene.add(suit)
    const number = badge(String(c.id + 1), { size: .5, bg: color.autumnGold }); number.position.set(x + .8, 1.1, z); labels.add(number)
  }

  return {
    picking, pads, labels, earthMat, selectedMat, plantTrees: opts.deferTrees ? plantTrees : () => {},
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()) },
  }
}

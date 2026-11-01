import type { FactionId, PlayerView } from '@root/game-engine'
import * as THREE from 'three'
import type { Travel } from '../motion.ts'
import { FACTION_COLOR } from '../names.ts'
import { color } from '../ui/tokens.ts'
import { CLEARING_R, forestCentre, groundHeight, PIECE_SCALE, spotPoint, world } from './geo.ts'
import { badge, outline, part, shape, toon } from './toon.ts'

/**
 * Pieces in the board's toon style. Every faction reads by shape as well as colour (style-guide §2): cat ears,
 * a beak and crest, long ears, a hooded cloak; the three Marquise buildings differ by a saw, a chimney and a flag.
 */

const INK_W = 0.022
const cyl = (rt: number, rb: number, h: number, seg = 12) => () => new THREE.CylinderGeometry(rt, rb, h, seg)
const cone = (r: number, h: number, seg = 10) => () => new THREE.ConeGeometry(r, h, seg)
const ball = (r: number) => () => new THREE.SphereGeometry(r, 14, 10)
const box = (x: number, y: number, z: number) => () => new THREE.BoxGeometry(x, y, z)
const capsule = (r: number, l: number) => () => new THREE.CapsuleGeometry(r, l, 4, 8)

function warrior(f: FactionId): THREE.Group {
  const c = FACTION_COLOR[f]
  const g = new THREE.Group()
  g.add(part('w-body', cyl(0.1, 0.15, 0.32), c, [0, 0.16, 0]), part('w-head', ball(0.115), c, [0, 0.42, 0]))
  if (f === 'marquise') {
    for (const s of [-1, 1]) g.add(part('cat-ear', cone(0.06, 0.15, 6), c, [s * 0.07, 0.56, 0], [0, 0, -s * 0.3]))
  } else if (f === 'eyrie') {
    g.add(part('beak', cone(0.04, 0.13, 8), color.autumnGold, [0, 0.41, 0.13], [Math.PI / 2, 0, 0]))
    g.add(part('crest', cone(0.035, 0.12, 6), c, [0, 0.56, -0.03], [-0.4, 0, 0]))
  } else {
    for (const s of [-1, 1]) g.add(part('long-ear', capsule(0.03, 0.15), c, [s * 0.05, 0.62, -0.01], [0, 0, -s * 0.18]))
  }
  return outline(g, INK_W)
}

function pawn(): THREE.Group {
  const c = FACTION_COLOR.vagabond
  const g = new THREE.Group()
  g.add(part('cloak', cone(0.21, 0.56, 12), c, [0, 0.28, 0]), part('hood', ball(0.13), c, [0, 0.6, -0.01]),
    part('face', ball(0.085), color.paperShade, [0, 0.6, 0.07]), part('pack', box(0.17, 0.19, 0.1), color.wood, [0, 0.36, -0.15]),
    part('staff', cyl(0.018, 0.018, 0.78, 6), color.wood, [0.2, 0.39, 0.04], [0, 0, -0.08]))
  return outline(g, INK_W)
}

export function building(type: string, f: FactionId): THREE.Group {
  const c = FACTION_COLOR[f]
  const g = new THREE.Group()
  if (type === 'roost') {
    g.add(part('stump', cyl(0.09, 0.12, 0.42, 8), color.wood, [0, 0.21, 0]))
    g.add(part('nest', () => new THREE.TorusGeometry(0.17, 0.075, 8, 18), c, [0, 0.46, 0], [Math.PI / 2, 0, 0]))
  } else if (type === 'base') {
    g.add(part('tent', cone(0.3, 0.5, 4), c, [0, 0.25, 0], [0, Math.PI / 4, 0]))
    g.add(part('pole', cyl(0.012, 0.012, 0.3, 5), color.wood, [0, 0.6, 0]), part('pennant', box(0.14, 0.08, 0.01), color.paperRaised, [0.07, 0.7, 0]))
  } else {
    g.add(part('walls', box(0.38, 0.27, 0.36), c, [0, 0.135, 0]), part('roof', cone(0.33, 0.24, 4), color.roofRed, [0, 0.39, 0], [0, Math.PI / 4, 0]))
    if (type === 'sawmill') g.add(part('saw', cyl(0.12, 0.12, 0.03, 16), color.rock, [0, 0.14, 0.2], [Math.PI / 2, 0, 0]))
    if (type === 'workshop') g.add(part('chimney', box(0.07, 0.2, 0.07), color.rock, [0.1, 0.45, 0.05]))
    if (type === 'recruiter') g.add(part('pole', cyl(0.012, 0.012, 0.3, 5), color.wood, [0.12, 0.5, 0.1]), part('flag', box(0.13, 0.08, 0.01), c, [0.18, 0.6, 0.1]))
  }
  return outline(g, INK_W)
}

export function ruin(): THREE.Group {
  const g = new THREE.Group()
  g.add(part('pillar-a', cyl(0.07, 0.08, 0.36, 7), color.rock, [-0.1, 0.18, 0]), part('pillar-b', cyl(0.07, 0.08, 0.22, 7), color.rock, [0.1, 0.11, 0]),
    part('lintel', box(0.2, 0.06, 0.08), color.rock, [0.05, 0.03, 0.12], [0, 0.6, 0]))
  return outline(g, INK_W)
}

function token(type: string, f: FactionId): THREE.Group {
  const c = FACTION_COLOR[f]
  const g = new THREE.Group()
  if (type === 'wood') {
    g.add(part('log', cyl(0.06, 0.06, 0.3, 8), color.woodLight, [0, 0.06, 0.04], [0, 0, Math.PI / 2]),
      part('log', cyl(0.06, 0.06, 0.3, 8), color.woodLight, [0, 0.06, -0.08], [0, 0, Math.PI / 2]),
      part('log', cyl(0.06, 0.06, 0.3, 8), color.woodLight, [0, 0.16, -0.02], [0, 0, Math.PI / 2]))
  } else if (type === 'keep') {
    g.add(part('tower', cyl(0.16, 0.19, 0.48, 10), c, [0, 0.24, 0]))
    for (let i = 0; i < 4; i++) g.add(part('merlon', box(0.07, 0.08, 0.07), c, [Math.cos(i * Math.PI / 2) * 0.12, 0.52, Math.sin(i * Math.PI / 2) * 0.12]))
  } else {
    g.add(part('disc', cyl(0.17, 0.17, 0.06, 20), c, [0, 0.03, 0]), part('heart', ball(0.07), color.paperRaised, [0, 0.08, 0]))
  }
  return outline(g, INK_W)
}

const slotGeo = () => shape('slot', () => new THREE.BoxGeometry(0.66, 0.04, 0.66))
const ringGeo = (r: number, tube: number) => shape(`ring-${r}-${tube}`, () => new THREE.TorusGeometry(r, tube, 8, 56))
const pulseMat = () => new THREE.MeshBasicMaterial({ color: color.autumnGold, transparent: true })
const litMat = new THREE.MeshBasicMaterial({ color: color.autumnGold })

/**
 * Pieces for one view. `highlight` rings the chosen clearings, `targets` lightly marks those that can be clicked.
 * Objects in `changed` clearings are listed in `pop`, plus one fading ring each in `pulse`.
 */
export function buildPieces(view: PlayerView, highlight: number[], changed: number[], targets: number[] = []): { root: THREE.Group; pop: THREE.Object3D[]; pulse: THREE.Mesh[] } {
  const root = new THREE.Group()
  const pop: THREE.Object3D[] = [], pulse: THREE.Mesh[] = []
  for (const [id, c] of view.map.clearings.entries()) {
    const p = world(id)
    const fresh = changed.includes(id)
    const add = (o: THREE.Object3D) => { o.scale.setScalar(PIECE_SCALE); root.add(o); if (fresh) pop.push(o) }
    // Slots on an arc at the back of the clearing.
    c.slots.forEach((slot, i) => {
      const a = Math.PI * (1.15 + (i + 0.5) / c.slots.length * 0.7)
      const sx = p.x + Math.cos(a) * 0.85, sz = p.z + Math.sin(a) * 0.85
      const pad = new THREE.Mesh(slotGeo(), toon(color.paperShade))
      pad.position.set(sx, 0.11, sz)
      pad.receiveShadow = true
      root.add(outline(pad, 0.03))
      if (!slot) return
      const obj = slot.kind === 'ruin' ? ruin() : building(slot.type, slot.faction)
      obj.position.set(sx, 0.13, sz)
      add(obj)
    })
    // Warriors in rows at the front; large groups become a stack with a count.
    const groups = Object.entries(c.warriors).filter(([, n]) => n && n > 0) as [FactionId, number][]
    groups.forEach(([f, n], gi) => {
      const baseX = p.x - (groups.length - 1) * 0.5 + gi * 1.0, baseZ = p.z + 0.5
      for (let k = 0; k < Math.min(n, 4); k++) {
        const w = warrior(f)
        w.position.set(baseX + (k % 2) * 0.36 - 0.18, 0.1, baseZ + Math.floor(k / 2) * 0.32 - 0.16)
        add(w)
      }
      if (n > 1) {
        const tag = badge(String(n), { bg: FACTION_COLOR[f], fg: color.white, size: 0.46 })
        tag.position.set(baseX, 1.35, baseZ)
        root.add(tag)
      }
    })
    c.tokens.forEach((t, i) => {
      const obj = token(t.type, t.faction)
      obj.position.set(p.x + 1.05, 0.1, p.z - 0.35 + i * 0.5)
      add(obj)
    })
    // Who rules the clearing (from the engine's view, §2.5): their icon opposite the clearing's number.
    const lord = view.rulers?.[id]
    if (lord) {
      const mark = badge('', { bg: FACTION_COLOR[lord], icon: lord, iconFill: color.paperRaised, size: 0.42 })
      mark.position.set(p.x + CLEARING_R * 0.8, 0.85, p.z - CLEARING_R * 0.8)
      root.add(mark)
    }
    if (fresh) {
      const ring = new THREE.Mesh(ringGeo(CLEARING_R, 0.09), pulseMat())
      ring.rotation.x = Math.PI / 2
      ring.position.set(p.x, 0.16, p.z)
      root.add(ring)
      pulse.push(ring)
    }
    if (highlight.includes(id)) {
      const ring = new THREE.Mesh(ringGeo(CLEARING_R + 0.16, 0.08), litMat)
      ring.rotation.x = Math.PI / 2
      ring.position.set(p.x, 0.14, p.z)
      root.add(outline(ring, 0.03))
    } else if (targets.includes(id)) {
      const ring = new THREE.Mesh(ringGeo(CLEARING_R + 0.14, 0.035), litMat)
      ring.rotation.x = Math.PI / 2
      ring.position.set(p.x, 0.14, p.z)
      root.add(ring)
    }
  }
  const where = view.factions.vagabond?.pawn
  if (where) {
    const fig = pawn()
    fig.scale.setScalar(PIECE_SCALE)
    const p = where.kind === 'clearing' ? world(where.id).add(new THREE.Vector3(0.6, 0, 0.6)) : forestCentre(where.id)
    fig.position.set(p.x, where.kind === 'clearing' ? 0.1 : groundHeight(p.x, p.z), p.z)
    root.add(fig)
    if (where.kind === 'clearing' && changed.includes(where.id)) pop.push(fig)
  }
  return { root, pop, pulse }
}

/** One figure per travel (with its count), hopping along the path; hidden once it lands. */
export function buildMovers(travels: Travel[]): { o: THREE.Object3D; from: THREE.Vector3; to: THREE.Vector3 }[] {
  return travels.map(t => {
    const o = new THREE.Group()
    const fig = t.pawn ? pawn() : warrior(t.faction)
    fig.scale.setScalar(PIECE_SCALE * 1.15)
    o.add(fig)
    if (t.count > 1) {
      const tag = badge(String(t.count), { bg: FACTION_COLOR[t.faction], fg: color.white, size: 0.46 })
      tag.position.y = 1.3
      o.add(tag)
    }
    return { o, from: spotPoint(t.from), to: spotPoint(t.to) }
  })
}

/** Frees what a pieces group made for itself: the pulse rings' materials. Shared shapes and materials stay cached. */
export function disposePieces(root: THREE.Group) {
  root.traverse(o => { if (o instanceof THREE.Mesh && o.material !== litMat && o.material instanceof THREE.MeshBasicMaterial && o.material.transparent) o.material.dispose() })
}

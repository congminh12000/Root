import type { FactionId, PlayerView } from '@root/game-engine'
import * as THREE from 'three'
import type { Spot, Travel } from '../motion.ts'
import { FACTION_COLOR } from '../names.ts'
import { color } from '../ui/tokens.ts'
import { CLEARING_R, PIECE_SCALE, spotPoint, world } from './geo.ts'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { IconName } from '../ui/icons.ts'
import { badge, part, shape, stickerOn } from './toon.ts'
import { material } from './look.ts'

/**
 * The pieces as a wooden set (style-guide §3): meeples cut in each faction's animal outline, buildings and tokens as
 * painted blocks and discs with printed stickers, score markers as discs on the printed track.
 */

const cyl = (rt: number, rb: number, h: number, seg = 12) => () => new THREE.CylinderGeometry(rt, rb, h, seg)
const box = (x: number, y: number, z: number) => () => new THREE.BoxGeometry(x, y, z)

/**
 * A wooden meeple: the faction's animal outline, cut from a board and rounded at the edges, the way the physical game's
 * pieces are made (style-guide §3). Outlines are drawn in a 0.4 × 0.8 box standing on y = 0; every faction reads by its
 * outline as well as its colour (§2): cat ears, a beak and crest, long ears, a hood.
 */
const SILHOUETTE: Record<FactionId, (s: THREE.Shape) => void> = {
  marquise: s => {
    s.moveTo(-.17, 0); s.lineTo(.17, 0); s.quadraticCurveTo(.18, .2, .11, .3); s.quadraticCurveTo(.17, .36, .15, .44)
    s.lineTo(.16, .6); s.lineTo(.07, .52); s.quadraticCurveTo(0, .55, -.07, .52); s.lineTo(-.16, .6); s.lineTo(-.15, .44)
    s.quadraticCurveTo(-.17, .36, -.11, .3); s.quadraticCurveTo(-.18, .2, -.17, 0)
  },
  eyrie: s => {
    s.moveTo(-.16, 0); s.lineTo(.16, 0); s.quadraticCurveTo(.18, .2, .11, .31); s.quadraticCurveTo(.15, .36, .15, .41)
    s.lineTo(.27, .44); s.lineTo(.14, .49); s.quadraticCurveTo(.1, .57, .03, .57); s.lineTo(-.02, .66); s.lineTo(-.05, .56)
    s.quadraticCurveTo(-.15, .52, -.14, .42); s.quadraticCurveTo(-.15, .35, -.11, .31); s.quadraticCurveTo(-.18, .2, -.16, 0)
  },
  alliance: s => {
    s.moveTo(-.17, 0); s.lineTo(.17, 0); s.quadraticCurveTo(.18, .2, .11, .3); s.quadraticCurveTo(.16, .36, .14, .45)
    s.quadraticCurveTo(.15, .7, .1, .76); s.quadraticCurveTo(.05, .7, .04, .52); s.lineTo(-.04, .52)
    s.quadraticCurveTo(-.05, .7, -.1, .76); s.quadraticCurveTo(-.15, .7, -.14, .45); s.quadraticCurveTo(-.16, .36, -.11, .3)
    s.quadraticCurveTo(-.18, .2, -.17, 0)
  },
  vagabond: s => {
    s.moveTo(-.2, 0); s.lineTo(.2, 0); s.quadraticCurveTo(.16, .25, .11, .4); s.quadraticCurveTo(.17, .5, .13, .6)
    s.quadraticCurveTo(.06, .72, 0, .72); s.quadraticCurveTo(-.06, .72, -.13, .6); s.quadraticCurveTo(-.17, .5, -.11, .4)
    s.quadraticCurveTo(-.16, .25, -.2, 0)
  },
}
const meeple = (f: FactionId) => () => {
  const s = new THREE.Shape(); SILHOUETTE[f](s)
  return new THREE.ExtrudeGeometry(s, { depth: .1, bevelEnabled: true, bevelThickness: .025, bevelSize: .022, bevelSegments: 3, curveSegments: 10 }).translate(0, 0, -.05)
}

function warrior(f: FactionId): THREE.Group {
  const g = new THREE.Group()
  g.add(part(`meeple-${f}`, meeple(f), FACTION_COLOR[f], [0, .025, 0]))
  return g
}

function pawn(): THREE.Group {
  const g = new THREE.Group()
  g.add(part('meeple-vagabond', meeple('vagabond'), FACTION_COLOR.vagabond, [0, .025, 0]),
    part('staff', cyl(0.018, 0.018, 0.78, 6), color.wood, [0.22, 0.39, 0.06], [0, 0, -0.08]),
    part('pack', box(0.17, 0.19, 0.08), color.woodLight, [0, 0.36, -0.12]))
  return g
}

/** Rounded wooden block (painted), the shape every building and token block shares. */
const block = (w: number, h: number, d: number) => () => new RoundedBoxGeometry(w, h, d, 3, .035)
const BUILDING_ICON: Record<string, IconName> = { sawmill: 'saw', workshop: 'hammer', recruiter: 'marquise', roost: 'eyrie', base: 'alliance' }

/** A building: a painted wooden block with its printed sticker on top (§6.2.3 sawmill, workshop, recruiter; roost; base). */
export function building(type: string, f: FactionId): THREE.Group {
  const g = new THREE.Group()
  g.add(part('building-block', block(.4, .2, .4), FACTION_COLOR[f], [0, .1, 0]), stickerOn(BUILDING_ICON[type] ?? 'card', .15, .2, FACTION_COLOR[f]))
  return g
}

export function ruin(): THREE.Group {
  const g = new THREE.Group()
  g.add(part('pillar-a', cyl(0.07, 0.08, 0.36, 7), color.rock, [-0.1, 0.18, 0]), part('pillar-b', cyl(0.07, 0.08, 0.22, 7), color.rock, [0.1, 0.11, 0]),
    part('lintel', box(0.2, 0.06, 0.08), color.rock, [0.05, 0.03, 0.12], [0, 0.6, 0]))
  return g
}

function token(type: string, f: FactionId): THREE.Group {
  const c = FACTION_COLOR[f]
  const g = new THREE.Group()
  if (type === 'wood') {
    g.add(part('log', cyl(0.06, 0.06, 0.3, 8), color.woodLight, [0, 0.06, 0.04], [0, 0, Math.PI / 2]),
      part('log', cyl(0.06, 0.06, 0.3, 8), color.woodLight, [0, 0.06, -0.08], [0, 0, Math.PI / 2]),
      part('log', cyl(0.06, 0.06, 0.3, 8), color.woodLight, [0, 0.16, -0.02], [0, 0, Math.PI / 2]))
  } else if (type === 'keep') {
    g.add(part('keep-block', block(.3, .42, .3), c, [0, .21, 0]), stickerOn('marquise', .12, .42, c))
  } else {
    g.add(part('disc', cyl(0.17, 0.17, 0.07, 24), c, [0, 0.035, 0]), stickerOn('alliance', .12, .07, c))
  }
  return g
}

const slotGeo = () => shape('slot', () => new THREE.BoxGeometry(0.66, 0.04, 0.66))
const ringGeo = (r: number, tube: number) => shape(`ring-${r}-${tube}`, () => new THREE.TorusGeometry(r, tube, 8, 56))
const pulseMat = () => new THREE.MeshBasicMaterial({ color: color.autumnGold, transparent: true })
const litMat = new THREE.MeshBasicMaterial({ color: color.autumnGold })

/** Where pieces stand on a particular map (map/theme.ts). The classic board uses CLASSIC below. */
export interface Placement {
  centre(c: number): THREE.Vector3
  /** Building slot `i` of `n` in clearing `c`. */
  slot(c: number, i: number, n: number): THREE.Vector3
  /** Where warrior group `gi` of `groups` stands. */
  warriors(c: number, gi: number, groups: number): THREE.Vector3
  token(c: number, i: number): THREE.Vector3
  /** The Vagabond in a clearing or a forest, or a moving piece's end (motion.ts). */
  spot(s: Spot): THREE.Vector3
  /** Half-axes of the ring around a clearing. */
  ring: [number, number]
  /** Where the ruler badge floats, relative to the centre. */
  rulerOffset: THREE.Vector3
  /** Draw a pad under each slot (the classic board); the diorama paints its slots into the ground. */
  pads: boolean
  /** Space `points` (0–30) of a score track printed on the map, if the map has one. */
  score?: (points: number) => THREE.Vector3
}

/** The classic board (UI-3): slots on an arc at the back, warriors in front, tokens to the right. */
export const CLASSIC: Placement = {
  centre: c => world(c),
  slot: (c, i, n) => { const p = world(c), a = Math.PI * (1.15 + (i + 0.5) / n * 0.7); return new THREE.Vector3(p.x + Math.cos(a) * 0.85, 0.13, p.z + Math.sin(a) * 0.85) },
  warriors: (c, gi, groups) => { const p = world(c); return new THREE.Vector3(p.x - (groups - 1) * 0.5 + gi * 1.0, 0.1, p.z + 0.5) },
  token: (c, i) => { const p = world(c); return new THREE.Vector3(p.x + 1.05, 0.1, p.z - 0.35 + i * 0.5) },
  spot: s => (s.kind === 'clearing' ? world(s.id).add(new THREE.Vector3(0.6, 0.1, 0.6)) : spotPoint(s)),
  ring: [CLEARING_R, CLEARING_R],
  rulerOffset: new THREE.Vector3(CLEARING_R * 0.8, 0.85, -CLEARING_R * 0.8),
  pads: true,
}

const ellipseRing = (at: THREE.Vector3, [rx, rz]: [number, number], grow: number, tube: number, mat: THREE.Material) => {
  const ring = new THREE.Mesh(ringGeo(1, tube / Math.max(rx, rz)), mat)
  ring.rotation.x = Math.PI / 2
  ring.scale.set(rx + grow, rz + grow, 1)
  ring.position.set(at.x, 0.14, at.z)
  return ring
}

/**
 * Pieces for one view, placed by `at`. `highlight` rings the chosen clearings, `targets` lightly marks those that can
 * be clicked. Objects in `changed` clearings are listed in `pop`, plus one fading ring each in `pulse`.
 */
export function buildPieces(view: PlayerView, highlight: number[], changed: number[], targets: number[] = [], at: Placement = CLASSIC): { root: THREE.Group; pop: THREE.Object3D[]; pulse: THREE.Mesh[] } {
  const root = new THREE.Group()
  const pop: THREE.Object3D[] = [], pulse: THREE.Mesh[] = []
  for (const [id, c] of view.map.clearings.entries()) {
    const p = at.centre(id)
    const fresh = changed.includes(id)
    // Pieces in a chosen clearing are lifted a hair off the board, as if picked up.
    const lift = highlight.includes(id) ? .06 : 0
    const add = (o: THREE.Object3D) => { o.scale.setScalar(PIECE_SCALE); o.position.y += lift; root.add(o); if (fresh) pop.push(o) }
    c.slots.forEach((slot, i) => {
      const s = at.slot(id, i, c.slots.length)
      if (at.pads) {
        const pad = new THREE.Mesh(slotGeo(), material(color.paperShade))
        pad.position.set(s.x, s.y - 0.02, s.z)
        pad.receiveShadow = true
        root.add(pad)
      }
      if (!slot) return
      const obj = slot.kind === 'ruin' ? ruin() : building(slot.type, slot.faction)
      obj.position.copy(s)
      add(obj)
    })
    // Warriors in rows at the front; large groups become a stack with a count.
    const groups = Object.entries(c.warriors).filter(([, n]) => n && n > 0) as [FactionId, number][]
    groups.forEach(([f, n], gi) => {
      const base = at.warriors(id, gi, groups.length)
      for (let k = 0; k < Math.min(n, 4); k++) {
        const w = warrior(f)
        // Two rows, the back row offset, each meeple turned a little as if set down by hand.
        const row = Math.floor(k / 2)
        w.position.set(base.x + (k % 2) * 0.44 - 0.22 + row * 0.12, base.y, base.z + row * 0.3 - 0.15)
        w.rotation.y = ((k * 37 + id * 11) % 7 - 3) * 0.07
        add(w)
      }
      if (n > 1) {
        const tag = badge(String(n), { bg: FACTION_COLOR[f], fg: color.white, size: 0.46 })
        tag.position.set(base.x, 1.35, base.z)
        root.add(tag)
      }
    })
    c.tokens.forEach((t, i) => {
      const obj = token(t.type, t.faction)
      obj.position.copy(at.token(id, i))
      add(obj)
    })
    // Who rules the clearing (from the engine's view, §2.5).
    const lord = view.rulers?.[id]
    if (lord) {
      const mark = badge('', { bg: FACTION_COLOR[lord], icon: lord, iconFill: color.paperRaised, size: 0.42 })
      mark.position.copy(p).add(at.rulerOffset)
      root.add(mark)
    }
    if (fresh) {
      const ring = ellipseRing(p, at.ring, 0, 0.09, pulseMat())
      ring.position.y = 0.16
      root.add(ring)
      pulse.push(ring)
    }
    if (highlight.includes(id)) root.add(ellipseRing(p, at.ring, 0.16, 0.08, litMat))
    else if (targets.includes(id)) root.add(ellipseRing(p, at.ring, 0.14, 0.035, litMat))
  }
  const where = view.factions.vagabond?.pawn
  if (where) {
    const fig = pawn()
    fig.scale.setScalar(PIECE_SCALE)
    fig.position.copy(at.spot(where))
    root.add(fig)
    if (where.kind === 'clearing' && changed.includes(where.id)) pop.push(fig)
  }
  // Score markers on the printed track (§3.1); factions on the same space stack upwards. Dominance players leave it.
  if (at.score) {
    const seen = new Map<number, number>()
    for (const [f, n] of Object.entries(view.score) as [FactionId, number | null][]) {
      if (typeof n !== 'number') continue
      const space = Math.min(30, n), stack = seen.get(space) ?? 0
      seen.set(space, stack + 1)
      const mark = new THREE.Group()
      mark.add(part('score-disc', cyl(.2, .2, .08, 24), FACTION_COLOR[f], [0, .04, 0]), stickerOn(f, .14, .08, FACTION_COLOR[f]))
      mark.position.copy(at.score(space)).add(new THREE.Vector3(0, stack * .09, -stack * .06))
      root.add(mark)
    }
  }
  return { root, pop, pulse }
}

/** One figure per travel (with its count), hopping along the path; hidden once it lands. */
export function buildMovers(travels: Travel[], at: Placement = CLASSIC): { o: THREE.Object3D; from: THREE.Vector3; to: THREE.Vector3 }[] {
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
    return { o, from: at.spot(t.from), to: at.spot(t.to) }
  })
}

/** Frees what a pieces group made for itself: the pulse rings' materials. Shared shapes and materials stay cached. */
export function disposePieces(root: THREE.Group) {
  root.traverse(o => { if (o instanceof THREE.Mesh && o.material !== litMat && o.material instanceof THREE.MeshBasicMaterial && o.material.transparent) o.material.dispose() })
}

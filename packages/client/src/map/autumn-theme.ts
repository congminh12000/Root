import { AUTUMN } from '@root/game-data'
import * as THREE from 'three'
import type { Placement } from '../board/pieces.ts'
import { CLEARINGS, CLEARING_RX, CLEARING_RY, DEPTH, RIVER, RIVER_HALF, scoreSpace, WIDTH, world } from '../autumn/layout.ts'
import { buildAutumnScenery } from '../autumn/scenery.ts'
import { color } from '../ui/tokens.ts'
import { buildApron, type XZ } from './apron.ts'
import { apronRadius, type Bounds } from './limits.ts'
import type { MapTheme } from './theme.ts'

const bounds: Bounds = { halfW: WIDTH / 2, halfD: DEPTH / 2 }
const RX = CLEARING_RX * WIDTH, RZ = CLEARING_RY * DEPTH
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const centre = (c: number) => { const [x,, z] = world(CLEARINGS[c]!.at); return v(x, .07, z) }
const forestCentre = (f: number) => {
  const ring = AUTUMN.forests[f]!.map(centre)
  return ring.reduce((a, p) => a.add(p), v(0, 0, 0)).multiplyScalar(1 / ring.length).setY(.05)
}

/** Slots across the back (the approved plots), warriors in a row in front, tokens behind them, the pawn to one side. */
const placement: Placement = {
  centre,
  slot: (c, i) => { const [x,, z] = world(CLEARINGS[c]!.plots[i]!.at); return v(x, .07, z) },
  warriors: (c, gi, groups) => centre(c).add(v(-(groups - 1) * .5 + gi * 1.0, 0, RZ * .38)),
  token: (c, i) => centre(c).add(v(-.5 + i * .55, 0, RZ * .7)),
  spot: s => (s.kind === 'clearing' ? centre(s.id).add(v(RX * .64, 0, RZ * .5)) : forestCentre(s.id)),
  ring: [RX * 1.02, RZ * 1.02],
  rulerOffset: v(RX * .62, 0, -RZ * .55),
  pads: false,
  score: n => { const [x,, z] = world(scoreSpace(n)); return v(x, .1, z) },
}

/** Beyond the board the river keeps climbing north and the lake opens out to the west (world units). */
const toXZ = (p: readonly [number, number]): XZ => { const [x,, z] = world(p); return [x, z] }
const riverOn: XZ[] = [toXZ(RIVER[0]!), [5.6, -17], [3.6, -24], [6.8, -33], [3.5, -45], [6, -60], [4, -95]]
const lakeOn: XZ[] = [[-13.9, -.4], [-18, -3], [-26, -5.5], [-40, -4], [-60, -6], [-95, -2], [-95, 16], [-60, 14], [-40, 15], [-26, 11], [-18, 8], [-13.9, 6.5]]

export const AUTUMN_DIORAMA: MapTheme = {
  id: 'autumn-diorama',
  name: 'Autumn diorama',
  bounds,
  clearingDepth: 2 * RZ,
  background: color.pine,
  placement,
  build(scene, quality) {
    performance.mark('map:scenery-start')
    const scenery = buildAutumnScenery(scene, { slab: false, deferTrees: true })
    performance.measure('map:scenery', 'map:scenery-start')
    scenery.labels.visible = false
    let disposeApron = () => {}
    // Clicking a clearing's open ground or one of its slots picks that clearing.
    const disc = new THREE.CircleGeometry(1, 40), hidden = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    const picking: THREE.Object3D[] = CLEARINGS.map(c => {
      const m = new THREE.Mesh(disc, hidden); const p = centre(c.id)
      m.rotation.x = -Math.PI / 2; m.scale.set(RX, RZ, 1); m.position.set(p.x, .02, p.z); m.userData.clearing = c.id
      scene.add(m); return m
    })
    for (const pad of scenery.picking) { const plot = CLEARINGS.flatMap(c => c.plots).find(p => p.id === pad.userData.plotId)!; pad.userData.clearing = plot.clearing; picking.push(pad) }
    const later = [
      () => {
        performance.mark('map:apron-start')
        disposeApron = buildApron(scene, { bounds, radius: apronRadius(bounds), seed: 2611, rivers: [{ line: riverOn, half: RIVER_HALF * WIDTH }], lakes: [lakeOn] }, { trees: quality.apronTrees })
        performance.measure('map:apron', 'map:apron-start')
      },
      () => scenery.plantTrees(),
    ]
    return { picking, later, dispose() { scenery.dispose(); disposeApron(); disc.dispose(); hidden.dispose() } }
  },
}

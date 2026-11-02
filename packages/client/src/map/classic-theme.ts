import { CLASSIC } from '../board/pieces.ts'
import { CLEARING_R, GROUND_X, GROUND_Z } from '../board/geo.ts'
import { buildClassicScenery } from '../board/scenery.ts'
import { color } from '../ui/tokens.ts'
import { buildApron } from './apron.ts'
import { apronRadius, type Bounds } from './limits.ts'
import type { MapTheme } from './theme.ts'

const bounds: Bounds = { halfW: GROUND_X / 2, halfD: GROUND_Z / 2 }

/**
 * The classic board (UI-3) on the map-only screen: its rolling ground, forests and suit-ringed clearings, without the
 * table, inside a forest apron. The board has no river or lake of its own, so the apron is forest and glades only.
 */
export const CLASSIC_BOARD: MapTheme = {
  id: 'classic',
  name: 'Bàn cổ điển',
  bounds,
  clearingDepth: 2 * CLEARING_R,
  background: color.pine,
  placement: CLASSIC,
  build(scene, quality) {
    performance.mark('map:scenery-start')
    const scenery = buildClassicScenery(scene, { table: false })
    performance.measure('map:scenery', 'map:scenery-start')
    let disposeApron = () => {}
    const later = [
      () => {
        performance.mark('map:apron-start')
        // The board's ground rolls down to about -0.2 (board/geo.ts), so the apron sits just below it.
        disposeApron = buildApron(scene, { bounds, radius: apronRadius(bounds), seed: 1907, rivers: [], lakes: [], ground: -.24 }, { trees: quality.apronTrees })
        performance.measure('map:apron', 'map:apron-start')
      },
      () => scenery.plantTrees(),
    ]
    return { picking: scenery.picking, later, dispose() { scenery.dispose(); disposeApron() } }
  },
}

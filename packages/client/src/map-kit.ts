import './ui/setup.ts'
import { sampleView } from './dev/sample.ts'
import { AUTUMN_DIORAMA } from './map/autumn-theme.ts'
import { mountMap } from './map/stage.ts'

/**
 * map-kit.html: the game's full-screen map on a fixed sample position, without a server, for camera-limit checks,
 * performance and review screenshots (visual/map.spec.ts). Clicking a clearing rings it.
 */
const host = document.getElementById('app')!
host.className = 'game-screen'
host.innerHTML = '<div class="game-map"></div>'
const view = sampleView()
const stage = mountMap(host.querySelector<HTMLElement>('.game-map')!, AUTUMN_DIORAMA, { pick: c => stage.update(view, [c]) })
stage.update(view, [])
;(window as unknown as { map: typeof stage }).map = stage

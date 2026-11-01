import './ui/setup.ts'
import { renderBoard } from './board.ts'
import { mountBoard3D } from './board3d.ts'
import { sampleView } from './dev/sample.ts'

/**
 * board-kit.html: the board alone, on a fixed mid-game position (seeded random play), to compare with the style
 * reference, measure frame rate and take screenshots (visual/). ?only=3d|2d shows one board; ?spin=1 orbits.
 */

const params = new URLSearchParams(location.search)
const only = params.get('only')
const view = sampleView()
const app = document.getElementById('app')!
app.innerHTML = `<main class="kit-page"><h1>Root 2 · board kit</h1><p class="note">Lượt ${view.turn.number}, vị trí cố định từ seed. Ô 5 đang được đánh dấu.</p>
  ${only === '2d' ? '' : '<section class="card kit"><h2>3D</h2><div class="map" id="b3"></div></section>'}
  ${only === '3d' ? '' : `<section class="card kit"><h2>2D</h2><div class="map">${renderBoard(view, [4])}</div></section>`}</main>`
const host = document.getElementById('b3')
if (host) {
  const board = mountBoard3D(host, () => {}, { autoRotate: params.get('spin') === '1' })
  board.update(view, [4])
  ;(window as unknown as { board: unknown }).board = board
}

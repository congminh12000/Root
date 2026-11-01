import './ui/setup.ts'
import { applyCommand, createGame, currentActor, legalActions, seededRng, viewFor, type FactionId } from '@root/game-engine'
import { renderBoard } from './board.ts'
import { mountBoard3D } from './board3d.ts'

/**
 * board-kit.html: the board alone, on a fixed mid-game position (seeded random play), to compare with the style
 * reference, measure frame rate and take screenshots (visual/). ?only=3d|2d shows one board; ?spin=1 orbits.
 */

function midGame() {
  const factions: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']
  const rng = seededRng('board-kit')
  let s = createGame({ gameId: 'kit', players: factions.map(f => ({ playerId: f, faction: f, controller: { kind: 'bot', profile: 'r' } })) }, rng)
  for (let n = 0; n < 2000 && !s.winner && s.turn.number < 9; n++) {
    const f = currentActor(s)!
    const legal = legalActions(s, f)
    // Prefer building up the board so every kind of piece shows.
    const action = legal.find(a => /build|recruit|spread|revolt|place|organize|move/.test(a.type) && rng.int(3) > 0) ?? legal[rng.int(legal.length)]!
    s = applyCommand(s, { gameId: 'kit', playerId: f, expectedRevision: s.meta.revision, actionId: `k${n}`, ...action }, rng).state
  }
  return viewFor(s, null)
}

const params = new URLSearchParams(location.search)
const only = params.get('only')
const view = midGame()
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

import './ui/setup.ts'
import { html } from 'htm/preact'
import { render } from 'preact'
import { Game } from './ui/screens/game.ts'
import { Lobby } from './ui/screens/lobby.ts'

const params = new URLSearchParams(location.search)
const game = params.get('game')
// Fetch the map (three.js and the theme) while the game connects, not after its first update arrives.
if (game) void Promise.all([import('./map/stage.ts'), import('./map/autumn-theme.ts')])
render(game ? html`<${Game} gameId=${game} token=${params.get('seat')} />` : html`<${Lobby} />`, document.getElementById('app')!)

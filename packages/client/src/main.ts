import './ui/setup.ts'
import { html } from 'htm/preact'
import { render } from 'preact'
import { Game } from './ui/screens/game.ts'
import { Lobby } from './ui/screens/lobby.ts'

const params = new URLSearchParams(location.search)
const game = params.get('game')
render(game ? html`<${Game} gameId=${game} token=${params.get('seat')} />` : html`<${Lobby} />`, document.getElementById('app')!)

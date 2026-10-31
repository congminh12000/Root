import { renderGame } from './game.ts'
import { renderLobby } from './lobby.ts'

const root = document.getElementById('app')!
const params = new URLSearchParams(location.search)
const game = params.get('game')
if (game) renderGame(root, game, params.get('seat'))
else void renderLobby(root)

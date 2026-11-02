import { applyCommand, createGame, currentActor, legalActions, seededRng, viewFor, type FactionId, type GameState } from '@root/game-engine'

/**
 * A fixed mid-game position from seeded random play, for ui-kit.html and map-kit.html (the seed name is historical; changing it changes the sample). It leans towards building
 * and moving so every kind of piece shows. Never used in a real game.
 */
export function sampleGame(turns = 9): GameState {
  const factions: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']
  const rng = seededRng('board-kit')
  let s = createGame({ gameId: 'kit', players: factions.map(f => ({ playerId: f, faction: f, controller: { kind: 'bot', profile: 'r' } })) }, rng)
  for (let n = 0; n < 2000 && !s.winner && s.turn.number < turns; n++) {
    const f = currentActor(s)!
    const legal = legalActions(s, f)
    const action = legal.find(a => /build|recruit|spread|revolt|place|organize|move/.test(a.type) && rng.int(3) > 0) ?? legal[rng.int(legal.length)]!
    s = applyCommand(s, { gameId: 'kit', playerId: f, expectedRevision: s.meta.revision, actionId: `k${n}`, ...action }, rng).state
  }
  return s
}

export const sampleView = (seat: FactionId | null = null) => viewFor(sampleGame(), seat)

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyCommand, createGame, currentActor, legalActions, seededRng, viewFor, type FactionId } from '@root/game-engine'
import { BOTS } from '../src/index.ts'

/** Bots only ever receive a PlayerView and the legal list; every pick must be accepted by the engine. */
for (const bot of Object.values(BOTS)) {
  test(`${bot.id} bot finishes games choosing only from legal actions`, () => {
    const factions: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']
    for (let g = 0; g < 4; g++) {
      const rng = seededRng(`bot-${bot.id}-${g}`)
      let s = createGame({ gameId: 'b', players: factions.map(f => ({ playerId: f, faction: f, controller: { kind: 'bot', profile: bot.id } })) }, rng)
      for (let n = 0; n < 4000 && !s.winner; n++) {
        const f = currentActor(s)!
        const action = bot.choose(viewFor(s, f), legalActions(s, f), rng)
        const out = applyCommand(s, { gameId: 'b', playerId: f, expectedRevision: s.meta.revision, actionId: `${n}`, ...action }, rng)
        assert.ok(out.result.ok)
        s = out.state
      }
      assert.ok(s.winner, `game ${g} finished`)
    }
  })
}

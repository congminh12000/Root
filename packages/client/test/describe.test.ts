import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyCommand, createGame, currentActor, legalActions, seededRng, type FactionId } from '@root/game-engine'
import { clearingsOf, describe, GROUP } from '../src/describe.ts'

test('every action met in random games has a group title and a non-empty description', () => {
  const factions: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']
  const seen = new Set<string>()
  for (let g = 0; g < 6; g++) {
    const rng = seededRng(`describe-${g}`)
    let s = createGame({ gameId: 'd', players: factions.map(f => ({ playerId: f, faction: f, controller: { kind: 'bot', profile: 'r' } })) }, rng)
    for (let n = 0; n < 3000 && !s.winner; n++) {
      const f = currentActor(s)!
      const legal = legalActions(s, f)
      for (const a of legal) {
        seen.add(a.type)
        assert.ok(GROUP[a.type], `group for ${a.type}`)
        assert.ok(describe(a).length > 0, `describe ${a.type}`)
      }
      s = applyCommand(s, { gameId: 'd', playerId: f, expectedRevision: s.meta.revision, actionId: `${n}`, ...legal[rng.int(legal.length)]! }, rng).state
    }
  }
  assert.ok(seen.size > 30, `saw ${seen.size} action types`)
})

test('clearingsOf finds the clearings an action is about', () => {
  assert.deepEqual(clearingsOf({ type: 'move', payload: { from: 2, to: 3, warriors: 1 } }), [2, 3])
  assert.deepEqual(clearingsOf({ type: 'vagabond-slip', payload: { to: { kind: 'clearing', id: 4 } } }), [4])
  assert.deepEqual(clearingsOf({ type: 'marquise-build', payload: { building: 'sawmill', clearing: 1, wood: [0, 0] } }), [1, 0])
})

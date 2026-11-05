import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createGame, seededRng, viewFor, type FactionId, type PlayerView } from '@root/game-engine'
import { woodGains } from '../src/net/changes.ts'

// RD-M14: "+1 wood" pops come from Marquise wood tokens that appeared in a clearing.

const FACTIONS: FactionId[] = ['marquise', 'eyrie']
const base = viewFor(createGame({ gameId: 't', players: FACTIONS.map(f => ({ playerId: f, faction: f, controller: { kind: 'bot', profile: 'r' } })) }, seededRng('m14')), null)
const withWood = (counts: Record<number, number>): PlayerView => ({
  ...base, map: { ...base.map, clearings: base.map.clearings.map((c, i) => ({ ...c, tokens: Array.from({ length: counts[i] ?? 0 }, () => ({ faction: 'marquise' as const, type: 'wood' as const })) })) },
})

test('only clearings that gained Marquise wood pop, with how many', () => {
  assert.deepEqual(woodGains(withWood({ 0: 1, 4: 0 }), withWood({ 0: 2, 4: 1, 7: 0 })), [{ clearing: 0, gained: 1 }, { clearing: 4, gained: 1 }])
  assert.deepEqual(woodGains(withWood({ 3: 2 }), withWood({ 3: 0 })), [], 'spending wood shows nothing')
  assert.deepEqual(woodGains(withWood({}), withWood({})), [])
})

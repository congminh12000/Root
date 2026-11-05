import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createGame, seededRng, viewFor, type FactionId, type PlayerView } from '@root/game-engine'
import { eventsSince } from '../src/interaction/events.ts'

// RD-M09: faction event banners come from the public log and the public Eyrie board only.

const FACTIONS: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']
const base = viewFor(createGame({ gameId: 't', players: FACTIONS.map(f => ({ playerId: f, faction: f, controller: { kind: 'bot', profile: 'r' } })) }, seededRng('ev')), null)
const at = (revision: number, eyrie?: object): PlayerView => ({ ...base, revision, factions: { ...base.factions, ...(eyrie ? { eyrie: eyrie as never } : {}) } })

test('Revolt, Outrage, Coalition and Dominance in the new part of the log become banners', () => {
  const log = [
    { revision: 4, faction: 'alliance' as const, type: 'alliance-revolt', detail: { clearing: 2 } },
    { revision: 11, faction: 'alliance' as const, type: 'alliance-revolt', detail: { clearing: 5 } },
    { revision: 12, faction: 'marquise' as const, type: 'outrage-give' },
    { revision: 13, faction: 'vagabond' as const, type: 'vagabond-coalition' },
    { revision: 14, faction: 'eyrie' as const, type: 'activate-dominance' },
    { revision: 14, faction: 'eyrie' as const, type: 'move' },
  ]
  const events = eventsSince(at(10), at(14), log)
  assert.deepEqual(events.map(e => [e.title, e.faction]), [['Revolt', 'alliance'], ['Outrage!', 'alliance'], ['Coalition', 'vagabond'], ['Dominance', 'eyrie']])
  assert.equal(events[0]!.note, 'ở ô 6')
  assert.deepEqual(eventsSince(at(14), at(14), log), [], 'nothing new, nothing shown')
})

test('Turmoil shows when the public Eyrie board starts deposing, once', () => {
  assert.deepEqual(eventsSince(at(5, { deposing: false }), at(6, { deposing: true }), []).map(e => e.title), ['Turmoil'])
  assert.deepEqual(eventsSince(at(6, { deposing: true }), at(7, { deposing: true }), []), [])
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createGame, seededRng, viewFor, type FactionId } from '@root/game-engine'
import { ownResources } from '../src/interaction/resources.ts'

// RD-M05: supplies on the seat's own badge come straight from its public faction board.

const FACTIONS: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']

test('each faction shows its supplies and cards in hand, read from the view', () => {
  const s = createGame({ gameId: 't', players: FACTIONS.map(f => ({ playerId: f, faction: f, controller: { kind: 'bot', profile: 'r' } })) }, seededRng('res'))
  // Run the automatic setup steps only; boards exist once each faction set up, so patch them in for the check.
  const v = viewFor(s, 'marquise')
  const patched = {
    ...v, handCounts: { marquise: 3, eyrie: 2, alliance: 4, vagabond: 1 }, supporterCount: 3,
    factions: {
      marquise: { warriorSupply: 10, woodSupply: 6 }, eyrie: { warriorSupply: 14, roostsOnTrack: 6 },
      alliance: { warriorSupply: 10, sympathyOnTrack: 10 }, vagabond: {},
    } as unknown as typeof v.factions,
  }
  assert.deepEqual(ownResources(patched, 'marquise').map(r => [r.label, r.value]), [['Chiến binh trong kho', 10], ['Gỗ trong kho', 6], ['Lá trên tay', 3]])
  assert.deepEqual(ownResources(patched, 'eyrie').map(r => r.value), [14, 6, 2])
  assert.deepEqual(ownResources(patched, 'alliance').map(r => r.value), [10, 10, 3, 4])
  assert.deepEqual(ownResources(patched, 'vagabond').map(r => r.value), [1])
})

test('before a faction has set up, only the hand count shows', () => {
  const s = createGame({ gameId: 't', players: FACTIONS.map(f => ({ playerId: f, faction: f, controller: { kind: 'bot', profile: 'r' } })) }, seededRng('res'))
  const v = { ...viewFor(s, 'eyrie'), factions: {} }
  assert.deepEqual(ownResources(v, 'eyrie').map(r => r.label), ['Lá trên tay'])
})

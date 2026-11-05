import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createGame, seededRng, viewFor, type FactionId, type PlayerView } from '@root/game-engine'
import { toastsSince } from '../src/interaction/events.ts'
import { decreeCounts, relationshipWith } from '../src/interaction/opponents.ts'
import { promptFor } from '../src/interaction/prompt.ts'
import { IDLE } from '../src/interaction/select.ts'

// RD-M10 to RD-M13: Evening discard count, dominance notice, opponents' public details.

const FACTIONS: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']
const base = viewFor(createGame({ gameId: 't', players: FACTIONS.map(f => ({ playerId: f, faction: f, controller: { kind: 'bot', profile: 'r' } })) }, seededRng('m10')), 'marquise')

test('RD-M10: the Evening discard banner counts the cards still to drop', () => {
  const v: PlayerView = { ...base, hand: ['a#1', 'b#1', 'c#1', 'd#1', 'e#1', 'f#1', 'g#1'], waitingOn: ['marquise'], pending: [{ kind: 'discard-down', player: 'marquise', to: 5 }] }
  const legal = v.hand.map(card => ({ type: 'discard-card', payload: { card } }) as never)
  assert.equal(promptFor({ view: v, legal, seat: 'marquise', stage: IDLE, focus: null, decision: null }), 'Bỏ 2 lá (giữ 5)')
  assert.equal(promptFor({ view: { ...v, hand: v.hand.slice(0, 6) }, legal, seat: 'marquise', stage: IDLE, focus: null, decision: null }), 'Bỏ 1 lá (giữ 5)')
})

test('RD-M11: a notice only for dominance cards that just became available', () => {
  const prev: PlayerView = { ...base, availableDominance: ['dominance-fox#1'] }
  const next: PlayerView = { ...base, revision: base.revision + 1, availableDominance: ['dominance-fox#1', 'dominance-bird#1'] }
  const toasts = toastsSince(prev, next, c => c.split('#')[0]!)
  assert.equal(toasts.length, 1)
  assert.ok(toasts[0]!.text.includes('dominance-bird'))
  assert.deepEqual(toastsSince(next, next, c => c), [])
})

test('RD-M12: Eyrie Decree counts per column and the Vagabond relationship with the viewer', () => {
  const v: PlayerView = { ...base, factions: { ...base.factions,
    eyrie: { decree: { recruit: [{ kind: 'vizier', index: 0 }], move: [{ kind: 'card', id: 'x#1' }, { kind: 'card', id: 'y#1' }], battle: [], build: [{ kind: 'vizier', index: 1 }] } } as never,
    vagabond: { relationships: { marquise: 2, eyrie: 'hostile', alliance: 3 } } as never } }
  assert.deepEqual(decreeCounts(v)!.map(d => d.count), [1, 2, 0, 1])
  assert.deepEqual(relationshipWith(v, 'marquise'), { text: 'Quan hệ 2/3', hostile: false })
  assert.deepEqual(relationshipWith(v, 'eyrie'), { text: 'Thù địch', hostile: true })
  assert.deepEqual(relationshipWith(v, 'alliance'), { text: 'Đồng minh', hostile: false })
  assert.equal(relationshipWith(v, 'vagabond'), null)
  assert.equal(relationshipWith(v, null), null)
  assert.equal(decreeCounts({ ...v, factions: {} }), null)
})

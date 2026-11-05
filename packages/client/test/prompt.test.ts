import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createGame, legalActions, seededRng, viewFor, type Action, type FactionId, type PlayerView } from '@root/game-engine'
import { decisionOf } from '../src/interaction/decisions.ts'
import { promptFor } from '../src/interaction/prompt.ts'
import { IDLE } from '../src/interaction/select.ts'

// RD-M03: the order banner says what the seat can do now, and nothing when the game waits on someone else.

const FACTIONS: FactionId[] = ['marquise', 'eyrie']
const game = (setup?: 'advanced') => createGame({ gameId: 't', ...(setup ? { setup } : {}), players: FACTIONS.map(f => ({ playerId: f, faction: f, controller: { kind: 'bot', profile: 'r' } })) }, seededRng('prompt'))
const at = (v: PlayerView, legal: Action[], seat: FactionId, extra: Partial<Parameters<typeof promptFor>[0]> = {}) =>
  promptFor({ view: v, legal, seat, stage: IDLE, focus: null, decision: decisionOf(v, legal), ...extra })

test('a setup choice reads as an order to the player who makes it, and others get no banner', () => {
  const s = game()
  const actor = s.pending.at(-1)!.player
  const v = viewFor(s, actor)
  const legal = legalActions(s, actor)
  assert.equal(at(v, legal, actor), 'Đặt Keep vào một ô góc')
  const other = FACTIONS.find(f => f !== actor)!
  assert.equal(at(viewFor(s, other), [], other), null)
  assert.equal(promptFor({ view: v, legal, seat: null, stage: IDLE, focus: null, decision: decisionOf(v, legal) }), null)
})

test('Advanced Setup: the first homeland pick is named in the banner', () => {
  const s = game('advanced')
  const actor = s.pending.at(-1)!.player
  const legal = legalActions(s, actor)
  const text = at(viewFor(s, actor), legal, actor)!
  assert.ok(actor === 'marquise' ? text.startsWith('Chọn 3 ô homeland') : text.startsWith('Chọn homeland ở mép bản đồ'), text)
})

test('the Build prompt, a chosen clearing and a lone Continue each get their own order', () => {
  const s = game()
  const actor = s.pending.at(-1)!.player
  const v: PlayerView = { ...viewFor(s, actor), pending: [] }
  const some: Action[] = [{ type: 'marquise-recruit', payload: { clearings: [0] } } as Action]
  assert.equal(promptFor({ view: v, legal: some, seat: actor, stage: IDLE, focus: 'marquise-build', decision: null }), 'Chọn ô để xây')
  assert.equal(promptFor({ view: v, legal: some, seat: actor, stage: { kind: 'at', clearing: 2 }, focus: null, decision: null }), 'Chọn việc làm ở ô 3')
  assert.equal(promptFor({ view: v, legal: [{ type: 'end-step', payload: {} }], seat: actor, stage: IDLE, focus: null, decision: null }), 'Bấm Continue để sang bước tiếp theo')
})

test('Marquise Daylight actions: the banner counts the actions left', () => {
  const s = game()
  const base = viewFor(s, 'marquise')
  const seat = base.seats.findIndex(x => x.faction === 'marquise')
  const v: PlayerView = {
    ...base, pending: [], waitingOn: ['marquise'], turn: { ...base.turn, seat, phase: 'daylight', step: 'actions' },
    factions: { ...base.factions, marquise: { ...base.factions.marquise!, actionsRemaining: 2 } },
  }
  const legal: Action[] = [{ type: 'marquise-recruit', payload: { clearings: [0] } } as Action, { type: 'end-step', payload: {} }]
  assert.equal(promptFor({ view: v, legal, seat: 'marquise', stage: IDLE, focus: null, decision: null }), 'Chọn một hành động (còn 2)')
})

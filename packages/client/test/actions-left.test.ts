import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyCommand, createGame, currentActor, legalActions, seededRng, viewFor, type FactionId, type GameState, type PlayerView } from '@root/game-engine'
import { marquiseActionsLeft } from '../src/interaction/actions-left.ts'

const FACTIONS: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']

/** A real game played by seeded random choices until `stop` holds (the engine keeps every number). */
function playUntil(stop: (s: GameState) => boolean): GameState {
  const rng = seededRng('rd-m01')
  let s = createGame({ gameId: 't', players: FACTIONS.map(f => ({ playerId: f, faction: f, controller: { kind: 'bot', profile: 'r' } })) }, rng)
  for (let n = 0; n < 5000 && !s.winner; n++) {
    if (stop(s)) return s
    const f = currentActor(s)!
    const legal = legalActions(s, f)
    const action = legal.find(a => a.type === 'end-step') && rng.int(4) === 0 ? legal.find(a => a.type === 'end-step')! : legal[rng.int(legal.length)]!
    s = applyCommand(s, { gameId: 't', playerId: f, expectedRevision: s.meta.revision, actionId: `a${n}`, ...action }, rng).state
  }
  throw new Error('position not reached')
}

const inActions = (s: GameState) => s.seats[s.turn.seat]!.faction === 'marquise' && s.turn.phase === 'daylight' && s.turn.step === 'actions'
const marquiseView = (v: PlayerView, patch: Partial<PlayerView['factions']['marquise'] & object>): PlayerView =>
  ({ ...v, factions: { ...v.factions, marquise: { ...v.factions.marquise!, ...patch } } })

test('Marquise Daylight actions: three at the start of the step, the same number for every seat and spectators', () => {
  const s = playUntil(inActions)
  for (const seat of [...FACTIONS, null]) assert.equal(marquiseActionsLeft(viewFor(s, seat)), 3)
})

test('the badge follows the engine count: down after an action, up after a bird, zero when spent', () => {
  const s = playUntil(st => inActions(st) && st.factions.marquise!.actionsRemaining < 3 && st.factions.marquise!.marching === 0)
  assert.equal(marquiseActionsLeft(viewFor(s, 'eyrie')), s.factions.marquise!.actionsRemaining)
  const v = viewFor(s, 'marquise')
  assert.equal(marquiseActionsLeft(marquiseView(v, { actionsRemaining: 4 })), 4)
  assert.equal(marquiseActionsLeft(marquiseView(v, { actionsRemaining: 0 })), 0)
})

test('no badge outside the Marquise Daylight actions step', () => {
  const s = playUntil(inActions)
  const v = viewFor(s, 'marquise')
  assert.equal(marquiseActionsLeft({ ...v, turn: { ...v.turn, step: 'craft' } }), null, 'craft comes before the count is set')
  assert.equal(marquiseActionsLeft({ ...v, turn: { ...v.turn, phase: 'birdsong', step: 'wood' } }), null)
  assert.equal(marquiseActionsLeft({ ...v, turn: { ...v.turn, phase: 'evening', step: 'draw' } }), null)
  const eyrieSeat = v.seats.findIndex(x => x.faction === 'eyrie')
  assert.equal(marquiseActionsLeft({ ...v, turn: { ...v.turn, seat: eyrieSeat } }), null, 'another faction is taking its turn')
  const { marquise: _gone, ...others } = v.factions
  assert.equal(marquiseActionsLeft({ ...v, factions: others }), null, 'no Marquise in this game')
  assert.equal(marquiseActionsLeft({ ...v, winner: { factions: ['eyrie'], reason: 'points' } }), null)
})

test('another faction in its own Daylight never shows the Marquise count', () => {
  const s = playUntil(st => st.seats[st.turn.seat]!.faction === 'eyrie' && st.turn.phase === 'daylight')
  for (const seat of [...FACTIONS, null]) assert.equal(marquiseActionsLeft(viewFor(s, seat)), null)
})

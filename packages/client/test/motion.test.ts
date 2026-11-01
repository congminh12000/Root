import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyCommand, createGame, currentActor, legalActions, seededRng, viewFor, type FactionId } from '@root/game-engine'
import { freshRoll, travelsSince, type LogEntry } from '../src/motion.ts'

test('travels and rolls come from the public log and views alone, matching what the engine did', () => {
  const factions: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']
  const rng = seededRng('motion')
  let state = createGame({ gameId: 'm', players: factions.map(f => ({ playerId: f, faction: f, controller: { kind: 'bot', profile: 'r' } })) }, rng)
  const seen = new Set<string>()
  let rolls = 0
  for (let n = 0; n < 4000 && !state.winner; n++) {
    const actor = currentActor(state)!
    const legal = legalActions(state, actor)
    const action = legal[rng.int(legal.length)]!
    const before = viewFor(state, null)
    const out = applyCommand(state, { gameId: 'm', playerId: actor, expectedRevision: state.meta.revision, actionId: `a${n}`, ...action }, rng)
    if (!out.result.ok) throw new Error(out.result.message)
    state = out.state
    const after = viewFor(state, null)
    const log: LogEntry[] = [{ revision: 0, faction: actor, type: 'move', detail: { from: 0, to: 1, warriors: 1 } }, // already seen: skipped
      { revision: after.revision, faction: actor, type: action.type, detail: action.payload }]
    const travels = travelsSince(before, log)
    const p = action.payload as Record<string, unknown>
    if (action.type === 'move' || action.type === 'eyrie-move') {
      seen.add('move')
      assert.deepEqual(travels, [{ faction: actor, from: { kind: 'clearing', id: p.from }, to: { kind: 'clearing', id: p.to }, count: p.warriors }])
    } else if (action.type === 'vagabond-move' || action.type === 'vagabond-slip') {
      seen.add(action.type)
      assert.deepEqual(travels[0], { faction: 'vagabond', from: before.factions.vagabond!.pawn, to: after.factions.vagabond!.pawn, count: 1, pawn: true })
    } else assert.deepEqual(travels, [], action.type)

    const roll = freshRoll(before, after)
    if (roll) {
      rolls++
      assert.ok(roll.dice.every(d => d >= 0 && d <= 3))
      assert.ok(roll.hits.attacker <= Math.max(...roll.dice) && roll.hits.defender <= Math.max(...roll.dice))
    }
    assert.equal(freshRoll(after, after), null, 'a roll is shown once')
  }
  assert.deepEqual([...seen].sort(), ['move', 'vagabond-move', 'vagabond-slip'])
  assert.ok(rolls > 0, 'some battle rolled')
})

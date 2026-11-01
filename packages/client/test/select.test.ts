import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyCommand, createGame, currentActor, legalActions, seededRng, type Action, type FactionId } from '@root/game-engine'
import { actionsAlong, actionsAt, click, destinations, generalActions, IDLE, startClearings, stillValid, viewOf, warriorCounts } from '../src/interaction/select.ts'

const key = (a: Action) => JSON.stringify(a)

function* positions(seed: string, steps: number) {
  const factions: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']
  const rng = seededRng(seed)
  let s = createGame({ gameId: seed, players: factions.map(f => ({ playerId: f, faction: f, controller: { kind: 'bot', profile: 'r' } })) }, rng)
  for (let n = 0; n < steps && !s.winner; n++) {
    const f = currentActor(s)!
    const legal = legalActions(s, f)
    yield legal
    s = applyCommand(s, { gameId: seed, playerId: f, expectedRevision: s.meta.revision, actionId: `${n}`, ...legal[rng.int(legal.length)]! }, rng).state
  }
}

test('every legal action is reachable on the board or as a button, exactly once', () => {
  let paths = 0, at = 0, counts = 0
  for (const seed of ['sel-a', 'sel-b', 'sel-c']) {
    for (const legal of positions(seed, 1500)) {
      const reached: string[] = generalActions(legal).map(key)
      for (const c of startClearings(legal)) {
        reached.push(...actionsAt(legal, c).map(key))
        at += actionsAt(legal, c).length
        for (const d of destinations(legal, c)) {
          const along = actionsAlong(legal, c, d)
          reached.push(...along.map(key))
          paths++
          if (warriorCounts(along)) counts++
          // Clicking the start then the destination lands on exactly these actions.
          const stage = click(legal, click(legal, IDLE, c), d)
          assert.deepEqual(stage, { kind: 'path', from: c, to: d })
          assert.deepEqual(viewOf(legal, stage).along.map(key), along.map(key))
        }
      }
      assert.deepEqual(reached.sort(), legal.map(key).sort())
    }
  }
  assert.ok(paths > 100 && at > 100 && counts > 20, `exercised paths ${paths}, clearing actions ${at}, count pickers ${counts}`)
})

test('clicks: select, go on to a destination, step back, deselect; stale stages fall back to idle', () => {
  const legal = [
    { type: 'move', payload: { from: 0, to: 4, warriors: 1 } },
    { type: 'move', payload: { from: 0, to: 4, warriors: 2 } },
    { type: 'battle', payload: { clearing: 0, defender: 'eyrie' } },
    { type: 'battle', payload: { clearing: 7, defender: 'alliance' } },
    { type: 'end-step', payload: {} },
  ] as Action[]
  assert.deepEqual(viewOf(legal, IDLE).targets, [0, 7])
  assert.deepEqual(click(legal, IDLE, 3), IDLE, 'nothing at clearing 4')
  const at0 = click(legal, IDLE, 0)
  assert.deepEqual(at0, { kind: 'at', clearing: 0 })
  assert.deepEqual(viewOf(legal, at0).here.map(a => a.type), ['battle'])
  assert.deepEqual(viewOf(legal, at0).destinations, [4])
  const path = click(legal, at0, 4)
  assert.deepEqual(warriorCounts(viewOf(legal, path).along), [1, 2])
  assert.deepEqual(click(legal, path, 4), at0, 'clicking the destination again steps back')
  assert.deepEqual(click(legal, at0, 0), IDLE, 'clicking the chosen clearing again deselects')
  assert.deepEqual(click(legal, at0, 7), { kind: 'at', clearing: 7 }, 'another clearing with actions is chosen instead')
  assert.deepEqual(stillValid(legal.slice(2), path), IDLE)
  assert.deepEqual(stillValid(legal, path), path)
  assert.deepEqual(generalActions(legal).map(a => a.type), ['end-step'])
})

test('card actions: every legal action naming a card is found from that card', async () => {
  const { actionsForCard } = await import('../src/interaction/cards.ts')
  let found = 0
  for (const legal of positions('cards', 1500)) {
    for (const a of legal) {
      const p = a.payload as Record<string, unknown>
      for (const k of ['card', 'spend', 'dominance']) {
        if (typeof p[k] !== 'string') continue
        assert.ok(actionsForCard(legal, p[k] as string).some(b => key(b) === key(a)), `${a.type} via ${k}`)
        found++
      }
    }
  }
  assert.ok(found > 200, `checked ${found}`)
})

test('decisions: every pending decision is worded, names who decides, and cites a clause', async () => {
  const { decisionOf } = await import('../src/interaction/decisions.ts')
  const { viewFor } = await import('@root/game-engine')
  const kinds = new Set<string>()
  for (const seed of ['dec-a', 'dec-b']) {
    const factions: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']
    const rng = seededRng(seed)
    let s = createGame({ gameId: seed, players: factions.map(f => ({ playerId: f, faction: f, controller: { kind: 'bot', profile: 'r' } })) }, rng)
    for (let n = 0; n < 3000 && !s.winner; n++) {
      const f = currentActor(s)!
      const legal = legalActions(s, f)
      const mine = decisionOf(viewFor(s, f), legal)
      const watching = decisionOf(viewFor(s, null), [])
      assert.equal(!!mine, s.pending.length > 0)
      if (mine) {
        kinds.add(mine.kind)
        assert.equal(mine.player, f)
        assert.ok(mine.title.length > 10 && !mine.title.includes('undefined') && /^§/.test(mine.rule), JSON.stringify(mine))
        if (!legal.some(a => a.type === 'order-effects')) assert.equal(watching!.title, mine.title, 'spectators see the same decision')
        assert.equal(watching!.dialog, false, 'never a dialog for someone who is not deciding')
      }
      s = applyCommand(s, { gameId: seed, playerId: f, expectedRevision: s.meta.revision, actionId: `${n}`, ...legal[rng.int(legal.length)]! }, rng).state
    }
  }
  for (const k of ['setup', 'take-hits', 'discard-down', 'ambush']) assert.ok(kinds.has(k), `saw ${k} (saw ${[...kinds].join(', ')})`)
})

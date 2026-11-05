import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyCommand, createGame, currentActor, legalActions, seededRng, type Action, type FactionId, type GameState } from '../src/index.ts'
import { setupStep } from '../src/setup.ts'

// Advanced Setup (App. A, decisions/0006, docs/02-rules-spec/setup.md). Clearing ids are 0-based; docs print id + 1.

const rng = seededRng('advanced-actions')

function game(factions: FactionId[], seed: string): GameState {
  const players = factions.map(f => ({ playerId: `p-${f}`, faction: f, controller: { kind: 'bot' as const, profile: 't' } }))
  return createGame({ gameId: 'g', setup: 'advanced', players }, seededRng(seed))
}

/** The first seed whose random seating satisfies `want`. */
function gameWhere(factions: FactionId[], want: (s: GameState) => boolean): GameState {
  for (let i = 0; i < 100; i++) { const s = game(factions, `adv-${i}`); if (want(s)) return s }
  throw new Error('no seed found')
}

function attempt(s: GameState, action: Action) {
  const f = currentActor(s)!
  return applyCommand(s, { gameId: 'g', playerId: `p-${f}`, expectedRevision: s.meta.revision, actionId: `a${s.meta.revision}`, ...action }, rng)
}

function act(s: GameState, action: Action): GameState {
  const out = attempt(s, action)
  assert.ok(out.result.ok, JSON.stringify(out.result))
  return out.state
}

function rejected(s: GameState, action: Action) {
  const out = attempt(s, action)
  assert.equal(out.result.ok, false)
  assert.equal(!out.result.ok && out.result.code, 'illegal-action')
}

const clearingsOf = (s: GameState) => legalActions(s, currentActor(s)!).map(a => (a.payload as { clearing: number }).clearing).sort((x, y) => x - y)
const homeland = (clearing: number): Action => ({ type: 'choose-homeland', payload: { clearing } })
const roost = (clearing: number): Action => ({ type: 'eyrie-place-roost', payload: { clearing } })

test('A.7: every player starts with five cards; Standard Setup still deals three (§5.1.3)', () => {
  const s = game(['marquise', 'eyrie', 'alliance', 'vagabond'], 'a7')
  assert.equal(s.setupMode, 'advanced')
  for (const { faction } of s.seats) assert.equal(s.hands[faction]!.length, 5)
  const standard = createGame({ gameId: 'g', players: [{ playerId: 'a', faction: 'marquise', controller: { kind: 'bot', profile: 't' } }, { playerId: 'b', faction: 'eyrie', controller: { kind: 'bot', profile: 't' } }] }, seededRng('a7'))
  assert.equal(standard.setupMode, undefined)
  assert.equal(standard.hands.marquise!.length, 3)
})

test('A.8.3: setup starts with the last player in turn order and goes counterclockwise', () => {
  const s = game(['marquise', 'eyrie', 'alliance', 'vagabond'], 'order')
  const order = s.pending.filter(p => p.kind === 'setup').reverse()
  const firsts = [...new Set(order.filter(p => p.step !== 'A.10' && p.step !== 'A.10-shuffle').map(p => p.player))]
  // createGame has already run the automatic steps at the front (a Woodland Alliance setting up first is all automatic).
  const expected = [...s.seats].reverse().map(x => x.faction)
  assert.deepEqual(firsts, expected.slice(expected.length - firsts.length))
  assert.ok(firsts.length >= expected.length - 1)
  // A.10 follows, in turn order, then one shuffle.
  assert.deepEqual(order.filter(p => p.step === 'A.10').map(p => p.player), s.seats.map(x => x.faction))
  assert.equal(order.at(-1)!.step, 'A.10-shuffle')
})

test('Marquise card: three connected homelands, garrison, keep and one building per homeland', () => {
  let s = gameWhere(['marquise', 'eyrie'], g => g.seats.at(-1)!.faction === 'marquise')
  assert.equal(currentActor(s), 'marquise')
  assert.equal(clearingsOf(s).length, 12) // no enemy homeland yet, every clearing has an open slot
  s = act(s, homeland(0)) // clearing 1
  assert.deepEqual(clearingsOf(s), [1, 3, 4]) // must touch a homeland: clearings 2, 4, 5
  rejected(s, homeland(6)) // clearing 7 is not adjacent
  s = act(s, homeland(1))
  s = act(s, homeland(3)) // homelands 1, 2, 4
  assert.deepEqual(s.homelands!.marquise, [0, 1, 3])

  // 2nd: two warriors in each homeland, one everywhere else (12 clearings: 6 + 9).
  s.map.clearings.forEach((c, i) => assert.equal(c.warriors.marquise, [0, 1, 3].includes(i) ? 2 : 1, `clearing ${i + 1}`))
  assert.equal(s.factions.marquise!.warriorSupply, 25 - 15)

  // 3rd: the keep in a homeland (no enemy homeland yet, so any of the three).
  assert.deepEqual(clearingsOf(s), [0, 1, 3])
  rejected(s, { type: 'marquise-place-keep', payload: { clearing: 4 } })
  s = act(s, { type: 'marquise-place-keep', payload: { clearing: 0 } })
  assert.equal(s.factions.marquise!.keep, 0)

  // One sawmill, workshop and recruiter, each in a different homeland.
  assert.equal(legalActions(s, 'marquise').length, 9)
  s = act(s, { type: 'marquise-place-building', payload: { building: 'sawmill', clearing: 0 } })
  rejected(s, { type: 'marquise-place-building', payload: { building: 'workshop', clearing: 0 } })
  rejected(s, { type: 'marquise-place-building', payload: { building: 'sawmill', clearing: 1 } })
  s = act(s, { type: 'marquise-place-building', payload: { building: 'workshop', clearing: 1 } })
  s = act(s, { type: 'marquise-place-building', payload: { building: 'recruiter', clearing: 3 } })
  assert.deepEqual(s.factions.marquise!.buildingsOnTrack, { sawmill: 5, workshop: 5, recruiter: 5 }) // 4th, as §6.3.5

  // Eyrie card: a homeland on the map edge with 2+ clearings between it and enemy homelands: clearings 10 and 12.
  assert.equal(currentActor(s), 'eyrie')
  assert.deepEqual(clearingsOf(s), [9, 11])
  rejected(s, roost(2)) // clearing 3: next to a Marquise homeland
  rejected(s, roost(6)) // clearing 7: not on the edge
  s = act(s, roost(11))
  assert.deepEqual(s.homelands!.eyrie, [11])
  assert.equal(s.map.clearings[11]!.warriors.eyrie, 6)
  assert.ok(s.map.clearings[11]!.slots.some(x => x?.kind === 'building' && x.type === 'roost'))
  s = act(s, legalActions(s, 'eyrie')[0]!) // leader, as §7.3.3

  // A.10: in turn order, each returns two cards to the deck, one at a time, and keeps three.
  for (const { faction } of s.seats) {
    assert.equal(currentActor(s), faction)
    rejected(s, { type: 'return-card', payload: { card: 'not-a-card' } })
    const [a, b] = s.hands[faction]!
    s = act(s, { type: 'return-card', payload: { card: a! } })
    rejected(s, { type: 'return-card', payload: { card: a! } }) // already returned
    s = act(s, { type: 'return-card', payload: { card: b! } })
    assert.equal(s.hands[faction]!.length, 3)
    assert.ok(s.deck.includes(a!) && s.deck.includes(b!))
  }
  assert.equal(s.stage, 'play')
  assert.equal(s.deck.length, 50 - 6) // two players: no dominance cards (A.7)
})

test('Marquise card: no enemy homeland as a homeland, a warrior in it anyway, keep away from it if able', () => {
  let s = gameWhere(['marquise', 'eyrie'], g => g.seats.at(-1)!.faction === 'eyrie')
  s = act(s, roost(0)) // Eyrie first: clearing 1 is its homeland
  s = act(s, legalActions(s, 'eyrie')[0]!)
  assert.equal(currentActor(s), 'marquise')
  assert.ok(!clearingsOf(s).includes(0))
  rejected(s, homeland(0))
  for (const c of [1, 2, 7]) s = act(s, homeland(c)) // clearings 2, 3, 8
  assert.equal(s.map.clearings[0]!.warriors.marquise, 1) // "each other clearing" includes the Eyrie homeland
  assert.deepEqual(clearingsOf(s), [2, 7]) // clearing 2 is next to the Eyrie homeland
  rejected(s, { type: 'marquise-place-keep', payload: { clearing: 1 } })
})

test('Marquise card: a homeland is only offered while three connected homelands can still be finished', () => {
  const s = gameWhere(['marquise', 'eyrie'], g => g.seats.at(-1)!.faction === 'marquise')
  // Fill every slot around clearing 1 except its own, so clearing 1 could not grow into three homelands.
  for (const c of [1, 3, 4]) s.map.clearings[c]!.slots = s.map.clearings[c]!.slots.map(x => x ?? { kind: 'building', faction: 'eyrie', type: 'roost' })
  assert.ok(!clearingsOf(s).includes(0))
})

test('A.8.3.II: the Eyrie homeland falls back from 2+ clearings between to not adjacent, then to any', () => {
  const s = game(['marquise', 'eyrie'], 'tiers')
  const offered = (homelands: NonNullable<GameState['homelands']>) => {
    s.homelands = homelands
    const step = setupStep('eyrie', 'A.8-eyrie-homeland')
    assert.ok('options' in step)
    return step.options(s).map(a => (a.payload as { clearing: number }).clearing + 1).sort((x, y) => x - y)
  }
  assert.deepEqual(offered({ marquise: [0, 1, 3] }), [10, 12]) // distance 3
  assert.deepEqual(offered({ marquise: [3, 5, 6] }), [2, 10]) // no distance 3 left: distance 2
  assert.deepEqual(offered({ marquise: [3, 5, 6], vagabond: [1, 9] }), [1, 3, 5, 8, 9, 11, 12]) // all adjacent: any edge
})

test('Advanced Setup always reaches play for every allowed faction mix', () => {
  const mixes: FactionId[][] = [['marquise', 'eyrie'], ['marquise', 'eyrie', 'alliance'], ['marquise', 'eyrie', 'vagabond'], ['marquise', 'alliance', 'vagabond'], ['marquise', 'eyrie', 'alliance', 'vagabond']]
  for (const mix of mixes) for (let i = 0; i < 15; i++) {
    let s = game(mix, `fuzz-${mix.join('+')}-${i}`)
    const pick = seededRng(`pick-${i}`)
    while (s.stage === 'setup') {
      const legal = legalActions(s, currentActor(s)!)
      assert.ok(legal.length, `stuck at ${JSON.stringify(s.pending.at(-1))}`)
      s = act(s, legal[pick.int(legal.length)]!)
    }
    for (const f of mix) assert.equal(s.hands[f]!.length, 3, f)
    const cards = mix.length === 2 ? 50 : 54
    assert.equal(s.deck.length + mix.length * 3 + (s.factions.alliance?.supporters.length ?? 0), cards)
    if (s.factions.marquise) {
      const onMap = s.map.clearings.reduce((n, c) => n + (c.warriors.marquise ?? 0), 0)
      assert.equal(onMap + s.factions.marquise.warriorSupply, 25)
      assert.equal(s.homelands!.marquise!.length, 3)
    }
    if (s.factions.eyrie) assert.equal(s.homelands!.eyrie!.length, 1)
  }
})

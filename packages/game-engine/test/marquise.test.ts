import assert from 'node:assert/strict'
import { test } from 'node:test'
import { legalActions } from '../src/index.ts'
import { answer, at, building, fixed, ofType, scenario, token, types, warriors } from './helpers.ts'

test('§6.4 Birdsong: one wood per sawmill; short of wood, the Marquise chooses where', () => {
  const s = scenario()
  building(s, 0, 'marquise', 'sawmill'); building(s, 1, 'marquise', 'sawmill'); building(s, 1, 'marquise', 'sawmill')
  warriors(s, 0, { marquise: 1 }); warriors(s, 1, { marquise: 1 })
  at(s, 'marquise', 'wood')
  assert.equal(s.map.clearings[1]!.tokens.filter(t => t.type === 'wood').length, 2)
  assert.equal(s.factions.marquise!.woodSupply, 5)

  const t = scenario()
  building(t, 0, 'marquise', 'sawmill'); building(t, 1, 'marquise', 'sawmill')
  t.factions.marquise!.woodSupply = 1
  at(t, 'marquise', 'wood')
  assert.deepEqual(ofType(legalActions(t, 'marquise'), 'marquise-place-wood').map(a => a.payload.clearings), [[0], [1]])
  const after = answer(t, { type: 'marquise-place-wood', payload: { clearings: [1] } })
  assert.equal(after.factions.marquise!.woodSupply, 0)
  assert.equal(after.map.clearings[1]!.tokens.length, 1)
})

test('§6.5 three actions, plus one per bird card spent; ends on its own when none are left', () => {
  let s = scenario()
  warriors(s, 0, { marquise: 4 }); warriors(s, 1, { marquise: 1 })
  s.hands.marquise = ['armorers#1']
  at(s, 'marquise', 'actions')
  assert.equal(s.factions.marquise!.actionsRemaining, 3)
  s = answer(s, { type: 'marquise-spend-bird', payload: { card: 'armorers#1' } })
  assert.equal(s.factions.marquise!.actionsRemaining, 4)
  assert.deepEqual(s.discard, ['armorers#1'])
  for (let i = 0; i < 4; i++) {
    s = answer(s, { type: 'move', payload: { from: 0, to: 1, warriors: 1 } })
    if (s.turn.step === 'actions') s = answer(s, { type: 'marquise-end-march', payload: {} })
  }
  assert.notEqual(s.turn.step, 'actions', 'no actions and no birds left: Daylight is over')
})

test('§6.5.2 March: up to two moves for one action, nothing else in between (§1.4.2)', () => {
  let s = scenario()
  warriors(s, 0, { marquise: 2 })
  at(s, 'marquise', 'actions')
  s = answer(s, { type: 'move', payload: { from: 0, to: 1, warriors: 2 } })
  assert.equal(s.factions.marquise!.actionsRemaining, 2)
  const mid = types(legalActions(s, 'marquise'))
  assert.deepEqual([...new Set(mid)].sort(), ['marquise-end-march', 'move'], 'only the second move or stopping')
  s = answer(s, { type: 'move', payload: { from: 1, to: 2, warriors: 2 } }) // §4.2.2 the same warriors again
  assert.equal(s.map.clearings[2]!.warriors.marquise, 2)
  assert.equal(s.factions.marquise!.actionsRemaining, 2)
  assert.ok(types(legalActions(s, 'marquise')).includes('end-step'), 'March over')
})

test('§6.5.3 Recruit: one warrior at each recruiter, once per turn; short of warriors, choose', () => {
  let s = scenario()
  building(s, 0, 'marquise', 'recruiter'); building(s, 1, 'marquise', 'recruiter')
  warriors(s, 0, { marquise: 1 })
  at(s, 'marquise', 'actions')
  s = answer(s, { type: 'marquise-recruit', payload: { clearings: [0, 1] } })
  assert.equal(s.map.clearings[0]!.warriors.marquise, 2)
  assert.equal(s.map.clearings[1]!.warriors.marquise, 1)
  assert.ok(!types(legalActions(s, 'marquise')).includes('marquise-recruit'), 'once per turn')

  const t = scenario()
  building(t, 0, 'marquise', 'recruiter'); building(t, 1, 'marquise', 'recruiter')
  t.factions.marquise!.warriorSupply = 1
  at(t, 'marquise', 'actions')
  assert.deepEqual(ofType(legalActions(t, 'marquise'), 'marquise-recruit').map(a => a.payload.clearings), [[0], [1]])
})

test('§6.5.4 Build: pay wood from clearings connected through ruled clearings, score the uncovered space', () => {
  let s = scenario()
  // Clearings 0–1–2 in a row; the Marquise rules 0 and 1, wood sits in 0. Workshop #2 costs 1 and scores 2.
  warriors(s, 0, { marquise: 1 }); warriors(s, 1, { marquise: 1 })
  building(s, 4, 'marquise', 'workshop') // one workshop already on the map (in clearing 4, not ruled)
  token(s, 0, 'marquise', 'wood'); s.factions.marquise!.woodSupply -= 1
  at(s, 'marquise', 'actions')
  const builds = ofType(legalActions(s, 'marquise'), 'marquise-build')
  assert.ok(builds.some(a => a.payload.clearing === 1 && a.payload.building === 'workshop' && a.payload.wood[0] === 0), 'wood from the adjacent ruled clearing')
  s = answer(s, { type: 'marquise-build', payload: { building: 'workshop', clearing: 1, wood: [0] } })
  assert.equal(s.score.marquise, 2)
  assert.equal(s.factions.marquise!.woodSupply, 8)
  assert.equal(s.factions.marquise!.buildingsOnTrack.workshop, 4)

  const t = scenario()
  warriors(t, 1, { marquise: 1 }); warriors(t, 0, { eyrie: 1 }) // clearing 0 is ruled by the Eyrie
  building(t, 4, 'marquise', 'workshop')
  token(t, 0, 'marquise', 'wood'); t.factions.marquise!.woodSupply -= 1
  at(t, 'marquise', 'actions')
  assert.ok(!ofType(legalActions(t, 'marquise'), 'marquise-build').some(a => a.payload.building === 'workshop'), 'wood behind an unruled clearing')
  t.factions.marquise!.buildingsOnTrack.sawmill = 0
  assert.ok(!ofType(legalActions(t, 'marquise'), 'marquise-build').some(a => a.payload.building === 'sawmill'), 'empty track')
})

test('§6.5.5 Overwork: spend a card matching a sawmill clearing to place a wood there', () => {
  let s = scenario()
  building(s, 0, 'marquise', 'sawmill') // clearing 0 is fox
  s.hands.marquise = ['anvil#1', 'bake-sale#1']
  at(s, 'marquise', 'actions')
  assert.deepEqual(ofType(legalActions(s, 'marquise'), 'marquise-overwork').map(a => a.payload.card), ['anvil#1'])
  s = answer(s, { type: 'marquise-overwork', payload: { clearing: 0, card: 'anvil#1' } })
  assert.equal(s.map.clearings[0]!.tokens[0]?.type, 'wood')
  s.factions.marquise!.woodSupply = 0
  s.hands.marquise = ['foxfolk-steel#1']
  assert.equal(ofType(legalActions(s, 'marquise'), 'marquise-overwork').length, 0, 'no wood left')
})

test('§6.5.1, §6.2.1 Battle and craft are offered; craft comes before the actions', () => {
  const s = scenario()
  building(s, 0, 'marquise', 'workshop') // fox
  warriors(s, 1, { marquise: 1, eyrie: 1 })
  s.hands.marquise = ['anvil#1']
  at(s, 'marquise', 'craft')
  assert.ok(types(legalActions(s, 'marquise')).includes('craft'))
  assert.ok(!types(legalActions(s, 'marquise')).includes('battle'))
  const after = answer(s, { type: 'craft', payload: { card: 'anvil#1' } })
  assert.deepEqual(after.factions.marquise!.craftedItems, ['hammer'])
  assert.equal(after.score.marquise, 2)
  assert.equal(after.turn.step, 'actions', 'nothing left to craft: on to the actions')
  const day = after
  assert.ok(ofType(legalActions(day, 'marquise'), 'battle').some(a => a.payload.clearing === 1 && a.payload.defender === 'eyrie'))
})

test('§6.6 Evening: draw one plus recruiter bonuses, discard down to five; then the next seat', () => {
  const s = scenario()
  for (const c of [0, 1, 2]) building(s, c, 'marquise', 'recruiter') // three on the map uncover the bonus at space 2
  s.hands.marquise = ['anvil#1', 'sword#1', 'bake-sale#1', 'investments#1']
  s.deck = ['crossbow-mouse#1', 'arms-trader#1', 'codebreakers#1']
  const after = at(s, 'marquise', 'draw', fixed([]))
  assert.equal(after.hands.marquise!.length, 6)
  assert.deepEqual(after.pending.at(-1), { kind: 'discard-down', player: 'marquise', to: 5 })
  const done = answer(after, { type: 'discard-card', payload: { card: 'anvil#1' } })
  assert.equal(done.hands.marquise!.length, 5)
  assert.equal(done.turn.number, 2)
  assert.equal(done.seats[done.turn.seat]!.faction, s.seats[(s.seats.findIndex(x => x.faction === 'marquise') + 1) % 4]!.faction)
})

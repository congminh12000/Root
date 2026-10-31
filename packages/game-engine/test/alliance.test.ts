import assert from 'node:assert/strict'
import { test } from 'node:test'
import { legalActions } from '../src/index.ts'
import { startBattle } from '../src/battle.ts'
import type { GameState } from '../src/index.ts'
import { answer, at, building, ofType, roll, scenario, token, turnOf, types, warriors } from './helpers.ts'

function sympathy(s: GameState, ...cs: number[]) {
  for (const c of cs) { s.map.clearings[c]!.tokens.push({ faction: 'alliance', type: 'sympathy' }); s.factions.alliance!.sympathyOnTrack -= 1 }
}
function base(s: GameState, c: number, suit: 'fox' | 'rabbit' | 'mouse') {
  const slots = s.map.clearings[c]!.slots
  slots[slots.indexOf(null)] = { kind: 'building', faction: 'alliance', type: 'base', suit }
  s.factions.alliance!.basesOnBoard[suit] = c
}

test('§8.4.1 Revolt: remove every enemy piece, place the base and warriors, add an officer, score buildings and tokens', () => {
  let s = scenario()
  // Fox clearings: 0, 5, 7, 9. Three are sympathetic; the Revolt is in 5.
  sympathy(s, 0, 5, 7)
  warriors(s, 5, { marquise: 2 })
  building(s, 5, 'marquise', 'sawmill')
  s.factions.alliance!.supporters = ['anvil#1', 'armorers#1', 'bake-sale#1']
  at(s, 'alliance', 'revolt')
  const revolts = ofType(legalActions(s, 'alliance'), 'alliance-revolt').filter(a => a.payload.clearing === 5)
  assert.deepEqual(revolts.map(a => a.payload.birds), [1], 'one fox and one bird supporter')
  s = answer(s, revolts[0]!)
  const c = s.map.clearings[5]!
  assert.equal(c.warriors.marquise, undefined)
  assert.equal(c.warriors.alliance, 3)
  assert.ok(c.slots.some(x => x?.kind === 'building' && x.type === 'base' && x.suit === 'fox'))
  assert.equal(s.factions.alliance!.officers, 1)
  assert.equal(s.score.alliance, 1, 'the sawmill')
  assert.deepEqual(s.factions.alliance!.supporters, ['bake-sale#1'])
  assert.ok(!ofType(legalActions(s, 'alliance'), 'alliance-revolt').some(a => [0, 7, 9].includes(a.payload.clearing)), 'fox base already built (FAQ)')
})

test('§8.4.1, §6.2.2 no Revolt where sympathy cannot be (the keep), nor without two matching supporters', () => {
  const s = scenario()
  sympathy(s, 0)
  s.factions.alliance!.supporters = ['anvil#1']
  at(s, 'alliance', 'revolt')
  assert.equal(ofType(legalActions(s, 'alliance'), 'alliance-revolt').length, 0)
})

test('§8.4.2 Spread Sympathy: adjacent to sympathy, cost by the track, Martial Law, points', () => {
  let s = scenario()
  sympathy(s, 0, 1, 3) // three on the map: the fourth costs 2 and scores 1
  s.factions.alliance!.supporters = ['travel-gear-mouse#1', 'mouse-in-a-sack#1', 'sword#1']
  at(s, 'alliance', 'spread-sympathy')
  const spreads = ofType(legalActions(s, 'alliance'), 'alliance-spread')
  assert.ok(spreads.some(a => a.payload.clearing === 4), 'mouse clearing 4 is adjacent to 0')
  assert.ok(!spreads.some(a => a.payload.clearing === 10), 'clearing 10 is not adjacent to sympathy')
  s = answer(s, { type: 'alliance-spread', payload: { clearing: 4, birds: 0 } })
  assert.equal(s.score.alliance, 1)
  assert.equal(s.factions.alliance!.supporters.length, 1)

  const t = scenario()
  sympathy(t, 0, 1, 3)
  warriors(t, 4, { marquise: 3 })
  t.factions.alliance!.supporters = ['travel-gear-mouse#1', 'mouse-in-a-sack#1']
  at(t, 'alliance', 'spread-sympathy')
  assert.ok(!ofType(legalActions(t, 'alliance'), 'alliance-spread').some(a => a.payload.clearing === 4), 'Martial Law costs one more')
  const u = scenario()
  u.factions.alliance!.supporters = ['anvil#1']
  token(u, 0, 'marquise', 'keep')
  at(u, 'alliance', 'spread-sympathy')
  const first = ofType(legalActions(u, 'alliance'), 'alliance-spread')
  assert.ok(first.some(a => a.payload.clearing === 5) && !first.some(a => a.payload.clearing === 0), 'any clearing first, never the keep')
})

test('§8.5.2 Mobilize obeys the supporter limit; §8.5.3 Train needs a base of the suit', () => {
  let s = scenario()
  s.factions.alliance!.supporters = ['anvil#1', 'sword#1', 'bake-sale#1', 'investments#1', 'sappers#1']
  s.hands.alliance = ['crossbow-mouse#1', 'foxfolk-steel#1']
  at(s, 'alliance', 'actions')
  assert.ok(!types(legalActions(s, 'alliance')).includes('alliance-train'), 'no base')
  s = answer(s, { type: 'alliance-mobilize', payload: { card: 'crossbow-mouse#1' } })
  assert.equal(s.factions.alliance!.supporters.length, 5)
  assert.ok(s.discard.includes('crossbow-mouse#1'), 'stack full without a base: discarded (§8.2.3.I)')
  base(s, 5, 'fox')
  s = answer(s, { type: 'alliance-train', payload: { card: 'foxfolk-steel#1' } })
  assert.equal(s.factions.alliance!.officers, 1)
})

test('§8.2.6 Outrage: moving warriors into sympathy costs a matching card, or a shown hand and a drawn supporter', () => {
  let s = scenario()
  sympathy(s, 1) // rabbit
  warriors(s, 0, { marquise: 1 })
  s.hands.marquise = ['bake-sale#1', 'anvil#1']
  at(s, 'marquise', 'actions')
  s = answer(s, { type: 'move', payload: { from: 0, to: 1, warriors: 1 } })
  assert.deepEqual(s.pending.at(-1), { kind: 'outrage', player: 'marquise', clearing: 1 })
  assert.deepEqual(legalActions(s, 'marquise'), [{ type: 'outrage-give', payload: { card: 'bake-sale#1' } }])
  s = answer(s, { type: 'outrage-give', payload: { card: 'bake-sale#1' } })
  assert.deepEqual(s.factions.alliance!.supporters, ['bake-sale#1'])

  let t = scenario()
  sympathy(t, 1)
  warriors(t, 0, { marquise: 1 })
  t.hands.marquise = ['anvil#1']
  t.deck = ['sword#1']
  at(t, 'marquise', 'actions')
  t = answer(t, { type: 'move', payload: { from: 0, to: 1, warriors: 1 } })
  t = answer(t, { type: 'outrage-reveal', payload: {} })
  assert.deepEqual(t.factions.alliance!.supporters, ['sword#1'])
  assert.deepEqual(t.reveals, [{ to: 'alliance', of: 'marquise', cards: ['anvil#1'] }])
})

test('§8.2.6 no Outrage for the Alliance itself, nor for placing pieces (FAQ)', () => {
  let s = scenario()
  sympathy(s, 1)
  warriors(s, 0, { alliance: 1 })
  s.factions.alliance!.officers = 1
  at(s, 'alliance', 'military-operations')
  s = answer(s, { type: 'move', payload: { from: 0, to: 1, warriors: 1 } })
  assert.equal(s.pending.length, 0)
})

test('§8.2.6 removing a sympathy token in battle causes Outrage for the remover', () => {
  let s = scenario()
  sympathy(s, 1)
  warriors(s, 1, { marquise: 1 })
  s.hands.marquise = ['bake-sale#1']
  turnOf(s, 'marquise')
  startBattle(s, 'marquise', 'alliance', 1, roll(1, 0))
  assert.equal(s.factions.alliance!.sympathyOnTrack, 10)
  assert.deepEqual(s.pending.at(-1), { kind: 'outrage', player: 'marquise', clearing: 1 })
  s = answer(s, { type: 'outrage-give', payload: { card: 'bake-sale#1' } })
  assert.equal(s.score.marquise, 1, 'one point for the token (§3.2.1)')
  assert.deepEqual(s.factions.alliance!.supporters, ['bake-sale#1'])
})

test('§8.2.4 losing a base: discard its supporters (birds too), lose half the officers, down to five without bases', () => {
  let s = scenario()
  base(s, 5, 'fox')
  s.factions.alliance!.officers = 3
  s.factions.alliance!.warriorSupply -= 3
  s.factions.alliance!.supporters = ['anvil#1', 'armorers#1', 'bake-sale#1', 'investments#1', 'sword#1', 'mouse-in-a-sack#1', 'codebreakers#1', 'smugglers-trail#1']
  warriors(s, 5, { marquise: 2 })
  turnOf(s, 'marquise')
  startBattle(s, 'marquise', 'alliance', 5, roll(1, 0))
  const a = s.factions.alliance!
  assert.equal(a.basesOnBoard.fox, null)
  assert.equal(a.officers, 1, 'half of three, rounded up, removed')
  assert.ok(!a.supporters.includes('anvil#1') && !a.supporters.includes('armorers#1'))
  assert.deepEqual(s.pending.at(-1), { kind: 'discard-supporters', player: 'alliance', to: 5 })
  s = answer(s, { type: 'discard-supporter', payload: { card: 'sword#1' } })
  assert.equal(s.factions.alliance!.supporters.length, 5)
  assert.equal(s.pending.length, 0)
})

test('§8.6.1 Military Operations: up to one action per officer; Recruit at a base, Organize for sympathy', () => {
  let s = scenario()
  base(s, 5, 'fox')
  s.factions.alliance!.officers = 2
  s.factions.alliance!.warriorSupply -= 2
  warriors(s, 4, { alliance: 1 })
  at(s, 'alliance', 'military-operations')
  assert.ok(ofType(legalActions(s, 'alliance'), 'alliance-recruit').some(a => a.payload.clearing === 5))
  s = answer(s, { type: 'alliance-organize', payload: { clearing: 4 } })
  assert.ok(s.map.clearings[4]!.tokens.some(t => t.type === 'sympathy'))
  assert.equal(s.map.clearings[4]!.warriors.alliance, undefined)
  assert.equal(s.score.alliance, 0, 'the first sympathy space scores 0')
  s = answer(s, { type: 'alliance-recruit', payload: { clearing: 5 } })
  assert.notEqual(s.turn.step, 'military-operations', 'two officers, two operations')
})

test('§8.6.2 Evening: draw one plus one per base on the map', () => {
  const s = scenario()
  base(s, 5, 'fox'); base(s, 1, 'rabbit')
  s.deck = ['anvil#1', 'sword#1', 'bake-sale#1', 'investments#1']
  at(s, 'alliance', 'draw')
  assert.equal(s.hands.alliance!.length, 3)
})

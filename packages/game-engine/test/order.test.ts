import assert from 'node:assert/strict'
import { test } from 'node:test'
import { startBattle } from '../src/battle.ts'
import { currentActor, legalActions, type GameState } from '../src/index.ts'
import { answer, effect, ofType, roll, scenario, token, turnOf, types, warriors } from './helpers.ts'

function sympathy(s: GameState, c: number) {
  s.map.clearings[c]!.tokens.push({ faction: 'alliance', type: 'sympathy' })
  s.factions.alliance!.sympathyOnTrack -= 1
}

/**
 * The Marquise attacks one Alliance warrior and a sympathy in fox clearing 5 holding a single fox card. Both lose
 * pieces at once (§4.3.6): Field Hospitals and Outrage both want that card.
 */
function clash(): GameState {
  const s = scenario()
  token(s, 0, 'marquise', 'keep') // clearing 0 is fox too
  sympathy(s, 5)
  warriors(s, 5, { alliance: 1, marquise: 2 })
  s.hands.marquise = ['anvil#1']
  turnOf(s, 'marquise')
  startBattle(s, 'marquise', 'alliance', 5, roll(2, 2))
  return s
}

test('§4.3.6, §1.5.4 both sides lose their pieces before the effects resolve', () => {
  const s = clash()
  assert.equal(s.map.clearings[5]!.warriors.marquise, 1, 'the Marquise warrior is gone before Outrage is paid')
  assert.deepEqual(s.map.clearings[5]!.tokens, [])
  assert.deepEqual(s.pending.map(p => p.kind).sort(), ['field-hospital', 'outrage'])
})

test('§1.1.3 effects from both sides: the player taking their turn picks the order', () => {
  const s = clash()
  assert.equal(currentActor(s), 'marquise')
  const options = ofType(legalActions(s, 'marquise'), 'order-effects')
  assert.deepEqual(options.map(o => o.payload.effect).sort(), ['field-hospital', 'outrage'])
  assert.deepEqual(types(legalActions(s, 'marquise')), ['order-effects', 'order-effects'], 'nothing else until the order is picked')
  assert.deepEqual(legalActions(s, 'alliance'), [])

  // Field Hospitals first: the fox card saves the warrior, then Outrage finds no match and shows the hand.
  let a = answer(s, options.find(o => o.payload.effect === 'field-hospital')!)
  assert.deepEqual(effect(a), { kind: 'field-hospital', player: 'marquise', clearing: 5, warriors: 1 })
  a = answer(a, { type: 'field-hospital', payload: { card: 'anvil#1' } })
  assert.equal(a.map.clearings[0]!.warriors.marquise, 1)
  assert.deepEqual(types(legalActions(a, 'marquise')), ['outrage-reveal'], 'one effect left: no order to pick')
  a = answer(a, { type: 'outrage-reveal', payload: {} })
  assert.equal(a.factions.alliance!.supporters.length, 1, 'the Alliance draws a supporter')
  assert.equal(a.battle, null)

  // Outrage first: the card goes to the Alliance and Field Hospitals has nothing left to spend.
  let b = answer(s, options.find(o => o.payload.effect === 'outrage')!)
  b = answer(b, { type: 'outrage-give', payload: { card: 'anvil#1' } })
  assert.deepEqual(b.factions.alliance!.supporters, ['anvil#1'])
  assert.deepEqual(types(legalActions(b, 'marquise')), ['decline-field-hospital'])
  b = answer(b, { type: 'decline-field-hospital', payload: {} })
  assert.equal(b.map.clearings[0]!.warriors.marquise ?? 0, 0)
  assert.equal(b.battle, null)
})

test('§4.3.6 effects all triggered by one side\'s pieces: that side picks the order', () => {
  const s = scenario()
  const slots = s.map.clearings[5]!.slots
  slots[slots.indexOf(null)] = { kind: 'building', faction: 'alliance', type: 'base', suit: 'fox' }
  s.factions.alliance!.basesOnBoard.fox = 5
  sympathy(s, 5)
  s.factions.alliance!.supporters = ['anvil#1', 'bake-sale#1', 'investments#1', 'sword#1', 'mouse-in-a-sack#1', 'codebreakers#1', 'smugglers-trail#1']
  warriors(s, 5, { marquise: 2 })
  s.hands.marquise = ['bake-sale#2']
  turnOf(s, 'marquise')
  startBattle(s, 'marquise', 'alliance', 5, roll(2, 2)) // defenseless: base and sympathy both go
  assert.deepEqual(s.pending.map(p => p.kind).sort(), ['discard-supporters', 'outrage'])
  assert.equal(currentActor(s), 'alliance')
  const options = ofType(legalActions(s, 'alliance'), 'order-effects')
  assert.equal(options.length, 2)
  let t = answer(s, options.find(o => o.payload.effect === 'discard-supporters')!)
  t = answer(t, { type: 'discard-supporter', payload: { card: 'sword#1' } })
  assert.equal(currentActor(t), 'marquise')
  t = answer(t, { type: 'outrage-reveal', payload: {} })
  assert.equal(t.factions.alliance!.supporters.length, 5, 'without a base, a sixth supporter is discarded (§8.2.3.I)')
})

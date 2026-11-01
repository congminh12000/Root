import assert from 'node:assert/strict'
import { test } from 'node:test'
import { legalActions, viewFor } from '../src/index.ts'
import { answer, at, building, effect, ofType, roll, scenario, token, types, warriors } from './helpers.ts'

test('Better Burrow Bank: at the start of Birdsong, draw one and an enemy draws one', () => {
  let s = scenario()
  s.playAreas.marquise = ['better-burrow-bank#1']
  s.deck = ['anvil#1', 'sword#1']
  at(s, 'marquise', 'birdsong-start')
  assert.ok(types(legalActions(s, 'marquise')).includes('end-step'), 'optional')
  s = answer(s, { type: 'better-burrow-bank', payload: { card: 'better-burrow-bank#1', enemy: 'eyrie' } })
  assert.deepEqual(s.hands.marquise, ['anvil#1'])
  assert.deepEqual(s.hands.eyrie, ['sword#1'])
  assert.ok(!types(legalActions(s, 'marquise')).includes('better-burrow-bank'), 'once')
})

test('Royal Claim: in Birdsong, discard it to score one per ruled clearing', () => {
  let s = scenario()
  s.playAreas.eyrie = ['royal-claim#1']
  warriors(s, 0, { eyrie: 1 }); warriors(s, 1, { eyrie: 1 })
  at(s, 'eyrie', 'birdsong-start')
  s = answer(s, { type: 'royal-claim', payload: { card: 'royal-claim#1' } })
  assert.equal(s.score.eyrie, 2)
  assert.deepEqual(s.playAreas.eyrie, [])
  assert.ok(s.discard.includes('royal-claim#1'))
})

test('Stand and Deliver!: once in Birdsong take a random card from an enemy, who scores one', () => {
  let s = scenario()
  s.playAreas.alliance = ['stand-and-deliver#1']
  s.hands.marquise = ['anvil#1', 'sword#1']
  at(s, 'alliance', 'birdsong-start')
  assert.ok(!ofType(legalActions(s, 'alliance'), 'stand-and-deliver').some(a => a.payload.enemy === 'eyrie'), 'empty hand')
  s = answer(s, { type: 'stand-and-deliver', payload: { card: 'stand-and-deliver#1', enemy: 'marquise' } }, { int: () => 1 })
  assert.deepEqual(s.hands.alliance, ['sword#1'])
  assert.equal(s.score.marquise, 1)
})

test('Command Warren: at the start of Daylight, may initiate a battle', () => {
  let s = scenario()
  s.playAreas.marquise = ['command-warren#1']
  warriors(s, 1, { marquise: 2, eyrie: 1 })
  at(s, 'marquise', 'daylight-start')
  assert.ok(ofType(legalActions(s, 'marquise'), 'command-warren').some(a => a.payload.clearing === 1 && a.payload.defender === 'eyrie'))
  s = answer(s, { type: 'command-warren', payload: { card: 'command-warren#1', clearing: 1, defender: 'eyrie' } }, roll(1, 0))
  assert.equal(s.map.clearings[1]!.warriors.eyrie, undefined)
})

test('Cobbler: at the start of Evening, may take a move', () => {
  let s = scenario()
  s.playAreas.marquise = ['cobbler#1']
  warriors(s, 0, { marquise: 1 })
  at(s, 'marquise', 'evening-start')
  s = answer(s, { type: 'cobbler', payload: { card: 'cobbler#1', from: 0, to: 1, warriors: 1 } })
  assert.equal(s.map.clearings[1]!.warriors.marquise, 1)
})

test('Codebreakers: once in Daylight, look at a hand; only the user sees it', () => {
  let s = scenario()
  s.playAreas.eyrie = ['codebreakers#1']
  s.hands.alliance = ['anvil#1']
  s.hands.eyrie = ['sword#1']
  building(s, 0, 'eyrie', 'roost')
  at(s, 'eyrie', 'craft')
  s = answer(s, { type: 'codebreakers', payload: { card: 'codebreakers#1', target: 'alliance' } })
  assert.deepEqual(viewFor(s, 'eyrie').revealed, [{ to: 'eyrie', of: 'alliance', cards: ['anvil#1'] }])
  assert.deepEqual(viewFor(s, 'marquise').revealed, [])
})

test('Tax Collector: once in Daylight, remove one of your warriors to draw a card; Field Hospitals may follow', () => {
  let s = scenario()
  s.playAreas.marquise = ['tax-collector#1']
  token(s, 11, 'marquise', 'keep')
  warriors(s, 0, { marquise: 1 })
  s.hands.marquise = ['anvil#1']
  s.deck = ['sword#1']
  at(s, 'marquise', 'actions')
  s = answer(s, { type: 'tax-collector', payload: { card: 'tax-collector#1', clearing: 0 } })
  assert.equal(s.map.clearings[0]!.warriors.marquise, undefined)
  assert.ok(s.hands.marquise!.includes('sword#1'))
  assert.deepEqual(effect(s), { kind: 'field-hospital', player: 'marquise', clearing: 0, warriors: 1 })
  s = answer(s, { type: 'decline-field-hospital', payload: {} })
  assert.ok(!types(legalActions(s, 'marquise')).includes('tax-collector'), 'once per turn')
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EYRIE } from '@root/game-data'
import { legalActions } from '../src/index.ts'
import type { GameState } from '../src/index.ts'
import { answer, at, building, ofType, run, scenario, types, warriors } from './helpers.ts'

/** An Eyrie with a roost in clearing 0 (fox) and a Decree of the given deck cards. */
function eyrie(decree: Partial<Record<'recruit' | 'move' | 'battle' | 'build', string[]>>, leader: 'builder' | 'charismatic' | 'commander' | 'despot' = 'despot'): GameState {
  const s = scenario()
  const e = s.factions.eyrie!
  e.leader = leader
  e.leadersFaceUp = (['builder', 'charismatic', 'commander', 'despot'] as const).filter(l => l !== leader)
  e.decree = { recruit: [], move: [], battle: [], build: [] }
  EYRIE.leaders[leader].forEach((col, index) => e.decree[col].push({ kind: 'vizier', index: index as 0 | 1 }))
  for (const [col, cards] of Object.entries(decree)) e.decree[col as 'move'].push(...cards.map(id => ({ kind: 'card' as const, id })))
  building(s, 0, 'eyrie', 'roost')
  warriors(s, 0, { eyrie: 2 })
  return s
}

test('§7.4.1 Emergency Orders: draw one card with an empty hand', () => {
  const s = eyrie({})
  s.hands.eyrie = []
  s.deck = ['anvil#1', 'sword#1']
  at(s, 'eyrie', 'emergency-orders')
  assert.deepEqual(s.hands.eyrie, ['anvil#1'])
  const t = eyrie({})
  t.hands.eyrie = ['sword#1']
  at(t, 'eyrie', 'emergency-orders')
  assert.deepEqual(t.hands.eyrie, ['sword#1'])
})

test('§7.4.2 Add to the Decree: one or two cards, at most one bird', () => {
  let s = eyrie({})
  s.hands.eyrie = ['armorers#1', 'sappers#1', 'anvil#1']
  at(s, 'eyrie', 'add-to-decree')
  assert.ok(!types(legalActions(s, 'eyrie')).includes('end-step'), 'at least one card')
  s = answer(s, { type: 'eyrie-add-card', payload: { card: 'armorers#1', column: 'move' } })
  const second = ofType(legalActions(s, 'eyrie'), 'eyrie-add-card')
  assert.ok(!second.some(a => a.payload.card === 'sappers#1'), 'no second bird')
  assert.ok(types(legalActions(s, 'eyrie')).includes('end-step'))
  s = answer(s, { type: 'eyrie-add-card', payload: { card: 'anvil#1', column: 'build' } })
  assert.notEqual(s.turn.step, 'add-to-decree', 'two cards: done')
  assert.deepEqual(s.factions.eyrie!.decree.move.at(-1), { kind: 'card', id: 'armorers#1' })
})

test('§7.4.3 A New Roost: only with no roost on the map, in a clearing with the fewest warriors, all four pieces', () => {
  const s = scenario()
  for (const c of s.map.clearings.keys()) if (c !== 9) warriors(s, c, { marquise: 1 })
  at(s, 'eyrie', 'new-roost')
  assert.deepEqual(ofType(legalActions(s, 'eyrie'), 'eyrie-new-roost').map(a => a.payload.clearing), [9])
  const after = answer(s, { type: 'eyrie-new-roost', payload: { clearing: 9 } })
  assert.equal(after.map.clearings[9]!.warriors.eyrie, 3)
  assert.equal(after.factions.eyrie!.roostsOnTrack, 6)

  const t = scenario()
  t.factions.eyrie!.warriorSupply = 2 // decisions/0004 OQ-13
  at(t, 'eyrie', 'new-roost')
  assert.equal(ofType(legalActions(t, 'eyrie'), 'eyrie-new-roost').length, 0)
  const u = eyrie({})
  at(u, 'eyrie', 'new-roost')
  assert.equal(ofType(legalActions(u, 'eyrie'), 'eyrie-new-roost').length, 0, 'a roost is on the map')
})

test('§7.5.2 resolve the Decree left to right; each card acts in a clearing of its suit', () => {
  let s = eyrie({ recruit: ['anvil#1'], move: ['sword#1'] }) // fox recruit, mouse move (despot: no recruit vizier)
  warriors(s, 2, { eyrie: 1 }) // clearing 2 is mouse
  at(s, 'eyrie', 'decree')
  assert.deepEqual(legalActions(s, 'eyrie'), [{ type: 'eyrie-recruit', payload: { index: 0, clearing: 0 } }], 'recruit column first')
  s = answer(s, { type: 'eyrie-recruit', payload: { index: 0, clearing: 0 } })
  assert.equal(s.map.clearings[0]!.warriors.eyrie, 3)
  // Move column: the despot's vizier (bird, index 0) and the mouse card (index 1).
  const moves = ofType(legalActions(s, 'eyrie'), 'eyrie-move').filter(a => a.payload.index === 1)
  assert.ok(moves.length > 0 && moves.every(a => a.payload.from === 2), 'move from a mouse clearing')
})

test('§7.7 Turmoil after an impossible Decree card', () => {
  let s = eyrie({ recruit: ['sword#1'], build: ['armorers#1', 'anvil#1'] }) // recruit mouse: no roost in a mouse clearing
  s.score.eyrie = 2
  at(s, 'eyrie', 'decree')
  run(s) // the recruit card is impossible
  const e = s.factions.eyrie!
  assert.equal(s.turn.step, 'depose')
  assert.equal(s.score.eyrie, 0, '§7.7.1: three birds (two viziers + Armorers), not below zero (OQ-14)')
  assert.deepEqual(Object.values(e.decree).flat(), [{ kind: 'vizier', index: 0 }, { kind: 'vizier', index: 1 }], '§7.7.2 viziers stay')
  assert.ok(s.discard.includes('sword#1') && s.discard.includes('armorers#1'))
  assert.deepEqual(ofType(legalActions(s, 'eyrie'), 'eyrie-choose-leader').map(a => a.payload.leader).sort(), ['builder', 'charismatic', 'commander'], 'the deposed despot is face down')
  s = answer(s, { type: 'eyrie-choose-leader', payload: { leader: 'commander' } })
  assert.equal(s.factions.eyrie!.leader, 'commander')
  assert.deepEqual(s.factions.eyrie!.decree.move, [{ kind: 'vizier', index: 0 }])
  assert.deepEqual(s.factions.eyrie!.decree.battle, [{ kind: 'vizier', index: 1 }])
  assert.ok(s.turn.number > 1, '§7.7.4 Rest: Evening ran and the turn passed on')
  assert.equal(s.hands.eyrie!.length, 1, 'Eyrie Evening draw')
})

test('§7.7 a doable card cannot be skipped to fall into Turmoil on purpose', () => {
  const s = eyrie({ recruit: ['anvil#1'] })
  at(s, 'eyrie', 'decree')
  assert.ok(!types(legalActions(s, 'eyrie')).includes('end-step'))
  assert.equal(s.turn.step, 'decree')
})

test('§7.7.3.I A New Clutch: with no leader face up, all are turned face up', () => {
  const s = eyrie({ recruit: ['sword#1'] })
  s.factions.eyrie!.leadersFaceUp = []
  at(s, 'eyrie', 'decree')
  run(s)
  assert.equal(ofType(legalActions(s, 'eyrie'), 'eyrie-choose-leader').length, 4)
})

test('§7.8.2 Charismatic recruits two; with one warrior left it places one, then Turmoil (FAQ)', () => {
  let s = eyrie({ recruit: ['anvil#1'] }, 'charismatic')
  at(s, 'eyrie', 'decree')
  s = answer(s, { type: 'eyrie-recruit', payload: { index: 0, clearing: 0 } })
  assert.equal(s.map.clearings[0]!.warriors.eyrie, 4)
  let t = eyrie({ recruit: ['anvil#1'] }, 'charismatic')
  t.factions.eyrie!.warriorSupply = 1
  at(t, 'eyrie', 'decree')
  t = answer(t, { type: 'eyrie-recruit', payload: { index: 0, clearing: 0 } })
  assert.equal(t.map.clearings[0]!.warriors.eyrie, 3)
  assert.equal(t.turn.step, 'depose')
})

test('§7.5.2.IV Build: a ruled clearing of the suit without a roost', () => {
  const s = eyrie({ build: ['anvil#1'] })
  warriors(s, 5, { eyrie: 1 }) // fox, ruled
  warriors(s, 7, { eyrie: 1, marquise: 2 }) // fox, not ruled
  s.factions.eyrie!.resolved.move = [0] // the despot's move vizier is done
  at(s, 'eyrie', 'decree')
  const card = s.factions.eyrie!.decree.build.length - 1 // after the despot's build vizier
  assert.deepEqual(ofType(legalActions(s, 'eyrie'), 'eyrie-build').filter(a => a.payload.index === card).map(a => a.payload.clearing), [5])
})

test('§7.6 Evening: score the rightmost empty roost space, draw one plus bonuses', () => {
  const s = eyrie({})
  building(s, 1, 'eyrie', 'roost'); building(s, 2, 'eyrie', 'roost') // three roosts: 2 points, bonus at space 2
  s.hands.eyrie = []
  s.deck = ['anvil#1', 'sword#1', 'bake-sale#1']
  at(s, 'eyrie', 'score')
  assert.equal(s.score.eyrie, 2)
  at(s, 'eyrie', 'draw')
  assert.equal(s.hands.eyrie!.length, 2)
})

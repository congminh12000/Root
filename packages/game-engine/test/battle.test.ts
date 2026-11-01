import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canBattle, startBattle } from '../src/battle.ts'
import { currentActor, legalActions, viewFor } from '../src/index.ts'
import { answer, building, fixed, roll, scenario, token, turnOf, types, warriors } from './helpers.ts'

// Clearing 6 is mouse, 0 is fox (and a corner).

test('§4.3 who can battle: attacker warriors or pawn there, an enemy with pieces there', () => {
  const s = scenario()
  warriors(s, 6, { marquise: 1 })
  assert.ok(!canBattle(s, 'marquise', 'eyrie', 6), 'no defender pieces')
  token(s, 6, 'alliance', 'sympathy')
  assert.ok(canBattle(s, 'marquise', 'alliance', 6), 'a token is enough')
  assert.ok(!canBattle(s, 'eyrie', 'alliance', 6), 'no attacker warriors')
  s.factions.vagabond!.pawn = { kind: 'clearing', id: 6 }
  s.factions.vagabond!.coalition = 'marquise'
  assert.ok(!canBattle(s, 'vagabond', 'marquise', 6), 'coalition partners do not battle (FAQ §9.2.8)')
  assert.ok(canBattle(s, 'vagabond', 'alliance', 6))
})

test('§4.3.3 high roll to the attacker, low to the defender, each capped by its warriors', () => {
  const s = scenario()
  warriors(s, 6, { marquise: 3, eyrie: 2 })
  startBattle(s, 'marquise', 'eyrie', 6, roll(3, 1))
  assert.equal(s.battle, null)
  assert.deepEqual(s.map.clearings[6]!.warriors, { marquise: 2 })
  assert.equal(s.factions.eyrie!.warriorSupply, 20)

  const t = scenario()
  warriors(t, 6, { marquise: 1, eyrie: 3 })
  startBattle(t, 'marquise', 'eyrie', 6, roll(3, 3))
  assert.deepEqual(t.map.clearings[6]!.warriors, { eyrie: 2 }, 'one Marquise warrior deals at most one hit')
  assert.deepEqual(t.lastRoll, { revision: t.meta.revision + 1, clearing: 6, attacker: 'marquise', defender: 'eyrie', dice: [3, 3], hits: { attacker: 1, defender: 3 } },
    'the roll stays public after the battle, with both faces and the capped hits')
  assert.deepEqual(viewFor(t, 'alliance').lastRoll, t.lastRoll)
})

test('§4.3.5.II a defender with no warriors is defenseless: one extra hit; §3.2.1 one point per building', () => {
  const s = scenario()
  warriors(s, 6, { marquise: 2 })
  building(s, 6, 'eyrie', 'roost')
  startBattle(s, 'marquise', 'eyrie', 6, roll(0, 0))
  assert.equal(s.map.clearings[6]!.slots.filter(x => x?.kind === 'building').length, 0)
  assert.equal(s.factions.eyrie!.roostsOnTrack, 7, 'the roost goes back to its track')
  assert.equal(s.score.marquise, 1)
})

test('§4.3.6 warriors go before buildings and tokens', () => {
  const s = scenario()
  warriors(s, 6, { marquise: 2, eyrie: 1 })
  building(s, 6, 'eyrie', 'roost')
  startBattle(s, 'marquise', 'eyrie', 6, roll(1, 0))
  assert.equal(s.map.clearings[6]!.warriors.eyrie, undefined)
  assert.equal(s.map.clearings[6]!.slots.filter(x => x?.kind === 'building').length, 1)
  assert.equal(s.score.marquise, 0)
})

test('§4.3.6 the side taking hits chooses which buildings and tokens go', () => {
  const s = scenario()
  turnOf(s, 'eyrie')
  warriors(s, 6, { eyrie: 2, marquise: 1 })
  building(s, 6, 'marquise', 'sawmill')
  token(s, 6, 'marquise', 'wood')
  startBattle(s, 'eyrie', 'marquise', 6, roll(2, 0))
  assert.equal(currentActor(s), 'marquise')
  assert.deepEqual(legalActions(s, 'marquise').map(a => a.payload), [{ remove: { sawmill: 1 } }, { remove: { wood: 1 } }])
  const after = answer(s, { type: 'take-hits', payload: { remove: { wood: 1 } } })
  assert.equal(after.battle, null)
  assert.equal(after.map.clearings[6]!.tokens.length, 0)
  assert.equal(after.factions.marquise!.woodSupply, 9)
  assert.equal(after.score.eyrie, 1)
})

test('§4.3.1 ambush: two immediate hits; the battle ends if the attacker has nothing left', () => {
  const s = scenario()
  warriors(s, 6, { marquise: 2, eyrie: 1 })
  s.hands.eyrie = ['ambush-mouse#1', 'ambush-fox#1']
  startBattle(s, 'marquise', 'eyrie', 6, fixed([]))
  assert.equal(currentActor(s), 'eyrie')
  assert.deepEqual(legalActions(s, 'eyrie').map(a => a.payload), [{ card: 'ambush-mouse#1' }, {}], 'only the matching ambush')
  const after = answer(s, { type: 'play-ambush', payload: { card: 'ambush-mouse#1' } })
  assert.equal(after.battle, null)
  assert.deepEqual(after.map.clearings[6]!.warriors, { eyrie: 1 })
  assert.deepEqual(after.discard, ['ambush-mouse#1'])
})

test('§4.3.1.I foil: the attacker cancels with a matching ambush; both cards are discarded', () => {
  const s = scenario()
  warriors(s, 6, { marquise: 2, eyrie: 1 })
  s.hands.eyrie = ['ambush-mouse#1']
  s.hands.marquise = ['ambush-bird#1']
  startBattle(s, 'marquise', 'eyrie', 6, fixed([]))
  let t = answer(s, { type: 'play-ambush', payload: { card: 'ambush-mouse#1' } })
  assert.equal(currentActor(t), 'marquise')
  t = answer(t, { type: 'play-ambush', payload: { card: 'ambush-bird#1' } }, roll(0, 0))
  assert.equal(t.battle, null)
  assert.deepEqual(t.map.clearings[6]!.warriors, { marquise: 2, eyrie: 1 })
  assert.deepEqual([...t.discard].sort(), ['ambush-bird#1', 'ambush-mouse#1'])
})

test('Scouting Party: the defender may still ambush, but deals no hits (decisions/0004)', () => {
  const s = scenario()
  warriors(s, 6, { marquise: 2, eyrie: 1 })
  s.playAreas.marquise = ['scouting-party#1']
  s.hands.eyrie = ['ambush-mouse#1']
  startBattle(s, 'marquise', 'eyrie', 6, fixed([]))
  const t = answer(s, { type: 'play-ambush', payload: { card: 'ambush-mouse#1' } }, roll(0, 0))
  assert.deepEqual(t.map.clearings[6]!.warriors, { marquise: 2, eyrie: 1 })
  assert.deepEqual(t.discard, ['ambush-mouse#1'])
})

test('declining the ambush goes straight to the roll', () => {
  const s = scenario()
  warriors(s, 6, { marquise: 2, eyrie: 1 })
  s.hands.eyrie = ['ambush-mouse#1']
  startBattle(s, 'marquise', 'eyrie', 6, fixed([]))
  const t = answer(s, { type: 'decline-ambush', payload: {} }, roll(1, 0))
  assert.deepEqual(t.map.clearings[6]!.warriors, { marquise: 2 })
  assert.deepEqual(t.hands.eyrie, ['ambush-mouse#1'])
})

test('§8.2.2 Guerrilla War: the Alliance as defender deals the high roll', () => {
  const s = scenario()
  warriors(s, 6, { marquise: 2, alliance: 2 })
  startBattle(s, 'marquise', 'alliance', 6, roll(3, 0))
  assert.deepEqual(s.map.clearings[6]!.warriors, { alliance: 2 })
})

test('Brutal Tactics: an extra hit for the attacker, one point for the defender', () => {
  const s = scenario()
  warriors(s, 6, { marquise: 2, eyrie: 2 })
  s.playAreas.marquise = ['brutal-tactics#1']
  startBattle(s, 'marquise', 'eyrie', 6, roll(1, 0))
  assert.deepEqual(types(legalActions(s, 'marquise')), ['use-battle-card', 'end-battle-cards'])
  let t = answer(s, { type: 'use-battle-card', payload: { card: 'brutal-tactics#1' } })
  assert.deepEqual(types(legalActions(t, 'marquise')), ['end-battle-cards'], 'once per battle')
  t = answer(t, { type: 'end-battle-cards', payload: {} })
  assert.equal(t.map.clearings[6]!.warriors.eyrie, undefined)
  assert.equal(t.score.eyrie, 1)
  assert.deepEqual(t.playAreas.marquise, ['brutal-tactics#1'], 'it stays in play')
})

test('Sappers (defender) adds a hit and is discarded; Armorers ignores rolled hits taken', () => {
  const s = scenario()
  warriors(s, 6, { marquise: 2, eyrie: 2 })
  s.playAreas.eyrie = ['sappers#1', 'armorers#1']
  startBattle(s, 'marquise', 'eyrie', 6, roll(2, 0))
  assert.equal(currentActor(s), 'eyrie')
  let t = answer(s, { type: 'use-battle-card', payload: { card: 'sappers#1' } })
  t = answer(t, { type: 'use-battle-card', payload: { card: 'armorers#1' } })
  t = answer(t, { type: 'end-battle-cards', payload: {} })
  assert.deepEqual(t.map.clearings[6]!.warriors, { marquise: 1, eyrie: 2 }, 'Eyrie lost nothing; Sappers took one Marquise warrior')
  assert.deepEqual(t.playAreas.eyrie, [])
  assert.deepEqual([...t.discard].sort(), ['armorers#1', 'sappers#1'])
})

test('§7.8.3 Commander deals an extra hit as attacker; §7.8.4 Despot scores one extra point per battle', () => {
  const s = scenario()
  warriors(s, 6, { eyrie: 1, marquise: 2 })
  s.factions.eyrie!.leader = 'commander'
  startBattle(s, 'eyrie', 'marquise', 6, roll(1, 0))
  assert.equal(s.map.clearings[6]!.warriors.marquise, undefined, '1 rolled + 1 Commander')

  const t = scenario()
  warriors(t, 6, { eyrie: 2 })
  building(t, 6, 'marquise', 'sawmill')
  token(t, 6, 'marquise', 'wood')
  t.factions.eyrie!.leader = 'despot'
  startBattle(t, 'eyrie', 'marquise', 6, roll(3, 0))
  assert.equal(t.score.eyrie, 3, 'two pieces + one Despot point, not two')
})

test('§6.2.3 Field Hospitals: spend a matching card to put removed warriors at the keep', () => {
  const s = scenario()
  turnOf(s, 'eyrie')
  token(s, 0, 'marquise', 'keep')
  warriors(s, 6, { eyrie: 3, marquise: 2 })
  s.hands.marquise = ['investments#1', 'anvil#1']
  startBattle(s, 'eyrie', 'marquise', 6, roll(3, 0))
  assert.equal(currentActor(s), 'marquise')
  assert.deepEqual(legalActions(s, 'marquise').map(a => a.payload), [{ card: 'investments#1' }, {}], 'only mouse (or bird) cards')
  const t = answer(s, { type: 'field-hospital', payload: { card: 'investments#1' } })
  assert.equal(t.map.clearings[0]!.warriors.marquise, 2)
  assert.deepEqual(t.discard, ['investments#1'])
})

test('FAQ §4.3.1/§6.2.3: ambushed at the keep, Field Hospitals returns the warriors at once and the battle goes on', () => {
  const s = scenario()
  turnOf(s, 'marquise')
  token(s, 0, 'marquise', 'keep')
  warriors(s, 0, { marquise: 2, eyrie: 1 })
  s.hands.eyrie = ['ambush-fox#1']
  s.hands.marquise = ['anvil#1']
  startBattle(s, 'marquise', 'eyrie', 0, fixed([]))
  let t = answer(s, { type: 'play-ambush', payload: { card: 'ambush-fox#1' } })
  assert.equal(t.pending.at(-1)?.kind, 'field-hospital')
  t = answer(t, { type: 'field-hospital', payload: { card: 'anvil#1' } }, roll(2, 0))
  assert.equal(t.battle, null)
  assert.deepEqual(t.map.clearings[0]!.warriors, { marquise: 2 }, 'back at the keep, then won the roll')
})

test('§9.2.6–9.2.7 the Vagabond rolls up to his swords and takes hits as damaged items; §9.2.4 defenseless without a sword', () => {
  const s = scenario()
  s.factions.vagabond!.pawn = { kind: 'clearing', id: 6 }
  warriors(s, 6, { marquise: 3 })
  startBattle(s, 'marquise', 'vagabond', 6, roll(2, 3 - 2)) // high 2 to the Marquise, low 1 to the Vagabond
  assert.equal(currentActor(s), 'vagabond')
  const t = answer(s, { type: 'take-hits', payload: { remove: { boots: 1, torch: 1 } } })
  assert.deepEqual(t.factions.vagabond!.damaged.map(i => i.type).sort(), ['boots', 'torch'])
  assert.equal(t.map.clearings[6]!.warriors.marquise, 2, 'one sword caps the Vagabond at one rolled hit')

  const w = scenario()
  w.factions.vagabond!.pawn = { kind: 'clearing', id: 6 }
  warriors(w, 6, { marquise: 3 })
  startBattle(w, 'marquise', 'vagabond', 6, roll(3, 3))
  // Hits are counted before they are dealt: losing the sword now does not lower the Vagabond's hit.
  const x = answer(w, { type: 'take-hits', payload: { remove: { sword: 1, tea: 1, torch: 1 } } })
  assert.equal(x.map.clearings[6]!.warriors.marquise, 2, 'a roll of 3 still deals only one hit with one sword')

  const u = scenario()
  u.factions.vagabond!.pawn = { kind: 'clearing', id: 6 }
  u.factions.vagabond!.satchel = u.factions.vagabond!.satchel.filter(i => i.type !== 'sword')
  warriors(u, 6, { marquise: 1 })
  startBattle(u, 'marquise', 'vagabond', 6, roll(1, 0))
  const top = u.pending.at(-1)
  assert.equal(top?.kind === 'take-hits' ? top.hits : null, 2, 'one rolled + one defenseless')
})

test('§3.1 a battle that brings a player to 30 ends the game at once', () => {
  const s = scenario()
  turnOf(s, 'eyrie')
  s.score.eyrie = 29
  warriors(s, 6, { eyrie: 1 })
  building(s, 6, 'marquise', 'sawmill')
  startBattle(s, 'eyrie', 'marquise', 6, roll(1, 0))
  assert.deepEqual(s.winner, { factions: ['eyrie'], reason: 'points' })
  assert.equal(s.battle, null)
  assert.equal(currentActor(s), null)
})

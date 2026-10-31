import assert from 'node:assert/strict'
import { test } from 'node:test'
import { legalActions } from '../src/index.ts'
import type { FactionId, GameState, ItemType } from '../src/index.ts'
import { checkVictory } from '../src/rules.ts'
import { answer, at, building, ofType, roll, scenario, warriors } from './helpers.ts'

/** A Vagabond in clearing `at` (or forest with `forest: true`) holding exactly these face-up items. */
function vagabond(where: number, items: ItemType[], opts: { forest?: boolean; character?: 'thief' | 'tinker' | 'ranger'; factions?: FactionId[] } = {}): GameState {
  const s = scenario(opts.factions)
  const v = s.factions.vagabond!
  v.character = opts.character ?? 'thief'
  v.pawn = opts.forest ? { kind: 'forest', id: where } : { kind: 'clearing', id: where }
  v.satchel = []; v.tracks = { tea: 0, coin: 0, bag: 0 }; v.damaged = []
  for (const type of items) {
    if ((type === 'tea' || type === 'coin' || type === 'bag') && v.tracks[type] < 3) v.tracks[type] += 1
    else v.satchel.push({ type, exhausted: false })
  }
  return s
}
const exhausted = (s: GameState, type: ItemType) => s.factions.vagabond!.satchel.filter(i => i.type === type && i.exhausted).length

test('§9.4.1 Refresh flips 3 + 2 per tea, and asks which when more are exhausted', () => {
  let s = vagabond(0, ['tea', 'boots', 'boots', 'sword', 'torch', 'hammer', 'crossbow'])
  for (const i of s.factions.vagabond!.satchel) i.exhausted = true
  s.factions.vagabond!.damaged = [{ type: 'bag', exhausted: true }]
  at(s, 'vagabond', 'refresh')
  const options = ofType(legalActions(s, 'vagabond'), 'vagabond-refresh')
  assert.ok(options.length > 1 && options.every(o => Object.values(o.payload.items).reduce((a, b) => a + b, 0) === 5))
  s = answer(s, options[0]!)
  assert.equal(s.factions.vagabond!.satchel.filter(i => i.exhausted).length, 1)
  assert.equal(s.factions.vagabond!.damaged.length, 1, 'damaged stays damaged')
  const t = vagabond(0, ['boots', 'sword'])
  for (const i of t.factions.vagabond!.satchel) i.exhausted = true
  at(t, 'vagabond', 'refresh')
  assert.equal(exhausted(t, 'boots') + exhausted(t, 'sword'), 0, 'fewer than three: all, no question')
})

test('§9.4.2 Slip into a forest; §9.2.10 Move may leave a forest but never enter one; boots per move', () => {
  let s = vagabond(0, ['boots'])
  at(s, 'vagabond', 'slip')
  const slips = ofType(legalActions(s, 'vagabond'), 'vagabond-slip').map(a => a.payload.to)
  assert.ok(slips.some(p => p.kind === 'forest' && p.id === 0) && slips.some(p => p.kind === 'clearing' && p.id === 1))
  s = answer(s, { type: 'vagabond-slip', payload: { to: { kind: 'forest', id: 0 } } })
  assert.equal(s.turn.step, 'actions')
  const moves = ofType(legalActions(s, 'vagabond'), 'vagabond-move').map(a => a.payload.to).sort()
  assert.deepEqual(moves, [0, 1, 2, 3], 'out to a clearing around forest 0')
  s = answer(s, { type: 'vagabond-move', payload: { to: 3 } })
  assert.equal(exhausted(s, 'boots'), 1)
  assert.equal(ofType(legalActions(s, 'vagabond'), 'vagabond-move').length, 0, 'no face-up boots')
})

test('§9.2.9.III.b moving into a Hostile clearing costs an extra boot', () => {
  const s = vagabond(0, ['boots'])
  s.factions.vagabond!.relationships.eyrie = 'hostile'
  warriors(s, 1, { eyrie: 1 })
  at(s, 'vagabond', 'actions')
  const to = ofType(legalActions(s, 'vagabond'), 'vagabond-move').map(a => a.payload.to)
  assert.ok(!to.includes(1) && to.includes(3))
})

test('§9.5.4, §9.2.9.I Aid: give a matching card, take a crafted item, improve the relationship', () => {
  let s = vagabond(0, ['boots', 'sword', 'torch']) // clearing 0 is fox
  warriors(s, 0, { marquise: 1 })
  s.factions.marquise!.craftedItems = ['hammer']
  s.hands.vagabond = ['anvil#1', 'sword#1']
  at(s, 'vagabond', 'actions')
  const aids = ofType(legalActions(s, 'vagabond'), 'vagabond-aid')
  assert.ok(aids.every(a => a.payload.card === 'anvil#1'), 'only fox or bird cards')
  s = answer(s, { type: 'vagabond-aid', payload: { to: 'marquise', card: 'anvil#1', exhaust: 'torch', take: 'hammer' } })
  assert.deepEqual(s.hands.marquise, ['anvil#1'])
  assert.ok(s.factions.vagabond!.satchel.some(i => i.type === 'hammer' && !i.exhausted))
  assert.equal(s.factions.vagabond!.relationships.marquise, 1)
  assert.equal(s.score.vagabond, 1)
  // Allied: two points per Aid (§9.2.9.II.a); Hostile: no step (§9.2.9.III.c).
  const t = vagabond(0, ['boots', 'boots'])
  warriors(t, 0, { marquise: 1, eyrie: 1 })
  t.factions.vagabond!.relationships.marquise = 3
  t.factions.vagabond!.relationships.eyrie = 'hostile'
  t.hands.vagabond = ['anvil#1', 'armorers#1']
  at(t, 'vagabond', 'actions')
  const u = answer(t, { type: 'vagabond-aid', payload: { to: 'marquise', card: 'anvil#1', exhaust: 'boots' } })
  assert.equal(u.score.vagabond, 2)
  const w = answer(u, { type: 'vagabond-aid', payload: { to: 'eyrie', card: 'armorers#1', exhaust: 'boots' } })
  assert.equal(w.factions.vagabond!.relationships.eyrie, 'hostile')
  assert.equal(w.score.vagabond, 2)
})

test('§9.2.9.I.a two Aids in one turn are needed for the second step', () => {
  let s = vagabond(0, ['boots', 'boots', 'boots'])
  warriors(s, 0, { marquise: 1 })
  s.factions.vagabond!.relationships.marquise = 1
  s.hands.vagabond = ['anvil#1', 'armorers#1', 'sappers#1']
  at(s, 'vagabond', 'actions')
  s = answer(s, { type: 'vagabond-aid', payload: { to: 'marquise', card: 'anvil#1', exhaust: 'boots' } })
  assert.equal(s.factions.vagabond!.relationships.marquise, 1)
  s = answer(s, { type: 'vagabond-aid', payload: { to: 'marquise', card: 'armorers#1', exhaust: 'boots' } })
  assert.equal(s.factions.vagabond!.relationships.marquise, 2)
  assert.equal(s.score.vagabond, 2)
})

test('§9.5.3 Explore: take the ruin item, score one, remove the empty ruin', () => {
  let s = vagabond(3, ['torch']) // clearing 3 has a ruin
  const slots = s.map.clearings[3]!.slots
  ;(slots[slots.length - 1] as { items: ItemType[] }).items = ['hammer']
  at(s, 'vagabond', 'actions')
  s = answer(s, { type: 'vagabond-explore', payload: {} })
  assert.equal(s.score.vagabond, 1)
  assert.ok(s.factions.vagabond!.satchel.some(i => i.type === 'hammer' && !i.exhausted))
  assert.equal(s.map.clearings[3]!.slots.at(-1), null, 'ruin removed, slot open')
})

test('§9.5.5 Quest: matching suit, exhaust both items, then points per matching quest or two cards', () => {
  let s = vagabond(0, ['torch', 'hammer', 'boots']) // fox
  s.questsAvailable = ['repair-a-shed', 'escort', 'fundraising']
  s.questDeck = ['errand-fox']
  at(s, 'vagabond', 'actions')
  const quests = ofType(legalActions(s, 'vagabond'), 'vagabond-quest')
  assert.deepEqual([...new Set(quests.map(q => q.payload.quest))], ['repair-a-shed'])
  s = answer(s, { type: 'vagabond-quest', payload: { quest: 'repair-a-shed', reward: 'points' } })
  assert.equal(s.score.vagabond, 1)
  assert.deepEqual(s.questsAvailable, ['escort', 'fundraising', 'errand-fox'])
  assert.equal(exhausted(s, 'torch') + exhausted(s, 'hammer'), 2)
})

test('§9.5.6 Strike: remove a warrior and turn Hostile, no Infamy; buildings when no warriors (FAQ: no Hostility)', () => {
  let s = vagabond(0, ['crossbow', 'crossbow'])
  warriors(s, 0, { eyrie: 1 })
  building(s, 0, 'marquise', 'sawmill')
  at(s, 'vagabond', 'actions')
  s = answer(s, { type: 'vagabond-strike', payload: { target: 'eyrie', piece: 'warrior' } })
  assert.equal(s.factions.vagabond!.relationships.eyrie, 'hostile')
  assert.equal(s.score.vagabond, 0)
  s = answer(s, { type: 'vagabond-strike', payload: { target: 'marquise', piece: 'sawmill' } })
  assert.equal(s.score.vagabond, 1)
  assert.equal(s.factions.vagabond!.relationships.marquise, 0, 'no witnesses')
})

test('§9.2.9.III.a Infamy: pieces of a Hostile faction removed in battle on his turn score one more each', () => {
  let s = vagabond(0, ['sword', 'sword'])
  s.factions.vagabond!.relationships.eyrie = 'hostile'
  warriors(s, 0, { eyrie: 2 })
  at(s, 'vagabond', 'actions')
  s = answer(s, { type: 'vagabond-battle', payload: { defender: 'eyrie' } }, roll(2, 0))
  assert.equal(s.map.clearings[0]!.warriors.eyrie, undefined)
  assert.equal(s.score.vagabond, 2)
  // The warrior that makes a faction Hostile does not score.
  let t = vagabond(0, ['sword', 'sword'])
  warriors(t, 0, { marquise: 2 })
  at(t, 'vagabond', 'actions')
  t = answer(t, { type: 'vagabond-battle', payload: { defender: 'marquise' } }, roll(2, 0))
  assert.equal(t.factions.vagabond!.relationships.marquise, 'hostile')
  assert.equal(t.score.vagabond, 1)
})

test('§9.2.9.II.c–d attacking with an ally: their warriors add hits; taking more hits with them than items turns them Hostile', () => {
  let s = vagabond(0, ['sword'])
  s.factions.vagabond!.relationships.marquise = 3
  warriors(s, 0, { marquise: 2, eyrie: 3 })
  at(s, 'vagabond', 'actions')
  const battles = ofType(legalActions(s, 'vagabond'), 'vagabond-battle')
  assert.ok(battles.some(b => b.payload.defender === 'eyrie' && b.payload.ally === 'marquise'))
  assert.ok(!battles.some(b => b.payload.defender === 'marquise' && b.payload.ally === 'marquise'))
  s = answer(s, { type: 'vagabond-battle', payload: { defender: 'eyrie', ally: 'marquise' } }, roll(3, 2))
  assert.equal(s.map.clearings[0]!.warriors.eyrie, undefined, 'three hits: two Marquise warriors plus his sword')
  assert.deepEqual(s.pending.at(-1)?.kind, 'take-hits')
  s = answer(s, { type: 'take-hits', payload: { remove: { ally: 2 } } })
  assert.equal(s.factions.vagabond!.relationships.marquise, 'hostile')
})

test('§9.5.7 Repair and §9.5.8 Craft with hammers matching the clearing', () => {
  let s = vagabond(0, ['hammer', 'hammer', 'hammer'])
  s.factions.vagabond!.damaged = [{ type: 'sword', exhausted: false }]
  s.hands.vagabond = ['foxfolk-steel#1', 'bake-sale#1', 'tax-collector#1']
  at(s, 'vagabond', 'actions')
  const crafts = ofType(legalActions(s, 'vagabond'), 'craft').map(a => a.payload.card)
  assert.deepEqual(crafts, ['foxfolk-steel#1'], 'fox+fox in a fox clearing; never a multi-suit card (FAQ)')
  s = answer(s, { type: 'vagabond-repair', payload: { item: 'sword' } })
  assert.deepEqual(s.factions.vagabond!.damaged, [])
  s = answer(s, { type: 'craft', payload: { card: 'foxfolk-steel#1' } })
  assert.equal(s.factions.vagabond!.satchel.filter(i => i.type === 'sword').length, 2)
  assert.equal(s.score.vagabond, 2)
})

test('§V.1.2 Steal and §V.2.2 Day Labor', () => {
  let s = vagabond(0, ['torch'], { character: 'thief' })
  warriors(s, 0, { eyrie: 1 })
  s.hands.eyrie = ['anvil#1']
  at(s, 'vagabond', 'actions')
  s = answer(s, { type: 'vagabond-steal', payload: { from: 'eyrie' } }, { int: () => 0 })
  assert.equal(s.hands.vagabond![0], 'anvil#1') // nothing left to do: Evening then drew one more
  assert.ok(!s.hands.eyrie!.includes('anvil#1'))

  let t = vagabond(1, ['torch'], { character: 'tinker' }) // rabbit
  t.discard = ['anvil#1', 'bake-sale#1', 'armorers#1']
  at(t, 'vagabond', 'actions')
  assert.deepEqual(ofType(legalActions(t, 'vagabond'), 'vagabond-day-labor').map(a => a.payload.card), ['bake-sale#1', 'armorers#1'])
  t = answer(t, { type: 'vagabond-day-labor', payload: { card: 'armorers#1' } }, { int: () => 0 })
  assert.equal(t.hands.vagabond![0], 'armorers#1')
  assert.ok(!t.discard.includes('armorers#1'))

})

test('§V.3.2 Hideout repairs three items, then Daylight ends at once', () => {
  let u = vagabond(0, ['torch'], { character: 'ranger' })
  u.factions.vagabond!.damaged = [{ type: 'sword', exhausted: false }, { type: 'boots', exhausted: true }]
  at(u, 'vagabond', 'actions')
  const [hide] = ofType(legalActions(u, 'vagabond'), 'vagabond-hideout')
  u = answer(u, hide!)
  assert.equal(u.factions.vagabond!.damaged.length, 0)
  assert.notEqual(u.turn.phase, 'daylight')
})

test('§9.6 Evening: rest in a forest repairs all, draw one per coin, item limit six plus two per bag', () => {
  const s = vagabond(0, ['coin', 'boots', 'boots', 'boots', 'sword', 'sword', 'torch', 'hammer'], { forest: true })
  s.factions.vagabond!.damaged = [{ type: 'crossbow', exhausted: true }]
  s.deck = ['anvil#1', 'sword#1', 'bake-sale#1']
  at(s, 'vagabond', 'rest')
  assert.equal(s.factions.vagabond!.damaged.length, 0)
  assert.ok(s.factions.vagabond!.satchel.some(i => i.type === 'crossbow' && i.exhausted), 'returns on the same face')
  at(s, 'vagabond', 'draw')
  assert.equal(s.hands.vagabond!.length, 2)
  at(s, 'vagabond', 'item-capacity')
  const removals = ofType(legalActions(s, 'vagabond'), 'vagabond-remove-items')
  assert.ok(removals.length > 0 && removals.every(r => Object.values(r.payload.items).reduce((a, b) => a + b, 0) === 2), 'eight items in Satchel and Damaged (the coin is on its track), limit six')
})

test('§9.2.8 coalition: four players, ten points, with the lowest scorer; then they share the win', () => {
  let s = vagabond(0, ['boots'])
  s.score = { marquise: 5, eyrie: 3, alliance: 3, vagabond: 10 }
  s.factions.vagabond!.relationships.eyrie = 'hostile'
  s.hands.vagabond = ['dominance-fox#1']
  at(s, 'vagabond', 'actions')
  const offers = ofType(legalActions(s, 'vagabond'), 'vagabond-coalition').map(a => a.payload.with).sort()
  assert.deepEqual(offers, ['alliance', 'eyrie'])
  s = answer(s, { type: 'vagabond-coalition', payload: { card: 'dominance-fox#1', with: 'eyrie' } })
  assert.equal(s.score.vagabond, null)
  assert.equal(s.factions.vagabond!.relationships.eyrie, 0, '§9.2.9.III.d')
  s.score.eyrie = 30
  assert.ok(checkVictory(s))
  assert.deepEqual(s.winner?.factions, ['eyrie', 'vagabond'])

  const three = vagabond(0, ['boots'], { factions: ['marquise', 'eyrie', 'vagabond'] })
  three.score = { marquise: 5, eyrie: 3, vagabond: 10 }
  three.hands.vagabond = ['dominance-fox#1']
  at(three, 'vagabond', 'actions')
  assert.equal(ofType(legalActions(three, 'vagabond'), 'vagabond-coalition').length, 0, 'not with three players')
})

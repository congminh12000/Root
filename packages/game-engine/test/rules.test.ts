import assert from 'node:assert/strict'
import { test } from 'node:test'
import { adjacent, mapOf, placeInSlot, placeWarriors, drawCards } from '../src/board.ts'
import { canCraft, craft, payCost } from '../src/craft.ts'
import { canMove, moveOptions, moveWarriors } from '../src/move.ts'
import { award, checkDominanceVictory, checkVictory, discardCard, isBird, isEnemy, matchesSuit, ruler } from '../src/rules.ts'
import { legalActions, seededRng, viewFor } from '../src/index.ts'
import { answer, building, scenario, token, turnOf, types, warriors } from './helpers.ts'

// Autumn, 0-based: fox 0 5 7 9, rabbit 1 3 8 11, mouse 2 4 6 10; corners 0 2 8 11.

test('§1.5.4 place as many as possible: recruiting past the supply places what is left', () => {
  const s = scenario()
  s.factions.eyrie!.warriorSupply = 1
  assert.equal(placeWarriors(s, 'eyrie', 3, 2), 1)
  assert.equal(s.map.clearings[3]!.warriors.eyrie, 1)
  assert.equal(placeWarriors(s, 'eyrie', 3, 2), 0)
})

test('§2.1 drawing reshuffles the discard pile the moment the deck runs out', () => {
  const s = scenario()
  s.deck = ['anvil#1']
  s.discard = ['sword#1', 'cobbler#1']
  const drawn = drawCards(s, 3, seededRng('d'))
  assert.equal(drawn.length, 3)
  assert.deepEqual([...drawn].sort(), ['anvil#1', 'cobbler#1', 'sword#1'])
  assert.deepEqual(drawCards(s, 2, seededRng('d')), [], 'nothing left anywhere: draw nothing')
})

test('§2.1 the reshuffle happens when the deck empties, not at the next draw', () => {
  const s = scenario()
  s.deck = ['anvil#1']
  s.discard = ['sword#1']
  assert.deepEqual(drawCards(s, 1, seededRng('d')), ['anvil#1'])
  assert.deepEqual(s.deck, ['sword#1'], 'shuffled in at once')
  assert.deepEqual(s.discard, [])
  s.discard = ['cobbler#1'] // discarded after the reshuffle: stays in the discard pile
  assert.deepEqual(drawCards(s, 1, seededRng('d')), ['sword#1'])
  assert.deepEqual(s.deck, ['cobbler#1'], 'the deck emptied again, so the new discard was shuffled in')
})

test('§2.1.1 birds are wild, but only a bird pays for a bird', () => {
  assert.ok(matchesSuit('armorers#1', 'fox'))
  assert.ok(matchesSuit('anvil#1', 'fox'))
  assert.ok(!matchesSuit('anvil#1', 'mouse'))
  assert.ok(isBird('armorers#1'))
  assert.ok(!isBird('anvil#1'))
})

test('§3.3.3 discarded dominance cards become available instead of going to the pile', () => {
  const s = scenario()
  discardCard(s, 'dominance-fox#1')
  discardCard(s, 'anvil#1')
  assert.deepEqual(s.availableDominance, ['dominance-fox#1'])
  assert.deepEqual(s.discard, ['anvil#1'])
})

test('§2.2.1 adjacency follows paths only; §2.2.3 a full clearing takes no building', () => {
  const s = scenario()
  assert.deepEqual(adjacent(mapOf(s), 0).sort(), [1, 3, 4])
  assert.ok(!adjacent(mapOf(s), 0).includes(5))
  placeInSlot(s, 0, { kind: 'building', faction: 'marquise', type: 'sawmill' })
  assert.throws(() => placeInSlot(s, 0, { kind: 'building', faction: 'marquise', type: 'workshop' }))
})

test('§2.5 rule: most warriors + buildings; ties rule nobody; tokens and pawns do not count', () => {
  const s = scenario()
  warriors(s, 4, { marquise: 2, alliance: 1 })
  assert.equal(ruler(s, 4), 'marquise')
  warriors(s, 4, { alliance: 2 })
  assert.equal(ruler(s, 4), null)
  token(s, 4, 'alliance', 'sympathy')
  assert.equal(ruler(s, 4), null, 'a token does not break the tie')
  building(s, 4, 'alliance' as never, 'sawmill' as never) // any building counts
  assert.equal(ruler(s, 4), 'alliance')
  assert.equal(ruler(s, 6), null, 'empty clearing')
  const v = viewFor(s, null)
  assert.deepEqual(v.rulers, s.map.clearings.map((_, c) => ruler(s, c)), 'every view shows the same rulers as the engine')
  assert.equal(v.rulers[4], 'alliance')
})

test('§7.2.2 Lords of the Forest: the Eyrie rule ties, but only with a piece there', () => {
  const s = scenario()
  warriors(s, 5, { marquise: 2, eyrie: 1 })
  building(s, 5, 'eyrie', 'roost')
  assert.equal(ruler(s, 5), 'eyrie')
  warriors(s, 7, { marquise: 1, alliance: 1 })
  assert.equal(ruler(s, 7), null)
})

test('§3.1 30 points wins at once; §3.1.1 simultaneous 30s go to the closest player clockwise', () => {
  const s = scenario()
  turnOf(s, s.seats[1]!.faction)
  award(s, s.seats[0]!.faction, 30)
  award(s, s.seats[2]!.faction, 30)
  assert.ok(checkVictory(s))
  assert.deepEqual(s.winner, { factions: [s.seats[2]!.faction], reason: 'points' }, 'seat 2 is closer to seat 1 than seat 0')
  const t = scenario()
  award(t, 'eyrie', 29)
  assert.ok(!checkVictory(t))
})

test('§3.2 players without a score marker score nothing', () => {
  const s = scenario()
  s.score.eyrie = null
  award(s, 'eyrie', 5)
  assert.equal(s.score.eyrie, null)
})

test('§3.3.1 activate dominance: own Daylight, at least 10 points; the marker leaves the track', () => {
  const s = scenario()
  turnOf(s, 'marquise')
  s.hands.marquise = ['dominance-fox#1', 'anvil#1']
  s.score.marquise = 9
  assert.ok(!types(legalActions(s, 'marquise')).includes('activate-dominance'))
  s.score.marquise = 10
  turnOf(s, 'marquise', 'birdsong')
  assert.deepEqual(legalActions(s, 'marquise'), [], 'not in Birdsong')
  turnOf(s, 'marquise')
  const after = answer(s, { type: 'activate-dominance', payload: { card: 'dominance-fox#1' } })
  assert.equal(after.score.marquise, null)
  assert.deepEqual(after.playAreas.marquise, ['dominance-fox#1'])
  assert.ok(!types(legalActions(after, 'marquise')).includes('activate-dominance'), 'only one active dominance')
})

test('§3.3.1.I/II dominance victory at the start of Birdsong: three suit clearings, or opposite corners', () => {
  const s = scenario()
  s.playAreas.alliance = ['dominance-fox#1']
  s.score.alliance = null
  warriors(s, 0, { alliance: 1 }); warriors(s, 5, { alliance: 1 })
  assert.ok(!checkDominanceVictory(s, 'alliance'))
  warriors(s, 9, { alliance: 1 })
  assert.ok(checkDominanceVictory(s, 'alliance'))
  assert.equal(s.winner?.reason, 'dominance')
  const t = scenario()
  t.playAreas.eyrie = ['dominance-bird#1']
  warriors(t, 0, { eyrie: 1 }); warriors(t, 2, { eyrie: 1 })
  assert.ok(!checkDominanceVictory(t, 'eyrie'), 'adjacent corners do not count')
  warriors(t, 11, { eyrie: 1 })
  assert.ok(checkDominanceVictory(t, 'eyrie'))
})

test('§3.3.4 take an available dominance by spending a matching card; bird needs a bird', () => {
  const s = scenario()
  turnOf(s, 'eyrie')
  s.availableDominance = ['dominance-fox#1', 'dominance-bird#1']
  s.hands.eyrie = ['anvil#1', 'armorers#1', 'cobbler#1']
  const takes = legalActions(s, 'eyrie').filter(a => a.type === 'take-dominance').map(a => a.payload)
  assert.deepEqual(takes, [
    { dominance: 'dominance-fox#1', spend: 'anvil#1' },
    { dominance: 'dominance-fox#1', spend: 'armorers#1' },
    { dominance: 'dominance-bird#1', spend: 'armorers#1' },
  ])
  const after = answer(s, { type: 'take-dominance', payload: { dominance: 'dominance-bird#1', spend: 'armorers#1' } })
  assert.ok(after.hands.eyrie!.includes('dominance-bird#1'))
  assert.deepEqual(after.availableDominance, ['dominance-fox#1'])
})

test('§4.1.1 crafting cost: one piece per icon, matching suits, "any" takes anything', () => {
  const fox = { id: 0, suit: 'fox' as const }, fox2 = { id: 5, suit: 'fox' as const }, mouse = { id: 2, suit: 'mouse' as const }
  assert.ok(payCost(['fox', 'fox'], [fox, fox2]))
  assert.equal(payCost(['fox', 'fox'], [fox, mouse]), null)
  assert.equal(payCost(['rabbit', 'fox', 'mouse'], [fox, mouse]), null)
  assert.ok(payCost(['any', 'fox'], [mouse, fox]), '"any" must not steal the only fox')
})

test('§4.1.2 items: taken from the supply, scored, card discarded; none left means no craft', () => {
  const s = scenario()
  s.hands.marquise = ['anvil#1']
  const fox = [{ id: 0, suit: 'fox' as const }]
  assert.ok(canCraft(s, 'marquise', 'anvil#1', fox))
  craft(s, 'marquise', 'anvil#1', fox)
  assert.deepEqual(s.factions.marquise!.craftedItems, ['hammer'])
  assert.equal(s.itemSupply.hammer, 0)
  assert.equal(s.score.marquise, 2)
  assert.deepEqual(s.discard, ['anvil#1'])
  assert.deepEqual(s.craftingUsed, [0])
  s.hands.marquise = ['anvil#1']
  assert.ok(!canCraft(s, 'marquise', 'anvil#1', fox), 'no hammer left')
  assert.ok(!canCraft(s, 'marquise', 'ambush-fox#1', fox), 'ambush cannot be crafted')
})

test('§7.2.3 Disdain for Trade: the Eyrie score one point per item, the Builder scores in full', () => {
  const s = scenario()
  s.hands.eyrie = ['sword#1', 'foxfolk-steel#1']
  const foxes = [{ id: 0, suit: 'fox' as const }, { id: 5, suit: 'fox' as const }]
  s.factions.eyrie!.leader = 'commander'
  craft(s, 'eyrie', 'sword#1', foxes)
  assert.equal(s.score.eyrie, 1)
  s.factions.eyrie!.leader = 'builder'
  craft(s, 'eyrie', 'foxfolk-steel#1', foxes)
  assert.equal(s.score.eyrie, 3)
})

test('§4.1.3–4.1.4 persistent cards go to the play area; no identical duplicate', () => {
  const s = scenario()
  s.hands.marquise = ['cobbler#1', 'cobbler#2']
  const rabbits = [{ id: 1, suit: 'rabbit' as const }, { id: 3, suit: 'rabbit' as const }]
  craft(s, 'marquise', 'cobbler#1', rabbits)
  assert.deepEqual(s.playAreas.marquise, ['cobbler#1'])
  assert.ok(!canCraft(s, 'marquise', 'cobbler#2', rabbits))
})

test('Favor removes every enemy piece in its suit, scores buildings and tokens, spares ruins and the pawn', () => {
  const s = scenario()
  warriors(s, 0, { eyrie: 2, marquise: 1 })
  building(s, 0, 'eyrie', 'roost')
  token(s, 5, 'alliance', 'sympathy')
  warriors(s, 7, { alliance: 1 })
  s.factions.vagabond!.pawn = { kind: 'clearing', id: 9 }
  s.hands.marquise = ['favor-of-the-foxes#1']
  craft(s, 'marquise', 'favor-of-the-foxes#1', [0, 5, 7].map(id => ({ id, suit: 'fox' as const })))
  assert.deepEqual(s.map.clearings[0]!.warriors, { marquise: 1 }, 'own pieces stay')
  assert.equal(s.map.clearings[0]!.slots.filter(Boolean).length, 0)
  assert.equal(s.map.clearings[5]!.tokens.length, 0)
  assert.equal(s.map.clearings[5]!.slots.filter(x => x?.kind === 'ruin').length, 1, 'ruins stay (§2.2.4)')
  assert.equal(s.score.marquise, 2, 'roost + sympathy')
  assert.deepEqual(s.factions.vagabond!.pawn, { kind: 'clearing', id: 9 })
  const top = s.pending.at(-1)
  assert.deepEqual(top?.kind === 'take-hits' ? [top.player, top.hits] : null, ['vagabond', 3], 'the Vagabond damages three items of his choice (§9.2.2.I)')
})

test('§4.2 move: adjacent, at least one warrior, ruling the origin or destination (§4.2.1)', () => {
  const s = scenario()
  warriors(s, 0, { marquise: 2, eyrie: 2 })
  assert.ok(!canMove(s, 'marquise', 0, 1), 'tied at origin, nobody at the destination')
  warriors(s, 1, { marquise: 1 })
  assert.ok(canMove(s, 'marquise', 0, 1), 'rules the destination')
  assert.ok(!canMove(s, 'marquise', 0, 5), 'not adjacent')
  assert.ok(canMove(s, 'eyrie', 0, 1), 'Lords of the Forest: the Eyrie rule the tie')
  assert.deepEqual(moveOptions(s, 'marquise').filter(m => m.from === 0).map(m => m.warriors), [1, 2])
  moveWarriors(s, 'marquise', 0, 1, 2)
  assert.deepEqual(s.map.clearings[1]!.warriors, { marquise: 3 })
  assert.throws(() => moveWarriors(s, 'marquise', 0, 1, 1))
})

test('G.8 coalition partners are not enemies', () => {
  const s = scenario()
  assert.ok(isEnemy(s, 'vagabond', 'eyrie'))
  s.factions.vagabond!.coalition = 'eyrie'
  assert.ok(!isEnemy(s, 'vagabond', 'eyrie'))
  assert.ok(isEnemy(s, 'vagabond', 'marquise'))
})

test('discarding down to five: the player picks cards one at a time until the limit (§6.6, §7.6.2)', async () => {
  const { requireDiscardDown } = await import('../src/common.ts')
  const s = scenario()
  turnOf(s, 'eyrie', 'evening')
  s.hands.eyrie = ['anvil#1', 'sword#1', 'cobbler#1', 'cobbler#2', 'sappers#1', 'armorers#1', 'dominance-mouse#1']
  requireDiscardDown(s, 'eyrie')
  assert.equal(legalActions(s, 'eyrie').length, 7)
  let t = answer(s, { type: 'discard-card', payload: { card: 'dominance-mouse#1' } })
  assert.equal(t.pending.length, 1, 'still six cards')
  t = answer(t, { type: 'discard-card', payload: { card: 'anvil#1' } })
  assert.equal(t.pending.length, 0)
  assert.equal(t.hands.eyrie!.length, 5)
  assert.deepEqual(t.availableDominance, ['dominance-mouse#1'], 'a discarded dominance becomes available')
  const u = scenario()
  u.hands.eyrie = ['anvil#1']
  requireDiscardDown(u, 'eyrie')
  assert.equal(u.pending.length, 0, 'nothing to discard')
})

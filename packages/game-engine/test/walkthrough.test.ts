import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BASE_DECK, BASE_QUESTS } from '@root/game-data'
import { currentActor, legalActions, type Action, type FactionId, type GameState, type Rng } from '../src/index.ts'
import { answer, at, building, fixed, roll, run, scenario, token, warriors } from './helpers.ts'

/**
 * "Walking Through Root" (SRC-003, Oct 2020): Leder's two-turn example game, replayed move by move.
 * The booklet's own setup replaces the normal one. Clearings on the Autumn map (game-data ids):
 * 0 top-left fox (keep), 1 top rabbit, 2 top-right mouse, 3 rabbit (workshop), 4 left mouse (recruiter),
 * 5 central fox, 7 right fox, 10 bottom mouse, 11 bottom-right rabbit (Eyrie roost). The Vagabond starts
 * in forest 4 (between 5, 6, 10 and 11). Cards drawn during the walkthrough are not named in the booklet,
 * so the deck is stacked with cards that ask no questions (no ambush, no bird, no dominance).
 */

const FILLER = BASE_DECK.filter(c => c.suit !== 'bird' && c.kind !== 'ambush' && c.kind !== 'dominance')
  .map(c => `${c.id}#1`)
  .filter(id => !['better-burrow-bank#1', 'travel-gear-mouse#1', 'a-visit-to-friends#1', 'bake-sale#1', 'anvil#1', 'scouting-party#1', 'crossbow-mouse#1', 'root-tea-fox#1', 'protection-racket#1', 'cobbler#1'].includes(id))

function walkthroughSetup(): GameState {
  const s = scenario()
  const e = s.factions.eyrie!, a = s.factions.alliance!, v = s.factions.vagabond!
  // Seating, clockwise: Marquise, Eyrie, Alliance, Vagabond.
  s.seats = (['marquise', 'eyrie', 'alliance', 'vagabond'] as FactionId[]).map(f => s.seats.find(x => x.faction === f)!)
  // Marquise 1st–4th: keep and a sawmill top-left, a warrior everywhere but the opposite corner, workshop and recruiter.
  token(s, 0, 'marquise', 'keep')
  building(s, 0, 'marquise', 'sawmill')
  for (let c = 0; c < 11; c++) warriors(s, c, { marquise: 1 })
  building(s, 3, 'marquise', 'workshop')
  building(s, 4, 'marquise', 'recruiter')
  // Eyrie 1st–4th: Despot, viziers in Move and Build, a roost and six warriors bottom-right.
  e.leader = 'despot'
  e.leadersFaceUp = ['builder', 'charismatic', 'commander']
  e.decree = { recruit: [], move: [{ kind: 'vizier', index: 0 }], battle: [], build: [{ kind: 'vizier', index: 1 }] }
  building(s, 11, 'eyrie', 'roost')
  warriors(s, 11, { eyrie: 6 })
  // Alliance 1st–2nd: full sympathy track, three supporters.
  a.sympathyOnTrack = 10
  a.supporters = ['sappers#1', 'birdy-bindle#1', 'anvil#1']
  // Vagabond 1st–5th: Thief in the central forest, Errand (fox) plus two quests, boots/torch/sword and tea.
  v.character = 'thief'
  v.pawn = { kind: 'forest', id: 4 }
  v.satchel = [{ type: 'boots', exhausted: false }, { type: 'torch', exhausted: false }, { type: 'sword', exhausted: false }]
  v.tracks = { tea: 1, coin: 0, bag: 0 }
  v.damaged = []
  v.relationships = { marquise: 0, eyrie: 0, alliance: 0 }
  const quests = BASE_QUESTS.map(q => q.id)
  s.questsAvailable = ['errand-fox', 'escort', 'fundraising']
  s.questDeck = quests.filter(q => !s.questsAvailable.includes(q))
  // Ruin under the central fox clearing holds a hammer (the booklet draws one at random).
  const ruin = s.map.clearings[5]!.slots.find(x => x?.kind === 'ruin')
  assert.ok(ruin?.kind === 'ruin')
  ruin.items = ['hammer']
  // Hands, public for the walkthrough.
  s.hands = {
    marquise: ['brutal-tactics#1', 'better-burrow-bank#1', 'travel-gear-mouse#1'],
    eyrie: ['ambush-bird#1', 'a-visit-to-friends#1', 'bake-sale#1'],
    alliance: ['brutal-tactics#2', 'scouting-party#1', 'crossbow-mouse#1'],
    vagabond: ['root-tea-fox#1', 'protection-racket#1', 'cobbler#1'],
  }
  s.deck = FILLER.slice(0, 20)
  s.discard = []
  return at(s, 'marquise', 'birdsong-start')
}

/** Plays the one legal action of `type` whose payload contains `match`, as whoever must act now. */
function play(s: GameState, type: Action['type'], match: Record<string, unknown> = {}, rng: Rng = fixed([])): GameState {
  const who = currentActor(s)!
  const options = legalActions(s, who).filter(x => x.type === type && Object.entries(match).every(([k, v]) => JSON.stringify((x.payload as Record<string, unknown>)[k]) === JSON.stringify(v)))
  assert.ok(options.length >= 1, `${who} at ${s.turn.step}: no ${type} ${JSON.stringify(match)}; legal: ${JSON.stringify(legalActions(s, who).map(x => [x.type, x.payload]))}`)
  return answer(s, options[0]!, rng)
}
const endStep = (s: GameState, rng?: Rng) => play(s, 'end-step', {}, rng)
/** Ends optional steps until `type` is legal for the current actor. */
function until(s: GameState, type: Action['type']): GameState {
  for (let i = 0; i < 20 && !legalActions(s, currentActor(s)!).some(x => x.type === type); i++) s = endStep(s)
  return s
}

/**
 * Starts a battle and finishes it with these dice: nobody plays ambush or battle cards, hits fall on warriors
 * first (the only choice the booklet's battles leave). Field Hospitals is declined unless `hospital` names the card.
 */
function fight(s: GameState, type: Action['type'], match: Record<string, unknown>, dice: Rng, hospital?: string): GameState {
  s = play(s, type, match, dice)
  for (let i = 0; i < 10 && (s.battle || s.pending.length); i++) {
    const legal = legalActions(s, currentActor(s)!)
    const pick = (t: Action['type']) => legal.find(x => x.type === t)
    const next = pick('decline-ambush') ?? pick('end-battle-cards') ?? (hospital ? legal.find(x => x.type === 'field-hospital' && x.payload.card === hospital) : pick('decline-field-hospital')) ?? pick('take-hits')
    if (!next) break
    s = answer(s, next, dice)
  }
  assert.equal(s.battle, null, 'battle over')
  return s
}

const w = (s: GameState, c: number, f: FactionId) => s.map.clearings[c]!.warriors[f] ?? 0
const builds = (s: GameState, c: number) => s.map.clearings[c]!.slots.flatMap(x => (x?.kind === 'building' ? [`${x.faction}:${x.type}`] : []))
const tokens = (s: GameState, c: number) => s.map.clearings[c]!.tokens.map(t => `${t.faction}:${t.type}`)
const active = (s: GameState) => s.seats[s.turn.seat]!.faction
const scores = (s: GameState) => ({ marquise: s.score.marquise, eyrie: s.score.eyrie, alliance: s.score.alliance, vagabond: s.score.vagabond })

test('Walking Through Root: two full rounds end with the booklet\'s board and scores', () => {
  let s = run(walkthroughSetup())

  // ── Turn 1: Marquise ──
  assert.equal(active(s), 'marquise')
  s = until(s, 'marquise-build') // Birdsong placed a wood at the sawmill
  assert.deepEqual(tokens(s, 0), ['marquise:keep', 'marquise:wood'])
  s = play(s, 'marquise-build', { building: 'sawmill', clearing: 1, wood: [0] })
  assert.equal(s.score.marquise, 1, 'second sawmill scores one')
  s = play(s, 'marquise-recruit', { clearings: [4] })
  assert.equal(w(s, 4, 'marquise'), 2)
  s = play(s, 'move', { from: 1, to: 2, warriors: 1 })
  s = play(s, 'move', { from: 2, to: 7, warriors: 2 })
  assert.deepEqual([w(s, 1, 'marquise'), w(s, 2, 'marquise'), w(s, 7, 'marquise')], [0, 0, 3])
  s = until(s, 'eyrie-add-card') // Evening: draw a card
  assert.equal(s.hands.marquise!.length, 4)

  // ── Turn 1: Eyrie ──
  assert.equal(active(s), 'eyrie')
  s = play(s, 'eyrie-add-card', { card: 'a-visit-to-friends#1', column: 'recruit' })
  s = play(s, 'eyrie-add-card', { card: 'bake-sale#1', column: 'recruit' })
  s = play(s, 'eyrie-recruit', { clearing: 11 })
  s = play(s, 'eyrie-recruit', { clearing: 11 })
  assert.equal(w(s, 11, 'eyrie'), 8)
  s = play(s, 'eyrie-move', { from: 11, to: 10, warriors: 3 })
  s = play(s, 'eyrie-build', { clearing: 10 })
  assert.deepEqual(builds(s, 10), ['eyrie:roost'])
  s = until(s, 'alliance-spread') // Evening: two roosts score one, draw a card
  assert.equal(s.score.eyrie, 1)
  assert.equal(s.hands.eyrie!.length, 2)

  // ── Turn 1: Alliance ──
  assert.equal(active(s), 'alliance')
  s = play(s, 'alliance-spread', { clearing: 5 })
  assert.deepEqual(tokens(s, 5), ['alliance:sympathy'])
  assert.deepEqual(s.factions.alliance!.supporters, ['sappers#1', 'birdy-bindle#1'])
  assert.equal(s.score.alliance, 0, 'the first sympathy scores nothing')
  s = until(s, 'craft')
  s = play(s, 'craft', { card: 'crossbow-mouse#1' })
  assert.equal(s.score.alliance, 1)
  assert.deepEqual(s.factions.alliance!.craftedItems, ['crossbow'])
  s = until(s, 'alliance-mobilize')
  s = play(s, 'alliance-mobilize', { card: 'brutal-tactics#2' })
  s = play(s, 'alliance-mobilize', { card: 'scouting-party#1' })
  assert.equal(s.factions.alliance!.supporters.length, 4)
  s = until(s, 'vagabond-slip') // Evening: no officers, draw a card
  assert.equal(s.hands.alliance!.length, 1)

  // ── Turn 1: Vagabond ──
  assert.equal(active(s), 'vagabond')
  s = play(s, 'vagabond-slip', { to: { kind: 'clearing', id: 5 } })
  s = until(s, 'vagabond-aid')
  s = play(s, 'vagabond-aid', { to: 'alliance', card: 'root-tea-fox#1', exhaust: 'torch', take: 'crossbow' })
  assert.equal(s.factions.vagabond!.relationships.alliance, 1)
  assert.equal(s.score.vagabond, 1)
  assert.deepEqual(s.factions.alliance!.craftedItems, [])
  s = play(s, 'vagabond-move', { to: 10 })
  s = play(s, 'vagabond-strike', { target: 'eyrie', piece: 'warrior' })
  assert.equal(s.factions.vagabond!.relationships.eyrie, 'hostile')
  assert.equal(s.score.vagabond, 1, 'the removal that makes them Hostile scores nothing')
  s = fight(s, 'vagabond-battle', { defender: 'eyrie' }, roll(1, 0))
  assert.equal(w(s, 10, 'eyrie'), 1)
  assert.equal(s.score.vagabond, 2, 'a point for removing a Hostile warrior')
  s = until(s, 'marquise-build')
  assert.equal(s.hands.vagabond!.length, 3)
  assert.deepEqual(scores(s), { marquise: 1, eyrie: 1, alliance: 1, vagabond: 2 })

  // ── Turn 2: Marquise ──
  assert.deepEqual(tokens(s, 0), ['marquise:keep', 'marquise:wood'])
  assert.deepEqual(tokens(s, 1), ['marquise:wood'])
  s = play(s, 'marquise-build', { building: 'workshop', clearing: 1, wood: [1] })
  assert.equal(s.score.marquise, 3, 'second workshop scores two')
  s = fight(s, 'battle', { clearing: 10, defender: 'eyrie' }, roll(2, 1), 'brutal-tactics#1')
  assert.deepEqual([w(s, 10, 'marquise'), w(s, 10, 'eyrie')], [0, 0], 'one warrior each')
  assert.equal(w(s, 0, 'marquise'), 2, 'Field Hospitals: back at the keep')
  assert.ok(s.discard.includes('brutal-tactics#1'))
  s = play(s, 'marquise-recruit', { clearings: [4] })
  assert.equal(w(s, 4, 'marquise'), 3)
  s = until(s, 'eyrie-add-card')
  assert.equal(s.hands.marquise!.length, 4)

  // ── Turn 2: Eyrie ──
  s = play(s, 'eyrie-add-card', { card: 'ambush-bird#1', column: 'battle' })
  s = until(s, 'eyrie-recruit')
  s = play(s, 'eyrie-recruit', { clearing: 11 })
  s = play(s, 'eyrie-recruit', { clearing: 11 })
  s = play(s, 'eyrie-move', { from: 11, to: 7, warriors: 2 })
  s = fight(s, 'eyrie-battle', { clearing: 7, defender: 'marquise' }, roll(3, 1))
  assert.deepEqual([w(s, 7, 'marquise'), w(s, 7, 'eyrie')], [1, 1], 'one warrior each')
  s = play(s, 'eyrie-build', { clearing: 7 }) // Lords of the Forest: the Eyrie rule the tie
  assert.deepEqual(builds(s, 7), ['eyrie:roost'])
  s = until(s, 'alliance-revolt') // Evening: three roosts score two, draw two
  assert.equal(s.score.eyrie, 3)
  assert.equal(s.hands.eyrie!.length, 3)

  // ── Turn 2: Alliance ──
  s = play(s, 'alliance-revolt', { clearing: 5, birds: 2 })
  if (s.pending.at(-1)?.kind === 'field-hospital') s = play(s, 'decline-field-hospital')
  assert.equal(w(s, 5, 'marquise'), 0)
  assert.equal(w(s, 5, 'alliance'), 1)
  assert.deepEqual(builds(s, 5), ['alliance:base'])
  assert.equal(s.factions.alliance!.officers, 1)
  assert.equal(s.score.alliance, 1, 'the revolt removed only a warrior')
  s = until(s, 'alliance-spread')
  s = play(s, 'alliance-spread', { clearing: 10, birds: 0 })
  assert.equal(s.score.alliance, 2, 'the second sympathy scores one')
  s = until(s, 'alliance-mobilize')
  for (const card of [...s.hands.alliance!]) s = play(s, 'alliance-mobilize', { card })
  assert.equal(s.factions.alliance!.supporters.length, 3)
  s = until(s, 'alliance-recruit')
  s = play(s, 'alliance-recruit', { clearing: 5 })
  assert.equal(w(s, 5, 'alliance'), 2)
  s = until(s, 'vagabond-slip') // Evening: draw one plus one for the base
  assert.equal(s.hands.alliance!.length, 2)

  // ── Turn 2: Vagabond ──
  assert.ok(s.factions.vagabond!.satchel.every(i => !i.exhausted), 'Refresh: tea lets him flip all five')
  s = play(s, 'vagabond-slip', { to: { kind: 'clearing', id: 5 } })
  s = until(s, 'vagabond-explore')
  s = play(s, 'vagabond-explore')
  assert.equal(s.score.vagabond, 3)
  assert.ok(!s.map.clearings[5]!.slots.some(x => x?.kind === 'ruin'), 'the ruin is gone')
  assert.ok(s.factions.vagabond!.satchel.some(i => i.type === 'hammer'))
  s = play(s, 'vagabond-quest', { quest: 'errand-fox', reward: 'draw' })
  assert.equal(s.score.vagabond, 3, 'drew instead of scoring')
  assert.deepEqual(s.factions.vagabond!.completedQuests, ['errand-fox'])
  assert.equal(s.questsAvailable.length, 3, 'a new quest is put out')
  assert.equal(s.factions.vagabond!.tracks.tea, 0, 'exhausted tea moved to the satchel')
  assert.equal(s.hands.vagabond!.length, 5)
  s = until(s, 'discard-card') // Evening: draw one, six cards, discard one
  s = play(s, 'discard-card', { card: s.hands.vagabond![0] })
  assert.equal(s.hands.vagabond!.length, 5)

  // The walkthrough is over: the Marquise is up again.
  assert.equal(active(s), 'marquise')
  assert.deepEqual(scores(s), { marquise: 3, eyrie: 3, alliance: 2, vagabond: 3 })
  assert.deepEqual(builds(s, 10), ['eyrie:roost'])
  assert.deepEqual(tokens(s, 10), ['alliance:sympathy'])
  assert.deepEqual(builds(s, 1), ['marquise:sawmill', 'marquise:workshop'])
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AUTUMN, VAGABOND } from '@root/game-data'
import {
  applyCommand, createGame, currentActor, legalActions, recordingRng, replay, replayRng, seededRng, viewFor,
  type Action, type FactionId, type GameOptions, type GameRecord, type GameState, type Rng,
} from '../src/index.ts'

const bot = { kind: 'bot', profile: 'test' } as const
const options = (factions: FactionId[]): GameOptions => ({
  gameId: 'g1', players: factions.map(f => ({ playerId: `p-${f}`, faction: f, controller: bot })),
})
const ALL: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']

let actionCounter = 0
function act(state: GameState, action: Action, rng: Rng, faction = currentActor(state)!) {
  const command = { gameId: state.meta.gameId, playerId: `p-${faction}`, expectedRevision: state.meta.revision, actionId: `a${++actionCounter}`, ...action }
  const out = applyCommand(state, command, rng)
  assert.ok(out.result.ok, JSON.stringify(out.result))
  return { state: out.state, command }
}

/** Answers every setup choice with `pick` (default: the first legal option). */
function finishSetup(state: GameState, rng: Rng, pick: (options: Action[]) => Action = o => o[0]!) {
  while (state.stage === 'setup') state = act(state, pick(legalActions(state, currentActor(state)!)), rng).state
  return state
}

const countCards = (s: GameState) =>
  s.deck.length + s.discard.length + s.availableDominance.length +
  Object.values(s.hands).reduce((n, h) => n + h.length, 0) + (s.factions.alliance?.supporters.length ?? 0)

const warriorsOnMap = (s: GameState, f: FactionId) => s.map.clearings.reduce((n, c) => n + (c.warriors[f] ?? 0), 0)

test('rng: same seed, same sequence; replay returns the recorded values and rejects overruns', () => {
  const a = seededRng('seed'), b = seededRng('seed')
  const xs = Array.from({ length: 20 }, () => a.int(12))
  assert.deepEqual(xs, Array.from({ length: 20 }, () => b.int(12)))
  assert.ok(xs.every(x => Number.isInteger(x) && x >= 0 && x < 12))
  const rec = recordingRng(seededRng('other'))
  const ys = [rec.int(6), rec.int(6), rec.int(100)]
  const rep = replayRng(rec.values)
  assert.deepEqual([rep.int(6), rep.int(6), rep.int(100)], ys)
  assert.throws(() => rep.int(6))
})

test('createGame refuses mixes below the Reach minimum (decision 0003)', () => {
  assert.throws(() => createGame(options(['eyrie', 'alliance', 'vagabond']), seededRng('x')))
  assert.throws(() => createGame(options(['marquise', 'vagabond']), seededRng('x')))
})

test('standard setup, four players: decks, hands and the setup order A–D (§5.1)', () => {
  const rng = seededRng('four')
  let s = createGame(options(ALL), rng)
  assert.equal(s.stage, 'setup')
  assert.deepEqual([...s.seats.map(x => x.faction)].sort(), [...ALL].sort())
  assert.ok(Object.values(s.hands).every(h => h.length === 3))
  assert.equal(currentActor(s), 'marquise')
  assert.deepEqual(legalActions(s, 'marquise').map(a => a.payload), [0, 2, 8, 11].map(clearing => ({ clearing })))
  assert.deepEqual(legalActions(s, 'eyrie'), [])

  s = act(s, { type: 'marquise-place-keep', payload: { clearing: 0 } }, rng).state
  // Garrison: every clearing but the opposite corner (§6.3.3).
  assert.equal(warriorsOnMap(s, 'marquise'), 11)
  assert.equal(s.map.clearings[11]!.warriors.marquise, undefined)
  // Buildings may go in the keep's clearing or adjacent ones with an open slot (§6.3.4).
  const where = new Set(legalActions(s, 'marquise').map(a => (a.payload as { clearing: number }).clearing))
  assert.deepEqual([...where].sort(), [0, 1, 3, 4])

  s = finishSetup(s, rng, opts => opts.find(o => o.type === 'eyrie-place-roost' && o.payload.clearing !== 11) ?? opts[0]!)
  assert.equal(s.stage, 'play')
  // Turn 1 starts with seat 0 (§5.1.1); steps without a choice have already run.
  assert.equal(s.turn.seat, 0)
  assert.equal(s.turn.number, 1)
  assert.deepEqual(s.pending, [])

  // Eyrie had to take the corner opposite the keep (§7.3.2).
  assert.equal(s.map.clearings[11]!.warriors.eyrie, 6)
  assert.equal(s.factions.eyrie!.roostsOnTrack, 6)
  assert.equal(s.factions.eyrie!.leadersFaceUp.length, 3)
  assert.equal(Object.values(s.factions.eyrie!.decree).flat().length, 2)
  // Marquise: 14 warriors left, one of each building out, five on each track.
  assert.equal(s.factions.marquise!.warriorSupply, 14)
  assert.deepEqual(s.factions.marquise!.buildingsOnTrack, { sawmill: 5, workshop: 5, recruiter: 5 })
  // Alliance drew three supporters; 54 − 12 dealt − 3 supporters = 39, as in Walking Through Root.
  assert.equal(s.factions.alliance!.supporters.length, 3)
  assert.equal(s.deck.length, 39)
  assert.equal(countCards(s), 54)
  // Vagabond: one hidden "R" item per ruin, three quests, relationships with everyone else.
  const ruins = s.map.clearings.flatMap(c => c.slots.filter(x => x?.kind === 'ruin'))
  assert.deepEqual(ruins.flatMap(r => (r!.kind === 'ruin' ? r!.items : [])).sort(), [...VAGABOND.ruinItems].sort())
  assert.equal(s.questsAvailable.length, 3)
  assert.equal(s.questDeck.length, 12)
  assert.deepEqual(Object.keys(s.factions.vagabond!.relationships).sort(), ['alliance', 'eyrie', 'marquise'])
  assert.equal(s.factions.vagabond!.pawn?.kind, 'forest')
  // The first option is the Thief: boots, torch, sword in the Satchel, tea on its track (§V.1.1, §9.3.5).
  assert.equal(s.factions.vagabond!.character, 'thief')
  assert.deepEqual(s.factions.vagabond!.satchel.map(i => i.type).sort(), ['boots', 'sword', 'torch'])
  assert.deepEqual(s.factions.vagabond!.tracks, { tea: 1, coin: 0, bag: 0 })
})

test('each Vagabond character starts with its listed items (§V.1.1–V.3.1)', () => {
  for (const character of ['thief', 'tinker', 'ranger'] as const) {
    const rng = seededRng(character)
    let s = createGame(options(['marquise', 'eyrie', 'vagabond']), rng)
    s = finishSetup(s, rng, opts => opts.find(o => o.type === 'vagabond-choose-character' && o.payload.character === character) ?? opts[0]!)
    const v = s.factions.vagabond!
    const all = [...v.satchel.map(i => i.type), ...Object.entries(v.tracks).flatMap(([t, n]) => Array(n).fill(t))]
    assert.deepEqual(all.sort(), [...VAGABOND.characters[character].items].sort(), character)
  }
})

test('two players play without dominance cards (§5.1.3)', () => {
  const s = finishSetup(createGame(options(['marquise', 'eyrie']), seededRng('two')), seededRng('two-b'))
  assert.equal(countCards(s), 50)
  assert.ok(![...s.deck, ...Object.values(s.hands).flat()].some(c => c.startsWith('dominance')))
})

test('Eyrie corner follows the keep: opposite corner only (§7.3.2)', () => {
  const rng = seededRng('corner')
  let s = createGame(options(['marquise', 'eyrie']), rng)
  s = act(s, { type: 'marquise-place-keep', payload: { clearing: AUTUMN.corners.topRight } }, rng).state
  while (currentActor(s) === 'marquise') s = act(s, legalActions(s, 'marquise')[0]!, rng).state
  assert.deepEqual(legalActions(s, 'eyrie').map(a => a.payload), [{ clearing: AUTUMN.corners.bottomLeft }])
})

test('commands: stale, wrong player, illegal and duplicate commands leave the state untouched', () => {
  const rng = seededRng('cmd')
  const s = createGame(options(ALL), rng)
  const before = JSON.stringify(s)
  const base = { gameId: 'g1', playerId: 'p-marquise', expectedRevision: 0, actionId: 'x1', type: 'marquise-place-keep', payload: { clearing: 0 } }
  assert.equal(applyCommand(s, { ...base, expectedRevision: 5 }, rng).result.ok, false)
  assert.equal(applyCommand(s, { ...base, playerId: 'p-eyrie' }, rng).result.ok, false)
  assert.equal(applyCommand(s, { ...base, payload: { clearing: 5 } }, rng).result.ok, false)
  assert.equal(applyCommand(s, { ...base, gameId: 'other' }, rng).result.ok, false)
  const ok = applyCommand(s, base, rng)
  assert.deepEqual(ok.result, { ok: true, revision: 1 })
  assert.equal(JSON.stringify(s), before, 'input state must not change')
  const again = applyCommand(ok.state, { ...base, expectedRevision: 1 }, rng)
  assert.deepEqual(again.result, { ok: true, revision: 1, duplicate: true })
  assert.equal(again.state, ok.state)
})

test('view hides hands, supporters, ruin items and the deck (§1.2)', () => {
  const s = finishSetup(createGame(options(ALL), seededRng('view')), seededRng('view-b'))
  const eyrie = viewFor(s, 'eyrie'), alliance = viewFor(s, 'alliance'), spectator = viewFor(s, null)
  assert.deepEqual(eyrie.hand, s.hands.eyrie)
  assert.equal(eyrie.handCounts.marquise, 3)
  assert.equal(eyrie.supporters, null)
  assert.equal(eyrie.supporterCount, 3)
  assert.deepEqual(alliance.supporters, s.factions.alliance!.supporters)
  assert.equal(spectator.hand.length, 0)
  const text = JSON.stringify(eyrie)
  for (const card of [...s.hands.marquise!, ...s.factions.alliance!.supporters, ...s.deck]) assert.ok(!text.includes(card), `${card} leaked`)
  assert.ok(!text.includes('"items"'), 'ruin items leaked')
  assert.equal(eyrie.deckCount, s.deck.length)
})

test('replay rebuilds the same state from the record, and rejects a tampered record', () => {
  const setupRng = recordingRng(seededRng('replay'))
  const opts = options(ALL)
  let s = createGame(opts, setupRng)
  const record: GameRecord = { options: opts, setupRandom: setupRng.values, commands: [] }
  while (s.stage === 'setup') {
    const rng = recordingRng(seededRng(`cmd-${record.commands.length}`))
    const options = legalActions(s, currentActor(s)!)
    const out = act(s, options[options.length - 1]!, rng)
    record.commands.push({ command: out.command, random: rng.values })
    s = out.state
  }
  assert.deepEqual(replay(record), s)
  const tampered = structuredClone(record)
  tampered.setupRandom[0] = (tampered.setupRandom[0]! + 1) % 4
  assert.notDeepEqual((() => { try { return replay(tampered) } catch { return null } })(), s)
})

test('property: 200 random setups keep pieces and cards conserved and replay exactly', () => {
  const mixes: FactionId[][] = [['marquise', 'eyrie'], ['marquise', 'eyrie', 'alliance'], ['marquise', 'eyrie', 'vagabond'], ['marquise', 'alliance', 'vagabond'], ALL]
  const TOTAL = { marquise: 25, eyrie: 20, alliance: 10, vagabond: 0 }
  for (let g = 0; g < 200; g++) {
    const opts = { ...options(mixes[g % mixes.length]!), gameId: `g${g}` }
    const setupRng = recordingRng(seededRng(`p${g}`))
    let s = createGame(opts, setupRng)
    const record: GameRecord = { options: opts, setupRandom: setupRng.values, commands: [] }
    const chooser = seededRng(`choice${g}`)
    while (s.stage === 'setup') {
      const legal = legalActions(s, currentActor(s)!)
      assert.ok(legal.length > 0, 'setup must always offer a choice')
      const rng = recordingRng(seededRng(`c${g}-${record.commands.length}`))
      const command = { gameId: opts.gameId, playerId: `p-${currentActor(s)}`, expectedRevision: s.meta.revision, actionId: `g${g}-${record.commands.length}`, ...legal[chooser.int(legal.length)]! }
      const out = applyCommand(s, command, rng)
      assert.ok(out.result.ok)
      record.commands.push({ command, random: rng.values })
      s = out.state
    }
    assert.equal(countCards(s), s.seats.length === 2 ? 50 : 54)
    for (const seat of s.seats) assert.equal(s.factions[seat.faction]!.warriorSupply + warriorsOnMap(s, seat.faction), TOTAL[seat.faction], seat.faction)
    s.map.clearings.forEach((c, i) => assert.equal(c.slots.length, AUTUMN.clearings[i]!.slots))
    assert.deepEqual(replay(record), s)
  }
})

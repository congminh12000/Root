import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyCommand, createGame, currentActor, legalActions, seededRng, viewFor, type FactionId, type GameState } from '@root/game-engine'
import { checkInvariants } from '../../game-engine/test/fuzz.ts'
import { determinize, searchBot } from '../src/index.ts'

const FACTIONS: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']

/** States along random games, for every seat's point of view. */
function* positions(games: number): Generator<GameState> {
  for (let g = 0; g < games; g++) {
    const rng = seededRng(`pos-${g}`)
    let s = createGame({ gameId: 'p', players: FACTIONS.map(f => ({ playerId: f, faction: f, controller: { kind: 'bot', profile: 'r' } })) }, rng)
    for (let n = 0; n < 3000 && !s.winner; n++) {
      if (n % 7 === 0) yield s
      const f = currentActor(s)!
      const legal = legalActions(s, f)
      s = applyCommand(s, { gameId: 'p', playerId: f, expectedRevision: s.meta.revision, actionId: `${n}`, ...legal[rng.int(legal.length)]! }, rng).state
    }
  }
}

test('a determinized state keeps every card and piece, and gives the actor exactly its real legal actions', () => {
  const rng = seededRng('det')
  let checked = 0
  for (const s of positions(4)) {
    const actor = currentActor(s)!
    for (const { faction } of s.seats) {
      const guess = determinize(viewFor(s, faction), rng)
      checkInvariants(guess, 'determinize')
      assert.deepEqual(viewFor(guess, faction).hand, viewFor(s, faction).hand)
      assert.equal(guess.deck.length, s.deck.length)
      if (faction === actor) assert.deepEqual(legalActions(guess, actor), legalActions(s, actor))
    }
    checked++
  }
  assert.ok(checked > 100)
})

test('the guess never copies hidden information it cannot see', () => {
  // Over many guesses, another player's hand differs from the real one at least sometimes.
  const rng = seededRng('hidden')
  const s = [...positions(1)][10]!
  const real = JSON.stringify(s.hands.eyrie)
  const same = Array.from({ length: 20 }, () => JSON.stringify(determinize(viewFor(s, 'marquise'), rng).hands.eyrie)).filter(h => h === real).length
  assert.ok(same < 20)
})

test('the search bot returns a legal action within its budget', () => {
  const bot = searchBot({ budgetMs: 50 })
  const rng = seededRng('sb')
  for (const s of [...positions(1)].slice(0, 15)) {
    const f = currentActor(s)!
    const legal = legalActions(s, f)
    const t = Date.now()
    const a = bot.choose(viewFor(s, f), legal, rng)
    assert.ok(Date.now() - t < 1000)
    assert.ok(legal.includes(a))
  }
})

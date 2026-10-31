import assert from 'node:assert/strict'
import { test } from 'node:test'
import { replay, type FactionId } from '../src/index.ts'
import { randomGame } from './fuzz.ts'

const MIXES: FactionId[][] = [
  ['marquise', 'eyrie', 'alliance', 'vagabond'],
  ['marquise', 'eyrie'],
  ['marquise', 'eyrie', 'vagabond'],
  ['eyrie', 'alliance', 'vagabond', 'marquise'],
]
const GAMES = Number(process.env.FUZZ_GAMES ?? 24)

test(`random bots play ${GAMES} games to the end; pieces and cards are conserved every command`, () => {
  for (let i = 0; i < GAMES; i++) {
    const { state } = randomGame(`fuzz-${i}`, MIXES[i % MIXES.length]!)
    assert.ok(state.winner, `fuzz-${i} ended without a winner`)
  }
})

test('a random game replays to the identical state without its seed', () => {
  for (let i = 0; i < 3; i++) {
    const { state, record } = randomGame(`replay-${i}`, MIXES[i]!, 400)
    assert.deepEqual(replay(record), state)
  }
})

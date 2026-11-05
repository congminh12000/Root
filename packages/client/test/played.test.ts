import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LogEntry } from '../src/motion.ts'
import { newPlayed, playedCards } from '../src/interaction/played.ts'

// The "just played" card in the middle comes from public log payloads, in play order, each shown once.

const log: LogEntry[] = [
  { revision: 1, faction: 'marquise', type: 'move', detail: { from: 1, to: 2, warriors: 1 } },
  { revision: 2, faction: 'eyrie', type: 'eyrie-add-card', detail: { card: 'ambush-bird' } },
  { revision: 3, faction: 'marquise', type: 'craft', detail: { card: 'armorers' } },
  { revision: 3, faction: 'marquise', type: 'craft', detail: { card: 'armorers' } },
  { revision: 4, faction: 'alliance', type: 'craft', detail: {} },
]

test('only card-playing entries with a public card become played cards, in order', () => {
  assert.deepEqual(playedCards(log).map(p => [p.faction, p.card]), [['eyrie', 'ambush-bird'], ['marquise', 'armorers'], ['marquise', 'armorers']])
})

test('two plays of one card in one revision keep distinct keys', () => {
  const keys = playedCards(log).map(p => p.key)
  assert.equal(new Set(keys).size, keys.length)
})

test('keys survive the log being trimmed from the front', () => {
  assert.deepEqual(playedCards(log.slice(2)).map(p => p.key), playedCards(log).slice(1).map(p => p.key))
})

test('newPlayed returns each card once, so a fast burst queues instead of repeating', () => {
  const known = new Set(playedCards(log.slice(0, 2)).map(p => p.key))
  assert.deepEqual(newPlayed(log, known).map(p => p.card), ['armorers', 'armorers'])
  assert.deepEqual(newPlayed(log, known), [])
  const later: LogEntry = { revision: 5, faction: 'vagabond', type: 'discard-card', detail: { card: 'favor-of-the-foxes' } }
  assert.deepEqual(newPlayed([...log, later], known).map(p => p.faction), ['vagabond'])
})

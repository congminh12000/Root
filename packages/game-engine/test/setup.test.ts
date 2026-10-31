import assert from 'node:assert/strict'
import { test } from 'node:test'
import { factionMixAllowed } from '../src/index.ts'
import type { FactionId } from '../src/index.ts'

const ALL: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']
const subsets = (n: number): FactionId[][] =>
  n === 0 ? [[]] : ALL.flatMap((f, i) => subsets(n - 1).filter(s => s.every(x => ALL.indexOf(x) > i)).map(s => [f, ...s]))

test('only the mixes in decision 0003 meet the Reach minimum (§5.2)', () => {
  const allowed = [2, 3, 4].flatMap(n => subsets(n)).filter(factionMixAllowed).map(s => s.join('+'))
  assert.deepEqual(allowed, [
    'marquise+eyrie',
    'marquise+eyrie+alliance', 'marquise+eyrie+vagabond', 'marquise+alliance+vagabond',
    'marquise+eyrie+alliance+vagabond',
  ])
})

test('rejects too few, too many or repeated factions', () => {
  assert.equal(factionMixAllowed(['marquise']), false)
  assert.equal(factionMixAllowed(['marquise', 'marquise']), false)
  assert.equal(factionMixAllowed(['eyrie', 'alliance', 'vagabond']), false)
})

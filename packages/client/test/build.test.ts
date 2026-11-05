import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MARQUISE } from '@root/game-data'
import { applyCommand, createGame, currentActor, legalActions, seededRng, viewFor, type Action, type FactionId, type GameState } from '@root/game-engine'
import { buildClearings, buildOptions, type BuildAction } from '../src/interaction/build.ts'

// RD-M02: grouping legal Marquise builds (ROOT-6.5.4) for the Build box. Every option must be an element of `legal`.

const FACTIONS: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']

/** A real game played by seeded random choices until the Marquise can build in its Daylight. */
function canBuild(): GameState {
  for (let seed = 0; seed < 20; seed++) {
    const rng = seededRng(`rd-m02-${seed}`)
    let s = createGame({ gameId: 't', players: FACTIONS.map(f => ({ playerId: f, faction: f, controller: { kind: 'bot', profile: 'r' } })) }, rng)
    for (let n = 0; n < 3000 && !s.winner; n++) {
      const f = currentActor(s)!
      const legal = legalActions(s, f)
      if (f === 'marquise' && legal.some(a => a.type === 'marquise-build')) return s
      const action = legal[rng.int(legal.length)]!
      s = applyCommand(s, { gameId: 't', playerId: f, expectedRevision: s.meta.revision, actionId: `a${n}`, ...action }, rng).state
    }
  }
  throw new Error('no position where the Marquise can build')
}

const build = (building: BuildAction['payload']['building'], clearing: number, wood: number[]): BuildAction =>
  ({ type: 'marquise-build', payload: { building, clearing, wood } })

test('Build box: options are grouped from legal builds, with the cost and the points of the next space', () => {
  const s = canBuild()
  const legal = legalActions(s, 'marquise')
  const view = viewFor(s, 'marquise')
  const where = buildClearings(legal)
  assert.ok(where.length > 0)
  for (const c of where) {
    const options = buildOptions(view, legal, c)
    assert.ok(options.length > 0 && options.length <= 3)
    for (const o of options) {
      assert.ok(o.ways.every(a => a.payload.clearing === c && a.payload.building === o.building))
      assert.ok(o.ways.every(a => legal.includes(a)), 'every way to pay is a legal action')
      assert.ok(o.ways.includes(o.auto))
      assert.ok(o.ways.every(a => a.payload.wood.length === o.wood))
      const built = MARQUISE.buildingsPerType - s.factions.marquise!.buildingsOnTrack[o.building]
      assert.equal(o.wood, MARQUISE.woodCost[built])
      assert.equal(o.points, MARQUISE.points[o.building][built])
    }
    // Every legal build at the clearing is in exactly one column.
    assert.equal(options.reduce((n, o) => n + o.ways.length, 0), legal.filter(a => a.type === 'marquise-build' && a.payload.clearing === c).length)
  }
})

test('Build box: nothing to offer where the Marquise cannot build, or when no build is legal', () => {
  const s = canBuild()
  const legal = legalActions(s, 'marquise')
  const view = viewFor(s, 'marquise')
  const other = s.map.clearings.map((_, i) => i).find(c => !buildClearings(legal).includes(c))!
  assert.deepEqual(buildOptions(view, legal, other), [])
  const noBuilds: Action[] = legal.filter(a => a.type !== 'marquise-build')
  assert.deepEqual(buildOptions(view, noBuilds, buildClearings(legal)[0]!), [])
  assert.deepEqual(buildClearings(noBuilds), [])
})

test('Build box: the suggested payment takes the most wood from the clearing itself; columns follow Root Digital', () => {
  const view = viewFor(canBuild(), 'marquise')
  const ways = [build('sawmill', 4, [0, 4]), build('sawmill', 4, [4, 4]), build('sawmill', 4, [0, 0])]
  const legal: Action[] = [build('recruiter', 4, [4]), ...ways, build('workshop', 4, [])]
  const options = buildOptions(view, legal, 4)
  assert.deepEqual(options.map(o => o.building), ['workshop', 'sawmill', 'recruiter'])
  assert.equal(options[1]!.auto, ways[1])
  assert.equal(options[1]!.ways.length, 3)
})

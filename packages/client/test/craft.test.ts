import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AUTUMN } from '@root/game-data'
import { applyCommand, createGame, currentActor, legalActions, seededRng, viewFor, type FactionId, type PlayerView } from '@root/game-engine'
import { html } from 'htm/preact'
import { render } from 'preact-render-to-string'
import { sampleView } from '../src/dev/sample.ts'
import { craftClearings, craftPieces, matchCost } from '../src/interaction/craft.ts'
import { CraftPanel } from '../src/ui/components.ts'

// Crafting display (§4.1.1, docs/07-ui/checklist.md C): the seat's crafting pieces and which of them pay the open card.

const FOX = AUTUMN.clearings.flatMap((c, i) => (c.suit === 'fox' ? [i] : []))
const MOUSE = AUTUMN.clearings.flatMap((c, i) => (c.suit === 'mouse' ? [i] : []))

/** A view with no pieces on the map, then `put` places what the test needs. */
function bare(seat: FactionId): PlayerView {
  const v = sampleView(seat)
  for (const c of v.map.clearings) { c.slots = c.slots.map(() => null); c.tokens = [] }
  v.craftingUsed = []
  return v
}
const workshop = (v: PlayerView, c: number) => { v.map.clearings[c]!.slots[0] = { kind: 'building', faction: 'marquise', type: 'workshop' } }

test('Marquise workshops are crafting pieces of their clearing suit; activated ones are marked used', () => {
  const v = bare('marquise')
  workshop(v, FOX[0]!); workshop(v, FOX[1]!); workshop(v, MOUSE[0]!)
  v.map.clearings[MOUSE[1]!]!.slots[0] = { kind: 'building', faction: 'marquise', type: 'sawmill' } // not a crafting piece
  v.craftingUsed = [FOX[1]!]
  const pieces = craftPieces(v, 'marquise')
  assert.deepEqual(pieces.map(p => [p.clearing, p.suit, p.used]), [[FOX[0], 'fox', false], [FOX[1], 'fox', true], [MOUSE[0], 'mouse', false]].sort((a, b) => (a[0] as number) - (b[0] as number)))
  assert.equal(craftPieces(v, 'eyrie').length, 0, 'workshops are not Eyrie roosts')
})

test('Alliance sympathy tokens and Eyrie roosts count; other factions\' pieces do not', () => {
  const v = bare('alliance')
  v.map.clearings[MOUSE[0]!]!.tokens = [{ faction: 'alliance', type: 'sympathy' }]
  v.map.clearings[FOX[0]!]!.slots[0] = { kind: 'building', faction: 'eyrie', type: 'roost' }
  assert.deepEqual(craftPieces(v, 'alliance').map(p => p.clearing), [MOUSE[0]])
  assert.deepEqual(craftPieces(v, 'eyrie').map(p => p.suit), ['fox'])
})

test('the Vagabond crafts with face-up hammers in its pawn clearing, never in a forest (§9.2.1)', () => {
  const v = bare('vagabond')
  const vb = v.factions.vagabond!
  vb.satchel = [{ type: 'hammer', exhausted: false }, { type: 'hammer', exhausted: false }, { type: 'hammer', exhausted: true }, { type: 'sword', exhausted: false }]
  vb.pawn = { kind: 'clearing', id: MOUSE[0]! }
  assert.deepEqual(craftPieces(v, 'vagabond'), [{ clearing: null, suit: 'mouse', used: false }, { clearing: null, suit: 'mouse', used: false }])
  vb.pawn = { kind: 'forest', id: 0 }
  assert.equal(craftPieces(v, 'vagabond').length, 0)
})

test('cost matching pays each icon with a distinct unused piece of its suit, and reports what is missing', () => {
  const v = bare('marquise')
  workshop(v, FOX[0]!); workshop(v, FOX[1]!); workshop(v, MOUSE[0]!)
  const paid = matchCost('arms-trader#1', craftPieces(v, 'marquise')) // fox, fox
  assert.ok(paid.every(c => c.piece?.suit === 'fox'))
  assert.notEqual(paid[0]!.piece, paid[1]!.piece)
  assert.deepEqual(craftClearings(paid), [FOX[0], FOX[1]].sort((a, b) => a! - b!))

  v.craftingUsed = [FOX[1]!] // one fox workshop already activated this turn
  const short = matchCost('arms-trader#1', craftPieces(v, 'marquise'))
  assert.deepEqual(short.map(c => c.piece?.clearing ?? null), [FOX[0], null])
  assert.deepEqual(matchCost('birdy-bindle#1', craftPieces(v, 'marquise')).map(c => c.piece?.clearing), [MOUSE[0]]) // mouse
  assert.equal(matchCost('royal-claim#1', craftPieces(v, 'marquise')).filter(c => c.piece).length, 2, 'any suit, but only unused pieces')
})

test('the panel says craftable only when the engine offers the craft, and names what is missing', () => {
  const v = bare('marquise')
  workshop(v, FOX[0]!); workshop(v, FOX[1]!)
  const ready = render(html`<${CraftPanel} card="arms-trader#1" view=${v} seat="marquise" craftable=${true} />`)
  assert.match(ready, /Chế tạo được ngay/)
  assert.equal(ready.match(/craft-piece paying/g)?.length, 2)
  const late = render(html`<${CraftPanel} card="arms-trader#1" view=${v} seat="marquise" craftable=${false} />`)
  assert.match(late, /chưa chế tạo được lá này/)
  const short = render(html`<${CraftPanel} card="birdy-bindle#1" view=${v} seat="marquise" craftable=${false} />`)
  assert.match(short, /thiếu/)
  assert.match(short, /Chưa đủ workshop/)
  assert.ok(!/undefined|NaN/.test(ready + late + short))
  assert.equal(render(html`<${CraftPanel} card="ambush-bird#1" view=${v} seat="marquise" craftable=${false} />`), '', 'Ambush cannot be crafted (§2.1.2)')
})

test('whenever the engine offers a craft, the display finds pieces for every cost icon', () => {
  const factions: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']
  const rng = seededRng('craft-display')
  let s = createGame({ gameId: 'c', players: factions.map(f => ({ playerId: f, faction: f, controller: { kind: 'bot', profile: 'r' } })) }, rng)
  let checked = 0
  for (let n = 0; n < 3000 && !s.winner; n++) {
    const f = currentActor(s)!
    const legal = legalActions(s, f)
    const v = viewFor(s, f)
    for (const a of legal) if (a.type === 'craft') {
      assert.ok(matchCost(a.payload.card, craftPieces(v, f)).every(c => c.piece), `${f} ${a.payload.card}`)
      checked++
    }
    const pick = legal.find(a => a.type === 'craft' && rng.int(2) === 0) ?? legal[rng.int(legal.length)]!
    s = applyCommand(s, { gameId: 'c', playerId: f, expectedRevision: s.meta.revision, actionId: `c${n}`, ...pick }, rng).state
  }
  assert.ok(checked > 5, `checked ${checked} crafts`)
})

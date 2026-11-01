import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BASE_DECK } from '@root/game-data'
import { applyCommand, createGame, currentActor, legalActions, seededRng, viewFor, type FactionId } from '@root/game-engine'
import { changedClearings } from '../src/board.ts'
import { html } from 'htm/preact'
import { render } from 'preact-render-to-string'
import { CardChip, CardDetail } from '../src/ui/components.ts'

test('every card in the deck has a detail panel with its name, kind and cost or effect', () => {
  for (const c of BASE_DECK) {
    const out = render(html`<${CardDetail} card=${`${c.id}#1`} />`)
    assert.ok(out.includes(c.name.replace(/&/g, '&amp;')), c.id)
    assert.ok(/Item|Dùng ngay|Lâu dài|Ambush|Dominance/.test(out), `kind for ${c.id}`)
    if (c.kind === 'item') assert.ok(out.includes(`+${c.vp} điểm`), `points for ${c.id}`)
  }
  assert.ok(render(html`<${CardChip} card="anvil#1" />`).includes('data-card="anvil#1"'))
})

test('changedClearings lists exactly the clearings a command touched', () => {
  const factions: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']
  const rng = seededRng('changed')
  let s = createGame({ gameId: 'c', players: factions.map(f => ({ playerId: f, faction: f, controller: { kind: 'bot', profile: 'r' } })) }, rng)
  assert.deepEqual(changedClearings(viewFor(s, null), viewFor(s, null)), [])
  let moves = 0
  for (let n = 0; n < 400 && !s.winner; n++) {
    const f = currentActor(s)!
    const legal = legalActions(s, f)
    const action = legal.find(a => a.type === 'move') ?? legal[rng.int(legal.length)]!
    const before = viewFor(s, null)
    s = applyCommand(s, { gameId: 'c', playerId: f, expectedRevision: s.meta.revision, actionId: `${n}`, ...action }, rng).state
    if (action.type === 'move') {
      moves++
      const changed = changedClearings(before, viewFor(s, null))
      assert.ok(changed.includes(action.payload.from) && changed.includes(action.payload.to), `move ${JSON.stringify(action.payload)} → ${changed}`)
    }
  }
  assert.ok(moves > 0)
})

test('faction boards, hand and decisions render at every step of a game, setup included', async () => {
  const { FactionBoards } = await import('../src/ui/screens/boards.ts')
  const { DecisionDialog } = await import('../src/ui/screens/decision.ts')
  const { decisionOf } = await import('../src/interaction/decisions.ts')
  const factions: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']
  const rng = seededRng('render')
  let s = createGame({ gameId: 'r', players: factions.map(f => ({ playerId: f, faction: f, controller: { kind: 'bot', profile: 'r' } })) }, rng)
  let dialogs = 0
  for (let n = 0; n < 600 && !s.winner; n++) {
    const f = currentActor(s)!
    const legal = legalActions(s, f)
    for (const seat of [f, null]) {
      const v = viewFor(s, seat)
      for (const tab of [...factions, 'shared'] as const) render(html`<${FactionBoards} view=${v} seat=${seat} initial=${tab} />`)
      const d = decisionOf(v, seat ? legal : [])
      if (d && seat && d.dialog) { render(html`<${DecisionDialog} decision=${d} view=${v} legal=${legal} send=${() => {}} onFold=${() => {}} />`); dialogs++ }
    }
    s = applyCommand(s, { gameId: 'r', playerId: f, expectedRevision: s.meta.revision, actionId: `${n}`, ...legal[rng.int(legal.length)]! }, rng).state
  }
  assert.ok(dialogs > 10, `rendered ${dialogs} dialogs`)
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { currentActor } from '@root/game-engine'
import { at } from '../../game-engine/test/helpers.ts'
import { Room } from '../src/room.ts'

function room() {
  return Room.create({ seats: [{ faction: 'marquise', kind: 'human' }, { faction: 'eyrie', kind: 'human' }] }, () => {}, { turnSeconds: 0 })
}
function reversible(r: Room) {
  for (let i = 0; i < 150; i++) {
    const actor = currentActor(r.state)!
    const msg = r.message(actor)
    assert.ok(msg.type === 'update')
    const a = msg.legal.find(a => a.type === 'marquise-recruit') ?? msg.legal.find(a => a.type === 'end-step') ?? msg.legal[0]!
    const before = structuredClone(r.state)
    assert.ok(r.submit(actor, `advance-${i}`, msg.view.revision, a).ok)
    const after = r.message(actor)
    assert.ok(after.type === 'update')
    if (after.canUndo && actor === 'marquise') return { actor, before, revision: after.view.revision, action: a }
  }
  throw new Error('No reversible action reached')
}

test('undo restores board and replay, increases revision, rejects stale/wrong-seat requests', () => {
  const r = room()
  try {
    const { actor, before, revision, action } = reversible(r)
    assert.equal(r.undo(actor === 'marquise' ? 'eyrie' : 'marquise', revision), false)
    assert.equal(r.undo(actor, revision - 1), false)
    assert.equal(r.undo(actor, revision), true)
    assert.deepEqual(r.state, before)
    const update = r.message(actor)
    assert.ok(update.type === 'update')
    assert.equal(update.view.revision, revision + 1)
    assert.equal(update.canUndo, false)
    assert.equal(r.submit(actor, 'stale', revision, action).ok, false)
    const loaded = new Room(structuredClone(r.saved), () => {}, { turnSeconds: 0 })
    try { assert.deepEqual(loaded.state, r.state); const m = loaded.message(actor); assert.ok(m.type === 'update'); assert.equal(m.view.revision, revision + 1) } finally { loaded.close() }
    assert.equal(r.undo(actor, revision + 1), false)
    assert.equal(r.submit(actor, 'again', revision + 1, action).ok, true)
  } finally { r.close() }
})

test('setup and advancing to the next step cannot be undone', () => {
  const r = room()
  try {
    const m = r.message('marquise'); assert.ok(m.type === 'update')
    assert.ok(r.submit('marquise', 'setup', m.view.revision, m.legal[0]!).ok)
    assert.equal(r.undo('marquise', 1), false)
    const { actor } = reversible(r)
    const u = r.message(actor); assert.ok(u.type === 'update')
    const next = u.legal.find(a => a.type === 'end-step'); assert.ok(next)
    assert.ok(r.submit(actor, 'next', u.view.revision, next).ok)
    const after = r.message(actor); assert.ok(after.type === 'update')
    assert.equal(after.canUndo, false)
  } finally { r.close() }
})

test('chat validates messages, persists and never changes game revision', () => {
  const r = room()
  try {
    assert.equal(r.chat('marquise', '  '), false)
    assert.equal(r.chat('marquise', 'x'.repeat(501)), false)
    assert.equal(r.chat('marquise', {}), false)
    assert.equal(r.chat('vagabond', 'no seat'), false)
    assert.equal(r.chat('marquise', '  Chào bạn  '), true)
    assert.equal(r.chat('marquise', 'spam'), false)
    const m = r.message(null); assert.ok(m.type === 'update')
    assert.equal(m.chat[0]!.text, 'Chào bạn')
    assert.equal(m.view.revision, 0)
    assert.equal(m.canUndo, false)
    const loaded = new Room(structuredClone(r.saved), () => {}, { turnSeconds: 0 })
    try { const n = loaded.message(null); assert.ok(n.type === 'update'); assert.deepEqual(n.chat, m.chat) } finally { loaded.close() }
  } finally { r.close() }
})

test('battle clears any previous undo point, even before the dice are rolled', () => {
  const r = room()
  try {
    const { actor } = reversible(r)
    const clearing = r.state.map.clearings.find(c => (c.warriors.marquise ?? 0) > 0)!
    clearing.warriors.eyrie = 1
    const m = r.message(actor); assert.ok(m.type === 'update')
    const battle = m.legal.find(a => a.type === 'battle'); assert.ok(battle, JSON.stringify({ actor, turn: r.state.turn, legal: m.legal }))
    assert.ok(r.submit(actor, 'battle', m.view.revision, battle).ok)
    const n = r.message(actor); assert.ok(n.type === 'update')
    assert.equal(n.canUndo, false)
    assert.equal(r.undo(actor, n.view.revision), false)
  } finally { r.close() }
})

test('Charismatic recruiting its last warrior triggers turmoil and cannot be undone', () => {
  const r = room()
  try {
    reversible(r)
    const e = r.state.factions.eyrie!
    e.leader = 'charismatic'
    e.decree = { recruit: [{ kind: 'vizier', index: 0 }], move: [], battle: [], build: [] }
    e.resolved = { recruit: [], move: [], battle: [], build: [] }
    e.warriorSupply = 1
    at(r.state, 'eyrie', 'decree')
    const m = r.message('eyrie'); assert.ok(m.type === 'update')
    const recruit = m.legal.find(a => a.type === 'eyrie-recruit'); assert.ok(recruit)
    assert.ok(r.submit('eyrie', 'turmoil', m.view.revision, recruit).ok)
    assert.equal(r.state.turn.step, 'depose')
    const n = r.message('eyrie'); assert.ok(n.type === 'update')
    assert.equal(n.canUndo, false)
    assert.equal(r.undo('eyrie', n.view.revision), false)
    assert.equal(r.undo('marquise', n.view.revision), false)
  } finally { r.close() }
})

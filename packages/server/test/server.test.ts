import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { WebSocket } from 'ws'
import { GAME_GONE, type CreateGameResponse, type ServerMessage } from '../src/protocol.ts'
import { Room, type SavedGame } from '../src/room.ts'
import { startServer } from '../src/server.ts'
import { Store } from '../src/store.ts'
import { currentActor, legalActions } from '@root/game-engine'

const allBots = { seats: (['marquise', 'eyrie', 'alliance', 'vagabond'] as const).map(faction => ({ faction, kind: 'bot' as const, bot: 'simple' })) }

test('an all-bot game runs to the end and reloads from its record to the same state', () => {
  let saved: SavedGame | null = null
  const room = Room.create(allBots, g => { saved = structuredClone(g) }, { botDelayMs: 0 })
  for (let i = 0; i < 5000 && room.botStep(); i++);
  assert.ok(room.state.winner)
  const again = new Room(saved!, () => {}, { botDelayMs: 0 })
  assert.deepEqual(again.state, room.state)
})

test('seat tokens map to seats; spectators see no hand and no legal actions; bots are never driven by clients', () => {
  const room = Room.create({ seats: [{ faction: 'marquise', kind: 'human', name: 'An' }, { faction: 'eyrie', kind: 'bot' }] }, () => {}, { botDelayMs: 0 })
  const token = room.saved.seats[0]!.token!
  assert.equal(room.seatFor(token), 'marquise')
  assert.equal(room.seatFor('nope'), null)
  assert.equal(room.saved.seats[1]!.token, null, 'bot seats have no token')
  const spectator = room.message(null)
  assert.ok(spectator.type === 'update' && spectator.view.hand.length === 0 && spectator.legal.length === 0)
  const own = room.message('marquise')
  assert.ok(own.type === 'update' && own.view.hand.length === 5) // Advanced Setup draws five (A.7, decisions/0006)
})

test('a command from the wrong seat or with a stale revision is rejected and changes nothing', () => {
  const room = Room.create({ seats: [{ faction: 'marquise', kind: 'human' }, { faction: 'eyrie', kind: 'human' }] }, () => {}, { botDelayMs: 0, turnSeconds: 0 })
  const before = room.state
  const first = currentActor(room.state)! // Advanced Setup starts with the last seat in turn order (A.8.3)
  const other = first === 'marquise' ? 'eyrie' : 'marquise'
  const legal = room.message(first)
  assert.ok(legal.type === 'update' && legal.legal.length > 0)
  const wrong = room.submit(other, 'x1', 0, legal.legal[0]!)
  assert.equal(wrong.ok, false)
  const stale = room.submit(first, 'x2', 99, legal.legal[0]!)
  assert.ok(!stale.ok && stale.code === 'stale-revision')
  assert.equal(room.state, before)
  assert.ok(room.submit(first, 'x3', 0, legal.legal[0]!).ok)
  assert.equal(room.saved.record.commands.length, 1)
  room.close()
})

test('a human who runs out of time gets one decision made by a bot, then the clock restarts', async () => {
  const room = Room.create({ seats: [{ faction: 'marquise', kind: 'human' }, { faction: 'eyrie', kind: 'human' }] }, () => {}, { botDelayMs: 0, turnSeconds: 0.05 })
  const unsubscribe = room.subscribe(null, () => {}) // the clock starts once someone is connected or a command lands
  assert.ok(room.deadline !== null)
  const msg = room.message(null)
  assert.ok(msg.type === 'update' && msg.deadline === room.deadline)
  await new Promise(r => setTimeout(r, 700)) // the timeout bot thinks for 0.3 s
  assert.ok(room.saved.record.commands.length >= 1)
  assert.ok(room.saved.record.commands[0]!.command.actionId.startsWith('timeout-'))
  unsubscribe()
  room.close()
})

test('scheduled bot moves run in a worker thread: the server keeps answering while a bot searches', async () => {
  const room = Room.create({ seats: (['marquise', 'eyrie'] as const).map(faction => ({ faction, kind: 'bot' as const, bot: 'search-fast' })) }, () => {}, { botDelayMs: 0 })
  let last = Date.now(), worstGap = 0
  const tick = setInterval(() => { const now = Date.now(); worstGap = Math.max(worstGap, now - last); last = now }, 10)
  const unsubscribe = room.subscribe(null, () => {})
  await new Promise(r => setTimeout(r, 2500))
  clearInterval(tick)
  unsubscribe()
  room.close()
  assert.ok(room.saved.record.commands.length >= 2, `bots moved (${room.saved.record.commands.length})`)
  assert.ok(worstGap < 150, `the main thread was blocked for ${worstGap} ms`)
})

test('a timeout decision that arrives after the human already acted is dropped', async () => {
  let release: () => void = () => {}
  const slow = (job: { legal: unknown[] }) => new Promise<number>(r => { release = () => r(job.legal.length - 1) })
  const room = Room.create({ seats: [{ faction: 'marquise', kind: 'human' }, { faction: 'eyrie', kind: 'human' }] }, () => {}, { botDelayMs: 0, turnSeconds: 0.02, thinker: slow })
  const unsubscribe = room.subscribe(null, () => {})
  await new Promise(r => setTimeout(r, 60)) // the clock ran out; the stand-in bot is thinking
  const revision = room.state.meta.revision
  const first = currentActor(room.state)! // Advanced Setup starts with the last seat in turn order (A.8.3)
  const own = legalActions(room.state, first)[0]!
  assert.ok(room.submit(first, 'human-1', revision, own).ok)
  release()
  await new Promise(r => setTimeout(r, 20))
  unsubscribe()
  room.close()
  assert.deepEqual(room.saved.record.commands.map(c => c.command.actionId), ['human-1'])
})

test('HTTP + WebSocket: create a game, join a seat, act, and see the update; the game file is saved', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'root-server-'))
  const server = startServer({ port: 0, host: '127.0.0.1', dataDir, botDelayMs: 0 })
  await new Promise(r => server.http.once('listening', r))
  const port = (server.http.address() as { port: number }).port
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/games`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ seats: [{ faction: 'marquise', kind: 'human', name: 'An' }, { faction: 'eyrie', kind: 'bot', bot: 'random' }] }),
    })
    assert.equal(res.status, 201)
    const game = (await res.json()) as CreateGameResponse
    const token = game.links.find(l => l.faction === 'marquise')!.token!
    const bad = await fetch(`http://127.0.0.1:${port}/api/games`, { method: 'POST', body: JSON.stringify({ seats: [{ faction: 'alliance', kind: 'bot' }, { faction: 'vagabond', kind: 'bot' }] }) })
    assert.equal(bad.status, 400, 'Reach too low (decision 0003)')

    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?game=${game.id}&token=${token}`)
    const messages: ServerMessage[] = []
    const next = (pred: (m: ServerMessage) => boolean) => new Promise<ServerMessage>(resolve => {
      const hit = messages.find(pred); if (hit) return resolve(hit)
      const on = (raw: unknown) => { const m = JSON.parse(String(raw)) as ServerMessage; if (pred(m)) { ws.off('message', on); resolve(m) } }
      ws.on('message', on)
    })
    ws.on('message', raw => messages.push(JSON.parse(String(raw))))
    const first = await next(m => m.type === 'update' && m.legal.length > 0)
    assert.ok(first.type === 'update' && first.seat === 'marquise')
    ws.send(JSON.stringify({ type: 'command', actionId: 'c1', expectedRevision: first.view.revision, action: first.legal[0] }))
    const after = await next(m => m.type === 'update' && m.view.revision > first.view.revision)
    assert.ok(after.type === 'update')
    ws.close()
    assert.ok(readdirSync(dataDir).includes(`${game.id}.json`))
  } finally {
    await server.close()
  }
})

test('room password guards listing, creating and watching; seat links still work; unfinished games are capped', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'root-server-'))
  const server = startServer({ port: 0, host: '127.0.0.1', dataDir, botDelayMs: 0, turnSeconds: 0, password: 'lan-key', maxGames: 1 })
  await new Promise(r => server.http.once('listening', r))
  const base = `http://127.0.0.1:${(server.http.address() as { port: number }).port}`
  try {
    assert.deepEqual(await (await fetch(`${base}/api/config`)).json(), { passwordRequired: true, turnSeconds: 0 })
    assert.equal((await fetch(`${base}/api/games`)).status, 401)
    assert.equal((await fetch(`${base}/api/games`, { headers: { 'x-room-key': 'wrong' } })).status, 401)
    const create = () => fetch(`${base}/api/games`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-room-key': 'lan-key' },
      body: JSON.stringify({ seats: [{ faction: 'marquise', kind: 'human' }, { faction: 'eyrie', kind: 'human' }] }),
    })
    const first = await create()
    assert.equal(first.status, 201)
    assert.equal((await create()).status, 429, 'one unfinished game at most')
    const game = (await first.json()) as CreateGameResponse
    const open = (q: string) => new Promise<ServerMessage>(resolve => {
      const ws = new WebSocket(`${base.replace('http', 'ws')}/ws?game=${game.id}${q}`)
      ws.once('message', raw => { resolve(JSON.parse(String(raw))); ws.close() })
    })
    assert.equal((await open('')).type, 'error', 'spectator without the key')
    assert.equal((await open('&key=lan-key')).type, 'update')
    const seat = await open(`&token=${game.links[0]!.token}`)
    assert.ok(seat.type === 'update' && seat.seat !== null, 'a seat link needs no key')
  } finally {
    await server.close()
  }
})

test('DELETE /api/games: finished games only, then all; open sockets are told and closed; files go; a restart loads nothing', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'root-server-'))
  const finished = Room.create(allBots, new Store(dataDir).save, { botDelayMs: 0 })
  for (let i = 0; i < 5000 && finished.botStep(); i++);
  assert.ok(finished.state.winner)
  const server = startServer({ port: 0, host: '127.0.0.1', dataDir, botDelayMs: 0, turnSeconds: 0, password: 'lan-key' })
  await new Promise(r => server.http.once('listening', r))
  const base = `http://127.0.0.1:${(server.http.address() as { port: number }).port}`
  const headers = { 'x-room-key': 'lan-key', 'content-type': 'application/json' }
  const list = async () => ((await (await fetch(`${base}/api/games`, { headers })).json()) as { id: string }[]).map(g => g.id)
  try {
    const res = await fetch(`${base}/api/games`, { method: 'POST', headers, body: JSON.stringify({ seats: [{ faction: 'marquise', kind: 'human', name: 'An' }, { faction: 'eyrie', kind: 'bot', bot: 'random' }] }) })
    const live = (await res.json()) as CreateGameResponse
    const token = live.links.find(l => l.faction === 'marquise')!.token!
    assert.deepEqual((await list()).sort(), [finished.id, live.id].sort())

    // Invalid: no password, or no/unknown scope. Nothing is deleted.
    assert.equal((await fetch(`${base}/api/games?scope=all`, { method: 'DELETE' })).status, 401)
    assert.equal((await fetch(`${base}/api/games`, { method: 'DELETE', headers })).status, 400)
    assert.equal((await fetch(`${base}/api/games?scope=everything`, { method: 'DELETE', headers })).status, 400)
    assert.equal((await list()).length, 2)

    // Finished only: the running game and its file stay.
    const one = await fetch(`${base}/api/games?scope=finished`, { method: 'DELETE', headers })
    assert.equal(one.status, 200)
    assert.deepEqual(await one.json(), { deleted: [finished.id] })
    assert.deepEqual(await list(), [live.id])
    assert.deepEqual(readdirSync(dataDir), [`${live.id}.json`])

    // All, while a player is connected: they get an error, the socket closes, and the game no longer accepts commands.
    const ws = new WebSocket(`${base.replace('http', 'ws')}/ws?game=${live.id}&token=${token}`)
    const messages: ServerMessage[] = []
    ws.on('message', raw => messages.push(JSON.parse(String(raw))))
    const closed = new Promise<number>(r => ws.once('close', code => r(code)))
    await new Promise<void>(r => { const t = setInterval(() => { if (messages.some(m => m.type === 'update')) { clearInterval(t); r() } }, 10) })
    const room = server.rooms.get(live.id)!
    const all = await fetch(`${base}/api/games?scope=all`, { method: 'DELETE', headers })
    assert.deepEqual(await all.json(), { deleted: [live.id] })
    assert.equal(await closed, GAME_GONE, 'browsers stop reconnecting on this code')
    assert.ok(messages.some(m => m.type === 'error' && m.message.includes('xoá')))
    const update = messages.find(m => m.type === 'update')!
    assert.ok(update.type === 'update')
    const late = room.submit('marquise', 'late', update.view.revision, update.legal[0] ?? { type: 'pass', payload: {} } as never)
    assert.equal(late.ok, false)
    assert.deepEqual(await list(), [])
    assert.deepEqual(readdirSync(dataDir), [])
    const gone = new WebSocket(`${base.replace('http', 'ws')}/ws?game=${live.id}&token=${token}`)
    assert.equal(await new Promise<number>(r => gone.once('close', code => r(code))), GAME_GONE)
    assert.equal((await fetch(`${base}/api/games?scope=all`, { method: 'DELETE', headers }).then(r => r.json()) as { deleted: string[] }).deleted.length, 0)
  } finally {
    await server.close()
  }
  const again = startServer({ port: 0, host: '127.0.0.1', dataDir, botDelayMs: 0 })
  await new Promise(r => again.http.once('listening', r))
  assert.equal(again.rooms.size, 0)
  await again.close()
})

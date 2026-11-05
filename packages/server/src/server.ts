import { timingSafeEqual } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { factionMixAllowed, type FactionId } from '@root/game-engine'
import { WebSocketServer, type WebSocket } from 'ws'
import { GAME_GONE, type ClearGamesResponse, type ClientMessage, type CreateGameRequest, type CreateGameResponse } from './protocol.ts'
import { Room, type RoomOptions } from './room.ts'
import { Store } from './store.ts'

export interface ServerOptions {
  port: number
  host: string
  dataDir: string
  /** Built client (packages/client/dist); served if it exists. */
  staticDir?: string
  botDelayMs?: number
  /** Seconds a human has per decision before a bot decides for them; 0 turns the clock off. */
  turnSeconds?: number
  /** When set, listing, creating and watching games need this key; seat links work on their own token. */
  password?: string
  /** Most unfinished games at once. */
  maxGames?: number
}

const FACTIONS: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' }

/** HTTP for the lobby and static files, one WebSocket per seat or spectator for play. LAN only, no accounts. */
export function startServer(opts: ServerOptions) {
  const store = new Store(opts.dataDir)
  const rooms = new Map<string, Room>()
  /** Open WebSockets per game, so deleting a game can close them. */
  const sockets = new Map<string, Set<WebSocket>>()
  const roomOpts: RoomOptions = { ...(opts.botDelayMs !== undefined && { botDelayMs: opts.botDelayMs }), ...(opts.turnSeconds !== undefined && { turnSeconds: opts.turnSeconds }) }
  const maxGames = opts.maxGames ?? 20
  for (const saved of store.loadAll()) {
    try { rooms.set(saved.id, new Room(saved, store.save, roomOpts)) } catch (e) { console.error(`skip game ${saved.id}: ${(e as Error).message}`) }
  }

  /** Constant-time key check; always true when no password is set. */
  const keyOk = (key: string | null | undefined) => {
    if (!opts.password) return true
    const a = Buffer.from(key ?? ''), b = Buffer.from(opts.password)
    return a.length === b.length && timingSafeEqual(a, b)
  }

  /**
   * Deletes finished games, or every game. A deleted game stops its bots and clock, its players and spectators get an
   * error and are disconnected, and its file is removed. Cannot be undone; the lobby asks first.
   */
  function clearGames(scope: string): string[] {
    const doomed = [...rooms.values()].filter(r => scope === 'all' || !!r.state.winner)
    for (const room of doomed) {
      room.close()
      rooms.delete(room.id)
      for (const ws of sockets.get(room.id) ?? []) {
        ws.send(JSON.stringify({ type: 'error', message: 'Trận này đã bị xoá khỏi máy chủ.' }))
        ws.close(GAME_GONE, 'game deleted')
      }
      sockets.delete(room.id)
      store.remove(room.id)
    }
    return doomed.map(r => r.id)
  }

  const json = (res: ServerResponse, code: number, body: unknown) => {
    res.writeHead(code, { 'content-type': 'application/json' })
    res.end(JSON.stringify(body))
  }

  async function readBody(req: IncomingMessage): Promise<unknown> {
    let data = ''
    for await (const chunk of req) { data += chunk; if (data.length > 1e5) throw new Error('body too large') }
    return JSON.parse(data || '{}')
  }

  function validCreate(body: unknown): body is CreateGameRequest {
    const seats = (body as CreateGameRequest)?.seats
    if (!Array.isArray(seats)) return false
    if (!seats.every(s => FACTIONS.includes(s.faction) && (s.kind === 'human' || s.kind === 'bot'))) return false
    return factionMixAllowed(seats.map(s => s.faction))
  }

  const http = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://local')
    try {
      if (url.pathname === '/api/config') return json(res, 200, { passwordRequired: !!opts.password, turnSeconds: opts.turnSeconds ?? 90 })
      if (url.pathname.startsWith('/api/') && !keyOk(req.headers['x-room-key'] as string | undefined)) return json(res, 401, { error: 'wrong or missing room password' })
      if (url.pathname === '/api/games' && req.method === 'GET') return json(res, 200, [...rooms.values()].map(r => r.summary()))
      if (url.pathname === '/api/games' && req.method === 'POST') {
        const body = await readBody(req)
        if (!validCreate(body)) return json(res, 400, { error: 'invalid seats or faction mix (Reach, decision 0003)' })
        if ([...rooms.values()].filter(r => !r.state.winner).length >= maxGames) return json(res, 429, { error: `at most ${maxGames} unfinished games` })
        const room = Room.create(body, store.save, roomOpts)
        rooms.set(room.id, room)
        const out: CreateGameResponse = { id: room.id, links: room.saved.seats.map(s => ({ faction: s.faction, token: s.token })) }
        return json(res, 201, out)
      }
      if (url.pathname === '/api/games' && req.method === 'DELETE') {
        const scope = url.searchParams.get('scope')
        if (scope !== 'finished' && scope !== 'all') return json(res, 400, { error: 'scope must be finished or all' })
        const out: ClearGamesResponse = { deleted: clearGames(scope) }
        return json(res, 200, out)
      }
      if (opts.staticDir && req.method === 'GET') {
        const path = normalize(join(opts.staticDir, url.pathname === '/' ? 'index.html' : url.pathname))
        if (path.startsWith(normalize(opts.staticDir)) && existsSync(path) && statSync(path).isFile()) {
          res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' })
          return res.end(readFileSync(path))
        }
        const index = join(opts.staticDir, 'index.html')
        if (existsSync(index)) { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(readFileSync(index)) }
      }
      json(res, 404, { error: 'not found' })
    } catch (e) {
      json(res, 400, { error: (e as Error).message })
    }
  })

  const wss = new WebSocketServer({ server: http, path: '/ws' })
  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url ?? '/', 'http://local')
    const room = rooms.get(url.searchParams.get('game') ?? '')
    if (!room) { ws.send(JSON.stringify({ type: 'error', message: 'Không có trận này trên máy chủ (có thể đã bị xoá).' })); ws.close(GAME_GONE, 'no such game'); return }
    const token = url.searchParams.get('token')
    const seat = room.seatFor(token)
    if (token && !seat) { ws.send(JSON.stringify({ type: 'error', message: 'unknown seat token' })); ws.close(); return }
    if (!seat && !keyOk(url.searchParams.get('key'))) { ws.send(JSON.stringify({ type: 'error', message: 'room password required to watch' })); ws.close(); return }
    const unsubscribe = room.subscribe(seat, msg => ws.send(JSON.stringify(msg)))
    const open = sockets.get(room.id) ?? new Set<WebSocket>()
    sockets.set(room.id, open.add(ws))
    ws.on('message', raw => {
      let msg: ClientMessage
      try { msg = JSON.parse(String(raw)) } catch { return }
      if (!msg || !seat) return
      if (msg.type === 'chat') {
        if (!room.chat(seat, msg.text)) ws.send(JSON.stringify({ type: 'error', message: 'Tin nhắn cần 1–500 ký tự; vui lòng chờ một chút giữa hai tin.' }))
        return
      }
      if (msg.type === 'undo') {
        if (!room.undo(seat, msg.expectedRevision)) ws.send(JSON.stringify({ type: 'error', message: 'Không thể Undo hành động này.' }))
        return
      }
      if (msg.type !== 'command') return
      const result = room.submit(seat, String(msg.actionId), Number(msg.expectedRevision), msg.action)
      if (!result.ok) ws.send(JSON.stringify({ type: 'rejected', actionId: msg.actionId, result }))
    })
    ws.on('close', () => { unsubscribe(); open.delete(ws) })
  })

  http.listen(opts.port, opts.host)
  return {
    http, rooms,
    close: () => new Promise<void>(done => { for (const r of rooms.values()) r.close(); wss.close(); http.close(() => done()) }),
  }
}

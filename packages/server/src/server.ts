import { existsSync, readFileSync, statSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { factionMixAllowed, type FactionId } from '@root/game-engine'
import { WebSocketServer, type WebSocket } from 'ws'
import type { ClientMessage, CreateGameRequest, CreateGameResponse } from './protocol.ts'
import { Room } from './room.ts'
import { Store } from './store.ts'

export interface ServerOptions {
  port: number
  host: string
  dataDir: string
  /** Built client (packages/client/dist); served if it exists. */
  staticDir?: string
  botDelayMs?: number
}

const FACTIONS: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' }

/** HTTP for the lobby and static files, one WebSocket per seat or spectator for play. LAN only, no accounts. */
export function startServer(opts: ServerOptions) {
  const store = new Store(opts.dataDir)
  const rooms = new Map<string, Room>()
  for (const saved of store.loadAll()) {
    try { rooms.set(saved.id, new Room(saved, store.save, opts.botDelayMs)) } catch (e) { console.error(`skip game ${saved.id}: ${(e as Error).message}`) }
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
      if (url.pathname === '/api/games' && req.method === 'GET') return json(res, 200, [...rooms.values()].map(r => r.summary()))
      if (url.pathname === '/api/games' && req.method === 'POST') {
        const body = await readBody(req)
        if (!validCreate(body)) return json(res, 400, { error: 'invalid seats or faction mix (Reach, decision 0003)' })
        const room = Room.create(body, store.save, opts.botDelayMs)
        rooms.set(room.id, room)
        const out: CreateGameResponse = { id: room.id, links: room.saved.seats.map(s => ({ faction: s.faction, token: s.token })) }
        return json(res, 201, out)
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
    if (!room) { ws.send(JSON.stringify({ type: 'error', message: 'no such game' })); ws.close(); return }
    const token = url.searchParams.get('token')
    const seat = room.seatFor(token)
    if (token && !seat) { ws.send(JSON.stringify({ type: 'error', message: 'unknown seat token' })); ws.close(); return }
    const unsubscribe = room.subscribe(seat, msg => ws.send(JSON.stringify(msg)))
    ws.on('message', raw => {
      let msg: ClientMessage
      try { msg = JSON.parse(String(raw)) } catch { return }
      if (msg.type !== 'command' || !seat) return
      const result = room.submit(seat, String(msg.actionId), Number(msg.expectedRevision), msg.action)
      if (!result.ok) ws.send(JSON.stringify({ type: 'rejected', actionId: msg.actionId, result }))
    })
    ws.on('close', unsubscribe)
  })

  http.listen(opts.port, opts.host)
  return {
    http, rooms,
    close: () => new Promise<void>(done => { for (const r of rooms.values()) r.close(); wss.close(); http.close(() => done()) }),
  }
}

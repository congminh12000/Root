import type { Action, FactionId, PlayerView } from '@root/game-engine'
import type { LogEntry } from '../motion.ts'

/** What the server pushes over the game WebSocket (docs/05-product-spec/multiplayer.md). */
export interface Seat { faction: FactionId; kind: string; name: string; connected: boolean }
export interface Update {
  type: 'update'; gameId: string; seat: FactionId | null; view: PlayerView; legal: Action[]
  seats: Seat[]
  log: LogEntry[]
  deadline: number | null
  now: number
}
export type Message = Update | { type: 'rejected'; actionId: string; result: { code: string; message: string } } | { type: 'error'; message: string }

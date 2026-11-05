import type { Action, FactionId, PlayerView } from '@root/game-engine'
import type { LogEntry } from '../motion.ts'

/** What the server pushes over the game WebSocket (docs/05-product-spec/multiplayer.md). */
export interface Seat { faction: FactionId; kind: string; name: string; connected: boolean }
export interface ChatEntry { faction: FactionId; text: string; at: number }

export interface Update {
  type: 'update'; gameId: string; seat: FactionId | null; view: PlayerView; legal: Action[]
  seats: Seat[]
  log: LogEntry[]; chat: ChatEntry[]; canUndo: boolean
  deadline: number | null
  now: number
}
/** Server closes with this code when the game does not exist or was deleted (multiplayer.md); do not reconnect. */
export const GAME_GONE = 4404

export type Message = Update | { type: 'rejected'; actionId: string; result: { code: string; message: string } } | { type: 'error'; message: string }

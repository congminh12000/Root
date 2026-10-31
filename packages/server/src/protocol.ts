import type { Action, CommandResult, FactionId, PlayerView } from '@root/game-engine'

/** Wire protocol between the server and browsers (docs/05-product-spec/multiplayer.md). JSON over one WebSocket. */

export interface SeatInfo {
  faction: FactionId
  kind: 'human' | 'bot'
  name: string
  connected: boolean
}

export interface LogEntry { revision: number; faction: FactionId; type: string; detail?: unknown }

export type ServerMessage =
  /** Sent on connect and after every accepted command. `legal` is empty unless this seat must act. */
  | { type: 'update'; gameId: string; seat: FactionId | null; view: PlayerView; legal: Action[]; seats: SeatInfo[]; log: LogEntry[] }
  | { type: 'rejected'; actionId: string; result: Extract<CommandResult, { ok: false }> }
  | { type: 'error'; message: string }

export type ClientMessage =
  /** The server fills playerId from the seat token; the client never names its player. */
  | { type: 'command'; actionId: string; expectedRevision: number; action: Action }

export interface GameSummary {
  id: string
  createdAt: string
  seats: SeatInfo[]
  turn: number
  winner: FactionId[] | null
}

export interface CreateGameRequest {
  seats: { faction: FactionId; kind: 'human' | 'bot'; name?: string; bot?: string }[]
}

/** Returned once at creation: the only time seat tokens leave the server. */
export interface CreateGameResponse {
  id: string
  links: { faction: FactionId; token: string | null }[]
}

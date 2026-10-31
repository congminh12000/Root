/**
 * The only way to change a game. A client sends intent; the server fills playerId from the session
 * and the engine accepts or rejects the command as a whole (no half-applied actions).
 */
export interface GameCommand {
  gameId: string
  /** Set by the server from the authenticated session, never copied from the client payload. */
  playerId: string
  /** Must equal GameState.meta.revision, or the command is rejected as stale. */
  expectedRevision: number
  /** Client-generated id, so a retried send after reconnect is applied at most once. */
  actionId: string
  type: string
  payload: unknown
}

export type CommandResult =
  | { ok: true; revision: number; duplicate?: true }
  | { ok: false; code: 'wrong-game' | 'unknown-player' | 'stale-revision' | 'game-over' | 'not-your-turn' | 'illegal-action'; message: string }

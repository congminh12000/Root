/** Lobby "delete games" buttons: which games each choice removes and what the confirmation says. No rules here. */

export type ClearScope = 'finished' | 'all'

interface GameLike { winner: unknown[] | null; seats: { kind: string; connected: boolean }[] }

/** Games the server will delete for this choice (same filter as `DELETE /api/games`). */
export const clearTargets = <G extends GameLike>(games: G[], scope: ClearScope): G[] =>
  scope === 'all' ? games : games.filter(g => !!g.winner)

/** Text for the confirmation box, or null when there is nothing to delete. */
export function clearPrompt(games: GameLike[], scope: ClearScope): string | null {
  const doomed = clearTargets(games, scope)
  if (!doomed.length) return null
  const running = doomed.filter(g => !g.winner)
  const online = running.filter(g => g.seats.some(s => s.kind === 'human' && s.connected)).length
  const what = scope === 'all' ? (doomed.length > 1 ? `tất cả ${doomed.length} trận` : '1 trận') : `${doomed.length} trận đã kết thúc`
  const warn = running.length
    ? ` Trong đó ${running.length} trận đang chơi dở${online ? `, ${online} trận có người đang kết nối (sẽ bị ngắt)` : ''}.`
    : ''
  return `Xoá ${what} khỏi máy chủ?${warn} Không thể hoàn tác.`
}

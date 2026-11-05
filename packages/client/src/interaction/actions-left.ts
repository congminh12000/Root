import type { PlayerView } from '@root/game-engine'

/**
 * Marquise Daylight actions still to take (ROOT-6.5: three, plus one per bird card spent), read from the public
 * Marquise board in `PlayerView` (`actionsRemaining`, kept by the engine). The client only shows the number; it never
 * counts actions itself.
 *
 * Shown only while the Marquise takes its turn in the Daylight `actions` step: the engine sets the count to three when
 * that step begins, so before it (Birdsong, the craft step) the stored value is stale. Every seat and spectators see
 * it, since the Marquise board is public.
 */
export function marquiseActionsLeft(v: PlayerView): number | null {
  if (v.winner) return null
  const board = v.factions.marquise
  if (!board) return null
  if (v.seats[v.turn.seat]?.faction !== 'marquise') return null
  if (v.turn.phase !== 'daylight' || v.turn.step !== 'actions') return null
  return Math.max(0, board.actionsRemaining)
}

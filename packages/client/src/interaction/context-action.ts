import type { Action, PlayerView } from '@root/game-engine'

/** RD-M07: presentation only. Always return the original legal action, never fabricate a command. */
export function contextAction(legal: Action[], view?: PlayerView, cancelling = false): {
  label: string; action: Action | null; cancel: boolean
} {
  if (cancelling) return { label: 'Huỷ', action: null, cancel: true }
  const march = legal.find(a => a.type === 'marquise-end-march')
  if (march) return { label: 'Dừng March', action: march, cancel: false }
  const action = legal.find(a => a.type === 'end-step') ?? null
  const evening = action && view?.stage === 'play' && !view.winner
    && view.seats[view.turn.seat]?.faction === 'marquise'
    && view.turn.phase === 'daylight' && view.turn.step === 'actions'
  return { label: evening ? 'Sang Evening' : 'Tiếp tục', action, cancel: false }
}

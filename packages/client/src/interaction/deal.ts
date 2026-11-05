import { signal } from '@preact/signals'
import type { FactionId, PlayerView } from '@root/game-engine'

/**
 * Opening deal, client side only. The engine has already dealt the starting hands in seating order (§5.1.3, create.ts);
 * this just replays it on screen, one card at a time round the table from the first seat, like Root Digital's start.
 */
export interface DealStep { faction: FactionId; /** This faction's nth card (0-based), so own cards match `view.hand[nth]`. */ nth: number }

export const DEAL_GAP_MS = 160
export const DEAL_FLY_MS = 750
/** The map fades in first; dealing starts once it is mostly there. */
export const DEAL_START_MS = 700

/** Round-robin order: one card to each seat in turn, starting with the first seat, until every hand is full. */
export function dealPlan(order: FactionId[], counts: Partial<Record<FactionId, number>>): DealStep[] {
  const most = Math.max(0, ...order.map(f => counts[f] ?? 0))
  const steps: DealStep[] = []
  for (let nth = 0; nth < most; nth++) for (const f of order) if ((counts[f] ?? 0) > nth) steps.push({ faction: f, nth })
  return steps
}

/** Deal only while the game is still in setup, so joining or reloading mid-game does not replay it. */
export function shouldDeal(view: Pick<PlayerView, 'stage'>): boolean {
  return view.stage === 'setup'
}

/** Own cards already landed in the hand during the deal; null when no deal is running (whole hand shown). */
export const dealShown = signal<number | null>(null)

/** Hand slot class for card `i` while dealing: still on its way, or the one that just landed. */
export function dealSlotClass(i: number, shown: number | null): string {
  if (shown === null) return ''
  return i >= shown ? ' deal-wait' : i === shown - 1 ? ' deal-land' : ''
}

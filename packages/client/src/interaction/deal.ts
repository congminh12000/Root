import { signal } from '@preact/signals'
import type { FactionId, PlayerView } from '@root/game-engine'

/**
 * Cards leaving the shared deck, client side only. The deck sits off the right edge of the screen: the opening deal
 * and every later draw fly in from there. Opponents' cards go face down to their badges; your own fly face up into
 * your hand. The engine has already moved the cards; this only shows it, from public data.
 */
export interface DealStep { faction: FactionId; /** This faction's nth card (0-based), so own cards match `view.hand[nth]`. */ nth: number }
/** One card off the deck: to whom, and which card when it is yours (null: face down). */
export interface Draw { faction: FactionId; card: string | null }

export const DEAL_GAP_MS = 160
export const DEAL_FLY_MS = 750
/** The map fades in first; dealing starts once it is mostly there. */
export const DEAL_START_MS = 700

/** Round-robin order: one card to each seat in turn, starting with the first seat (§5.1.3), until every hand is full. */
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

type DrawView = Pick<PlayerView, 'self' | 'deckCount' | 'hand' | 'handCounts' | 'supporterCount' | 'seats' | 'turn'>

/**
 * Cards drawn from the deck between two views. The deck count says how many left it; hand and supporter counts say
 * who gained cards (§2.1 draws, §8 supporters drawn for the Alliance). Cards gained without the deck shrinking
 * (taken from a player or a Dominance card) are not draws. Gains are filled from the turn owner first, then in seat
 * order. When the deck ran out and the discard was shuffled in (§2.1) the count is lost, so every gain counts.
 * Your own drawn cards are the newest ones in your hand.
 */
export function drawsBetween(prev: DrawView, next: DrawView): Draw[] {
  const reshuffled = next.deckCount > prev.deckCount
  let left = reshuffled ? Infinity : prev.deckCount - next.deckCount
  if (left <= 0) return []
  const order = next.seats.map(s => s.faction)
  const owner = order[next.turn.seat]
  const ranked = owner ? [owner, ...order.filter(f => f !== owner)] : order
  const out: Draw[] = []
  for (const f of ranked) {
    const gain = Math.max(0, (next.handCounts[f] ?? 0) - (prev.handCounts[f] ?? 0))
      + (f === 'alliance' ? Math.max(0, next.supporterCount - prev.supporterCount) : 0)
    const n = Math.min(gain, left)
    if (!n) continue
    left -= n
    const fresh = f === next.self ? newCards(prev.hand, next.hand).slice(-n) : []
    for (let i = 0; i < n; i++) out.push({ faction: f, card: fresh[i - (n - fresh.length)] ?? null })
  }
  return out
}

/** Cards in `next` that `prev` did not hold. Card ids are unique (`name#n`). */
function newCards(prev: string[], next: string[]): string[] {
  const had = new Set(prev)
  return next.filter(c => !had.has(c))
}

/** Own cards still flying to the hand (their slots wait empty), and the one that just landed. */
export const handIncoming = signal<ReadonlySet<string>>(new Set())
export const handLanded = signal<string | null>(null)

/** Hand slot class for `card`: still on its way, or just set down. */
export function handSlotClass(card: string, incoming: ReadonlySet<string>, landed: string | null): string {
  return incoming.has(card) ? ' deal-wait' : card === landed ? ' deal-land' : ''
}

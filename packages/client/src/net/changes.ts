import type { FactionId, LastRoll, PlayerView } from '@root/game-engine'
import { freshRoll, travelsSince, type Travel } from '../motion.ts'
import type { Update } from './types.ts'

/** What one update changed, to animate once: clearings, scores, moves along paths and a fresh battle roll. */
export interface Changes { seq: number; changed: number[]; scored: FactionId[]; travels: Travel[]; roll: LastRoll | null }

export const NO_CHANGES: Changes = { seq: 0, changed: [], scored: [], travels: [], roll: null }

/** `seq` grows with every update, so a view that re-renders for another reason does not replay the animations. */
export function changesBetween(prev: Update | null, next: Update, seq: number): Changes {
  if (!prev) return { ...NO_CHANGES, seq }
  return {
    seq,
    changed: changedClearings(prev.view, next.view),
    scored: (Object.keys(next.view.score) as FactionId[]).filter(f => next.view.score[f] !== prev.view.score[f]),
    travels: travelsSince(prev.view, next.log),
    roll: freshRoll(prev.view, next.view),
  }
}

/** Clearings whose pieces differ between two views, including where the Vagabond pawn left or arrived. */
export function changedClearings(prev: PlayerView, next: PlayerView): number[] {
  const out = new Set<number>()
  next.map.clearings.forEach((c, i) => { if (JSON.stringify(c) !== JSON.stringify(prev.map.clearings[i])) out.add(i) })
  const a = prev.factions.vagabond?.pawn, b = next.factions.vagabond?.pawn
  if (JSON.stringify(a) !== JSON.stringify(b)) for (const p of [a, b]) if (p?.kind === 'clearing') out.add(p.id)
  return [...out].sort((x, y) => x - y)
}

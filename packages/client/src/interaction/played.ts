import type { FactionId } from '@root/game-engine'
import type { LogEntry } from '../motion.ts'

/** Log types whose public payload names a card a faction just put on the table. */
export const PLAYED_TYPES = ['craft', 'discard-card', 'eyrie-add-card', 'play-ambush', 'use-battle-card', 'activate-dominance'] as const

export interface PlayedCard { key: string; faction: FactionId; card: string }

/** Every publicly played card in log order, with a key stable across log trims (revision + same-revision count). */
export function playedCards(log: LogEntry[]): PlayedCard[] {
  const seen = new Map<string, number>()
  const out: PlayedCard[] = []
  for (const e of log) {
    const card = (e.detail as { card?: unknown } | undefined)?.card
    if (!(PLAYED_TYPES as readonly string[]).includes(e.type) || typeof card !== 'string') continue
    const base = `${e.revision}:${e.type}:${card}`
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    out.push({ key: `${base}:${n}`, faction: e.faction, card })
  }
  return out
}

/** Cards in `log` not in `known`, in play order; `known` gains their keys. */
export function newPlayed(log: LogEntry[], known: Set<string>): PlayedCard[] {
  const fresh = playedCards(log).filter(p => !known.has(p.key))
  for (const p of fresh) known.add(p.key)
  return fresh
}

/** How long a played card stays at full view, and how long it then fades. The next card waits for the hold. */
export const PLAYED_HOLD_MS = 1000
export const PLAYED_FADE_MS = 450

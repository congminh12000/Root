import { MIN_REACH, REACH } from '@root/game-data'
import type { FactionId } from './state.ts'

/**
 * Whether a faction mix may start a game: 2–4 distinct factions whose Reach adds up to the minimum for that
 * player count (Law §5.2). The Law only recommends this; decision 0003 makes it mandatory.
 */
export function factionMixAllowed(factions: readonly FactionId[]): boolean {
  if (factions.length < 2 || factions.length > 4 || new Set(factions).size !== factions.length) return false
  const total = factions.reduce((sum, f) => sum + REACH[f], 0)
  return total >= MIN_REACH[factions.length]!
}

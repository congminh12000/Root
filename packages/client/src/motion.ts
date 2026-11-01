import type { FactionId, LastRoll, PlayerView } from '@root/game-engine'

/** Where a moving piece starts or ends: a clearing, or a forest for the Vagabond (§9.2.6 slip). */
export interface Spot { kind: 'clearing' | 'forest'; id: number }
/** Pieces that went along one path with one command, for the board to slide from `from` to `to`. */
export interface Travel { faction: FactionId; from: Spot; to: Spot; count: number; pawn?: true }
export interface LogEntry { revision: number; faction: FactionId; type: string; detail?: unknown }

type MoveDetail = { from: number; to: number; warriors: number }
type VagabondDetail = { to: number | Spot; ally?: { faction: FactionId; warriors: number } }

/**
 * Moves made after `prev`, read from the public log only (the server logs move payloads for everyone). The
 * Vagabond's start is followed from the pawn in `prev`, since his commands name only where he goes.
 */
export function travelsSince(prev: PlayerView, log: LogEntry[]): Travel[] {
  const out: Travel[] = []
  let pawn: Spot | null = prev.factions.vagabond?.pawn ?? null
  for (const entry of log) {
    if (entry.revision <= prev.revision || !entry.detail) continue
    if (entry.type === 'move' || entry.type === 'eyrie-move') {
      const d = entry.detail as MoveDetail
      out.push({ faction: entry.faction, from: { kind: 'clearing', id: d.from }, to: { kind: 'clearing', id: d.to }, count: d.warriors })
    } else if (entry.type === 'vagabond-move' || entry.type === 'vagabond-slip') {
      const d = entry.detail as VagabondDetail
      const to: Spot = typeof d.to === 'number' ? { kind: 'clearing', id: d.to } : d.to
      if (pawn) {
        out.push({ faction: 'vagabond', from: pawn, to, count: 1, pawn: true })
        if (d.ally && d.ally.warriors > 0) out.push({ faction: d.ally.faction, from: pawn, to, count: d.ally.warriors })
      }
      pawn = to
    }
  }
  return out
}

/** The battle roll made since `prev`, if there was one. */
export function freshRoll(prev: PlayerView | null, next: PlayerView): LastRoll | null {
  const roll = next.lastRoll
  if (!roll || !prev) return null
  return roll.revision > prev.revision && roll.revision !== prev.lastRoll?.revision ? roll : null
}

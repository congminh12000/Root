import type { FactionId, PlayerView } from '@root/game-engine'

/**
 * RD-M12: what Root Digital keeps on opponents' portraits (docs/07-ui/root-digital/marquise.md §2): the Eyrie Decree
 * as four column counts, and the Vagabond's relationship with the viewer. Public board data only.
 */
export const DECREE_COLUMNS = [
  { column: 'recruit', icon: 'eyrie', label: 'Recruit' },
  { column: 'move', icon: 'boots', label: 'Move' },
  { column: 'battle', icon: 'sword', label: 'Battle' },
  { column: 'build', icon: 'hammer', label: 'Build' },
] as const

export function decreeCounts(v: PlayerView): { icon: string; label: string; count: number }[] | null {
  const e = v.factions.eyrie
  return e ? DECREE_COLUMNS.map(c => ({ icon: c.icon, label: c.label, count: e.decree[c.column].length })) : null
}

/** The Vagabond's relationship with `seat` (§9.2.9): null when there is none to show. */
export function relationshipWith(v: PlayerView, seat: FactionId | null): { text: string; hostile: boolean } | null {
  const r = seat && seat !== 'vagabond' ? v.factions.vagabond?.relationships[seat] : undefined
  if (r === undefined) return null
  if (r === 'hostile') return { text: 'Thù địch', hostile: true }
  return { text: r === 3 ? 'Đồng minh' : `Quan hệ ${r}/3`, hostile: false }
}

import type { FactionId, PlayerView } from '@root/game-engine'
import type { LogEntry } from '../motion.ts'

/**
 * RD-M09: big one-off banners for faction events, like Root Digital's "Revolt", "Outrage!", "Coalition" and "The Eyrie
 * have entered Turmoil" (docs/07-ui/root-digital/marquise.md §3). Read from the public log and the public Eyrie board
 * only; the client adds no rules.
 */
export interface GameEvent { key: string; faction: FactionId; title: string; note?: string }

const BY_TYPE: Record<string, { title: string; note?: (d: Record<string, unknown>) => string | undefined }> = {
  'alliance-revolt': { title: 'Revolt', note: d => (typeof d.clearing === 'number' ? `ở ô ${d.clearing + 1}` : undefined) },
  'outrage-give': { title: 'Outrage!' },
  'outrage-reveal': { title: 'Outrage!' },
  'vagabond-coalition': { title: 'Coalition' },
  'activate-dominance': { title: 'Dominance', note: () => 'thắng ngay khi đủ điều kiện ở đầu Birdsong' },
}

export function eventsSince(prev: PlayerView, next: PlayerView, log: LogEntry[]): GameEvent[] {
  const out: GameEvent[] = []
  for (const e of log) {
    if (e.revision <= prev.revision || e.revision > next.revision) continue
    const kind = BY_TYPE[e.type]
    if (!kind) continue
    const note = kind.note?.((e.detail ?? {}) as Record<string, unknown>)
    out.push({ key: `${e.revision}:${e.type}`, faction: e.type.startsWith('outrage') ? 'alliance' : e.faction, title: kind.title, ...(note ? { note } : {}) })
  }
  // Turmoil (§7.7) runs on its own, so it never appears in the log: the public Eyrie board starts deposing.
  if (prev.factions.eyrie && next.factions.eyrie && !prev.factions.eyrie.deposing && next.factions.eyrie.deposing)
    out.push({ key: `${next.revision}:turmoil`, faction: 'eyrie', title: 'Turmoil', note: 'Eyrie không thực hiện được Decree' })
  return out
}

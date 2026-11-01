import { AUTUMN } from '@root/game-data'
import type { FactionId, PlayerView } from '@root/game-engine'
import { html } from 'htm/preact'
import { SUIT_NAME } from '../../names.ts'
import { FactionChip, Icon, SuitPip } from '../components.ts'

const TOKEN = { wood: 'gỗ', keep: 'keep', sympathy: 'sympathy' } as Record<string, string>

/** What is in one clearing, read from the view: suit, ruler (from the engine, §2.5), pieces, ruins, the Vagabond. */
export function ClearingInfo({ view: v, clearing: c, onClose }: { view: PlayerView; clearing: number; onClose: () => void }) {
  const def = AUTUMN.clearings[c]!
  const here = v.map.clearings[c]!
  const warriors = Object.entries(here.warriors).filter(([, n]) => n && n > 0) as [FactionId, number][]
  const slots = here.slots.filter(s => s !== null)
  const lord = v.rulers[c] ?? null
  const pawn = v.factions.vagabond?.pawn
  return html`<section class="card clearinginfo" aria-label=${`Thông tin ô ${c + 1}`}>
    <div class="head"><h3>Ô ${c + 1} <${SuitPip} suit=${def.suit} /> <span class="note">${SUIT_NAME[def.suit]} · ${here.slots.length} slot</span></h3>
      <button class="secondary" aria-label="Đóng" onClick=${onClose}><${Icon} name="close" /></button></div>
    <div>Cai quản: ${lord ? html`<${FactionChip} f=${lord} />` : 'không ai'}</div>
    <div>Chiến binh: ${warriors.length ? warriors.map(([f, n]) => html`<span class="pieces"><${FactionChip} f=${f} /> ×${n}</span>`) : '—'}</div>
    <div>Công trình: ${slots.length ? slots.map(s => s!.kind === 'ruin' ? html`<span class="pieces">ruin (${s!.itemCount} item)</span>`
      : html`<span class="pieces"><${FactionChip} f=${s!.faction} /> ${s!.type}</span>`) : '—'}</div>
    <div>Token: ${here.tokens.length ? here.tokens.map(t => html`<span class="pieces"><${FactionChip} f=${t.faction} /> ${TOKEN[t.type] ?? t.type}</span>`) : '—'}</div>
    ${pawn?.kind === 'clearing' && pawn.id === c && html`<div><${FactionChip} f="vagabond" /> đang ở đây</div>`}
  </section>`
}

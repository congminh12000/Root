import type { Action, FactionId, PlayerView } from '@root/game-engine'
import { html } from 'htm/preact'
import { usableCards } from '../../interaction/cards.ts'
import { CardChip, FactionChip, MiniCard } from '../components.ts'

const Chip = ({ f }: { f: FactionId }) => html`<${FactionChip} f=${f} />`

/** Your hand as a fan of small cards; cards some legal action uses now are lit. Click a card for details and actions. */
export function Hand({ view: v, seat, legal }: { view: PlayerView; seat: FactionId; legal: Action[] }) {
  const usable = usableCards(legal, v.hand)
  const mid = (v.hand.length - 1) / 2
  return html`<section class="card hand"><h3>Bài của bạn <small class="note">${v.hand.length} lá${usable.size ? ` · ${usable.size} lá dùng được ngay` : ''}</small></h3>
    ${v.hand.length ? html`<div class="fan">${v.hand.map((c, i) => html`<${MiniCard} key=${c} card=${c} usable=${usable.has(c)}
      style=${{ '--turn': `${(i - mid) * 3.5}deg`, '--drop': `${Math.abs(i - mid) * 3}px` }} />`)}</div>` : html`<p class="note">Không có lá nào.</p>`}
    ${v.playAreas[seat]?.length ? html`<div>Play area: ${v.playAreas[seat]!.map(c => html`<${CardChip} card=${c} />`)}</div>` : null}
    ${v.revealed.map(r => html`<div>Bài của <${Chip} f=${r.of} />: ${r.cards.length ? r.cards.map(c => html`<${CardChip} card=${c} />`) : '—'}</div>`)}</section>`
}

import type { Action, FactionId, PlayerView } from '@root/game-engine'
import { html } from 'htm/preact'
import { usableCards } from '../../interaction/cards.ts'
import type { Changes } from '../../net/changes.ts'
import type { Seat } from '../../net/types.ts'
import { CardChip, FactionChip, Icon, MiniCard } from '../components.ts'

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

const WIN = 30 // §3.1
/** The score track 0–30 with every faction's marker, then one line per seat. Dominance players leave the track (§3.3.1). */
export function Scores({ view: v, seats, changes }: { view: PlayerView; seats: Seat[]; changes: Changes }) {
  const active = v.waitingOn[0]
  const onTrack = seats.filter(s => typeof v.score[s.faction] === 'number')
  return html`<section class="card"><h3>Điểm</h3>
    <div class="scoretrack" role="img" aria-label=${onTrack.map(s => `${s.faction} ${v.score[s.faction]}`).join(', ')}>
      ${Array.from({ length: WIN / 5 + 1 }, (_, i) => html`<span class="tick" style=${{ left: `${(i * 5 / WIN) * 100}%` }}>${i * 5}</span>`)}
      ${onTrack.map(s => { const n = Math.min(WIN, v.score[s.faction] as number); const stack = onTrack.slice(0, onTrack.indexOf(s)).filter(o => Math.abs((v.score[o.faction] as number) - n) <= 1).length
        return html`<span class="marker" style=${{ left: `${(n / WIN) * 100}%`, '--chip': `var(--faction-${s.faction})`, '--stack': stack }} title=${`${s.faction}: ${n}`}><${Icon} name=${s.faction} /></span>` })}
    </div>
    ${seats.map(s => html`<div class="score" key=${s.faction}><${Chip} f=${s.faction} />${' '}
      <b key=${changes.scored.includes(s.faction) ? `${s.faction}-${changes.seq}` : s.faction} class=${changes.scored.includes(s.faction) ? 'bump' : ''}>${v.score[s.faction] ?? 'dominance'}</b>
      ${' '}· ${s.kind === 'bot' ? 'bot' : s.name}${s.kind === 'human' && !s.connected ? ' (vắng)' : ''} · ${v.handCounts[s.faction] ?? 0} lá${s.faction === active ? ' ◀' : ''}</div>`)}</section>`
}

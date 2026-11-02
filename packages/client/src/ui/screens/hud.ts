import type { Action, FactionId, PlayerView } from '@root/game-engine'
import { html } from 'htm/preact'
import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { usableCards } from '../../interaction/cards.ts'
import type { Decision } from '../../interaction/decisions.ts'
import { FACTION_NAME, PHASE_NAME, STEP_NAME } from '../../names.ts'
import type { Changes } from '../../net/changes.ts'
import type { Seat } from '../../net/types.ts'
import { FactionChip, Icon } from '../components.ts'

/**
 * The floating HUD of the map-only game screen (docs/07-ui/gameplay-map-only.md §4): small pieces at the edges and
 * one drawer at a time, so the map always fills the screen.
 */

export type DrawerId = 'hand' | 'log' | 'all' | 'guide' | FactionId

/** Countdown for the human the game waits on; a bot decides once when it reaches zero. Ticks on its own. */
function Clock({ deadline }: { deadline: number | null }) {
  const [, tick] = useState(0)
  useEffect(() => {
    if (deadline === null) return
    const id = setInterval(() => tick(n => n + 1), 250)
    return () => clearInterval(id)
  }, [deadline])
  if (deadline === null) return null
  const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
  return html`<span class=${`clock${left <= 15 ? ' urgent' : ''}`}><${Icon} name="clock" label="Thời gian còn lại" /> ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</span>`
}

/** Top left: turn, phase and step, who the game waits on and why, the clock, any notice. */
export function HudStatus({ view: v, seat, deadline, notice, decision, mine, onReopen }: {
  view: PlayerView; seat: FactionId | null; deadline: number | null; notice: string; decision: Decision | null; mine: boolean
  /** Shown when your own dialog was folded away to look at the map. */
  onReopen?: () => void
}) {
  const waiting = v.waitingOn[0]
  return html`<section class="hud-status" aria-label="Trạng thái trận">
    <div class="line"><b>Lượt ${v.turn.number}</b> · ${PHASE_NAME[v.turn.phase]} · ${STEP_NAME[v.turn.step] ?? v.turn.step} <${Clock} deadline=${deadline} /></div>
    <div class="line">${waiting ? html`${seat === waiting ? html`<b>Đến lượt bạn</b>` : html`Đang chờ <${FactionChip} f=${waiting} />`}` : 'Đã kết thúc'}
      ${seat ? '' : html` · <span class="note">khán giả</span>`}</div>
    ${decision && !mine && html`<div class="line note">${decision.title} <span class="rule">${decision.rule}</span></div>`}
    ${onReopen && html`<button class="secondary" onClick=${onReopen}>Mở lại quyết định</button>`}
    ${notice && html`<div class="line notice" role="status">${notice}</div>`}</section>`
}

/** Top right: a menu button with everything that is not part of play. */
export function HudMenu({ children }: { children: ComponentChildren }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useOutside(box, open, () => setOpen(false))
  return html`<div class="hud-menu" ref=${box}>
    <button class="secondary" aria-expanded=${open} aria-label="Menu" onClick=${() => setOpen(o => !o)}>☰</button>
    ${open && html`<div class="hud-menu-list" role="menu" onClick=${(e: Event) => { if ((e.target as Element).closest('[data-close]')) setOpen(false) }}>${children}</div>`}</div>`
}

/** Right edge: each faction's badge with score and cards in hand; it opens that faction's board. */
export function HudFactions({ view: v, seats, seat, changes, open, onOpen }: {
  view: PlayerView; seats: Seat[]; seat: FactionId | null; changes: Changes; open: DrawerId | null; onOpen: (f: FactionId) => void
}) {
  const waiting = v.waitingOn[0]
  return html`<nav class="hud-factions" aria-label="Các phe">${seats.map(s => html`
    <button key=${s.faction} class=${`hud-faction${s.faction === waiting ? ' turn' : ''}${s.faction === seat ? ' me' : ''}`} style=${{ '--chip': `var(--faction-${s.faction})` }}
      aria-pressed=${open === s.faction} aria-label=${`${FACTION_NAME[s.faction]}: ${v.score[s.faction] ?? 'dominance'} điểm, ${v.handCounts[s.faction] ?? 0} lá${s.kind === 'human' && !s.connected ? ', vắng' : ''}`}
      onClick=${() => onOpen(s.faction)}>
      <span class="badge"><${Icon} name=${s.faction} /></span>
      <b key=${changes.scored.includes(s.faction) ? `${s.faction}-${changes.seq}` : s.faction} class=${changes.scored.includes(s.faction) ? 'bump' : ''}>${v.score[s.faction] ?? 'D'}</b>
      <small>${v.handCounts[s.faction] ?? 0} lá${s.kind === 'human' && !s.connected ? ' · vắng' : ''}</small>
    </button>`)}</nav>`
}

/** Bottom: your hand as a strip; tap or swipe up for the fan. */
export function HandStrip({ view: v, legal, onOpen }: { view: PlayerView; legal: Action[]; onOpen: () => void }) {
  const usable = usableCards(legal, v.hand).size
  const start = useRef<number | null>(null)
  return html`<button class=${`hud-hand${usable ? ' usable' : ''}`} onClick=${onOpen} aria-label=${`Bài của bạn: ${v.hand.length} lá${usable ? `, ${usable} lá dùng được` : ''}`}
    onPointerDown=${(e: PointerEvent) => { start.current = e.clientY }} onPointerUp=${(e: PointerEvent) => { if (start.current !== null && start.current - e.clientY > 30) onOpen(); start.current = null }}>
    <span class="cards">${v.hand.map((_, i) => html`<i key=${i} style=${{ '--turn': `${(i - (v.hand.length - 1) / 2) * 6}deg` }}></i>`)}</span>
    <b>Bài của bạn</b> ${v.hand.length} lá${usable ? html` · <span class="gold">${usable} dùng được</span>` : ''}</button>`
}

/** One drawer at a time; a press outside it (or Esc) closes it. */
export function Drawer({ side, label, onClose, children }: { side: 'bottom' | 'right' | 'left'; label: string; onClose: () => void; children: ComponentChildren }) {
  const box = useRef<HTMLElement>(null)
  useOutside(box, true, onClose)
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onClose])
  return html`<aside class=${`hud-drawer ${side}`} aria-label=${label} ref=${box}>
    <button class="secondary close" aria-label="Đóng" onClick=${onClose}>×</button>${children}</aside>`
}

/** Calls `close` on a press outside `box` (HUD buttons included, so they can switch drawers). */
function useOutside(box: { current: Element | null }, active: boolean, close: () => void) {
  useEffect(() => {
    if (!active) return
    const press = (e: PointerEvent) => {
      const t = e.target as Element
      if (box.current && !box.current.contains(t) && !t.closest('.hud-faction, .hud-hand, .hud-log, .hud-menu, .carddetail')) close()
    }
    document.addEventListener('pointerdown', press)
    return () => document.removeEventListener('pointerdown', press)
  }, [active, close])
}

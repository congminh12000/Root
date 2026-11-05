import type { Action, FactionId, PlayerView } from '@root/game-engine'
import { html } from 'htm/preact'
import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { GROUP } from '../../describe.ts'
import { Hand } from './hand.ts'
import type { Decision } from '../../interaction/decisions.ts'
import { FACTION_NAME, PHASE_NAME, STEP_NAME } from '../../names.ts'
import type { Changes } from '../../net/changes.ts'
import type { Seat } from '../../net/types.ts'
import { FactionChip, Icon, MiniCard } from '../components.ts'

/**
 * The floating HUD of the map-only game screen (docs/07-ui/gameplay-map-only.md §4): small pieces at the edges and
 * one drawer at a time, so the map always fills the screen.
 */

export type DrawerId = 'chat' | 'log' | 'all' | 'guide' | FactionId

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

/** Top centre: turn, phase and step, who the game waits on and why, the clock, any notice. */
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
    <button class="secondary" aria-expanded=${open} aria-label="Cài đặt" onClick=${() => setOpen(o => !o)}>⚙</button>
    ${open && html`<div class="hud-menu-list" role="menu" onClick=${(e: Event) => { if ((e.target as Element).closest('[data-close]')) setOpen(false) }}>${children}</div>`}</div>`
}

/** Left edge: each faction's badge with score and cards in hand; it opens that faction's board. */
export function HudFactions({ view: v, seats, seat, changes, open, onOpen, own = false }: {
  view: PlayerView; seats: Seat[]; seat: FactionId | null; changes: Changes; open: DrawerId | null; onOpen: (f: FactionId) => void; own?: boolean
}) {
  const waiting = v.waitingOn[0]
  const ordered = v.seats.map(s => seats.find(info => info.faction === s.faction)).filter((s): s is Seat => !!s)
  const visible = ordered.filter(s => own ? s.faction === seat : s.faction !== seat)
  return html`<nav class=${own ? 'hud-factions hud-self' : 'hud-factions'} aria-label=${own ? 'Phe của bạn' : 'Thứ tự lượt chơi'}>${visible.map(s => html`
    <button key=${s.faction} class=${`hud-faction${s.faction === waiting ? ' turn' : ''}${s.faction === seat ? ' me' : ''}`} style=${{ '--chip': `var(--faction-${s.faction})` }}
      aria-pressed=${open === s.faction} aria-label=${`${FACTION_NAME[s.faction]}: ${v.score[s.faction] ?? 'dominance'} điểm, ${v.handCounts[s.faction] ?? 0} lá${s.kind === 'human' && !s.connected ? ', vắng' : ''}`}
      onClick=${() => onOpen(s.faction)}>
      <span class="badge"><${Icon} name=${s.faction} /></span>
      <b key=${changes.scored.includes(s.faction) ? `${s.faction}-${changes.seq}` : s.faction} class=${changes.scored.includes(s.faction) ? 'bump' : ''}>${v.score[s.faction] ?? 'D'}</b>
      <span class="hud-player-name">${s.name}</span><small>${v.handCounts[s.faction] ?? 0} lá${s.kind === 'human' && !s.connected ? ' · vắng' : ''}</small>
    </button>`)}</nav>`
}

/** Bottom: cards stay visible and open their own detail/actions directly. */
export function HandStrip({ view, legal, seat }: { view: PlayerView; legal: Action[]; seat: FactionId }) {
  return html`<div class="hud-hand"><${Hand} view=${view} legal=${legal} seat=${seat} /></div>`
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
      if (box.current && !box.current.contains(t) && !t.closest('.hud-faction, .hud-hand, .hud-log, .hud-menu, .hud-chat-toggle, .hud-actions, .carddetail')) close()
    }
    document.addEventListener('pointerdown', press)
    return () => document.removeEventListener('pointerdown', press)
  }, [active, close])
}

/** The last publicly played card, taken only from public log payloads. */
export function HudPlayed({ log }: { log: import('../../motion.ts').LogEntry[] }) {
  const entry = [...log].reverse().find(e => ['craft', 'discard-card', 'eyrie-add-card', 'play-ambush', 'use-battle-card', 'activate-dominance'].includes(e.type) && typeof (e.detail as { card?: unknown } | undefined)?.card === 'string')
  if (!entry) return null
  const card = (entry.detail as { card: string }).card
  return html`<section class="hud-played" aria-label="Bài vừa đánh ra"><small>Bài vừa đánh ra</small><${MiniCard} card=${card} /></section>`
}

/**
 * Marquise Daylight actions still to take (ROOT-6.5), as a numbered sun like Root Digital's. The number comes from
 * `marquiseActionsLeft` (interaction/actions-left.ts); `key` restarts the bump each time it changes.
 */
export function ActionSun({ left }: { left: number }) {
  const label = `Marquise còn ${left} hành động Daylight`
  return html`<div class="action-sun" role="status" aria-label=${label} title=${label}>
    <${Icon} name="sun" /><b key=${left}>${left}</b></div>`
}

export function HudActions({ legal, canUndo, undo, send, onOpen, actionsLeft = null }: {
  legal: Action[]; canUndo: boolean; undo: () => void; send: (a: Action) => void; onOpen: (type?: string) => void
  /** Marquise Daylight actions left, shown as a sun over the panel; null hides it. */
  actionsLeft?: number | null
}) {
  const next = legal.find(a => a.type === 'end-step' || a.type === 'marquise-end-march')
  return html`<section class="hud-actions" aria-label="Hành động của phe">
    ${actionsLeft !== null && html`<${ActionSun} left=${actionsLeft} />`}
    <button class="secondary" disabled=${!legal.length} aria-label=${`Xem ${legal.length} lựa chọn hợp lệ`} onClick=${() => onOpen()}>Lựa chọn · ${legal.length}</button>
    <div class="hud-action-types">${[...new Set(legal.filter(a => a !== next).map(a => a.type))].map(type => html`<button class="secondary" onClick=${() => onOpen(type)}>${GROUP[type] ?? type}</button>`)}</div>
    <div><button class="secondary" disabled=${!canUndo} title=${canUndo ? 'Hoàn tác hành động trước' : 'Không có hành động có thể hoàn tác; battle, turmoil và thông tin mới không thể Undo'} onClick=${undo}>↶ Undo</button>
    <button disabled=${!next} title=${next ? 'Qua bước tiếp theo' : 'Hoàn thành quyết định hiện tại trước'} onClick=${() => next && send(next)}>Continue ▷</button></div></section>`
}

/** A spectator has no action panel, so the sun stands alone in its corner. */
export function HudSun({ left }: { left: number | null }) {
  return left === null ? null : html`<div class="hud-sun"><${ActionSun} left=${left} /></div>`
}

export function HudChat({ entries, enabled, send }: { entries: import('../../net/types.ts').ChatEntry[]; enabled: boolean; send: (text: string) => void }) {
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => end.current?.scrollIntoView({ block: 'nearest' }), [entries.length, entries.at(-1)?.at])
  return html`<section class="hud-chat"><h3>Chat</h3><div class="chat-messages" role="log" aria-label="Tin nhắn">
    ${entries.map(e => html`<p><${FactionChip} f=${e.faction} /> <span>${e.text}</span></p>`)}<div ref=${end}></div></div>
    <form onSubmit=${(e: Event) => { e.preventDefault(); if (text.trim()) { send(text.trim()); setText('') } }}>
    <input aria-label="Tin nhắn" placeholder=${enabled ? 'Nhập tin nhắn…' : 'Khán giả chỉ đọc chat'} maxLength=${500} disabled=${!enabled} value=${text} onInput=${(e: Event) => setText((e.target as HTMLInputElement).value)} />
    <button disabled=${!enabled || !text.trim()}>Gửi</button></form></section>`
}

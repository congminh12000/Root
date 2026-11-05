import { ContextButton } from './context-button.ts'
import { PhaseMark, turnOwner } from './turn-phase.ts'
import type { Action, FactionId, PlayerView } from '@root/game-engine'
import { html } from 'htm/preact'
import type { ComponentChildren } from 'preact'
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import { GROUP } from '../../describe.ts'
import { MARQUISE_BUTTON_TYPES, marquiseButtons } from '../../interaction/marquise-actions.ts'
import { ownResources } from '../../interaction/resources.ts'
import { decreeCounts, relationshipWith } from '../../interaction/opponents.ts'
import { ALLIANCE_OPPONENT_ART, OWN_PANEL } from '../faction-art.ts'
import { usableCards } from '../../interaction/cards.ts'
import { newPlayed, playedCards, PLAYED_FADE_MS, PLAYED_HOLD_MS, type PlayedCard } from '../../interaction/played.ts'
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
  return html`<nav class=${own ? 'hud-factions hud-self' : 'hud-factions'} aria-label=${own ? 'Phe của bạn' : 'Thứ tự lượt chơi'}>${visible.map(s => own && OWN_PANEL[s.faction] ? html`<${ArtPanel} key=${s.faction} view=${v} seat=${s} waiting=${waiting} changes=${changes} open=${open} onOpen=${onOpen} />` : html`
    <button key=${s.faction} data-faction=${s.faction} class=${`hud-faction${!own && s.faction === 'alliance' ? ' alliance-portrait' : ''}${s.faction === waiting ? ' turn' : ''}${s.faction === seat ? ' me' : ''}`} style=${{ '--chip': `var(--faction-${s.faction})` }}
      aria-pressed=${open === s.faction} aria-label=${`${FACTION_NAME[s.faction]}: ${v.score[s.faction] ?? 'dominance'} điểm, ${v.handCounts[s.faction] ?? 0} lá${s.kind === 'human' && !s.connected ? ', vắng' : ''}`}
      onClick=${() => onOpen(s.faction)}>
      ${!own && s.faction === 'alliance' ? html`<img class="opponent-art" src=${ALLIANCE_OPPONENT_ART} alt="" draggable=${false} />` : html`<span class="badge"><${Icon} name=${s.faction} /></span>`}
      ${turnOwner(v) === s.faction && html`<${PhaseMark} phase=${v.turn.phase} />`}
      <b key=${changes.scored.includes(s.faction) ? `${s.faction}-${changes.seq}` : s.faction} class=${`${!own && s.faction === 'alliance' ? 'opponent-score' : ''}${changes.scored.includes(s.faction) ? ' bump' : ''}`}>${v.score[s.faction] ?? 'D'}</b>
      <span class="hud-player-name">${s.name}</span><small>${v.handCounts[s.faction] ?? 0} lá${s.kind === 'human' && !s.connected ? ' · vắng' : ''}</small>
      ${!own && s.faction === 'eyrie' && decreeCounts(v) && html`<span class="decree-mini" aria-label="Decree">${decreeCounts(v)!.map(d => html`<span title=${`${d.label}: ${d.count} lá`}><${Icon} name=${d.icon} /><b>${d.count}</b></span>`)}</span>`}
      ${!own && s.faction === 'vagabond' && relationshipWith(v, seat) && html`<span class=${`relation${relationshipWith(v, seat)!.hostile ? ' hostile' : ''}`} title="Quan hệ của Vagabond với bạn"><${Icon} name="heart" />${relationshipWith(v, seat)!.text}</span>`}
      ${own && html`<span class="hud-res" role="list" aria-label="Tài nguyên">${ownResources(v, s.faction).map(r => html`<span role="listitem" title=${r.label} aria-label=${`${r.label}: ${r.value}`}><${Icon} name=${r.icon} /><b>${r.value}</b></span>`)}</span>`}
    </button>`)}</nav>`
}

/** Your own faction as its painted panel: score in the laurel, each supply count beside its painted icon. No name: it is you. */
function ArtPanel({ view: v, seat: s, waiting, changes, open, onOpen }: {
  view: PlayerView; seat: Seat; waiting: FactionId | undefined; changes: Changes; open: DrawerId | null; onOpen: (f: FactionId) => void
}) {
  const art = OWN_PANEL[s.faction]!
  const res = ownResources(v, s.faction)
  const scored = changes.scored.includes(s.faction)
  return html`<button data-faction=${s.faction} class=${`hud-faction art-panel me${s.faction === waiting ? ' turn' : ''}`} style=${{ '--chip': `var(--faction-${s.faction})` }}
    aria-pressed=${open === s.faction} aria-label=${`${FACTION_NAME[s.faction]}: ${v.score[s.faction] ?? 'dominance'} điểm, ${res.map(r => `${r.label} ${r.value}`).join(', ')}${s.kind === 'human' && !s.connected ? ', vắng' : ''}`}
    onClick=${() => onOpen(s.faction)}>
    <img class="panel-art" src=${art.src} alt="" draggable=${false} />
    ${turnOwner(v) === s.faction && html`<${PhaseMark} phase=${v.turn.phase} />`}
    <b key=${scored ? `${s.faction}-${changes.seq}` : s.faction} class=${`panel-score${scored ? ' bump' : ''}`}>${v.score[s.faction] ?? 'D'}</b>
    ${res.map(r => art.rows.indexOf(r.icon) >= 0 && html`<b class="panel-num" style=${{ '--row': art.rows.indexOf(r.icon) }} title=${r.label}>${r.value}</b>`)}
  </button>`
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

/**
 * Cards a faction just played, from public log payloads only. Each flies out of that faction's panel to the middle,
 * holds PLAYED_HOLD_MS, then fades; a card played sooner waits its turn in a queue. Cards already in the log when
 * this mounts are not replayed. `hidden` keeps the queue running while another overlay owns the middle.
 */
export function HudPlayed({ log, hidden = false }: { log: import('../../motion.ts').LogEntry[]; hidden?: boolean }) {
  const known = useRef<Set<string> | null>(null)
  if (!known.current) known.current = new Set(playedCards(log).map(p => p.key))
  const [queue, setQueue] = useState<PlayedCard[]>([])
  const [active, setActive] = useState<PlayedCard | null>(null)
  const [leaving, setLeaving] = useState<PlayedCard | null>(null)
  useEffect(() => {
    const fresh = newPlayed(log, known.current!)
    if (fresh.length) setQueue(q => [...q, ...fresh])
  }, [log])
  useEffect(() => {
    if (active || !queue.length) return
    setActive(queue[0]!)
    setQueue(queue.slice(1))
  }, [active, queue])
  useEffect(() => {
    if (!active) return
    const t = setTimeout(() => { setLeaving(active); setActive(null) }, PLAYED_FLY_MS + PLAYED_HOLD_MS)
    return () => clearTimeout(t)
  }, [active])
  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(() => setLeaving(null), PLAYED_FADE_MS)
    return () => clearTimeout(t)
  }, [leaving])
  if (!active && !leaving) return null
  return html`<section class="hud-played" aria-label="Bài vừa đánh ra" hidden=${hidden}>
    ${leaving && html`<${PlayedCardView} key=${leaving.key} played=${leaving} leaving=${true} />`}
    ${active && html`<${PlayedCardView} key=${active.key} played=${active} leaving=${false} />`}</section>`
}

const PLAYED_FLY_MS = 420

function PlayedCardView({ played, leaving }: { played: PlayedCard; leaving: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = box.current
    if (!el || leaving || typeof el.animate !== 'function') return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const from = document.querySelector(`.hud-faction[data-faction="${played.faction}"]`)?.getBoundingClientRect()
    const to = el.getBoundingClientRect()
    const start = from && !reduce
      ? `translate(${from.left + from.width / 2 - (to.left + to.width / 2)}px, ${from.top + from.height / 2 - (to.top + to.height / 2)}px) scale(0.25)`
      : 'scale(0.96)'
    el.animate([{ transform: start, opacity: 0.4 }, { transform: 'none', opacity: 1 }],
      { duration: reduce ? 150 : PLAYED_FLY_MS, easing: 'cubic-bezier(.2,.8,.2,1)' })
  }, [])
  return html`<div class="hud-played-card${leaving ? ' leaving' : ''}" ref=${box} style=${{ '--chip': `var(--faction-${played.faction})` }}>
    <small>${FACTION_NAME[played.faction]} vừa đánh ra</small><${MiniCard} card=${played.card} /></div>`
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

export function HudActions({ legal, canUndo, undo, send, onOpen, actionsLeft = null, view, onCancel }: {
  legal: Action[]; canUndo: boolean; undo: () => void; send: (a: Action) => void; onOpen: (type?: string) => void
  /** Marquise Daylight actions left, shown as a sun over the panel; null hides it. */
  view?: PlayerView | undefined; onCancel?: (() => void) | undefined
  actionsLeft?: number | null
}) {
  const next = legal.find(a => a.type === 'end-step' || a.type === 'marquise-end-march')
  return html`<section class="hud-actions" aria-label="Hành động của phe">
    ${actionsLeft !== null && html`<${ActionSun} left=${actionsLeft} />`}
    <button class="secondary" disabled=${!legal.length} aria-label=${`Xem ${legal.length} lựa chọn hợp lệ`} onClick=${() => onOpen()}>Lựa chọn · ${legal.length}</button>
    ${actionsLeft !== null && html`<div class="hud-marquise" role="group" aria-label="Hành động Marquise">${marquiseButtons(legal).map(b => html`<button class="secondary"
        disabled=${!b.enabled} aria-label=${b.label} title=${b.label} data-type=${b.type}
        onClick=${() => { const only = legal.find(a => a.type === b.type); if (b.mode === 'send' && only) send(only); else onOpen(b.type) }}><${Icon} name=${b.icon} />${b.type === 'marquise-spend-bird' ? html`<small>+1</small>` : ''}</button>`)}</div>`}
    <div class="hud-action-types">${[...new Set(legal.filter(a => a !== next && !(actionsLeft !== null && MARQUISE_BUTTON_TYPES.has(a.type))).map(a => a.type))].map(type => html`<button class="secondary" onClick=${() => onOpen(type)}>${GROUP[type] ?? type}</button>`)}</div>
    <div><button class="secondary" disabled=${!canUndo} title=${canUndo ? 'Hoàn tác hành động trước' : 'Không có hành động có thể hoàn tác; battle, turmoil và thông tin mới không thể Undo'} onClick=${undo}>↶ Undo</button>
    <${ContextButton} legal=${legal} view=${view} send=${send} onCancel=${onCancel} /></div></section>`
}

/** RD-M03: the order for this seat at the top middle (interaction/prompt.ts); Esc or "Thôi" leaves a mode like Build. */
export function MapPrompt({ text, onCancel }: { text: string; onCancel?: (() => void) | undefined }) {
  return html`<div class="map-prompt" role="status" aria-live="polite">${text}${onCancel && html` <button class="secondary" onClick=${onCancel}>Thôi (Esc)</button>`}</div>`
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

/** RD-M11: a small notice at the top right for a few seconds (a dominance card became available). */
export function HudToast({ changes }: { changes: Changes }) {
  const [toast, setToast] = useState<{ key: string; text: string } | null>(null)
  useEffect(() => {
    const last = changes.toasts[changes.toasts.length - 1]
    if (!last) return
    setToast(last)
    const id = setTimeout(() => setToast(null), 4500)
    return () => clearTimeout(id)
  }, [changes.seq])
  return toast ? html`<div class="hud-toast" key=${toast.key} role="status" aria-live="polite"><${Icon} name="crown" />${toast.text}</div>` : null
}

/** RD-M13: the seat's own persistent cards at the right edge; lit when one can be used now, a click opens its uses. */
export function HudPlayArea({ view: v, seat, legal }: { view: PlayerView; seat: FactionId; legal: Action[] }) {
  const cards = v.playAreas[seat] ?? []
  if (!cards.length) return null
  const usable = usableCards(legal, cards)
  return html`<section class="hud-playarea" aria-label="Lá đã chế tạo">${cards.map(c => html`<${MiniCard} key=${c} card=${c} usable=${usable.has(c)} />`)}</section>`
}

/** RD-M16: the server saves the game after every accepted command (packages/server room.ts); a small mark says so. */
export function SaveMark({ revision }: { revision: number }) {
  const [shown, setShown] = useState(false)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    setShown(true)
    const id = setTimeout(() => setShown(false), 1400)
    return () => clearTimeout(id)
  }, [revision])
  return shown ? html`<div class="save-mark" role="status" aria-label="Đã lưu trận"><${Icon} name="save" /></div>` : null
}

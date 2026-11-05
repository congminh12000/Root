import { SoundToggle } from './sound.ts'
import type { Action } from '@root/game-engine'
import { html } from 'htm/preact'
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { GameResult, GameLog, QuickGuide, logClearings } from './finish.ts'
import { decisionOf } from '../../interaction/decisions.ts'
import { marquiseActionsLeft } from '../../interaction/actions-left.ts'
import { click, destinations, IDLE, startClearings, stillValid, viewOf, type Stage } from '../../interaction/select.ts'
import { connectGame } from '../../net/connection.ts'
import type { LogEntry } from '../../motion.ts'
import { craftClearings, craftPieces, matchCost } from '../../interaction/craft.ts'
import { CardDetailOverlay, openCard } from '../components.ts'
import { GROUP } from '../../describe.ts'
import { FullList } from './action-bar.ts'
import { FactionBoards } from './boards.ts'
import { DecisionCallout, DecisionDialog } from './decision.ts'
import { Drawer, HandStrip, HudFactions, HudMenu, HudStatus, HudPlayed, HudActions, HudChat, HudSun, type DrawerId } from './hud.ts'
import { MapDice, MapInfo, MapOverlay } from './callouts.ts'
import { MapView, type Project } from './map-view.ts'
import { MapPicker, mapChoice } from '../../map/choice.ts'
import { liveScene, setLiveScene } from '../../map/live.ts'

/** One game: everything comes from the server's updates; the client never decides legality. */
export function Game({ gameId, token }: { gameId: string; token: string | null }) {
  const conn = useMemo(() => connectGame(gameId, token), [gameId, token])
  useEffect(() => () => conn.close(), [conn])
  /** What is chosen on the board (interaction/select.ts). */
  const [stage, setStage] = useState<Stage>(IDLE)
  /** Clearings of the option the pointer or focus is on, lit over the chosen ones. */
  const [logSelection, setLogSelection] = useState<LogEntry | null>(null)
  const [preview, setPreview] = useState<number[] | null>(null)
  const [cameraHome, setCameraHome] = useState(0)
  /** The clearing whose contents are shown under the board (the last one clicked). */
  const [inspect, setInspect] = useState<number | null>(null)
  const hoverTimer = useRef(0)
  /** The decision dialog folded away to look at the board; it opens again with every new position. */
  const [folded, setFolded] = useState(false)
  /** The one HUD drawer open, if any (hud.ts). */
  const [actionFilter, setActionFilter] = useState<string | null>(null)
  const [drawer, setDrawer] = useState<DrawerId | null>(null)
  const close = useCallback(() => setDrawer(null), [])
  const toggle = (d: DrawerId) => setDrawer(o => (o === d ? null : d))

  const u = conn.update.value
  // A new position drops the preview; a chosen path falls back to its start clearing, if that still has actions.
  useEffect(() => {
    setPreview(null)
    setLogSelection(null)
    setFolded(false)
    if (u) setStage(s => stillValid(u.legal, s.kind === 'path' ? { kind: 'at', clearing: s.from } : s))
  }, [u?.view.revision])
  if (!u) return html`<p class="loading">Đang kết nối trận ${gameId}… ${conn.notice.value}</p>`
  const { view: v, legal, seats, seat } = u
  const board = viewOf(legal, stage)
  const decision = decisionOf(v, legal)
  const mine = !!decision && decision.player === seat && legal.length > 0
  const dialog = mine && decision!.dialog
  // A decision in a clearing shows there on the map; only choices with no clearing take the middle of the screen.
  const atClearing = dialog && decision!.clearing !== null
  const centred = dialog && !atClearing
  // An open card from the hand lights the crafting pieces that would pay for it (§4.1.1), over the chosen clearing.
  const card = openCard.value
  const crafting = seat && card && v.hand.includes(card) ? craftClearings(matchCost(card, craftPieces(v, seat))) : []
  const highlight = preview ?? (logSelection ? logClearings(logSelection) : crafting.length ? crafting : board.selected)
  const pick = (c: number) => { setPreview(null); setLogSelection(null); setInspect(null); setStage(s => click(legal, s, c)) }
  // Clearing details: after the mouse rests on a clearing, or at once when a finger holds it.
  const hover = (c: number | null) => {
    clearTimeout(hoverTimer.current)
    hoverTimer.current = window.setTimeout(() => setInspect(c), c === null ? 200 : 450)
  }

  const logPick = (l: LogEntry) => { setLogSelection(logSelection?.revision === l.revision ? null : l); setPreview(null) }

  return html`<div class="game-screen">
    <${MapView} map=${mapChoice.value} view=${v} highlight=${highlight} targets=${board.targets} changes=${conn.changes.value} onPick=${pick} cameraHome=${cameraHome}
      draggable=${startClearings(legal).filter(c => destinations(legal, c).length > 0)}
      onDrag=${(from: number, to: number) => { setPreview(null); setStage(click(legal, click(legal, IDLE, from), to)) }}
      onDragOver=${(from: number, to: number | null) => setPreview(to === null ? [from] : [from, to])}
      onHover=${hover} onHold=${(c: number) => { clearTimeout(hoverTimer.current); setInspect(c) }}
      overlay=${(project: Project) => html`
        ${legal.length > 0 && !atClearing && html`<${MapOverlay} project=${project} view=${v} legal=${legal} stage=${stage} setStage=${setStage}
          send=${conn.send} onPreview=${setPreview} onPick=${pick} bubble=${false} />`}
        ${atClearing && project(decision!.clearing!) && html`<${DecisionCallout} decision=${decision!} view=${v} legal=${legal} send=${conn.send} at=${project(decision!.clearing!)!} />`}
        <${MapDice} project=${project} changes=${conn.changes.value} below=${atClearing ? decision!.clearing : null} />
        ${inspect !== null && !(stage.kind === 'at' && stage.clearing === inspect) && html`<${MapInfo} project=${project} view=${v} clearing=${inspect} onClose=${() => setInspect(null)} />`}`} />
    <${HudStatus} view=${v} seat=${seat} deadline=${conn.deadline.value} notice=${conn.notice.value} decision=${decision} mine=${mine}
      onReopen=${centred && folded ? () => setFolded(false) : undefined} />
    <button class="secondary hud-chat-toggle" aria-label="Chat" aria-pressed=${drawer === 'chat'} onClick=${() => toggle('chat')}>Chat</button>
    <${HudMenu}>
      <a role="menuitem" href="./">← Về sảnh</a>
      <span class="note">Trận <b>${u.gameId}</b></span>
      <button role="menuitem" class="secondary" data-close onClick=${() => setCameraHome(n => n + 1)}>Về góc mặc định</button>
      ${legal.length > 0 && html`<button role="menuitem" class="secondary" data-close onClick=${() => { setActionFilter(null); setDrawer('all') }}>Tất cả lựa chọn (${legal.length})</button>`}
      <button role="menuitem" class="secondary" data-close onClick=${() => setDrawer('guide')}>Hướng dẫn nhanh</button>
      <${SoundToggle} revision=${v.revision} />
      <button role="menuitemcheckbox" class="secondary" aria-checked=${liveScene.value} onClick=${() => setLiveScene(!liveScene.value)}>Cảnh động: ${liveScene.value ? 'bật' : 'tắt'}</button>
      <${MapPicker} />
    <//>
    <${HudFactions} view=${v} seats=${seats} seat=${seat} changes=${conn.changes.value} open=${drawer} onOpen=${toggle} />
    ${seat && html`<${HudFactions} view=${v} seats=${seats} seat=${seat} changes=${conn.changes.value} open=${drawer} onOpen=${toggle} own />`}
    <${HudPlayed} log=${u.log} />
    ${seat ? html`<${HudActions} actionsLeft=${marquiseActionsLeft(v)} legal=${legal} canUndo=${u.canUndo} undo=${conn.undo} send=${conn.send} onOpen=${(type?: string) => { setActionFilter(type ?? null); setDrawer('all') }} />` : html`<${HudSun} left=${marquiseActionsLeft(v)} />`}
    ${drawer === 'chat' && html`<${Drawer} side="right" label="Chat" onClose=${close}><${HudChat} entries=${u.chat ?? []} enabled=${!!seat} send=${conn.chat} /><//>`}
    ${seat && html`<${HandStrip} view=${v} legal=${legal} seat=${seat} />`}
    <button class="secondary hud-log" aria-pressed=${drawer === 'log'} onClick=${() => toggle('log')}>Nhật ký${u.log.length ? ` · ${u.log.length}` : ''}</button>
    ${drawer === 'log' && html`<${Drawer} side="left" label="Nhật ký" onClose=${close}><${GameLog} log=${u.log} selected=${logSelection?.revision ?? null} onSelect=${logPick} /><//>`}
    ${drawer === 'all' && legal.length > 0 && html`<${Drawer} side="right" label="Tất cả lựa chọn" onClose=${close}><section class="card"><h3>${actionFilter ? GROUP[actionFilter] ?? actionFilter : 'Tất cả lựa chọn'} <small class="note">${legal.length}</small></h3><${FullList} key=${actionFilter ?? 'all'} legal=${actionFilter ? legal.filter(a => a.type === actionFilter) : legal} onPreview=${setPreview} send=${(a: Action) => { close(); conn.send(a) }} /></section><//>`}
    ${drawer === 'guide' && html`<${Drawer} side="right" label="Hướng dẫn nhanh" onClose=${close}><${QuickGuide} /><//>`}
    ${drawer && seats.some(s => s.faction === drawer) && html`<${Drawer} side="right" label="Bảng phe" onClose=${close}><${FactionBoards} key=${drawer} view=${v} seat=${seat} initial=${drawer} /><//>`}
    ${centred && !folded && html`<${DecisionDialog} decision=${decision!} view=${v} legal=${legal} send=${conn.send} onFold=${() => setFolded(true)} />`}
    <${GameResult} view=${v} />
    <${CardDetailOverlay} legal=${legal} send=${conn.send} view=${v} seat=${seat} />
  </div>`
}

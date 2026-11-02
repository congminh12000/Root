import { SoundToggle } from './sound.ts'
import type { Action } from '@root/game-engine'
import { html } from 'htm/preact'
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { GameResult, GameLog, QuickGuide, logClearings } from './finish.ts'
import { decisionOf } from '../../interaction/decisions.ts'
import { click, destinations, IDLE, startClearings, stillValid, viewOf, type Stage } from '../../interaction/select.ts'
import { connectGame } from '../../net/connection.ts'
import type { LogEntry } from '../../motion.ts'
import { CardDetailOverlay } from '../components.ts'
import { FullList } from './action-bar.ts'
import { FactionBoards } from './boards.ts'
import { Hand } from './hand.ts'
import { DecisionCallout, DecisionDialog } from './decision.ts'
import { Drawer, HandStrip, HudFactions, HudMenu, HudStatus, type DrawerId } from './hud.ts'
import { MapDice, MapInfo, MapOverlay } from './callouts.ts'
import { MapView, type Project } from './map-view.ts'

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
  const highlight = preview ?? (logSelection ? logClearings(logSelection) : board.selected)
  const pick = (c: number) => { setPreview(null); setLogSelection(null); setInspect(null); setStage(s => click(legal, s, c)) }
  // Clearing details: after the mouse rests on a clearing, or at once when a finger holds it.
  const hover = (c: number | null) => {
    clearTimeout(hoverTimer.current)
    hoverTimer.current = window.setTimeout(() => setInspect(c), c === null ? 200 : 450)
  }

  const logPick = (l: LogEntry) => { setLogSelection(logSelection?.revision === l.revision ? null : l); setPreview(null) }

  return html`<div class="game-screen">
    <${MapView} view=${v} highlight=${highlight} targets=${board.targets} changes=${conn.changes.value} onPick=${pick} cameraHome=${cameraHome}
      draggable=${startClearings(legal).filter(c => destinations(legal, c).length > 0)}
      onDrag=${(from: number, to: number) => { setPreview(null); setStage(click(legal, click(legal, IDLE, from), to)) }}
      onDragOver=${(from: number, to: number | null) => setPreview(to === null ? [from] : [from, to])}
      onHover=${hover} onHold=${(c: number) => { clearTimeout(hoverTimer.current); setInspect(c) }}
      overlay=${(project: Project) => html`
        ${legal.length > 0 && !atClearing && html`<${MapOverlay} project=${project} view=${v} legal=${legal} stage=${stage} setStage=${setStage}
          send=${conn.send} onPreview=${setPreview} onPick=${pick} bubble=${!(centred && !folded)} />`}
        ${atClearing && project(decision!.clearing!) && html`<${DecisionCallout} decision=${decision!} view=${v} legal=${legal} send=${conn.send} at=${project(decision!.clearing!)!} />`}
        <${MapDice} project=${project} changes=${conn.changes.value} below=${atClearing ? decision!.clearing : null} />
        ${inspect !== null && !(stage.kind === 'at' && stage.clearing === inspect) && html`<${MapInfo} project=${project} view=${v} clearing=${inspect} onClose=${() => setInspect(null)} />`}`} />
    <${HudStatus} view=${v} seat=${seat} deadline=${conn.deadline.value} notice=${conn.notice.value} decision=${decision} mine=${mine}
      onReopen=${centred && folded ? () => setFolded(false) : undefined} />
    <${HudMenu}>
      <a role="menuitem" href="./">← Về sảnh</a>
      <span class="note">Trận <b>${u.gameId}</b></span>
      <button role="menuitem" class="secondary" data-close onClick=${() => setCameraHome(n => n + 1)}>Về góc mặc định</button>
      ${legal.length > 0 && html`<button role="menuitem" class="secondary" data-close onClick=${() => setDrawer('all')}>Tất cả lựa chọn (${legal.length})</button>`}
      <button role="menuitem" class="secondary" data-close onClick=${() => setDrawer('guide')}>Hướng dẫn nhanh</button>
      <${SoundToggle} revision=${v.revision} />
    <//>
    <${HudFactions} view=${v} seats=${seats} seat=${seat} changes=${conn.changes.value} open=${drawer} onOpen=${toggle} />
    ${seat && html`<${HandStrip} view=${v} legal=${legal} onOpen=${() => toggle('hand')} />`}
    <button class="secondary hud-log" aria-pressed=${drawer === 'log'} onClick=${() => toggle('log')}>Nhật ký${u.log.length ? ` · ${u.log.length}` : ''}</button>
    ${drawer === 'hand' && seat && html`<${Drawer} side="bottom" label="Bài của bạn" onClose=${close}><${Hand} view=${v} seat=${seat} legal=${legal} /><//>`}
    ${drawer === 'log' && html`<${Drawer} side="left" label="Nhật ký" onClose=${close}><${GameLog} log=${u.log} selected=${logSelection?.revision ?? null} onSelect=${logPick} /><//>`}
    ${drawer === 'all' && legal.length > 0 && html`<${Drawer} side="right" label="Tất cả lựa chọn" onClose=${close}><section class="card"><h3>Tất cả lựa chọn <small class="note">${legal.length}</small></h3><${FullList} legal=${legal} onPreview=${setPreview} send=${(a: Action) => { close(); conn.send(a) }} /></section><//>`}
    ${drawer === 'guide' && html`<${Drawer} side="right" label="Hướng dẫn nhanh" onClose=${close}><${QuickGuide} /><//>`}
    ${drawer && seats.some(s => s.faction === drawer) && html`<${Drawer} side="right" label="Bảng phe" onClose=${close}><${FactionBoards} key=${drawer} view=${v} seat=${seat} initial=${drawer} /><//>`}
    ${centred && !folded && html`<${DecisionDialog} decision=${decision!} view=${v} legal=${legal} send=${conn.send} onFold=${() => setFolded(true)} />`}
    <${GameResult} view=${v} />
    <${CardDetailOverlay} legal=${legal} send=${conn.send} />
  </div>`
}

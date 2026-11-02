import { SoundToggle } from './sound.ts'
import type { FactionId, PlayerView } from '@root/game-engine'
import { html } from 'htm/preact'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { GameResult, GameLog, QuickGuide, logClearings } from './finish.ts'
import { decisionOf } from '../../interaction/decisions.ts'
import { click, destinations, IDLE, startClearings, stillValid, viewOf, type Stage } from '../../interaction/select.ts'
import { PHASE_NAME, STEP_NAME } from '../../names.ts'
import { connectGame } from '../../net/connection.ts'
import type { LogEntry } from '../../motion.ts'
import { CardDetailOverlay, FactionChip, Icon } from '../components.ts'
import { ActionBar } from './action-bar.ts'
import { FactionBoards } from './boards.ts'
import { Hand, Scores } from './hand.ts'
import { DecisionBar, DecisionCallout, DecisionDialog } from './decision.ts'
import { MapDice, MapInfo, MapOverlay } from './callouts.ts'
import { MapView, type Project } from './map-view.ts'

const Chip = ({ f }: { f: FactionId }) => html`<${FactionChip} f=${f} />`

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
  /** The side panel floats over the map until G2–G4 move every action onto the map itself. */
  const [panel, setPanel] = useState(() => innerWidth >= 1100)

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
    <div class="hud-top">
      <${TopBar} gameId=${u.gameId} view=${v} seat=${seat} deadline=${conn.deadline.value} notice=${conn.notice.value}
        panel=${panel} onPanel=${() => setPanel(p => !p)} />
      ${decision && !atClearing && !(centred && !folded) && html`<${DecisionBar} decision=${decision} mine=${mine} onOpen=${centred ? () => setFolded(false) : undefined} />`}
    </div>
    ${centred && !folded && html`<${DecisionDialog} decision=${decision!} view=${v} legal=${legal} send=${conn.send} onFold=${() => setFolded(true)} />`}
    <${GameResult} view=${v} />
    <${QuickGuide} />
    <aside class="side-overlay" hidden=${!panel} aria-label="Bảng điều khiển">
      <div class="side-tools"><${SoundToggle} revision=${v.revision} /><button class="secondary" onClick=${() => setCameraHome(n => n + 1)}>Về góc mặc định</button></div>
      <${Scores} view=${v} seats=${seats} changes=${conn.changes.value} />
      ${seat && html`<${Hand} view=${v} seat=${seat} legal=${legal} />`}
      ${legal.length > 0 && html`<${ActionBar} legal=${legal} stage=${stage} setStage=${setStage} onPreview=${setPreview} send=${conn.send} />`}
      <${FactionBoards} view=${v} seat=${seat} />
      <${GameLog} log=${u.log} selected=${logSelection?.revision ?? null} onSelect=${(l: LogEntry) => { setLogSelection(logSelection?.revision === l.revision ? null : l); setPreview(null) }} />
    </aside>
    <${CardDetailOverlay} legal=${legal} send=${conn.send} />
  </div>`
}

function TopBar({ gameId, view: v, seat, deadline, notice, panel, onPanel }: {
  gameId: string; view: PlayerView; seat: FactionId | null; deadline: number | null; notice: string; panel: boolean; onPanel: () => void
}) {
  return html`
    <header class="bar">
      <a href="./">← Sảnh</a>
      <span>Trận <b>${gameId}</b></span>
      <span>Lượt ${v.turn.number} · ${PHASE_NAME[v.turn.phase]} · ${STEP_NAME[v.turn.step] ?? v.turn.step}</span>
      <span>Đang chờ: ${v.waitingOn.length ? v.waitingOn.map(f => html`<${Chip} f=${f} />`) : '—'}</span>
      <span>${seat ? html`Bạn là <${Chip} f=${seat} />` : 'Khán giả'}</span>
      <${Clock} deadline=${deadline} />
      <button class="secondary panel-toggle" aria-expanded=${panel} onClick=${onPanel}>${panel ? 'Ẩn bảng' : 'Hiện bảng'}</button>
    </header>
    ${notice && html`<div class="notice" role="status">${notice}</div>`}`
}

/** Countdown for the human the game waits on; a bot decides once when it reaches zero. Ticks on its own. */
function Clock({ deadline }: { deadline: number | null }) {
  const [, tick] = useState(0)
  useEffect(() => {
    if (deadline === null) return
    const id = setInterval(() => tick(n => n + 1), 250)
    return () => clearInterval(id)
  }, [deadline])
  if (deadline === null) return html`<span class="clock"></span>`
  const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
  return html`<span class=${`clock${left <= 15 ? ' urgent' : ''}`}><${Icon} name="clock" label="Thời gian còn lại" /> ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</span>`
}

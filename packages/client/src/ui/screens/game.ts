import type { Action, FactionId, LastRoll, PlayerView } from '@root/game-engine'
import { html } from 'htm/preact'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { describe, GROUP } from '../../describe.ts'
import { click, IDLE, stillValid, viewOf, type Stage } from '../../interaction/select.ts'
import { PHASE_NAME, STEP_NAME } from '../../names.ts'
import type { Changes } from '../../net/changes.ts'
import { connectGame } from '../../net/connection.ts'
import type { LogEntry } from '../../motion.ts'
import { CardDetailOverlay, Dice, FactionChip, Icon } from '../components.ts'
import { ActionBar } from './action-bar.ts'
import { FactionBoards } from './boards.ts'
import { Hand, Scores } from './hand.ts'
import { ClearingInfo } from './clearing-info.ts'
import { BoardView, type BoardMode } from './board-view.ts'

const Chip = ({ f }: { f: FactionId }) => html`<${FactionChip} f=${f} />`
const storedMode = (): BoardMode => { try { return localStorage.getItem('root-board') === '2d' ? '2d' : '3d' } catch { return '3d' } }

/** One game: everything comes from the server's updates; the client never decides legality. */
export function Game({ gameId, token }: { gameId: string; token: string | null }) {
  const conn = useMemo(() => connectGame(gameId, token), [gameId, token])
  useEffect(() => () => conn.close(), [conn])
  /** What is chosen on the board (interaction/select.ts). */
  const [stage, setStage] = useState<Stage>(IDLE)
  /** Clearings of the option the pointer or focus is on, lit over the chosen ones. */
  const [preview, setPreview] = useState<number[] | null>(null)
  const [mode, setModeState] = useState<BoardMode>(storedMode)
  const [cameraHome, setCameraHome] = useState(0)
  /** The clearing whose contents are shown under the board (the last one clicked). */
  const [inspect, setInspect] = useState<number | null>(null)
  const setMode = (m: BoardMode) => { setModeState(m); try { localStorage.setItem('root-board', m) } catch { /* private mode */ } }

  const u = conn.update.value
  // A new position drops the preview; a chosen path falls back to its start clearing, if that still has actions.
  useEffect(() => {
    setPreview(null)
    if (u) setStage(s => stillValid(u.legal, s.kind === 'path' ? { kind: 'at', clearing: s.from } : s))
  }, [u?.view.revision])
  if (!u) return html`<p class="loading">Đang kết nối trận ${gameId}… ${conn.notice.value}</p>`
  const { view: v, legal, seats, seat } = u
  const board = viewOf(legal, stage)
  const highlight = preview ?? board.selected
  const pick = (c: number) => { setPreview(null); setInspect(c); setStage(s => click(legal, s, c)) }

  return html`
    <${TopBar} gameId=${u.gameId} view=${v} seat=${seat} deadline=${conn.deadline.value} notice=${conn.notice.value} />
    <div class="layout">
      <div class="board-col">
        <div class="board-tools">
          ${(['3d', '2d'] as const).map(m => html`<button aria-pressed=${mode === m} onClick=${() => setMode(m)}>${m.toUpperCase()}</button>`)}
          ${mode === '3d' && html`<button class="secondary" onClick=${() => setCameraHome(n => n + 1)}>Về góc mặc định</button>`}
          <span>${legal.length ? 'Bấm ô có viền vàng để chọn hành động.' : ''}${mode === '3d' ? ' Kéo để xoay, cuộn để phóng to.' : ''}</span>
        </div>
        <${BoardView} view=${v} highlight=${highlight} targets=${board.targets} changes=${conn.changes.value} mode=${mode} onPick=${pick} onNoWebGL=${() => setModeState('2d')} cameraHome=${cameraHome} />
        <${DicePanel} changes=${conn.changes.value} />
        ${inspect !== null && html`<${ClearingInfo} view=${v} clearing=${inspect} onClose=${() => setInspect(null)} />`}
      </div>
      <aside>
        <${Scores} view=${v} seats=${seats} changes=${conn.changes.value} />
        ${seat && html`<${Hand} view=${v} seat=${seat} legal=${legal} />`}
        ${legal.length > 0 && html`<${ActionBar} legal=${legal} stage=${stage} setStage=${setStage} onPreview=${setPreview} send=${conn.send} />`}
        <${FactionBoards} view=${v} seat=${seat} />
        <${Log} log=${u.log} />
      </aside>
    </div>
    <${CardDetailOverlay} legal=${legal} send=${conn.send} />`
}

function TopBar({ gameId, view: v, seat, deadline, notice }: { gameId: string; view: PlayerView; seat: FactionId | null; deadline: number | null; notice: string }) {
  return html`
    <header class="bar">
      <a href="./">← Sảnh</a>
      <span>Trận <b>${gameId}</b></span>
      <span>Lượt ${v.turn.number} · ${PHASE_NAME[v.turn.phase]} · ${STEP_NAME[v.turn.step] ?? v.turn.step}</span>
      <span>Đang chờ: ${v.waitingOn.length ? v.waitingOn.map(f => html`<${Chip} f=${f} />`) : '—'}</span>
      <span>${seat ? html`Bạn là <${Chip} f=${seat} />` : 'Khán giả'}</span>
      <${Clock} deadline=${deadline} />
    </header>
    ${v.winner && html`<div class="winner">Kết thúc: ${v.winner.factions.map(f => html`<${Chip} f=${f} />`)} thắng (${v.winner.reason})</div>`}
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

/** The latest battle roll over the board for a few seconds. */
function DicePanel({ changes }: { changes: Changes }) {
  const [roll, setRoll] = useState<LastRoll | null>(null)
  useEffect(() => {
    if (!changes.roll) return
    setRoll(changes.roll)
    const id = setTimeout(() => setRoll(null), 3500)
    return () => clearTimeout(id)
  }, [changes.seq])
  // Keyed by revision so two rolls in a row both replay their entry animation.
  return roll ? html`<div class="dice" key=${roll.revision} role="status"><${Dice} roll=${roll} /></div>` : null
}

function Log({ log }: { log: LogEntry[] }) {
  return html`<section class="card log"><h3>Nhật ký</h3>${[...log].reverse().slice(0, 30).map(l => html`
    <div key=${l.revision}>#${l.revision} <${Chip} f=${l.faction} /> ${GROUP[l.type] ?? l.type}${l.detail ? `: ${describe({ type: l.type, payload: l.detail } as Action)}` : ''}</div>`)}</section>`
}

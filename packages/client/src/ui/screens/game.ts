import type { Action, FactionId, LastRoll, PlayerView } from '@root/game-engine'
import { html } from 'htm/preact'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { clearingsOf, describe, GROUP } from '../../describe.ts'
import { cardName, FACTION_NAME, ITEM_NAME, PHASE_NAME, questName, STEP_NAME } from '../../names.ts'
import type { Changes } from '../../net/changes.ts'
import { connectGame } from '../../net/connection.ts'
import type { LogEntry } from '../../motion.ts'
import type { Seat } from '../../net/types.ts'
import { CardChip, CardDetailOverlay, Dice, FactionChip, Icon } from '../components.ts'
import { BoardView, type BoardMode } from './board-view.ts'

const Chip = ({ f }: { f: FactionId }) => html`<${FactionChip} f=${f} />`
const Cards = ({ cards }: { cards: string[] }) => cards.length ? html`${cards.map(c => html`<${CardChip} key=${c} card=${c} />`)}` : html`—`
const storedMode = (): BoardMode => { try { return localStorage.getItem('root-board') === '2d' ? '2d' : '3d' } catch { return '3d' } }

/** One game: everything comes from the server's updates; the client never decides legality. */
export function Game({ gameId, token }: { gameId: string; token: string | null }) {
  const conn = useMemo(() => connectGame(gameId, token), [gameId, token])
  useEffect(() => () => conn.close(), [conn])
  const [filter, setFilter] = useState<number | null>(null)
  /** Clearings lit on the board: the filter, or the option being looked at in a list. */
  const [preview, setPreview] = useState<number[] | null>(null)
  const [mode, setModeState] = useState<BoardMode>(storedMode)
  const [cameraHome, setCameraHome] = useState(0)
  const setMode = (m: BoardMode) => { setModeState(m); try { localStorage.setItem('root-board', m) } catch { /* private mode */ } }

  const u = conn.update.value
  // A new position from the server drops the preview of an option that may no longer exist.
  useEffect(() => setPreview(null), [u?.view.revision])
  if (!u) return html`<p class="loading">Đang kết nối trận ${gameId}… ${conn.notice.value}</p>`
  const { view: v, legal, seats, seat } = u
  const highlight = preview ?? (filter === null ? [] : [filter])
  const pick = (c: number) => { setPreview(null); setFilter(f => (f === c ? null : c)) }

  return html`
    <${TopBar} gameId=${u.gameId} view=${v} seat=${seat} deadline=${conn.deadline.value} notice=${conn.notice.value} />
    <div class="layout">
      <div class="board-col">
        <div class="board-tools">
          ${(['3d', '2d'] as const).map(m => html`<button aria-pressed=${mode === m} onClick=${() => setMode(m)}>${m.toUpperCase()}</button>`)}
          ${mode === '3d' && html`<button class="secondary" onClick=${() => setCameraHome(n => n + 1)}>Về góc mặc định</button>`}
          <span>Bấm vào một ô để lọc lựa chọn.${mode === '3d' ? ' Kéo để xoay, cuộn để phóng to.' : ''}</span>
        </div>
        <${BoardView} view=${v} highlight=${highlight} changes=${conn.changes.value} mode=${mode} onPick=${pick} onNoWebGL=${() => setModeState('2d')} cameraHome=${cameraHome} />
        <${DicePanel} changes=${conn.changes.value} />
      </div>
      <aside>
        <${Scores} view=${v} seats=${seats} changes=${conn.changes.value} />
        ${seat && html`<${Hand} view=${v} seat=${seat} />`}
        ${legal.length > 0 && html`<${Actions} legal=${legal} filter=${filter} onClearFilter=${() => setFilter(null)} onPreview=${setPreview} send=${conn.send} />`}
        <section class="card"><h3>Bảng phe</h3><${FactionBoards} view=${v} /></section>
        <${Log} log=${u.log} />
      </aside>
    </div>
    <${CardDetailOverlay} />`
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

function Scores({ view: v, seats, changes }: { view: PlayerView; seats: Seat[]; changes: Changes }) {
  const active = v.waitingOn[0]
  return html`<section class="card"><h3>Điểm</h3>${seats.map(s => html`
    <div class="score" key=${s.faction}><${Chip} f=${s.faction} />${' '}
      <b key=${changes.scored.includes(s.faction) ? `${s.faction}-${changes.seq}` : s.faction} class=${changes.scored.includes(s.faction) ? 'bump' : ''}>${v.score[s.faction] ?? 'dominance'}</b>
      ${' '}· ${s.kind === 'bot' ? 'bot' : s.name}${s.kind === 'human' && !s.connected ? ' (vắng)' : ''} · ${v.handCounts[s.faction] ?? 0} lá${s.faction === active ? ' ◀' : ''}</div>`)}</section>`
}

function Hand({ view: v, seat }: { view: PlayerView; seat: FactionId }) {
  return html`<section class="card"><h3>Bài của bạn</h3><${Cards} cards=${v.hand} />
    ${v.playAreas[seat]?.length ? html`<div>Play area: <${Cards} cards=${v.playAreas[seat]!} /></div>` : null}
    ${v.revealed.map(r => html`<div>Bài của <${Chip} f=${r.of} />: <${Cards} cards=${r.cards} /></div>`)}</section>`
}

/** Legal actions grouped by type; the board filter narrows them to one clearing. */
function Actions({ legal, filter, onClearFilter, onPreview, send }: {
  legal: Action[]; filter: number | null; onClearFilter: () => void; onPreview: (c: number[] | null) => void; send: (a: Action) => void
}) {
  const shown = filter === null ? legal : legal.filter(a => clearingsOf(a).includes(filter))
  const groups = new Map<string, Action[]>()
  for (const a of shown) groups.set(a.type, [...(groups.get(a.type) ?? []), a])
  return html`<section class="card act"><h3>Lựa chọn của bạn</h3>
    ${filter !== null && html`<div class="filter">Đang lọc ô ${filter + 1} (${shown.length}/${legal.length}) <button class="secondary" onClick=${onClearFilter}>Bỏ lọc</button></div>`}
    ${[...groups].map(([type, list]) => html`<${ActionGroup} key=${type} type=${type} list=${list} onPreview=${onPreview} send=${send} />`)}</section>`
}

function ActionGroup({ type, list, onPreview, send }: { type: string; list: Action[]; onPreview: (c: number[] | null) => void; send: (a: Action) => void }) {
  const [index, setIndex] = useState(0)
  const label = GROUP[type] ?? type
  if (list.length === 1) {
    const a = list[0]!
    const bare = a.type === 'end-step' || a.type.startsWith('decline')
    return html`<div class="group"><button onClick=${() => send(a)}>${label}${bare ? '' : `: ${describe(a)}`}</button></div>`
  }
  const i = Math.min(index, list.length - 1)
  const look = (n: number) => { setIndex(n); onPreview(clearingsOf(list[n]!)) }
  return html`<div class="group"><label for=${`g-${type}`}>${label} (${list.length})</label>
    <select id=${`g-${type}`} value=${i} onChange=${(e: Event) => look(Number((e.target as HTMLSelectElement).value))} onFocus=${() => look(i)}>
      ${list.map((a, n) => html`<option value=${n}>${describe(a)}</option>`)}</select>
    <button onClick=${() => send(list[i]!)}>Thực hiện</button></div>`
}

function FactionBoards({ view: v }: { view: PlayerView }) {
  const m = v.factions.marquise, e = v.factions.eyrie, a = v.factions.alliance, g = v.factions.vagabond
  const items = g ? [...g.satchel.map(i => `${ITEM_NAME[i.type]}${i.exhausted ? ' (úp)' : ''}`),
    ...(['tea', 'coin', 'bag'] as const).flatMap(t => Array.from({ length: g.tracks[t] }, () => `${ITEM_NAME[t]} (track)`))] : []
  return html`
    ${m && html`<div><h4><${Chip} f="marquise" /></h4>Gỗ trong kho: ${m.woodSupply} · Chiến binh trong kho: ${m.warriorSupply} · Công trình còn trên track: sawmill ${m.buildingsOnTrack.sawmill}, workshop ${m.buildingsOnTrack.workshop}, recruiter ${m.buildingsOnTrack.recruiter}${m.keep === null && v.turn.number > 0 ? html` · <b>đã mất keep</b>` : ''}</div>`}
    ${e && html`<div><h4><${Chip} f="eyrie" /></h4>Leader: <b>${e.leader ?? '—'}</b> · Roost còn trên track: ${e.roostsOnTrack} · Chiến binh trong kho: ${e.warriorSupply}
      <div class="decree">${(['recruit', 'move', 'battle', 'build'] as const).map(col => html`<div><b>${col}</b>${e.decree[col].map((d, i) =>
        html`<div class=${e.resolved[col].includes(i) ? 'done' : ''}>${d.kind === 'vizier' ? 'Vizier (chim)' : cardName(d.id)}</div>`)}</div>`)}</div></div>`}
    ${a && html`<div><h4><${Chip} f="alliance" /></h4>Sympathy còn trên track: ${a.sympathyOnTrack} · Officer: ${a.officers} · Supporter: ${v.supporterCount} · Base trên bản đồ: ${Object.entries(a.basesOnBoard).filter(([, c]) => c !== null).map(([s, c]) => `${s} (ô ${(c as number) + 1})`).join(', ') || 'không'}
      ${v.supporters && html`<div>Supporter của bạn: <${Cards} cards=${v.supporters} /></div>`}</div>`}
    ${g && html`<div><h4><${Chip} f="vagabond" /></h4>Nhân vật: <b>${g.character ?? '—'}</b> · Item: ${items.join(', ') || '—'} · Hỏng: ${g.damaged.map(i => ITEM_NAME[i.type]).join(', ') || '—'}
      <div>Quan hệ: ${Object.entries(g.relationships).map(([f, r], i) => html`${i ? ' · ' : ''}${FACTION_NAME[f as FactionId]}: ${r === 'hostile' ? html`<b>Hostile</b>` : r === 3 ? html`<b>Allied</b>` : r}`)}${g.coalition ? ` · Coalition với ${FACTION_NAME[g.coalition]}` : ''}</div>
      <div>Quest đã xong: ${g.completedQuests.map(questName).join(', ') || '—'}</div></div>`}
    <div>Quest đang mở: ${v.questsAvailable.map(questName).join(' · ') || '—'}</div>
    <div>Item supply: ${Object.entries(v.itemSupply).map(([k, n]) => `${ITEM_NAME[k as keyof typeof ITEM_NAME]} ${n}`).join(', ')}</div>
    <div>Deck: ${v.deckCount} lá · Bỏ: ${v.discard.length} lá${v.availableDominance.length ? html` · Dominance có thể lấy: <${Cards} cards=${v.availableDominance} />` : ''}</div>`
}

function Log({ log }: { log: LogEntry[] }) {
  return html`<section class="card log"><h3>Nhật ký</h3>${[...log].reverse().slice(0, 30).map(l => html`
    <div key=${l.revision}>#${l.revision} <${Chip} f=${l.faction} /> ${GROUP[l.type] ?? l.type}${l.detail ? `: ${describe({ type: l.type, payload: l.detail } as Action)}` : ''}</div>`)}</section>`
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Board } from './Board'
import { appendFrames, nextIndex } from './playback'
import type { Card, Match, Meta, Player, Snapshot } from './types'
import './style.css'

async function request<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Không tải được dữ liệu (${response.status})`)
  return response.json() as Promise<T>
}

const FACTION_SUB: Record<string, string> = { guild: 'Industry & dominion', canopy: 'An oath to the sky', covenant: 'From whispers, a movement', ranger: 'No crown. No allegiance.' }
const PROFILE: Record<string, string> = { architect: 'The Architect', tactician: 'The Tactician', diplomat: 'The Diplomat', challenger: 'The Challenger' }

function Insignia({ faction }: { faction: string }) {
  return <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
    {faction === 'guild' ? <><path d="m11 35 4-19 9-8 9 8 4 19H11Z" /><path d="M18 35V24h12v11M15 16h18M24 8V3" /></>
      : faction === 'canopy' ? <><path d="m5 24 19-9 19 9-19 18L5 24Zm6 3 13-4 13 4M24 15V4m-6 6 6-6 6 6M24 23v19" /></>
      : faction === 'covenant' ? <><path d="M24 42V18M24 32C7 35 7 16 9 9c13 0 18 10 15 23Zm0-8c-3-11 8-17 17-17 1 12-6 21-17 17Z" /></>
      : <><path d="m24 4 7 13 13 7-13 7-7 13-7-13-13-7 13-7 7-13Z" /><circle cx="24" cy="24" r="6" /></>}
  </svg>
}

function FactionCard({ player: p, active, agent, onClick }: { player: Player; active: boolean; agent: string; onClick: () => void }) {
  return <button className={`faction-card ${active ? 'active' : ''}`} style={{ '--faction': p.color } as React.CSSProperties} onClick={onClick}>
    <div className="faction-card-top"><span className="insignia"><Insignia faction={p.faction} /></span>
      <span className="faction-heading"><span className="micro">{PROFILE[agent.split(':')[1]] || agent}</span><strong>{p.name}</strong></span>
      <span className="score">{p.dominance !== null ? '◇' : p.score}<small> / 30</small></span>
    </div>
    <div className="faction-card-bottom"><span>{FACTION_SUB[p.faction]}</span><span>{active ? '● THINKING' : 'VIEW FACTION ↗'}</span></div>
    <div className="score-track"><i style={{ width: `${Math.min(100, p.score / 30 * 100)}%` }} /></div>
  </button>
}

function CardList({ ids, cards }: { ids: number[] | undefined; cards: Card[] }) {
  if (!ids) return <p className="muted">Thông tin ẩn. Bật “Toàn cảnh” để xem.</p>
  if (!ids.length) return <p className="muted">Không có thẻ.</p>
  return <ul className="card-list">{ids.map(id => <li key={id}><span className={`suit-dot ${cards[id].suit}`} /><div><strong>{cards[id].name}</strong><small>{cards[id].effect.replaceAll('_', ' ')} · {cards[id].suit}</small></div><span>{cards[id].points ? `+${cards[id].points}` : '—'}</span></li>)}</ul>
}

function App() {
  const [meta, setMeta] = useState<Meta | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [matchId, setMatchId] = useState('')
  const [live, setLive] = useState<Snapshot | null>(null)
  const [frames, setFrames] = useState<Snapshot[]>([])
  const [mode, setMode] = useState<'live' | 'replay'>('live')
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [omniscient, setOmniscient] = useState(false)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [playerId, setPlayerId] = useState<number | null>(null)
  const [panel, setPanel] = useState<'archive' | 'about' | 'league' | null>(null)
  const [report, setReport] = useState<{ games: number; statuses: Record<string, number>; factions: Record<string, { wins: number; win_rate: number; ci95: number[] }> } | null>(null)
  const [replayLoading, setReplayLoading] = useState(false)
  const matchRef = useRef('')
  const modeRef = useRef(mode)
  useEffect(() => { modeRef.current = mode }, [mode])
  const modalRef = useRef<HTMLElement>(null)
  const modalOpen = Boolean(panel || playerId !== null)
  useEffect(() => {
    if (!modalOpen) return
    const previous = document.activeElement as HTMLElement | null
    const modal = modalRef.current
    modal?.focus()
    const trap = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setPanel(null); setPlayerId(null) }
      if (event.key !== 'Tab' || !modal) return
      const targets = Array.from(modal.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select, [tabindex="0"]'))
      const first = targets[0], last = targets[targets.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === modal)) {
        event.preventDefault(); last?.focus()
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === modal)) {
        event.preventDefault(); first?.focus()
      }
    }
    document.addEventListener('keydown', trap)
    return () => { document.removeEventListener('keydown', trap); previous?.focus() }
  }, [modalOpen])

  useEffect(() => {
    const controller = new AbortController()
    void request<Meta>('/api/meta', controller.signal).then(setMeta).catch(e => { if (!controller.signal.aborted) setError(String(e)) })
    const refresh = async () => {
      try {
        const data = await request<{ matches: Match[]; current: string | null; error: string | null }>('/api/matches', controller.signal)
        setMatches(data.matches)
        if (data.matches.length && (!matchRef.current || (modeRef.current === 'live' && data.current && data.current !== matchRef.current))) {
          const id = data.current || data.matches[0].id
          matchRef.current = id
          setMatchId(id)
        }
        if (data.error) setError(data.error)
      } catch (e) { if (!controller.signal.aborted) setError(String(e)) }
    }
    void refresh()
    const interval = window.setInterval(() => void refresh(), 5000)
    return () => { controller.abort(); window.clearInterval(interval) }
  }, [])

  useEffect(() => {
    if (!matchId) return
    let disposed = false
    let ws: WebSocket | null = null
    let retry: ReturnType<typeof setTimeout>
    const controller = new AbortController()
    setLive(null)
    setFrames([])
    setIndex(0)
    setPlaying(false)
    const connect = () => {
      if (disposed) return
      ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/watch/${matchId}?omniscient=${omniscient}`)
      ws.onopen = () => { setConnected(true); setError('') }
      ws.onmessage = event => {
        const data = JSON.parse(event.data) as { type: string; state: Snapshot }
        if (data.type === 'snapshot') setLive(data.state)
      }
      ws.onclose = () => { setConnected(false); if (!disposed) retry = setTimeout(connect, 1500) }
      ws.onerror = () => setError('Mất kết nối. Đang tự kết nối lại…')
    }
    void request<Snapshot>(`/api/matches/${matchId}/snapshot?omniscient=${omniscient}`, controller.signal)
      .then(snapshot => { setLive(snapshot); connect() }).catch(e => { if (!disposed) setError(String(e)) })
    return () => { disposed = true; controller.abort(); clearTimeout(retry); ws?.close() }
  }, [matchId, omniscient])

  useEffect(() => {
    if (mode !== 'replay' || !matchId) return
    const controller = new AbortController()
    setReplayLoading(true)
    setFrames([])
    setIndex(0)
    const load = async () => {
      let cursor = -1
      try {
        while (!controller.signal.aborted) {
          const data = await request<{ frames: Snapshot[]; cursor: number }>(`/api/matches/${matchId}/frames?after=${cursor}&limit=60&omniscient=${omniscient}`, controller.signal)
          if (!data.frames.length) break
          setFrames(existing => appendFrames(existing, data.frames))
          cursor = data.cursor
          if (data.frames.length < 60) break
        }
      } catch (e) { if (!controller.signal.aborted) setError(String(e)) }
      finally { if (!controller.signal.aborted) setReplayLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [mode, matchId, omniscient])

  useEffect(() => {
    if (!playing || mode !== 'replay') return
    const timer = window.setInterval(() => setIndex(i => nextIndex(i, frames.length)), 900 / speed)
    return () => window.clearInterval(timer)
  }, [playing, mode, speed, frames.length])

  const state = mode === 'replay' ? frames[index] ?? live : live
  const activeMatch = matches.find(m => m.id === matchId)
  const selectClearing = useCallback((id: number) => setSelected(id), [])
  const player = state?.players.find(p => p.id === playerId)
  const clearing = state?.clearings.find(c => c.id === selected)
  const chronicle = state ? [...state.events].filter(e => e.kind !== 'action' || !e.text.includes(': advance')).slice(-12).reverse() : []

  const openMatch = (id: string) => {
    matchRef.current = id; setMatchId(id); setMode('replay'); setPanel(null); setSelected(null)
  }

  const openLeague = () => {
    setPanel('league')
    void request<typeof report>('/api/report').then(setReport).catch(e => setError(String(e)))
  }

  return <>
    <header className="site-header">
      <a href="/" className="brand" aria-label="Root, trang chủ"><span className="brand-emblem">✳</span><span>root<span className="brand-small">AI STRATEGY THEATRE</span></span></a>
      <nav aria-label="Điều hướng chính"><button className={panel === null ? 'nav-active' : ''} onClick={() => setPanel(null)}>Đấu trường</button><button onClick={openLeague}>Phòng nghiên cứu</button><button onClick={() => setPanel('archive')}>Kho trận đấu</button></nav>
      <div className="local-tag"><span />LOCAL & OPEN SOURCE</div>
    </header>

    <main>
      <section className="intro">
        <div><p className="eyebrow">FOUR MINDS. ONE WOODLAND.</p><h1>Nơi những nước đi<br /><em>kể một câu chuyện.</em></h1></div>
        <div className="intro-note"><span className="mini-mark">✧</span><p>Bốn trí tuệ nhân tạo.<br />Bốn con đường đến chiến thắng.<br /><strong>Bạn chỉ cần quan sát.</strong></p><button className="text-link" onClick={() => setPanel('about')}>Về thí nghiệm này ↗</button></div>
      </section>

      {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')} aria-label="Đóng thông báo">×</button></div>}

      <section aria-label="Bốn phe thi đấu" className="faction-grid">{state?.players.map(p => <FactionCard key={p.id} player={p} active={state.actor === p.id && state.status === 'playing'} agent={activeMatch?.meta.agents[p.id] || 'heuristic:architect'} onClick={() => setPlayerId(p.id)} />)}</section>

      <div className="arena-layout">
        <section className="board-shell" aria-label="Bàn chơi">
          <div className="board-toolbar"><div><span className={`status-pill ${mode === 'live' && state?.status === 'playing' ? 'is-live' : ''}`}><i />{mode === 'replay' ? 'REPLAY' : state?.status === 'playing' ? 'LIVE ARENA' : 'MATCH ARCHIVE'}</span><span className="match-label">{matchId ? `#${matchId.slice(0, 6).toUpperCase()}` : 'WAITING FOR MATCH'}</span></div>
            <label className="vision-toggle"><input type="checkbox" checked={omniscient} onChange={e => setOmniscient(e.target.checked)} /><span>Toàn cảnh</span><span title="Chỉ khán giả được xem thông tin ẩn. AI vẫn chỉ biết thông tin của mình.">ⓘ</span></label></div>
          {state ? <Board state={state} selected={selected} onSelect={selectClearing} /> : <div className="empty-board"><span>❧</span><h2>Khu rừng đang chờ.</h2><p>Khởi động một trận từ máy chủ để các AI bắt đầu thi đấu.</p><code>./scripts/run.sh serve --host 0.0.0.0</code></div>}
          {state?.status === 'finished' && <div className="victory-strip"><span>✦</span><strong>{state.players[state.winner!].name}</strong> giành chiến thắng · {state.turn} lượt</div>}
          {state && state.status !== 'playing' && state.status !== 'finished' && <div className="victory-strip">Trận kết thúc: {state.status}. Không gán người thắng.</div>}
          <div className="playback-toolbar"><div className="view-mode"><button className={mode === 'live' ? 'selected' : ''} onClick={() => { setMode('live'); setPlaying(false) }}>Trực tiếp</button><button className={mode === 'replay' ? 'selected' : ''} onClick={() => { setMode('replay'); setPlaying(true) }}>Xem lại</button></div>
            {mode === 'replay' ? <div className="replay-controls"><button aria-label={playing ? 'Tạm dừng replay' : 'Phát replay'} onClick={() => setPlaying(!playing)} disabled={!frames.length}>{playing ? 'Ⅱ' : '▶'}</button><input aria-label="Vị trí replay" type="range" min="0" max={Math.max(0, frames.length - 1)} value={index} onChange={e => setIndex(Number(e.target.value))} /><span>{index + (frames.length ? 1 : 0)}/{frames.length}{replayLoading ? '…' : ''}</span><select aria-label="Tốc độ replay" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value=".5">0.5×</option><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></div>
              : <span className="connection-label"><i className={connected ? 'connected' : ''} />{connected ? 'Đồng bộ với máy chủ' : 'Chờ kết nối'}</span>}
          </div>
          <div className="map-legend"><span><i className="fox" />Hỏa thổ</span><span><i className="rabbit" />Đồng cỏ</span><span><i className="mouse" />Thủy địa</span><span>◇ Phế tích</span><span>❧ Ủng hộ</span></div>
        </section>

        <aside className="chronicle">
          <div className="chronicle-heading"><span className="eyebrow">THE WOODLAND CHRONICLE</span><h2>Diễn biến trận đấu<span>↙</span></h2></div>
          <div className="turn-summary"><div><span className="micro">LƯỢT HIỆN TẠI</span><strong>{state?.turn.toString().padStart(2, '0') || '—'}</strong></div><div><span className="micro">GIAI ĐOẠN</span><strong className="phase-label">{state?.phase.replaceAll('_', ' ') || 'Đang chờ'}</strong></div></div>
          <ol className="event-list" aria-live="off">{chronicle.map((event, i) => <li key={`${event.seq}-${i}`} className={i === 0 ? 'latest-event' : ''}><span className="event-tick" style={{ background: event.player !== undefined ? state?.players[event.player]?.color : '#ad9c74' }} /><div><span className="micro">LƯỢT {event.turn} · {event.kind.toUpperCase()}</span><p>{event.text}</p></div></li>)}</ol>
          {!chronicle.length && <p className="muted">Diễn biến sẽ xuất hiện khi trận đấu bắt đầu.</p>}
          <div className="observer-note"><span>◉</span><p>Chế độ khán giả<br /><small>Mọi quyết định đều do AI thực hiện.</small></p></div>
        </aside>
      </div>

      {clearing && state && <section className="clearing-detail"><div><span className="eyebrow">CLEARING {clearing.id + 1}</span><h2>{clearing.name}</h2></div><div>{state.players.map(p => <span key={p.id} style={{ color: p.color }}>{p.name}: <strong>{clearing.warriors[p.id]}</strong></span>)}</div><p>{clearing.buildings.map(b => `${state.players[b.player].name} / ${b.kind}`).join(' · ') || 'Chưa có công trình'} · {clearing.slots} ô xây dựng</p><button onClick={() => setSelected(null)} aria-label="Đóng chi tiết vùng">×</button></section>}

      <details className="accessible-board"><summary>Bảng trạng thái các vùng · thay thế bản đồ</summary><div className="table-wrap"><table><thead><tr><th>Vùng</th><th>Địa hình</th>{state?.players.map(p => <th key={p.id}>{p.name}</th>)}<th>Công trình</th></tr></thead><tbody>{state?.clearings.map(c => <tr key={c.id}><th><button onClick={() => setSelected(c.id)}>{c.name}</button></th><td>{c.suit}</td>{c.warriors.map((n, i) => <td key={i}>{n}</td>)}<td>{c.buildings.map(b => b.kind).join(', ') || '—'}</td></tr>)}</tbody></table></div></details>

      <footer><span>ROOT <i> / </i> {meta?.ruleset || 'LOCAL RESEARCH BUILD'}</span><button onClick={() => setPanel('about')}>Luật thử nghiệm · xem những khác biệt ↗</button><span>CRAFTED FOR CURIOSITY. RUNS LOCALLY.</span></footer>
    </main>

    {(panel || player) && <div className="modal-backdrop" onClick={() => { setPanel(null); setPlayerId(null) }}><section className="modal" role="dialog" aria-modal="true" aria-label={player?.name || 'Thông tin đấu trường'} onClick={e => e.stopPropagation()} tabIndex={-1} ref={modalRef}><button className="modal-close" onClick={() => { setPanel(null); setPlayerId(null) }} aria-label="Đóng">×</button>
      {player && meta ? <><span className="eyebrow">FACTION DOSSIER</span><h2>{player.name}</h2><p>{FACTION_SUB[player.faction]}</p><div className="dossier-stats"><span>Điểm <strong>{player.score}</strong></span><span>Quân dự bị <strong>{player.reserve}</strong></span><span>Thẻ bài <strong>{player.hand?.length ?? player.hand_count}</strong></span><span>Sĩ quan <strong>{player.officers}</strong></span></div>
        <h3>Bài trên tay</h3><CardList ids={player.hand} cards={meta.cards} />
        {player.faction === 'covenant' && <><h3>Ủng hộ viên</h3><CardList ids={player.supporters} cards={meta.cards} /></>}
        {player.faction === 'canopy' && <><h3>Sắc lệnh · {player.leader}</h3>{Object.entries(player.decree).map(([kind, cards]) => <p key={kind}>{kind}: {cards.map(c => c.suit).join(' · ') || '—'}</p>)}</>}
        {!!player.items.length && <><h3>Hành trang</h3><div className="item-list">{player.items.map(i => <span key={i.id} className={i.damaged ? 'damaged' : i.exhausted ? 'exhausted' : ''}>{i.kind} {i.damaged ? '✕' : i.exhausted ? '◌' : '✓'}</span>)}</div></>}
        <h3>Hiệu ứng đã chế tạo</h3><CardList ids={player.effects} cards={meta.cards} />
      </> : panel === 'archive' ? <><span className="eyebrow">THE ARCHIVES</span><h2>Mỗi trận, một câu chuyện.</h2>{matches.length ? <ul className="archive-list">{matches.map(m => <li key={m.id}><button onClick={() => openMatch(m.id)}><span><strong>#{m.id.slice(0, 6).toUpperCase()}</strong><small>{new Date(m.created * 1000).toLocaleString('vi-VN')} · seed {m.seed}</small></span><span>{m.status}<small>Xem lại ↗</small></span></button></li>)}</ul> : <p>Chưa có trận đấu được lưu.</p>}</>
      : panel === 'league' ? <><span className="eyebrow">RESEARCH LAB</span><h2>Thực lực cần được đo.</h2>{report ? <><p>{report.games.toLocaleString('vi-VN')} trận kiểm tra · {JSON.stringify(report.statuses)}</p><table><thead><tr><th>Phe</th><th>Thắng</th><th>Tỷ lệ</th><th>Khoảng 95%</th></tr></thead><tbody>{Object.entries(report.factions).map(([f, r]) => <tr key={f}><th>{f}</th><td>{r.wins}</td><td>{(r.win_rate * 100).toFixed(1)}%</td><td>{r.ci95.map(n => (n * 100).toFixed(1)).join('–')}%</td></tr>)}</tbody></table><p className="muted">Kết quả thuộc bộ luật thử nghiệm, không phải chứng nhận trình độ Root.</p></> : <><p>Chưa có báo cáo đánh giá. Chủ máy có thể chạy:</p><code>./scripts/run.sh evaluate --games 1000</code></>}</>
      : <><span className="eyebrow">AN OPEN EXPERIMENT</span><h2>Một khu rừng.<br />Nhiều cách suy nghĩ.</h2><p>Root là phòng thí nghiệm chiến thuật bất đối xứng chạy trên máy của bạn. Các AI chơi, khán giả quan sát. Không API, không dịch vụ trả phí, không cần Internet khi chạy.</p><h3>Trạng thái luật</h3><p>Đây là <strong>bộ luật thử nghiệm</strong>, chưa tương đương toàn bộ Root Digital.</p><ul>{meta?.differences.map(d => <li key={d}>{d}</li>)}</ul><p className="muted">Tham chiếu: {meta?.reference}. Xem docs/RULES.md trong mã nguồn để biết phạm vi và phần còn thiếu.</p><h3>AI hoạt động thế nào?</h3><p>Bot chiến thuật, tìm kiếm Monte Carlo và mô hình PyTorch dùng cùng một bộ luật. AI chỉ nhận thông tin của ghế mình, ngay cả khi bạn bật Toàn cảnh. Tên player thể hiện cấu hình đánh giá, không phải bốn mô hình cao thủ đã được huấn luyện.</p></>}
    </section></div>}
  </>
}

createRoot(document.getElementById('root')!).render(<App />)

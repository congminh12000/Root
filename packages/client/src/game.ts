import type { Action, FactionId, LastRoll, PlayerView } from '@root/game-engine'
import { changedClearings, renderBoard } from './board.ts'
import { cardChip, cardDetail } from './cardview.ts'
import { clearingsOf, describe, GROUP } from './describe.ts'
import { roomKey } from './lobby.ts'
import { freshRoll, travelsSince, type LogEntry, type Travel } from './motion.ts'
import { cardName, FACTION_COLOR, FACTION_NAME, ITEM_NAME, PHASE_NAME, questName, STEP_NAME } from './names.ts'

interface Update {
  type: 'update'; gameId: string; seat: FactionId | null; view: PlayerView; legal: Action[]
  seats: { faction: FactionId; kind: string; name: string; connected: boolean }[]
  log: LogEntry[]
  deadline: number | null
  now: number
}
type Message = Update | { type: 'rejected'; actionId: string; result: { code: string; message: string } } | { type: 'error'; message: string }

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const card = (c: string) => cardChip(c, cardName(c))
const faction = (f: FactionId) => `<span class="fchip" style="background:${FACTION_COLOR[f]}">${FACTION_NAME[f]}</span>`

/** One game: a WebSocket to the server, re-rendered on every update. The client never decides legality. */
export function renderGame(root: HTMLElement, gameId: string, token: string | null) {
  let last: Update | null = null
  let highlight: number[] = []
  let notice = ''
  let socket: WebSocket | null = null
  let counter = 0
  let localDeadline: number | null = null
  /** Clearings and scores that changed with the latest update; animated once, then cleared. */
  let changed: number[] = []
  let scored: FactionId[] = []
  let travels: Travel[] = []

  function connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const auth = token ? `&token=${encodeURIComponent(token)}` : `&key=${encodeURIComponent(roomKey())}`
    socket = new WebSocket(`${proto}://${location.host}/ws?game=${encodeURIComponent(gameId)}${auth}`)
    socket.onmessage = ev => {
      const msg = JSON.parse(ev.data) as Message
      if (msg.type === 'update') {
        localDeadline = msg.deadline === null ? null : Date.now() + (msg.deadline - msg.now)
        changed = last ? changedClearings(last.view, msg.view) : []
        scored = last ? (Object.keys(msg.view.score) as FactionId[]).filter(f => msg.view.score[f] !== last!.view.score[f]) : []
        travels = last ? travelsSince(last.view, msg.log) : []
        const roll = freshRoll(last?.view ?? null, msg.view)
        last = msg; notice = ''; highlight = filter === null ? [] : [filter]; draw()
        if (roll) showDice(roll)
        changed = []; scored = []; travels = []
      }
      else if (msg.type === 'rejected') { notice = `Máy chủ từ chối: ${msg.result.code}`; draw() }
      else { notice = msg.message; draw() }
    }
    socket.onclose = () => { notice = 'Mất kết nối, đang nối lại…'; draw(); setTimeout(connect, 1500) }
  }

  /** The latest battle roll over the board for a few seconds: both dice, then the hits each side deals. */
  let diceTimer: ReturnType<typeof setTimeout> | undefined
  function showDice(r: LastRoll) {
    const el = root.querySelector<HTMLElement>('.dice')
    if (!el) return
    const die = (n: number) => `<span class="die" style="background:#6b5537">${n}</span>`
    el.innerHTML = `${die(r.dice[0])}${die(r.dice[1])}<div class="what">${faction(r.attacker)} đánh ${faction(r.defender)} ở ô ${r.clearing + 1}<br>
      ${FACTION_NAME[r.attacker]} gây <b>${r.hits.attacker}</b> hit, ${FACTION_NAME[r.defender]} gây <b>${r.hits.defender}</b>${r.defender === 'alliance' ? ' (Guerrilla: Alliance lấy số cao)' : ''}</div>`
    el.hidden = false
    // Restart the entry animations when two rolls come back to back.
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''
    clearTimeout(diceTimer)
    diceTimer = setTimeout(() => { el.hidden = true }, 3500)
  }

  function send(action: Action) {
    if (!last || !socket) return
    socket.send(JSON.stringify({ type: 'command', actionId: `${Date.now()}-${counter++}`, expectedRevision: last.view.revision, action }))
  }

  function factionBoards(v: PlayerView): string {
    const out: string[] = []
    const m = v.factions.marquise, e = v.factions.eyrie, a = v.factions.alliance, g = v.factions.vagabond
    if (m) out.push(`<div><h4>${faction('marquise')}</h4>Gỗ trong kho: ${m.woodSupply} · Chiến binh trong kho: ${m.warriorSupply} · Công trình còn trên track: sawmill ${m.buildingsOnTrack.sawmill}, workshop ${m.buildingsOnTrack.workshop}, recruiter ${m.buildingsOnTrack.recruiter}${m.keep === null && v.turn.number > 0 ? ' · <b>đã mất keep</b>' : ''}</div>`)
    if (e) out.push(`<div><h4>${faction('eyrie')}</h4>Leader: <b>${e.leader ?? '—'}</b> · Roost còn trên track: ${e.roostsOnTrack} · Chiến binh trong kho: ${e.warriorSupply}
      <div class="decree">${(['recruit', 'move', 'battle', 'build'] as const).map(col => `<div><b>${col}</b>${e.decree[col].map((d, i) => `<div class="${e.resolved[col].includes(i) ? 'done' : ''}">${d.kind === 'vizier' ? 'Vizier (chim)' : esc(cardName(d.id))}</div>`).join('')}</div>`).join('')}</div></div>`)
    if (a) out.push(`<div><h4>${faction('alliance')}</h4>Sympathy còn trên track: ${a.sympathyOnTrack} · Officer: ${a.officers} · Supporter: ${v.supporterCount} · Base trên bản đồ: ${Object.entries(a.basesOnBoard).filter(([, c]) => c !== null).map(([s, c]) => `${s} (ô ${(c as number) + 1})`).join(', ') || 'không'}
      ${v.supporters ? `<div>Supporter của bạn: ${v.supporters.map(card).join(' ') || '—'}</div>` : ''}</div>`)
    if (g) {
      const items = [...g.satchel.map(i => `${ITEM_NAME[i.type]}${i.exhausted ? ' (úp)' : ''}`), ...(['tea', 'coin', 'bag'] as const).flatMap(t => Array.from({ length: g.tracks[t] }, () => `${ITEM_NAME[t]} (track)`))]
      out.push(`<div><h4>${faction('vagabond')}</h4>Nhân vật: <b>${g.character ?? '—'}</b> · Item: ${items.join(', ') || '—'} · Hỏng: ${g.damaged.map(i => ITEM_NAME[i.type]).join(', ') || '—'}
        <div>Quan hệ: ${Object.entries(g.relationships).map(([f, r]) => `${FACTION_NAME[f as FactionId]}: ${r === 'hostile' ? '<b>Hostile</b>' : r === 3 ? '<b>Allied</b>' : r}`).join(' · ')}${g.coalition ? ` · Coalition với ${FACTION_NAME[g.coalition]}` : ''}</div>
        <div>Quest đã xong: ${g.completedQuests.map(questName).join(', ') || '—'}</div></div>`)
    }
    out.push(`<div>Quest đang mở: ${v.questsAvailable.map(questName).join(' · ') || '—'}</div>`)
    out.push(`<div>Item supply: ${Object.entries(v.itemSupply).map(([k, n]) => `${ITEM_NAME[k as keyof typeof ITEM_NAME]} ${n}`).join(', ')}</div>`)
    out.push(`<div>Deck: ${v.deckCount} lá · Bỏ: ${v.discard.length} lá${v.availableDominance.length ? ` · Dominance có thể lấy: ${v.availableDominance.map(card).join(' ')}` : ''}</div>`)
    return out.join('')
  }

  function actions(legal: Action[]): string {
    const shown = filter === null ? legal : legal.filter(a => clearingsOf(a).includes(filter!))
    if (!legal.length) return ''
    const head = filter === null ? '' : `<div class="filter">Đang lọc ô ${filter + 1} (${shown.length}/${legal.length}) <button data-clear="1">Bỏ lọc</button></div>`
    const groups = new Map<string, Action[]>()
    for (const a of shown) groups.set(a.type, [...(groups.get(a.type) ?? []), a])
    return head + [...groups].map(([type, list]) => list.length === 1
      ? `<div class="group"><button data-act="${legal.indexOf(list[0]!)}">${esc(GROUP[type] ?? type)}${list[0]!.type === 'end-step' || list[0]!.type.startsWith('decline') ? '' : `: ${esc(describe(list[0]!))}`}</button></div>`
      : `<div class="group"><label>${esc(GROUP[type] ?? type)} (${list.length})</label>
          <select data-group="${type}">${list.map(a => `<option value="${legal.indexOf(a)}">${esc(describe(a))}</option>`).join('')}</select>
          <button data-go="${type}">Thực hiện</button></div>`).join('')
  }

  // ── Board: 3D (Three.js, loaded on demand) or 2D SVG; it lives outside the panel that re-renders. ──
  let mode: '3d' | '2d' = (() => { try { return localStorage.getItem('root-board') === '2d' ? '2d' : '3d' } catch { return '3d' } })()
  let filter: number | null = null
  let board3d: { update(v: PlayerView, h: number[], changed?: number[], travels?: Travel[]): void; dispose(): void } | null = null
  let loading3d = false

  const pick = (c: number) => { filter = filter === c ? null : c; highlight = filter === null ? [] : [filter]; draw() }

  function drawBoard() {
    const host = root.querySelector<HTMLElement>('.map')
    if (!host || !last) return
    if (mode === '3d') {
      if (board3d) { board3d.update(last.view, highlight, changed, travels); return }
      if (loading3d) return
      loading3d = true
      void import('./board3d.ts').then(m => {
        loading3d = false
        if (!m.webglAvailable()) { mode = '2d'; drawBoard(); return }
        host.innerHTML = ''
        board3d = m.mountBoard3D(host, pick)
        if (last) board3d.update(last.view, highlight)
      })
      return
    }
    if (board3d) { board3d.dispose(); board3d = null }
    host.innerHTML = renderBoard(last.view, highlight, changed, travels)
    host.querySelectorAll<SVGElement>('[data-clearing]').forEach(el => el.addEventListener('click', () => pick(Number(el.dataset.clearing))))
  }

  function skeleton() {
    if (root.querySelector('.layout')) return
    root.innerHTML = `<div class="top"></div><div class="layout">
      <div class="board-col"><div class="board-tools"><button data-mode="3d">3D</button><button data-mode="2d">2D</button><span>Bấm vào một ô để lọc lựa chọn. Kéo để xoay, cuộn để phóng to.</span></div><div class="map"></div><div class="dice" hidden></div></div>
      <aside></aside></div><div class="carddetail" hidden></div>`
    // Any card chip opens its details; the panel survives re-renders.
    const panel = root.querySelector<HTMLElement>('.carddetail')!
    root.addEventListener('click', ev => {
      const el = ev.target as HTMLElement
      const chip = el.closest<HTMLElement>('[data-card]')
      if (chip) { panel.innerHTML = cardDetail(chip.dataset.card!); panel.hidden = false; return }
      if (el.closest('[data-close-card]') || !el.closest('.carddetail')) panel.hidden = true
    })
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape') panel.hidden = true })
    root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.addEventListener('click', () => {
      mode = b.dataset.mode as '3d' | '2d'
      try { localStorage.setItem('root-board', mode) } catch { /* private mode */ }
      drawBoard(); markMode()
    }))
  }
  const markMode = () => root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === mode))

  function draw() {
    if (!last) { root.innerHTML = `<p class="loading">Đang kết nối trận ${esc(gameId)}… ${esc(notice)}</p>`; return }
    skeleton()
    markMode()
    const { view: v, legal, seats, seat } = last
    const active = v.waitingOn[0]
    root.querySelector('.top')!.innerHTML = `
      <header class="bar">
        <a href="./">← Sảnh</a>
        <span>Trận <b>${esc(last.gameId)}</b></span>
        <span>Lượt ${v.turn.number} · ${PHASE_NAME[v.turn.phase]} · ${esc(STEP_NAME[v.turn.step] ?? v.turn.step)}</span>
        <span>Đang chờ: ${v.waitingOn.map(faction).join(' ') || '—'}</span>
        <span>${seat ? `Bạn là ${faction(seat)}` : 'Khán giả'}</span>
        <span class="clock" id="clock"></span>
      </header>
      ${v.winner ? `<div class="winner">Kết thúc: ${v.winner.factions.map(faction).join(' + ')} thắng (${v.winner.reason})</div>` : ''}
      ${notice ? `<div class="notice">${esc(notice)}</div>` : ''}`
    const aside = root.querySelector('aside')!
    aside.innerHTML = `
          <section class="card"><h3>Điểm</h3>${seats.map(s => `<div class="score${scored.includes(s.faction) ? ' bump' : ''}">${faction(s.faction)} <b>${v.score[s.faction] ?? 'dominance'}</b> · ${s.kind === 'bot' ? 'bot' : esc(s.name)}${s.kind === 'human' && !s.connected ? ' (vắng)' : ''} · ${v.handCounts[s.faction] ?? 0} lá${s.faction === active ? ' ◀' : ''}</div>`).join('')}</section>
          ${seat ? `<section class="card"><h3>Bài của bạn</h3>${v.hand.map(card).join(' ') || '—'}
            ${v.playAreas[seat]?.length ? `<div>Play area: ${v.playAreas[seat]!.map(card).join(' ')}</div>` : ''}
            ${v.revealed.map(r => `<div>Bài của ${faction(r.of)}: ${r.cards.map(card).join(' ') || '—'}</div>`).join('')}</section>` : ''}
          ${legal.length ? `<section class="card act"><h3>Lựa chọn của bạn</h3>${actions(legal)}</section>` : ''}
          <section class="card"><h3>Bảng phe</h3>${factionBoards(v)}</section>
          <section class="card log"><h3>Nhật ký</h3>${[...last.log].reverse().slice(0, 30).map(l => `<div>#${l.revision} ${faction(l.faction)} ${esc(GROUP[l.type] ?? l.type)}${l.detail ? `: ${esc(describe({ type: l.type, payload: l.detail } as Action))}` : ''}</div>`).join('')}</section>`
    aside.querySelectorAll<HTMLButtonElement>('button[data-act]').forEach(b => b.addEventListener('click', () => send(legal[Number(b.dataset.act)]!)))
    aside.querySelectorAll<HTMLButtonElement>('button[data-go]').forEach(b => b.addEventListener('click', () => {
      const sel = aside.querySelector<HTMLSelectElement>(`select[data-group="${b.dataset.go}"]`)!
      send(legal[Number(sel.value)]!)
    }))
    aside.querySelector<HTMLButtonElement>('button[data-clear]')?.addEventListener('click', () => { filter = null; highlight = []; draw() })
    aside.querySelectorAll<HTMLSelectElement>('select[data-group]').forEach(sel => {
      const lightUp = () => { highlight = clearingsOf(legal[Number(sel.value)]!); drawBoard() }
      sel.addEventListener('change', lightUp)
      sel.addEventListener('focus', lightUp)
    })
    drawBoard()
  }

  /** Countdown for the human the game waits on (90 s by default); a bot decides once when it reaches zero. */
  setInterval(() => {
    const el = root.querySelector('#clock')
    if (!el || !last) return
    const left = localDeadline === null ? null : Math.max(0, Math.ceil((localDeadline - Date.now()) / 1000))
    el.textContent = left === null ? '' : `⏱ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
    el.classList.toggle('urgent', left !== null && left <= 15)
  }, 250)

  draw()
  connect()
}

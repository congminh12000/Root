import type { Action, FactionId, PlayerView } from '@root/game-engine'
import { renderBoard } from './board.ts'
import { clearingsOf, describe, GROUP } from './describe.ts'
import { cardDesign, cardName, FACTION_COLOR, FACTION_NAME, ITEM_NAME, PHASE_NAME, questName, STEP_NAME, SUIT_COLOR } from './names.ts'

interface Update {
  type: 'update'; gameId: string; seat: FactionId | null; view: PlayerView; legal: Action[]
  seats: { faction: FactionId; kind: string; name: string; connected: boolean }[]
  log: { revision: number; faction: FactionId; type: string; detail?: unknown }[]
}
type Message = Update | { type: 'rejected'; actionId: string; result: { code: string; message: string } } | { type: 'error'; message: string }

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const card = (c: string) => `<span class="cardchip" style="border-color:${SUIT_COLOR[cardDesign(c).suit]}">${esc(cardName(c))}</span>`
const faction = (f: FactionId) => `<span class="fchip" style="background:${FACTION_COLOR[f]}">${FACTION_NAME[f]}</span>`

/** One game: a WebSocket to the server, re-rendered on every update. The client never decides legality. */
export function renderGame(root: HTMLElement, gameId: string, token: string | null) {
  let last: Update | null = null
  let highlight: number[] = []
  let notice = ''
  let socket: WebSocket | null = null
  let counter = 0

  function connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    socket = new WebSocket(`${proto}://${location.host}/ws?game=${encodeURIComponent(gameId)}${token ? `&token=${encodeURIComponent(token)}` : ''}`)
    socket.onmessage = ev => {
      const msg = JSON.parse(ev.data) as Message
      if (msg.type === 'update') { last = msg; notice = ''; highlight = []; draw() }
      else if (msg.type === 'rejected') { notice = `Máy chủ từ chối: ${msg.result.code}`; draw() }
      else { notice = msg.message; draw() }
    }
    socket.onclose = () => { notice = 'Mất kết nối, đang nối lại…'; draw(); setTimeout(connect, 1500) }
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
    if (!legal.length) return ''
    const groups = new Map<string, Action[]>()
    for (const a of legal) groups.set(a.type, [...(groups.get(a.type) ?? []), a])
    return [...groups].map(([type, list]) => list.length === 1
      ? `<div class="group"><button data-act="${legal.indexOf(list[0]!)}">${esc(GROUP[type] ?? type)}${list[0]!.type === 'end-step' || list[0]!.type.startsWith('decline') ? '' : `: ${esc(describe(list[0]!))}`}</button></div>`
      : `<div class="group"><label>${esc(GROUP[type] ?? type)} (${list.length})</label>
          <select data-group="${type}">${list.map(a => `<option value="${legal.indexOf(a)}">${esc(describe(a))}</option>`).join('')}</select>
          <button data-go="${type}">Thực hiện</button></div>`).join('')
  }

  function draw() {
    if (!last) { root.innerHTML = `<p class="loading">Đang kết nối trận ${esc(gameId)}… ${esc(notice)}</p>`; return }
    const { view: v, legal, seats, seat } = last
    const active = v.waitingOn[0]
    root.innerHTML = `
      <header class="bar">
        <a href="./">← Sảnh</a>
        <span>Trận <b>${esc(last.gameId)}</b></span>
        <span>Lượt ${v.turn.number} · ${PHASE_NAME[v.turn.phase]} · ${esc(STEP_NAME[v.turn.step] ?? v.turn.step)}</span>
        <span>Đang chờ: ${v.waitingOn.map(faction).join(' ') || '—'}</span>
        <span>${seat ? `Bạn là ${faction(seat)}` : 'Khán giả'}</span>
      </header>
      ${v.winner ? `<div class="winner">Kết thúc: ${v.winner.factions.map(faction).join(' + ')} thắng (${v.winner.reason})</div>` : ''}
      ${notice ? `<div class="notice">${esc(notice)}</div>` : ''}
      <div class="layout">
        <div class="map">${renderBoard(v, highlight)}</div>
        <aside>
          <section class="card"><h3>Điểm</h3>${seats.map(s => `<div class="score">${faction(s.faction)} <b>${v.score[s.faction] ?? 'dominance'}</b> · ${s.kind === 'bot' ? 'bot' : esc(s.name)}${s.kind === 'human' && !s.connected ? ' (vắng)' : ''} · ${v.handCounts[s.faction] ?? 0} lá${s.faction === active ? ' ◀' : ''}</div>`).join('')}</section>
          ${seat ? `<section class="card"><h3>Bài của bạn</h3>${v.hand.map(card).join(' ') || '—'}
            ${v.playAreas[seat]?.length ? `<div>Play area: ${v.playAreas[seat]!.map(card).join(' ')}</div>` : ''}
            ${v.revealed.map(r => `<div>Bài của ${faction(r.of)}: ${r.cards.map(card).join(' ') || '—'}</div>`).join('')}</section>` : ''}
          ${legal.length ? `<section class="card act"><h3>Lựa chọn của bạn</h3>${actions(legal)}</section>` : ''}
          <section class="card"><h3>Bảng phe</h3>${factionBoards(v)}</section>
          <section class="card log"><h3>Nhật ký</h3>${[...last.log].reverse().slice(0, 30).map(l => `<div>#${l.revision} ${faction(l.faction)} ${esc(GROUP[l.type] ?? l.type)}${l.detail ? `: ${esc(describe({ type: l.type, payload: l.detail } as Action))}` : ''}</div>`).join('')}</section>
        </aside>
      </div>`
    root.querySelectorAll<HTMLButtonElement>('button[data-act]').forEach(b => b.addEventListener('click', () => send(legal[Number(b.dataset.act)]!)))
    root.querySelectorAll<HTMLButtonElement>('button[data-go]').forEach(b => b.addEventListener('click', () => {
      const sel = root.querySelector<HTMLSelectElement>(`select[data-group="${b.dataset.go}"]`)!
      send(legal[Number(sel.value)]!)
    }))
    root.querySelectorAll<HTMLSelectElement>('select[data-group]').forEach(sel => {
      const lightUp = () => { highlight = clearingsOf(legal[Number(sel.value)]!); root.querySelector('.map')!.innerHTML = renderBoard(v, highlight) }
      sel.addEventListener('change', lightUp)
      sel.addEventListener('focus', lightUp)
    })
  }

  draw()
  connect()
}

import type { FactionId } from '@root/game-engine'
import { FACTION_NAME } from './names.ts'

interface Summary { id: string; createdAt: string; seats: { faction: FactionId; kind: string; name: string; connected: boolean }[]; turn: number; winner: FactionId[] | null }

const FACTIONS: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']

/** Room password kept in this browser only (multiplayer.md). */
export const roomKey = () => { try { return localStorage.getItem('root-room-key') ?? '' } catch { return '' } }
const setRoomKey = (k: string) => { try { localStorage.setItem('root-room-key', k) } catch { /* private mode */ } }
const api = (path: string, init: RequestInit = {}) => fetch(path, { ...init, headers: { ...(init.headers ?? {}), 'x-room-key': roomKey() } })
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** Lobby: create a game (each seat human or bot) and list games on this server. */
export async function renderLobby(root: HTMLElement) {
  root.innerHTML = `
    <main class="lobby">
      <h1>Root — chơi trong mạng LAN</h1>
      <p class="note">Bản dùng cá nhân. Luật theo Leder Rules Library p16. Đồ họa tự vẽ, không dùng art chính thức.</p>
      <section class="card" id="keybox" hidden><h2>Mật khẩu phòng</h2>
        <input id="key" type="password" placeholder="Mật khẩu do chủ máy đặt"> <button id="savekey">Lưu</button> <span id="keymsg"></span></section>
      <section class="card">
        <h2>Tạo trận</h2>
        <table class="seats">
          <tr><th>Phe</th><th>Chơi</th><th>Người / bot</th><th>Tên hoặc loại bot</th></tr>
          ${FACTIONS.map(f => `<tr>
            <td>${FACTION_NAME[f]}</td>
            <td><input type="checkbox" data-f="${f}" class="use" checked></td>
            <td><select data-f="${f}" class="kind"><option value="human">Người</option><option value="bot"${f === 'marquise' ? '' : ' selected'}>Bot</option></select></td>
            <td><input data-f="${f}" class="name" placeholder="Tên người chơi"><select data-f="${f}" class="bot"><option value="simple">simple</option><option value="random">random</option></select></td>
          </tr>`).join('')}
        </table>
        <button id="create">Tạo trận</button>
        <div id="created"></div>
      </section>
      <section class="card"><h2>Các trận trên máy chủ</h2><div id="games">Đang tải…</div></section>
    </main>`
  const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel)!
  $('#create').addEventListener('click', async () => {
    const seats = FACTIONS.filter(f => $<HTMLInputElement>(`.use[data-f="${f}"]`).checked).map(f => ({
      faction: f,
      kind: $<HTMLSelectElement>(`.kind[data-f="${f}"]`).value as 'human' | 'bot',
      name: $<HTMLInputElement>(`.name[data-f="${f}"]`).value,
      bot: $<HTMLSelectElement>(`.bot[data-f="${f}"]`).value,
    }))
    const res = await api('/api/games', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ seats }) })
    const body = await res.json()
    if (!res.ok) { $('#created').innerHTML = `<p class="error">${esc(body.error ?? 'Không tạo được trận')}</p>`; return }
    const base = `${location.origin}${location.pathname}`
    $('#created').innerHTML = `<p>Trận <b>${body.id}</b>. Gửi mỗi đường dẫn cho đúng người (đường dẫn là quyền chơi ghế đó):</p><ul>
      ${body.links.map((l: { faction: FactionId; token: string | null }) => l.token
        ? `<li>${FACTION_NAME[l.faction]}: <a href="${base}?game=${body.id}&seat=${l.token}">${base}?game=${body.id}&amp;seat=${l.token}</a></li>`
        : `<li>${FACTION_NAME[l.faction]}: bot</li>`).join('')}
      <li>Khán giả: <a href="${base}?game=${body.id}">${base}?game=${body.id}</a></li></ul>`
    void listGames()
  })
  async function listGames() {
    const res = await api('/api/games')
    if (res.status === 401) { $('#games').innerHTML = '<p class="error">Cần mật khẩu phòng.</p>'; return }
    const games = (await res.json()) as Summary[]
    $('#games').innerHTML = games.length ? `<ul>${games.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(g => `<li>
      <a href="?game=${g.id}">${g.id}</a> — lượt ${g.turn} — ${g.seats.map(s => `${FACTION_NAME[s.faction]} (${s.kind === 'bot' ? 'bot' : esc(s.name)})`).join(', ')}
      ${g.winner ? ` — <b>thắng: ${g.winner.map(f => FACTION_NAME[f]).join(' + ')}</b>` : ''}</li>`).join('')}</ul>` : '<p>Chưa có trận nào.</p>'
  }
  const config = (await (await fetch('/api/config')).json()) as { passwordRequired: boolean; turnSeconds: number }
  if (config.passwordRequired) {
    $<HTMLElement>('#keybox').hidden = false
    $<HTMLInputElement>('#key').value = roomKey()
    $('#savekey').addEventListener('click', () => { setRoomKey($<HTMLInputElement>('#key').value); $('#keymsg').textContent = 'Đã lưu'; void listGames() })
  }
  await listGames()
}

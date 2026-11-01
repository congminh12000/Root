import type { FactionId } from '@root/game-engine'
import { html } from 'htm/preact'
import { useEffect, useState } from 'preact/hooks'
import { FACTION_NAME } from '../../names.ts'
import { api, roomKey, setRoomKey } from '../../net/api.ts'
import { FactionChip } from '../components.ts'

interface Summary { id: string; createdAt: string; seats: { faction: FactionId; kind: string; name: string; connected: boolean }[]; turn: number; winner: FactionId[] | null }
interface SeatForm { use: boolean; kind: 'human' | 'bot'; name: string; bot: string }
type Created = { id: string; links: { faction: FactionId; token: string | null }[] }

const FACTIONS: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']
const BOTS = [['search', 'search (mạnh, ~1 giây/nước)'], ['search-fast', 'search-fast (0,3 giây/nước)'], ['simple', 'simple (yếu)'], ['random', 'random']] as const

/** Lobby: create a game (each seat human or bot) and list games on this server. */
export function Lobby() {
  const [seats, setSeats] = useState<Record<FactionId, SeatForm>>(() => Object.fromEntries(FACTIONS.map(f =>
    [f, { use: true, kind: f === 'marquise' ? 'human' : 'bot', name: '', bot: 'search' }])) as Record<FactionId, SeatForm>)
  const [created, setCreated] = useState<Created | null>(null)
  const [error, setError] = useState('')
  const [games, setGames] = useState<Summary[] | 'locked' | null>(null)
  const [needKey, setNeedKey] = useState(false)
  const [key, setKey] = useState(roomKey())
  const [keySaved, setKeySaved] = useState(false)

  const edit = (f: FactionId, patch: Partial<SeatForm>) => setSeats(s => ({ ...s, [f]: { ...s[f], ...patch } }))

  async function listGames() {
    const res = await api('/api/games')
    setGames(res.status === 401 ? 'locked' : (await res.json() as Summary[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  }

  async function create() {
    const body = FACTIONS.filter(f => seats[f].use).map(f => ({ faction: f, kind: seats[f].kind, name: seats[f].name, bot: seats[f].bot }))
    const res = await api('/api/games', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ seats: body }) })
    const out = await res.json()
    if (!res.ok) { setError(out.error ?? 'Không tạo được trận'); setCreated(null); return }
    setError(''); setCreated(out as Created); void listGames()
  }

  useEffect(() => {
    void fetch('/api/config').then(r => r.json()).then((c: { passwordRequired: boolean }) => setNeedKey(c.passwordRequired))
    void listGames()
  }, [])

  const base = `${location.origin}${location.pathname}`
  return html`
    <main class="lobby">
      <h1>Root — chơi trong mạng LAN</h1>
      <p class="note">Bản dùng cá nhân. Luật theo Leder Rules Library p16. Đồ họa tự vẽ, không dùng art chính thức.</p>
      ${needKey && html`<section class="card"><h2>Mật khẩu phòng</h2>
        <input type="password" placeholder="Mật khẩu do chủ máy đặt" value=${key} onInput=${(e: Event) => setKey((e.target as HTMLInputElement).value)} />
        ${' '}<button onClick=${() => { setRoomKey(key); setKeySaved(true); void listGames() }}>Lưu</button>${keySaved && ' Đã lưu'}</section>`}
      <section class="card">
        <h2>Tạo trận</h2>
        <table class="seats">
          <tr><th>Phe</th><th>Chơi</th><th>Người / bot</th><th>Tên hoặc loại bot</th></tr>
          ${FACTIONS.map(f => html`<tr key=${f}>
            <td><${FactionChip} f=${f} /></td>
            <td><input type="checkbox" aria-label=${`Dùng ${FACTION_NAME[f]}`} checked=${seats[f].use} onChange=${(e: Event) => edit(f, { use: (e.target as HTMLInputElement).checked })} /></td>
            <td><select aria-label=${`Người hay bot cho ${FACTION_NAME[f]}`} value=${seats[f].kind} onChange=${(e: Event) => edit(f, { kind: (e.target as HTMLSelectElement).value as SeatForm['kind'] })}>
              <option value="human">Người</option><option value="bot">Bot</option></select></td>
            <td>${seats[f].kind === 'human'
              ? html`<input placeholder="Tên người chơi" value=${seats[f].name} onInput=${(e: Event) => edit(f, { name: (e.target as HTMLInputElement).value })} />`
              : html`<select aria-label=${`Loại bot cho ${FACTION_NAME[f]}`} value=${seats[f].bot} onChange=${(e: Event) => edit(f, { bot: (e.target as HTMLSelectElement).value })}>
                  ${BOTS.map(([v, label]) => html`<option value=${v}>${label}</option>`)}</select>`}</td>
          </tr>`)}
        </table>
        <button onClick=${create}>Tạo trận</button>
        ${error && html`<p class="error">${error}</p>`}
        ${created && html`<p>Trận <b>${created.id}</b>. Gửi mỗi đường dẫn cho đúng người (đường dẫn là quyền chơi ghế đó):</p><ul>
          ${created.links.map(l => l.token
            ? html`<li><${FactionChip} f=${l.faction} /> <a href=${`${base}?game=${created.id}&seat=${l.token}`}>${`${base}?game=${created.id}&seat=${l.token}`}</a></li>`
            : html`<li><${FactionChip} f=${l.faction} /> bot</li>`)}
          <li>Khán giả: <a href=${`${base}?game=${created.id}`}>${`${base}?game=${created.id}`}</a></li></ul>`}
      </section>
      <section class="card"><h2>Các trận trên máy chủ</h2>
        ${games === null ? 'Đang tải…' : games === 'locked' ? html`<p class="error">Cần mật khẩu phòng.</p>` : games.length === 0 ? html`<p>Chưa có trận nào.</p>` : html`<ul>
          ${games.map(g => html`<li key=${g.id}><a href=${`?game=${g.id}`}>${g.id}</a> — lượt ${g.turn} — ${g.seats.map(s => `${FACTION_NAME[s.faction]} (${s.kind === 'bot' ? 'bot' : s.name})`).join(', ')}
            ${g.winner && html` — <b>thắng: ${g.winner.map(f => FACTION_NAME[f]).join(' + ')}</b>`}</li>`)}</ul>`}
      </section>
    </main>`
}

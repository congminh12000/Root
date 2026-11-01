import { ALLIANCE, BASE_QUESTS, EYRIE, MARQUISE, VAGABOND } from '@root/game-data'
import type { FactionId, ItemType, PlayerView } from '@root/game-engine'
import { html } from 'htm/preact'
import { useState } from 'preact/hooks'
import { clearing, FACTION_NAME, ITEM_NAME, questName } from '../../names.ts'
import { CardChip, FactionChip, ItemIcon, SuitPip, Track, type Space } from '../components.ts'

/**
 * Faction boards drawn from game-data (costs, points, draw bonuses) and the view (what is still on each track), so
 * everything on the printed boards can be read (docs/07-ui/checklist.md D). Nothing here decides a rule.
 */

const Chip = ({ f }: { f: FactionId }) => html`<${FactionChip} f=${f} />`
const Cards = ({ cards }: { cards: string[] }) => cards.length ? html`${cards.map(c => html`<${CardChip} key=${c} card=${c} />`)}` : html`—`
const Items = ({ items }: { items: ItemType[] }) => items.length ? html`${items.map(i => html`<${ItemIcon} item=${i} />`)}` : html`—`
const Stat = ({ label, value }: { label: string; value: unknown }) => html`<span class="stat"><small>${label}</small><b>${value}</b></span>`
const LEADER: Record<string, string> = { builder: 'Builder', charismatic: 'Charismatic', commander: 'Commander', despot: 'Despot' }
const CHARACTER: Record<string, string> = { thief: 'Thief', tinker: 'Tinker', ranger: 'Ranger' }

function Marquise({ v }: { v: PlayerView }) {
  const m = v.factions.marquise!
  const row = (type: 'sawmill' | 'workshop' | 'recruiter', name: string) => {
    const built = MARQUISE.buildingsPerType - m.buildingsOnTrack[type]
    const spaces: Space[] = MARQUISE.woodCost.map((cost, i) => ({
      top: i ? `${cost}` : '', bottom: i ? `+${MARQUISE.points[type][i]}` : '', filled: i >= built, current: i === built,
      bonus: (MARQUISE.drawBonusAt[type] as readonly number[]).includes(i),
    }))
    return html`<${Track} label=${html`${name} <small>${built}/${MARQUISE.buildingsPerType}</small>`} spaces=${spaces} color="var(--faction-marquise)" />`
  }
  return html`<div class="fboard">
    <div class="stats"><${Stat} label="Gỗ trong kho" value=${m.woodSupply} /><${Stat} label="Chiến binh trong kho" value=${m.warriorSupply} />
      <${Stat} label="Keep" value=${m.keep === null ? (v.turn.number > 0 ? 'đã mất' : '—') : clearing(m.keep)} /></div>
    <p class="note">Mỗi ô: trên là gỗ cần để xây, dưới là điểm khi xây; ô vàng là công trình tiếp theo; +1 là rút thêm lá khi ô trống (§6.5.4, §6.6).</p>
    ${row('sawmill', 'Sawmill')}${row('workshop', 'Workshop')}${row('recruiter', 'Recruiter')}
    <div>Item đã chế tạo: <${Items} items=${m.craftedItems} /></div></div>`
}

function Eyrie({ v }: { v: PlayerView }) {
  const e = v.factions.eyrie!
  const placed = EYRIE.roosts - e.roostsOnTrack
  const spaces: Space[] = EYRIE.roostPoints.map((p, i) => ({ bottom: `+${p}`, filled: i >= placed, current: i === placed - 1, bonus: (EYRIE.roostDrawBonusAt as readonly number[]).includes(i) }))
  return html`<div class="fboard">
    <div class="stats"><${Stat} label="Leader" value=${e.leader ? LEADER[e.leader] : '—'} /><${Stat} label="Chiến binh trong kho" value=${e.warriorSupply} />
      <${Stat} label="Leader còn chọn được" value=${e.leadersFaceUp.map(l => LEADER[l]).join(', ') || '—'} /></div>
    <${Track} label=${html`Roost <small>${placed}/${EYRIE.roosts}</small>`} spaces=${spaces} color="var(--faction-eyrie)" />
    <p class="note">Điểm Evening là ô trống xa nhất (ô vàng) (§7.6.1).</p>
    <div class="decree">${(['recruit', 'move', 'battle', 'build'] as const).map(col => html`<div class="column"><b>${col}</b>
      ${e.decree[col].map((d, i) => html`<div class=${e.resolved[col].includes(i) ? 'done' : ''}>${d.kind === 'vizier' ? html`<span class="vizier"><${SuitPip} suit="bird" /> Vizier</span>` : html`<${CardChip} card=${d.id} />`}</div>`)}</div>`)}</div>
    <div>Item đã chế tạo: <${Items} items=${e.craftedItems} /></div></div>`
}

function Alliance({ v }: { v: PlayerView }) {
  const a = v.factions.alliance!
  const placed = ALLIANCE.sympathy - a.sympathyOnTrack
  const spaces: Space[] = ALLIANCE.sympathyCost.map((cost, i) => ({ top: `${cost}`, bottom: `+${ALLIANCE.sympathyPoints[i]}`, filled: i >= placed, current: i === placed }))
  return html`<div class="fboard">
    <div class="stats"><${Stat} label="Supporter" value=${v.supporterCount} /><${Stat} label="Officer" value=${a.officers} /><${Stat} label="Chiến binh trong kho" value=${a.warriorSupply} /></div>
    <${Track} label=${html`Sympathy <small>${placed}/${ALLIANCE.sympathy}</small>`} spaces=${spaces} color="var(--faction-alliance)" />
    <p class="note">Trên là số supporter cùng chất cần trả, dưới là điểm khi đặt (§8.4.2).</p>
    <div class="bases">Base: ${ALLIANCE.bases.map(s => html`<span class="stat"><${SuitPip} suit=${s} /> ${a.basesOnBoard[s] === null ? 'chưa đặt' : clearing(a.basesOnBoard[s]!)}</span>`)}</div>
    ${v.supporters && html`<div>Supporter của bạn: <${Cards} cards=${v.supporters} /></div>`}
    <div>Item đã chế tạo: <${Items} items=${a.craftedItems} /></div></div>`
}

const RELATION = ['Indifferent', '1', '2', 'Allied'] as const
function Vagabond({ v }: { v: PlayerView }) {
  const g = v.factions.vagabond!
  const track = (t: 'tea' | 'coin' | 'bag', note: string) => html`<${Track} label=${html`<${ItemIcon} item=${t} /> ${ITEM_NAME[t]} <small>${note}</small>`}
    spaces=${Array.from({ length: VAGABOND.trackSize }, (_, i) => ({ filled: i < g.tracks[t] }))} color="var(--faction-vagabond)" />`
  return html`<div class="fboard">
    <div class="stats"><${Stat} label="Nhân vật" value=${g.character ? CHARACTER[g.character] : '—'} /><${Stat} label="Ở" value=${g.pawn ? (g.pawn.kind === 'clearing' ? clearing(g.pawn.id) : `rừng ${g.pawn.id + 1}`) : '—'} />
      ${g.coalition && html`<span class="stat"><small>Coalition</small><${Chip} f=${g.coalition} /></span>`}</div>
    <div class="satchel">Túi: ${g.satchel.length ? g.satchel.map(i => html`<${ItemIcon} item=${i.type} state=${i.exhausted ? 'exhausted' : undefined} />`) : '—'}</div>
    <div class="satchel">Hỏng: ${g.damaged.length ? g.damaged.map(i => html`<${ItemIcon} item=${i.type} state="damaged" />`) : '—'}</div>
    ${track('tea', `Refresh ${VAGABOND.refresh.base} + ${VAGABOND.refresh.perTea}/trà`)}
    ${track('coin', `Rút ${VAGABOND.draw.base} + ${VAGABOND.draw.perCoin}/tiền`)}
    ${track('bag', `Giới hạn ${VAGABOND.itemLimit.base} + ${VAGABOND.itemLimit.perBag}/túi`)}
    <div class="relations"><b>Quan hệ</b> <small class="note">(Aid để tiến: ${VAGABOND.aidToAdvance.join(', ')}; điểm: ${VAGABOND.advancePoints.join(', ')})</small>
      ${(Object.entries(g.relationships) as [FactionId, number | 'hostile'][]).map(([f, r]) => html`<div class="relation"><${Chip} f=${f} />
        <span class="levels">${r === 'hostile' ? html`<span class="level on hostile">Hostile</span>` : RELATION.map((name, i) => html`<span class=${`level${i === r ? ' on' : ''}`}>${name}</span>`)}</span>
        ${g.aidThisTurn[f] ? html`<small>Aid lượt này: ${g.aidThisTurn[f]}</small>` : null}</div>`)}</div>
    <div>Quest đã xong: ${g.completedQuests.length ? g.completedQuests.map(q => html`<span class="stat">${questName(q)}</span>`) : '—'}</div></div>`
}

function Shared({ v }: { v: PlayerView }) {
  const quests = new Map(BASE_QUESTS.map(q => [q.id, q]))
  return html`<div class="fboard">
    <div class="stats"><${Stat} label="Deck" value=${`${v.deckCount} lá`} /><${Stat} label="Chồng bỏ" value=${`${v.discard.length} lá`} /><${Stat} label="Quest còn trong deck" value=${v.questDeckCount} /></div>
    <div class="satchel">Item supply: ${(Object.entries(v.itemSupply) as [ItemType, number][]).map(([k, n]) => html`<span class="stat"><${ItemIcon} item=${k} /> ×${n}</span>`)}</div>
    <div>Quest đang mở: ${v.questsAvailable.map(id => { const q = quests.get(id); return q
      ? html`<span class="quest"><${SuitPip} suit=${q.suit} /> ${q.name} <${ItemIcon} item=${q.items[0]} /><${ItemIcon} item=${q.items[1]} /></span>` : html`<span>${id}</span>` })}</div>
    <div>Dominance có thể lấy: <${Cards} cards=${v.availableDominance} /></div>
    ${v.discard.length > 0 && html`<details><summary>Chồng bỏ (${v.discard.length})</summary><${Cards} cards=${v.discard} /></details>`}</div>`
}

const BOARD: Record<FactionId, (p: { v: PlayerView }) => unknown> = { marquise: Marquise, eyrie: Eyrie, alliance: Alliance, vagabond: Vagabond }

/** Every faction's board as tabs (your own first), plus the shared supply. */
export function FactionBoards({ view: v, seat, initial }: { view: PlayerView; seat: FactionId | null; initial?: FactionId | 'shared' }) {
  // Every seat gets a tab; a faction's state appears only once its setup has started (§5.1.7).
  const factions = v.seats.map(s => s.faction)
  const order = seat ? [seat, ...factions.filter(f => f !== seat)] : factions
  const [tab, setTab] = useState<FactionId | 'shared'>(initial ?? order[0] ?? 'shared')
  const ready = tab === 'shared' || !!v.factions[tab]
  const Board = tab === 'shared' ? Shared : BOARD[tab]
  return html`<section class="card boards"><h3>Bảng phe</h3>
    <div class="tabs" role="tablist">${order.map(f => html`<button role="tab" class="secondary" aria-selected=${tab === f} onClick=${() => setTab(f)}><${Chip} f=${f} /></button>`)}
      <button role="tab" class="secondary" aria-selected=${tab === 'shared'} onClick=${() => setTab('shared')}>Chung</button></div>
    <div role="tabpanel" aria-label=${tab === 'shared' ? 'Chung' : FACTION_NAME[tab]}>${ready ? html`<${Board} v=${v} />` : html`<p class="note">Phe này chưa tới lượt setup.</p>`}</div></section>`
}

import './ui/setup.ts'
import type { FactionId, LastRoll } from '@root/game-engine'
import { html } from 'htm/preact'
import { render, type ComponentChildren } from 'preact'
import type { Action } from '@root/game-engine'
import { CardChip, CardDetail, Dice, FactionChip, Icon, SuitPip } from './ui/components.ts'
import { ActionBar } from './ui/screens/action-bar.ts'
import { FactionBoards } from './ui/screens/boards.ts'
import { Hand, Scores } from './ui/screens/hand.ts'
import { sampleView } from './dev/sample.ts'
import { NO_CHANGES } from './net/changes.ts'
import { ICONS } from './ui/icons.ts'
import { color, factionColor, font, fontSize, motion, radius, space, suitColor } from './ui/tokens.ts'

/**
 * ui-kit.html: every shared piece in every state, from the real components and the real tokens (docs/07-ui/README.md
 * §3). Build a component here first, then use it in the game. Playwright screenshots this page (visual/).
 */

const FACTIONS: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']
const Section = ({ title, note, children }: { title: string; note?: string; children: ComponentChildren }) =>
  html`<section class="card kit"><h2>${title}</h2>${note && html`<p class="note">${note}</p>`}${children}</section>`
const Swatch = ({ name, value }: { name: string; value: string }) =>
  html`<figure class="swatch"><span style=${{ background: value }}></span><figcaption><b>${name}</b><br /><code>${value}</code></figcaption></figure>`
const Row = ({ children }: { children: ComponentChildren }) => html`<div class="kit-row">${children}</div>`
const Item = ({ label, children }: { label: string; children: ComponentChildren }) => html`<div class="kit-item">${children}<small>${label}</small></div>`

const roll: LastRoll = { revision: 1, clearing: 4, attacker: 'marquise', defender: 'eyrie', dice: [3, 1], hits: { attacker: 3, defender: 1 } }
const guerrilla: LastRoll = { revision: 2, clearing: 8, attacker: 'eyrie', defender: 'alliance', dice: [2, 0], hits: { attacker: 0, defender: 2 } }
const noop = () => {}
const sample = sampleView('vagabond')
const seats = (['marquise', 'eyrie', 'alliance', 'vagabond'] as FactionId[]).map((f, i) => ({ faction: f, kind: i ? 'bot' : 'human', name: 'Minh', connected: true }))
const crafts = sample.hand.slice(0, 2).map(card => ({ type: 'craft', payload: { card } })) as Action[]
const legal = [
  { type: 'move', payload: { from: 0, to: 4, warriors: 1 } }, { type: 'move', payload: { from: 0, to: 4, warriors: 2 } },
  { type: 'move', payload: { from: 0, to: 4, warriors: 3 } }, { type: 'move', payload: { from: 0, to: 9, warriors: 1 } },
  { type: 'battle', payload: { clearing: 0, defender: 'eyrie' } }, { type: 'marquise-build', payload: { building: 'sawmill', clearing: 0, wood: [0] } },
  { type: 'battle', payload: { clearing: 6, defender: 'alliance' } },
  { type: 'craft', payload: { card: 'anvil#1' } }, { type: 'craft', payload: { card: 'sword#1' } }, { type: 'end-step', payload: {} },
] as Action[]

const Kit = () => html`
<main class="kit-page">
  <h1>Root 2 · UI kit</h1>
  <p class="note">Mọi thành phần dùng chung, ở mọi trạng thái, dựng từ component và token thật. Phong cách: docs/07-ui/style-guide.md.</p>

  <${Section} title="Bảng màu" note="Tên theo vai trò, không theo màu.">
    <${Row}>${Object.entries(color).map(([k, v]) => html`<${Swatch} name=${k} value=${v} />`)}<//><//>
  <${Section} title="Phe và chất" note="Luôn đi kèm icon hoặc hình riêng, không chỉ dùng màu.">
    <${Row}>${[...Object.entries(factionColor), ...Object.entries(suitColor)].map(([k, v]) => html`<${Swatch} name=${k} value=${v} />`)}<//><//>

  <${Section} title="Chữ">
    <p style=${{ font: `${fontSize.xl}px ${font.display}` }}>Rừng thu vẽ tay · Pangolin ${fontSize.xl}</p>
    <p style=${{ font: `${fontSize.lg}px ${font.display}` }}>Tiêu đề phụ, tên phe, điểm số · Pangolin ${fontSize.lg}</p>
    ${[fontSize.md, fontSize.sm, fontSize.xs].map(s => html`<p style=${{ fontSize: `${s}px` }}>Be Vietnam Pro ${s}: Đường đất băng qua rừng thông, hồ nước xanh và những mái nhà đỏ. Ôi, ụ, ỡ, ẵ, ặ, ữ, ự.</p>`)}
    <p><b>Đậm 700</b> · <span style=${{ fontWeight: 600 }}>600</span> · <span style=${{ fontWeight: 500 }}>500</span> · 400 · số: <span style=${{ fontVariantNumeric: 'tabular-nums' }}>0123456789</span></p><//>

  <${Section} title="Icon" note="Tự vẽ trên lưới 24×24: mảng phẳng + viền mực. Màu lấy từ --icon-fill.">
    <${Row}>${ICONS.map(n => html`<${Item} label=${n}><span class="kit-icon"><${Icon} name=${n} label=${n} /></span><//>`)}<//>
    <${Row}>${FACTIONS.map(f => html`<${Item} label=${`${f} trên màu phe`}><span class="kit-icon" style=${{ '--icon-fill': factionColor[f] }}><${Icon} name=${f} label=${f} /></span><//>`)}<//><//>

  <${Section} title="Nút">
    <${Row}>
      <${Item} label="bình thường"><button>Thực hiện</button><//>
      <${Item} label="hover"><button class="is-hover">Thực hiện</button><//>
      <${Item} label="đang bấm"><button class="is-active">Thực hiện</button><//>
      <${Item} label="focus bàn phím"><button class="is-focus">Thực hiện</button><//>
      <${Item} label="không dùng được"><button disabled>Thực hiện</button><//>
      <${Item} label="phụ"><button class="secondary">Bỏ lọc</button><//>
      <${Item} label="phụ, hover"><button class="secondary is-hover">Bỏ lọc</button><//>
      <${Item} label="chỉ có icon"><button class="secondary" aria-label="Đóng"><${Icon} name="close" /></button><//>
      <${Item} label="bật / tắt"><span><button class="secondary" aria-pressed="true">3D</button> <button class="secondary" aria-pressed="false">2D</button></span><//><//><//>

  <${Section} title="Ô nhập">
    <${Row}>
      <${Item} label="chọn"><select><option>Di chuyển: ô 1 → ô 5, 2 chiến binh</option></select><//>
      <${Item} label="chữ"><input placeholder="Tên người chơi" /><//>
      <${Item} label="chữ, focus"><input class="is-focus" value="Minh" /><//>
      <${Item} label="đánh dấu"><input type="checkbox" checked /><//><//><//>

  <${Section} title="Chip phe, pip chất, chip lá bài">
    <${Row}>${FACTIONS.map(f => html`<${Item} label=${f}><${FactionChip} f=${f} /><//>`)}<//>
    <${Row}>${(['fox', 'rabbit', 'mouse', 'bird'] as const).map(s => html`<${Item} label=${s}><${SuitPip} suit=${s} /><//>`)}<//>
    <${Row}>
      <${Item} label="bình thường"><${CardChip} card="anvil#1" /><//>
      <${Item} label="hover"><${CardChip} card="anvil#2" state="is-hover" /><//>
      <${Item} label="chim"><${CardChip} card="ambush-bird#1" /><//>
      <${Item} label="tên dài"><${CardChip} card="favor-of-the-foxes#1" /><//><//><//>

  <${Section} title="Chi tiết lá bài">
    <${Row}>${['arms-trader#1', 'ambush-bird#1', 'armorers#1', 'dominance-bird#1', 'favor-of-the-foxes#1'].map(c =>
      html`<div class="carddetail inline"><${CardDetail} card=${c} onClose=${noop} /></div>`)}<//><//>

  <${Section} title="Xúc xắc">
    <${Row}><div class="dice inline"><${Dice} roll=${roll} /></div><div class="dice inline"><${Dice} roll=${guerrilla} /></div><//><//>

  <${Section} title="Thanh trạng thái và thông báo">
    <header class="bar"><a href="./">← Sảnh</a><span>Trận <b>a1b2c3</b></span><span>Lượt 7 · Daylight · Hành động</span><span>Đang chờ: <${FactionChip} f="eyrie" /></span>
      <span class="clock"><${Icon} name="clock" /> 1:12</span><span class="clock urgent"><${Icon} name="clock" /> 0:09</span></header>
    <div class="notice">Máy chủ từ chối: stale-revision</div>
    <div class="winner">Kết thúc: <${FactionChip} f="alliance" /> thắng (points)</div>
    <p class="error">Không tạo được trận</p><//>

  <${Section} title="Thanh hành động" note="Chọn trên bàn cờ: chưa chọn ô, đã chọn ô 1, đã chọn đường ô 1 → ô 5 (chọn số chiến binh).">
    <div class="kit-grid">
      ${([{ kind: 'idle' }, { kind: 'at', clearing: 0 }, { kind: 'path', from: 0, to: 4 }] as const).map(stage =>
        html`<${ActionBar} legal=${legal} stage=${stage} setStage=${noop} onPreview=${noop} send=${noop} />`)}</div><//>

  <${Section} title="Tay bài và điểm" note="Lá viền vàng là lá có hành động dùng được ngay; bấm để xem chi tiết và hành động. Ván mẫu cố định từ seed.">
    <div class="kit-grid two"><${Hand} view=${sample} seat="vagabond" legal=${crafts} /><${Scores} view=${sample} seats=${seats} changes=${NO_CHANGES} /></div><//>

  <${Section} title="Bảng phe" note="Mỗi tab một phe, lấy số từ game-data và view; tab Chung là kho item, quest, deck.">
    <div class="kit-grid two">${(['marquise', 'eyrie', 'alliance', 'vagabond', 'shared'] as const).map(t => html`<${FactionBoards} view=${sample} seat="vagabond" initial=${t} />`)}</div><//>

  <${Section} title="Bảng">
    <div class="kit-grid">
      <section class="card"><h3>Điểm</h3>${FACTIONS.map((f, i) => html`<div class="score"><${FactionChip} f=${f} /> <b class=${i === 1 ? 'bump' : ''}>${[12, 9, 15, 7][i]}</b> · bot · ${i + 3} lá${i === 2 ? ' ◀' : ''}</div>`)}</section>
      <section class="card"><h3>Trống</h3><p class="note">Chưa có lá nào.</p></section></div><//>

  <${Section} title="Token khác">
    <p class="note">Khoảng cách ${Object.values(space).join(' / ')} px · bo góc ${Object.values(radius).join(' / ')} px · chuyển động ${Object.entries(motion).map(([k, v]) => `${k} ${v} ms`).join(', ')}</p><//>
</main>`

render(html`<${Kit} />`, document.getElementById('app')!)

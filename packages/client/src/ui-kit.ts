import './ui/setup.ts'
import type { FactionId, LastRoll } from '@root/game-engine'
import { html } from 'htm/preact'
import { render, type ComponentChildren } from 'preact'
import { CardChip, CardDetail, Dice, FactionChip, Icon, SuitPip } from './ui/components.ts'
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

  <${Section} title="Bảng">
    <div class="kit-grid">
      <section class="card"><h3>Điểm</h3>${FACTIONS.map((f, i) => html`<div class="score"><${FactionChip} f=${f} /> <b class=${i === 1 ? 'bump' : ''}>${[12, 9, 15, 7][i]}</b> · bot · ${i + 3} lá${i === 2 ? ' ◀' : ''}</div>`)}</section>
      <section class="card act"><h3>Lựa chọn của bạn</h3>
        <div class="filter">Đang lọc ô 5 (2/9) <button class="secondary">Bỏ lọc</button></div>
        <div class="group"><label>Di chuyển (3)</label><select><option>ô 1 → ô 5, 2 chiến binh</option></select><button>Thực hiện</button></div>
        <div class="group"><button>Kết thúc bước</button></div></section>
      <section class="card"><h3>Trống</h3><p class="note">Chưa có lá nào.</p></section></div><//>

  <${Section} title="Token khác">
    <p class="note">Khoảng cách ${Object.values(space).join(' / ')} px · bo góc ${Object.values(radius).join(' / ')} px · chuyển động ${Object.entries(motion).map(([k, v]) => `${k} ${v} ms`).join(', ')}</p><//>
</main>`

render(html`<${Kit} />`, document.getElementById('app')!)

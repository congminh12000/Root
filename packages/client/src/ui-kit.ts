import './ui/setup.ts'
import type { FactionId, LastRoll } from '@root/game-engine'
import { cardChip, cardDetail } from './cardview.ts'
import { cardName } from './names.ts'
import { ICONS, icon } from './ui/icons.ts'
import { diceHtml, factionChip, suitPip } from './ui/parts.ts'
import { color, factionColor, font, fontSize, motion, radius, space, suitColor } from './ui/tokens.ts'

/**
 * ui-kit.html: every shared piece in every state, from the real code and the real tokens (docs/07-ui/README.md §3).
 * Build a component here first, then use it in the game. Playwright screenshots this page (visual/).
 */

const FACTIONS: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']
const section = (title: string, body: string, note = '') =>
  `<section class="card kit"><h2>${title}</h2>${note ? `<p class="note">${note}</p>` : ''}${body}</section>`
const swatch = (name: string, value: string) =>
  `<figure class="swatch"><span style="background:${value}"></span><figcaption><b>${name}</b><br><code>${value}</code></figcaption></figure>`
const row = (...items: string[]) => `<div class="kit-row">${items.join('')}</div>`
const labelled = (label: string, html: string) => `<div class="kit-item">${html}<small>${label}</small></div>`

const roll: LastRoll = { revision: 1, clearing: 4, attacker: 'marquise', defender: 'eyrie', dice: [3, 1], hits: { attacker: 3, defender: 1 } }
const guerrilla: LastRoll = { revision: 2, clearing: 8, attacker: 'eyrie', defender: 'alliance', dice: [2, 0], hits: { attacker: 0, defender: 2 } }

document.getElementById('app')!.innerHTML = `
<main class="kit-page">
  <h1>Root 2 · UI kit</h1>
  <p class="note">Mọi thành phần dùng chung, ở mọi trạng thái, dựng từ code và token thật. Phong cách: docs/07-ui/style-guide.md.</p>

  ${section('Bảng màu', row(...Object.entries(color).map(([k, v]) => swatch(k, v))), 'Tên theo vai trò, không theo màu.')}
  ${section('Phe và chất', row(...Object.entries(factionColor).map(([k, v]) => swatch(k, v)), ...Object.entries(suitColor).map(([k, v]) => swatch(k, v))),
    'Luôn đi kèm icon hoặc hình riêng, không chỉ dùng màu.')}

  ${section('Chữ', `
    <p style="font:${fontSize.xl}px ${font.display}">Rừng thu vẽ tay · Pangolin ${fontSize.xl}</p>
    <p style="font:${fontSize.lg}px ${font.display}">Tiêu đề phụ, tên phe, điểm số · Pangolin ${fontSize.lg}</p>
    ${[fontSize.md, fontSize.sm, fontSize.xs].map(s => `<p style="font-size:${s}px">Be Vietnam Pro ${s}: Đường đất băng qua rừng thông, hồ nước xanh và những mái nhà đỏ. Ôi, ụ, ỡ, ẵ, ặ, ữ, ự.</p>`).join('')}
    <p><b>Đậm 700</b> · <span style="font-weight:600">600</span> · <span style="font-weight:500">500</span> · 400 · số: <span style="font-variant-numeric:tabular-nums">0123456789</span></p>`)}

  ${section('Icon', row(...ICONS.map(n => labelled(n, `<span class="kit-icon">${icon(n, n)}</span>`))) +
    row(...FACTIONS.map(f => labelled(`${f} trên màu phe`, `<span class="kit-icon" style="--icon-fill:${factionColor[f]}">${icon(f, f)}</span>`))),
    'Tự vẽ trên lưới 24×24: mảng phẳng + viền mực. Màu lấy từ --icon-fill.')}

  ${section('Nút', row(
    labelled('bình thường', '<button>Thực hiện</button>'),
    labelled('hover', '<button class="is-hover">Thực hiện</button>'),
    labelled('đang bấm', '<button class="is-active">Thực hiện</button>'),
    labelled('focus bàn phím', '<button class="is-focus">Thực hiện</button>'),
    labelled('không dùng được', '<button disabled>Thực hiện</button>'),
    labelled('phụ', '<button class="secondary">Bỏ lọc</button>'),
    labelled('phụ, hover', '<button class="secondary is-hover">Bỏ lọc</button>'),
    labelled('chỉ có icon', `<button class="secondary" aria-label="Đóng">${icon('close')}</button>`),
  ))}

  ${section('Ô nhập', row(
    labelled('chọn', '<select><option>Di chuyển: ô 1 → ô 5, 2 chiến binh</option></select>'),
    labelled('chữ', '<input placeholder="Tên người chơi">'),
    labelled('chữ, focus', '<input class="is-focus" value="Minh">'),
    labelled('đánh dấu', '<input type="checkbox" checked>'),
  ))}

  ${section('Chip phe, pip chất, chip lá bài', `
    ${row(...FACTIONS.map(f => labelled(f, factionChip(f))))}
    ${row(...(['fox', 'rabbit', 'mouse', 'bird'] as const).map(s => labelled(s, suitPip(s))))}
    ${row(labelled('bình thường', cardChip('anvil#1', cardName('anvil#1'))), labelled('hover', cardChip('anvil#2', cardName('anvil#2')).replace('class="cardchip"', 'class="cardchip is-hover"')),
      labelled('chim', cardChip('ambush-bird#1', cardName('ambush-bird#1'))), labelled('tên dài', cardChip('favor-of-the-foxes#1', cardName('favor-of-the-foxes#1'))))}`)}

  ${section('Chi tiết lá bài', row(...['arms-trader#1', 'ambush-bird#1', 'armorers#1', 'dominance-bird#1', 'favor-of-the-foxes#1'].map(c =>
    `<div class="carddetail inline">${cardDetail(c)}</div>`)))}

  ${section('Xúc xắc', row(`<div class="dice inline">${diceHtml(roll)}</div>`, `<div class="dice inline">${diceHtml(guerrilla)}</div>`))}

  ${section('Thanh trạng thái và thông báo', `
    <header class="bar"><a href="./">← Sảnh</a><span>Trận <b>a1b2c3</b></span><span>Lượt 7 · Daylight · Hành động</span><span>Đang chờ: ${factionChip('eyrie')}</span><span class="clock">⏱ 1:12</span><span class="clock urgent">⏱ 0:09</span></header>
    <div class="notice">Máy chủ từ chối: stale-revision</div>
    <div class="winner">Kết thúc: ${factionChip('alliance')} thắng (points)</div>
    <p class="error">Không tạo được trận</p>`)}

  ${section('Bảng', `<div class="kit-grid">
    <section class="card"><h3>Điểm</h3>${FACTIONS.map((f, i) => `<div class="score${i === 1 ? ' bump' : ''}">${factionChip(f)} <b>${[12, 9, 15, 7][i]}</b> · bot · ${i + 3} lá${i === 2 ? ' ◀' : ''}</div>`).join('')}</section>
    <section class="card act"><h3>Lựa chọn của bạn</h3><div class="group"><label>Di chuyển (3)</label><select><option>ô 1 → ô 5, 2 chiến binh</option></select><button>Thực hiện</button></div>
      <div class="group"><button>Kết thúc bước</button></div></section>
    <section class="card"><h3>Trống</h3><p class="note">Chưa có lá nào.</p></section></div>`)}

  ${section('Token khác', `<p class="note">Khoảng cách ${Object.values(space).join(' / ')} px · bo góc ${Object.values(radius).join(' / ')} px · chuyển động ${Object.entries(motion).map(([k, v]) => `${k} ${v} ms`).join(', ')}</p>`)}
</main>`

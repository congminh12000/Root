import { suitPip } from './ui/parts.ts'
import { cardDesign, ITEM_NAME, SUIT_COLOR, SUIT_NAME } from './names.ts'

/** Card details shown when a card chip is clicked: game-data only, our own wording around the printed summary. */

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

const KIND: Record<string, string> = {
  item: 'Item: chế tạo để lấy item và điểm, rồi bỏ lá (§4.1.2)',
  immediate: 'Dùng ngay: chế tạo, làm theo hiệu ứng, rồi bỏ lá (§4.1.2)',
  persistent: 'Lâu dài: chế tạo rồi đặt vào play area, dùng được về sau (§4.1.3)',
  ambush: 'Ambush: không chế tạo; chơi trong battle ở ô cùng chất (§2.1.2, §4.3.1)',
  dominance: 'Dominance: không chế tạo; kích hoạt để thắng theo điều kiện trên lá (§2.1.3, §3.3)',
}

const pip = suitPip

/** A clickable chip for one physical card, e.g. "anvil#1". */
export function cardChip(card: string, name: string): string {
  return `<button type="button" class="cardchip" data-card="${esc(card)}" style="border-color:${SUIT_COLOR[cardDesign(card).suit]}">${esc(name)}</button>`
}

export function cardDetail(card: string): string {
  const d = cardDesign(card)
  const effect = d.kind === 'item'
    ? `Nhận <b>${ITEM_NAME[d.item!]}</b>, +${d.vp ?? 0} điểm.`
    : d.kind === 'ambush'
      ? 'Phòng thủ: gây 2 hit ngay trước khi tung xúc xắc. Tấn công: chơi lá cùng chất để phá ambush của đối thủ.'
      : esc(d.text ?? '')
  return `<div class="carddetail-head" style="border-color:${SUIT_COLOR[d.suit]}">
      <b>${esc(d.name)}</b> <span class="note">· ${SUIT_NAME[d.suit]}</span>
      <button type="button" class="close" data-close-card aria-label="Đóng">×</button>
    </div>
    <div class="note">${KIND[d.kind] ?? d.kind}</div>
    ${d.cost.length ? `<div>Chi phí chế tạo: ${d.cost.map(pip).join('')}</div>` : ''}
    <div class="effect">${effect}</div>
    <div class="note">${esc(d.libraryId)}</div>`
}

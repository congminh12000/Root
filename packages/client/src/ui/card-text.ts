import type { CardDef, QuestDef } from '@root/game-data'
import { ITEM_NAME, SUIT_NAME } from '../names.ts'

/**
 * What each card does, in Vietnamese, for the text box of the card face (docs/07-ui/style-guide.md §6). Each line
 * follows the printed summary in game-data (`CardDef.text`) and adds nothing to it; the English stays visible in the
 * card's detail panel. Card names stay as printed.
 */
const EFFECT: Record<string, string> = {
  armorers: 'Trong trận đánh, có thể bỏ lá này để bỏ qua mọi hit từ xúc xắc mà bạn phải nhận.',
  'brutal-tactics': 'Khi tấn công trong trận đánh, có thể gây thêm 1 hit; khi đó bên phòng thủ được 1 điểm.',
  'royal-claim': 'Trong Birdsong, có thể bỏ lá này để được 1 điểm cho mỗi ô bạn cai quản.',
  sappers: 'Khi phòng thủ trong trận đánh, có thể bỏ lá này để gây thêm 1 hit.',
  'stand-and-deliver': 'Một lần trong Birdsong, có thể lấy ngẫu nhiên 1 lá của một đối thủ; nếu lấy, đối thủ đó được 1 điểm.',
  'tax-collector': 'Một lần trong Daylight, có thể gỡ 1 chiến binh phe bạn khỏi một ô trên bản đồ để rút 1 lá.',
  'better-burrow-bank': 'Đầu Birdsong, có thể rút 1 lá; nếu rút, chọn một đối thủ cũng rút 1 lá.',
  cobbler: 'Đầu Evening, có thể đi một lượt di chuyển.',
  'command-warren': 'Đầu Daylight, có thể khai chiến một trận đánh.',
  codebreakers: 'Một lần trong Daylight, có thể xem bài trên tay một người chơi khác.',
  'scouting-party': 'Khi tấn công trong trận đánh, bạn không bị ảnh hưởng bởi lá Ambush.',
}

/** Rule each kind of card follows, cited on the card (Law §2.1, §3.3, §4.1, §4.3.1). */
const KIND_RULE: Record<CardDef['kind'], string> = { item: '§4.1.2', immediate: '§4.1.2', persistent: '§4.1.3', ambush: '§4.3.1', dominance: '§3.3' }

export function cardText(d: CardDef): string {
  const rule = KIND_RULE[d.kind]
  switch (d.kind) {
    case 'item': return `Chế tạo: nhận ${ITEM_NAME[d.item!]} và ${d.vp ?? 0} điểm, rồi bỏ lá (${rule}).`
    case 'ambush': { const a = ambushText(d); return `${a.where} ${a.effect}` }
    case 'dominance': return d.suit === 'bird'
      ? `Bạn thắng nếu cai quản hai ô góc đối diện vào đầu Birdsong của bạn (${rule}).`
      : `Bạn thắng nếu cai quản ba ô ${SUIT_NAME[d.suit]} vào đầu Birdsong của bạn (${rule}).`
    case 'immediate': return `Gỡ mọi quân đối thủ ở các ô ${SUIT_NAME[d.suit]}, rồi bỏ lá này (${rule}).`
    case 'persistent': return `${EFFECT[d.id] ?? ''} (${rule})`
  }
}

/**
 * An ambush card's two lines (§4.3.1), laid out like the printed card: where it can be played (bird is wild, §2.2.2),
 * then what it does. A matching ambush is any that matches the clearing, a bird one included.
 */
export const ambushText = (d: CardDef) => ({
  where: `Có thể ambush ở ${d.suit === 'bird' ? 'ô bất kỳ' : `ô ${SUIT_NAME[d.suit]}`}.`,
  effect: `Đầu trận đánh, bên phòng thủ có thể chơi lá này để gây ngay 2 hit, rồi bỏ lá. Bị huỷ nếu bên tấn công cũng chơi một lá ambush khớp ô đó (${KIND_RULE.ambush}).`,
})

/** A quest's text (§9.5.5): the two items to exhaust, then points or cards. */
export const questText = (q: QuestDef) =>
  `Ở ô ${SUIT_NAME[q.suit]}, úp ${ITEM_NAME[q.items[0]]} và ${ITEM_NAME[q.items[1]]}: được 1 điểm cho mỗi quest ${SUIT_NAME[q.suit]} đã xong (tính cả lá này), hoặc rút 2 lá (§9.5.5).`

/** Keep source citations for audits, but omit them from player-facing card copy. */
export const displayCardText = (text: string) => text.replace(/\s*\([^)]*§[^)]*\)/g, '')

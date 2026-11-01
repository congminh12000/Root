import { BASE_DECK, BASE_QUESTS } from '@root/game-data'
import type { FactionId, ItemType, PawnLocation } from '@root/game-engine'

/** Display names. Official faction and card names (decision 0001); everything else is our own wording. */

export const FACTION_NAME: Record<FactionId, string> = { marquise: 'Marquise de Cat', eyrie: 'Eyrie Dynasties', alliance: 'Woodland Alliance', vagabond: 'Vagabond' }
export { factionColor as FACTION_COLOR, suitColor as SUIT_COLOR } from './ui/tokens.ts'
export const SUIT_NAME = { fox: 'cáo', rabbit: 'thỏ', mouse: 'chuột', bird: 'chim' } as const

export const ITEM_NAME: Record<ItemType, string> = { boots: 'giày', sword: 'kiếm', crossbow: 'nỏ', torch: 'đuốc', hammer: 'búa', tea: 'trà', coin: 'tiền', bag: 'túi' }

const CARDS = new Map(BASE_DECK.map(c => [c.id, c]))
const QUESTS = new Map(BASE_QUESTS.map(q => [q.id, q]))

export const cardDesign = (card: string) => CARDS.get(card.split('#')[0]!)!
export const cardName = (card: string) => { const d = cardDesign(card); return `${d.name} (${SUIT_NAME[d.suit]})` }
export const questName = (id: string) => { const q = QUESTS.get(id); return q ? `${q.name} (${SUIT_NAME[q.suit]}: ${q.items.map(i => ITEM_NAME[i]).join(' + ')})` : id }

/** Clearings are numbered from 1 for people (docs/03-data-spec/autumn.md). */
export const clearing = (c: number) => `ô ${c + 1}`
export const where = (p: PawnLocation) => (p.kind === 'clearing' ? clearing(p.id) : `rừng ${p.id + 1}`)

/** "boots", "boots:exhausted" → readable item keys. */
export function itemKeys(items: Record<string, number>): string {
  return Object.entries(items).filter(([, n]) => n > 0).map(([k, n]) => {
    const [base, ...rest] = k.split(':')
    const damaged = base === 'damaged'
    const [type, flag] = damaged ? rest : [base, rest[0]]
    const name = type === 'ally' ? 'chiến binh đồng minh' : ITEM_NAME[type as ItemType] ?? type
    return `${n}× ${name}${flag === 'exhausted' ? ' (úp)' : ''}${damaged ? ' (hỏng)' : ''}`
  }).join(', ')
}

export const STEP_NAME: Record<string, string> = {
  'birdsong-start': 'Đầu Birdsong', 'daylight-start': 'Đầu Daylight', 'evening-start': 'Đầu Evening',
  wood: 'Đặt gỗ', craft: 'Chế tạo', actions: 'Hành động', draw: 'Rút bài', 'emergency-orders': 'Lệnh khẩn',
  'add-to-decree': 'Thêm vào Decree', 'new-roost': 'Roost mới', decree: 'Thực hiện Decree', depose: 'Phế leader', score: 'Ghi điểm',
  revolt: 'Revolt', 'spread-sympathy': 'Lan sympathy', 'military-operations': 'Military Operations',
  refresh: 'Refresh', slip: 'Slip', rest: 'Nghỉ', 'item-capacity': 'Giới hạn item', hold: 'Tạm dừng', setup: 'Chuẩn bị',
}
export const PHASE_NAME = { birdsong: 'Birdsong', daylight: 'Daylight', evening: 'Evening' } as const

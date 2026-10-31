import type { Action } from '@root/game-engine'
import { cardName, clearing, FACTION_NAME, ITEM_NAME, itemKeys, questName, where } from './names.ts'

/** Group title for an action type, shown above its options. */
export const GROUP: Record<string, string> = {
  'end-step': 'Kết thúc bước', craft: 'Chế tạo', battle: 'Đánh', move: 'Di chuyển',
  'marquise-place-keep': 'Đặt keep', 'marquise-place-building': 'Đặt công trình', 'marquise-place-wood': 'Đặt gỗ',
  'marquise-spend-bird': 'Dùng lá chim lấy thêm hành động', 'marquise-end-march': 'Dừng March', 'marquise-recruit': 'Recruit',
  'marquise-build': 'Xây', 'marquise-overwork': 'Overwork',
  'eyrie-place-roost': 'Đặt roost', 'eyrie-choose-leader': 'Chọn leader', 'eyrie-add-card': 'Thêm lá vào Decree', 'eyrie-new-roost': 'Roost mới',
  'eyrie-recruit': 'Decree: Recruit', 'eyrie-move': 'Decree: Move', 'eyrie-battle': 'Decree: Battle', 'eyrie-build': 'Decree: Build',
  'alliance-revolt': 'Revolt', 'alliance-spread': 'Lan sympathy', 'alliance-mobilize': 'Mobilize', 'alliance-train': 'Train',
  'alliance-recruit': 'Recruit', 'alliance-organize': 'Organize',
  'vagabond-choose-character': 'Chọn nhân vật', 'vagabond-place-pawn': 'Đặt pawn', 'vagabond-refresh': 'Refresh', 'vagabond-slip': 'Slip',
  'vagabond-move': 'Di chuyển', 'vagabond-battle': 'Đánh', 'vagabond-explore': 'Khám phá ruin', 'vagabond-aid': 'Aid', 'vagabond-quest': 'Quest',
  'vagabond-strike': 'Strike', 'vagabond-repair': 'Sửa item', 'vagabond-steal': 'Steal', 'vagabond-day-labor': 'Day Labor', 'vagabond-hideout': 'Hideout',
  'vagabond-remove-items': 'Bỏ item vượt giới hạn', 'vagabond-coalition': 'Lập coalition',
  'play-ambush': 'Chơi Ambush', 'decline-ambush': 'Không ambush', 'use-battle-card': 'Dùng lá trong battle', 'end-battle-cards': 'Xong lá battle',
  'take-hits': 'Chọn quân chịu hit', 'field-hospital': 'Field Hospitals', 'decline-field-hospital': 'Không dùng Field Hospitals',
  'discard-card': 'Bỏ bài', 'activate-dominance': 'Kích hoạt dominance', 'take-dominance': 'Lấy dominance',
  'outrage-give': 'Outrage: đưa lá', 'outrage-reveal': 'Outrage: cho xem bài', 'discard-supporter': 'Bỏ supporter',
  'better-burrow-bank': 'Better Burrow Bank', 'royal-claim': 'Royal Claim', 'stand-and-deliver': 'Stand and Deliver!', 'command-warren': 'Command Warren',
  cobbler: 'Cobbler', 'cobbler-vagabond': 'Cobbler', codebreakers: 'Codebreakers', 'tax-collector': 'Tax Collector',
}

const BUILDING = { sawmill: 'sawmill', workshop: 'workshop', recruiter: 'recruiter' } as const
const list = (cs: number[]) => cs.map(clearing).join(', ') || 'không'
const warriors = (n: number) => `${n} chiến binh`

/** One line describing an option, in Vietnamese with official names. */
export function describe(a: Action): string {
  switch (a.type) {
    case 'end-step': return 'Sang bước tiếp theo'
    case 'craft': return cardName(a.payload.card)
    case 'battle': return `${clearing(a.payload.clearing)}, đánh ${FACTION_NAME[a.payload.defender]}`
    case 'move': return `${warriors(a.payload.warriors)} từ ${clearing(a.payload.from)} sang ${clearing(a.payload.to)}`
    case 'marquise-place-keep': case 'eyrie-place-roost': case 'eyrie-new-roost': return clearing(a.payload.clearing)
    case 'marquise-place-building': return `${BUILDING[a.payload.building]} ở ${clearing(a.payload.clearing)}`
    case 'marquise-place-wood': return list(a.payload.clearings)
    case 'marquise-spend-bird': case 'discard-card': case 'field-hospital': case 'play-ambush': case 'use-battle-card':
    case 'outrage-give': case 'discard-supporter': case 'alliance-mobilize': case 'alliance-train': case 'activate-dominance':
    case 'vagabond-day-labor': case 'royal-claim':
      return cardName(a.payload.card)
    case 'marquise-recruit': return list(a.payload.clearings)
    case 'marquise-build': return `${BUILDING[a.payload.building]} ở ${clearing(a.payload.clearing)}, gỗ từ ${list(a.payload.wood)}`
    case 'marquise-overwork': return `${clearing(a.payload.clearing)} bằng ${cardName(a.payload.card)}`
    case 'eyrie-choose-leader': return a.payload.leader
    case 'eyrie-add-card': return `${cardName(a.payload.card)} → cột ${a.payload.column}`
    case 'eyrie-recruit': case 'eyrie-build': return `lá #${a.payload.index + 1}: ${clearing(a.payload.clearing)}`
    case 'eyrie-move': return `lá #${a.payload.index + 1}: ${warriors(a.payload.warriors)} ${clearing(a.payload.from)} → ${clearing(a.payload.to)}`
    case 'eyrie-battle': return `lá #${a.payload.index + 1}: ${clearing(a.payload.clearing)}, đánh ${FACTION_NAME[a.payload.defender]}`
    case 'alliance-revolt': case 'alliance-spread': return `${clearing(a.payload.clearing)}${a.payload.birds ? `, dùng ${a.payload.birds} supporter chim` : ''}`
    case 'alliance-recruit': case 'alliance-organize': return clearing(a.payload.clearing)
    case 'vagabond-choose-character': return a.payload.character
    case 'vagabond-place-pawn': return `rừng ${a.payload.forest + 1}`
    case 'vagabond-refresh': case 'vagabond-remove-items': return itemKeys(a.payload.items)
    case 'vagabond-hideout': return `sửa ${itemKeys(a.payload.items) || 'không item nào (không có item hỏng)'}, rồi kết thúc Daylight`
    case 'vagabond-slip': return where(a.payload.to)
    case 'vagabond-move': return `${clearing(a.payload.to)}${a.payload.ally ? `, kéo ${a.payload.ally.warriors} chiến binh ${FACTION_NAME[a.payload.ally.faction]}` : ''}`
    case 'vagabond-battle': return `đánh ${FACTION_NAME[a.payload.defender]}${a.payload.ally ? ` cùng ${FACTION_NAME[a.payload.ally]}` : ''}`
    case 'vagabond-explore': return 'Lấy item dưới ruin'
    case 'vagabond-aid': return `${FACTION_NAME[a.payload.to]}: đưa ${cardName(a.payload.card)}, úp ${ITEM_NAME[a.payload.exhaust]}${a.payload.take ? `, lấy ${ITEM_NAME[a.payload.take]}` : ''}`
    case 'vagabond-quest': return `${questName(a.payload.quest)} → ${a.payload.reward === 'points' ? 'lấy điểm' : 'rút 2 lá'}`
    case 'vagabond-strike': return `${FACTION_NAME[a.payload.target]}: ${a.payload.piece === 'warrior' ? 'chiến binh' : a.payload.piece}`
    case 'vagabond-repair': return itemKeys({ [a.payload.item]: 1 })
    case 'vagabond-steal': return `lấy ngẫu nhiên một lá của ${FACTION_NAME[a.payload.from]}`
    case 'vagabond-coalition': return `${cardName(a.payload.card)} với ${FACTION_NAME[a.payload.with]}`
    case 'take-dominance': return `${cardName(a.payload.dominance)}, trả ${cardName(a.payload.spend)}`
    case 'take-hits': return Object.entries(a.payload.remove).map(([k, n]) => `${n}× ${k.includes(':') || k in ITEM_NAME || k === 'ally' ? itemKeys({ [k]: 1 }).slice(3) : k}`).join(', ')
    case 'decline-ambush': case 'end-battle-cards': case 'decline-field-hospital': case 'outrage-reveal': case 'marquise-end-march':
      return GROUP[a.type]!
    case 'better-burrow-bank': return `${FACTION_NAME[a.payload.enemy]} cũng rút 1 lá`
    case 'stand-and-deliver': return `lấy 1 lá của ${FACTION_NAME[a.payload.enemy]}`
    case 'command-warren': return `${clearing(a.payload.clearing)}, đánh ${FACTION_NAME[a.payload.defender]}`
    case 'cobbler': return `${warriors(a.payload.warriors)} ${clearing(a.payload.from)} → ${clearing(a.payload.to)}`
    case 'cobbler-vagabond': return clearing(a.payload.to)
    case 'codebreakers': return `xem bài ${FACTION_NAME[a.payload.target]}`
    case 'tax-collector': return `bỏ 1 chiến binh ở ${clearing(a.payload.clearing)}, rút 1 lá`
  }
}

/** Clearings an action is about, to highlight on the map. */
export function clearingsOf(a: Action): number[] {
  const p = a.payload as Record<string, unknown>
  const out: number[] = []
  for (const key of ['clearing', 'from', 'to']) { const v = p[key]; if (typeof v === 'number') out.push(v) }
  for (const key of ['clearings', 'wood']) { const v = p[key]; if (Array.isArray(v)) out.push(...(v as number[])) }
  const to = p.to as { kind?: string; id?: number } | undefined
  if (to && typeof to === 'object' && to.kind === 'clearing' && typeof to.id === 'number') out.push(to.id)
  return [...new Set(out)]
}

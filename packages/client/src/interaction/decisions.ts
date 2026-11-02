import type { Action, FactionId, PlayerView } from '@root/game-engine'
import { FACTION_NAME } from '../names.ts'
import { anchorOf } from './select.ts'

/** A decision the game is waiting on, worded for people, with the clause it comes from. */
export interface Decision {
  player: FactionId
  kind: string
  title: string
  rule: string
  /** Shown as a dialog to the deciding player: every option is a button, nothing to pick on the board. */
  dialog: boolean
  /** The clearing it happens in (a battle, a removal), so the map can show it there; none for setup choices and discards. */
  clearing: number | null
}

const at = (c: number) => `ô ${c + 1}`
/** Setup steps are named by their clause (packages/game-engine/src/factions); the ones that ask for a choice. */
const SETUP: Record<string, string> = {
  '6.3.2': 'đặt Keep vào một ô góc', '6.3.4': 'đặt sawmill, workshop, recruiter ở ô Keep hoặc ô kề', '7.3.2': 'đặt roost và 6 chiến binh vào một ô góc',
  '7.3.3': 'chọn leader đầu tiên', '9.3.1': 'chọn nhân vật', '9.3.2': 'đặt pawn vào một rừng',
}

/**
 * What the newest pending decision asks (PlayerView.pending, newest last), or the order of simultaneous effects when
 * that is the choice (§1.1.3). The decider is always the seat the game waits on.
 */
export function decisionOf(v: PlayerView, legal: Action[]): Decision | null {
  const player = v.waitingOn[0]
  const p = v.pending[v.pending.length - 1]
  if (!player || !p) return null
  const name = FACTION_NAME[player]
  const dialog = legal.length > 0 && legal.every(a => anchorOf(a).kind === 'none')
  const clearing = 'clearing' in p ? p.clearing : v.battle ? v.battle.clearing : null
  const d = (kind: string, title: string, rule: string): Decision => ({ player, kind, title, rule, dialog, clearing })
  if (legal.some(a => a.type === 'order-effects')) {
    return d('order-effects', `${name} chọn hiệu ứng nào xử lý trước`, '§1.1.3, §4.3.6')
  }
  switch (p.kind) {
    case 'ambush': return p.role === 'defender'
      ? d('ambush', `${name} có thể chơi Ambush ở ${at(p.clearing)}`, '§4.3.1')
      : d('ambush', `${name} có thể chơi Ambush để phá Ambush ở ${at(p.clearing)}`, '§4.3.1.I')
    case 'battle-effects': return d('battle-effects', `${name} chọn lá dùng trong battle ở ${at(p.clearing)}`, '§4.3.4')
    case 'take-hits': return d('take-hits', `${name} chọn quân chịu ${p.hits} hit ở ${at(p.clearing)}`, '§4.3.6')
    case 'field-hospital': return d('field-hospital', `Field Hospitals: ${name} có thể trả một lá cùng chất ${at(p.clearing)} để đưa ${p.warriors} chiến binh về Keep`, '§6.2.3')
    case 'outrage': return d('outrage', `Outrage: ${name} đưa Woodland Alliance một lá cùng chất ${at(p.clearing)}, hoặc cho xem bài nếu không có`, '§8.2.6')
    case 'discard-supporters': return d('discard-supporters', `${name} bỏ supporter cho tới khi còn ${p.to}`, '§8.2.3.I, §8.2.4')
    case 'discard-down': return d('discard-down', `${name} bỏ bài cho tới khi còn ${p.to} lá`, '§6.6, §7.6.2, §8.6.2, §9.6.3')
    case 'setup': return d('setup', `${name}: ${SETUP[p.step] ?? 'setup'}`, `§${p.step}`)
  }
}

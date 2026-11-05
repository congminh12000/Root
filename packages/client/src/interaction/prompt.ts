import type { Action, FactionId, PlayerView } from '@root/game-engine'
import { FACTION_NAME, STEP_NAME } from '../names.ts'
import type { Decision } from './decisions.ts'
import { warriorCounts, viewOf, type Stage } from './select.ts'
import { marquiseActionsLeft } from './actions-left.ts'

/**
 * RD-M03: the one-line order at the top middle of the screen, like Root Digital's banner ("Choose a building.",
 * docs/07-ui/root-digital/marquise.md §1). It only says what the seat can do now; every choice still comes from `legal`.
 * Null when the game is not waiting on this seat.
 */
export function promptFor({ view: v, legal, seat, stage, focus, decision }: {
  view: PlayerView; legal: Action[]; seat: FactionId | null; stage: Stage; focus: string | null; decision: Decision | null
}): string | null {
  if (!seat || v.winner || v.waitingOn[0] !== seat || !legal.length) return null
  if (focus && FOCUS_PROMPT[focus]) return FOCUS_PROMPT[focus]!
  if (decision && decision.player === seat) return sentence(withoutName(decision.title, seat))
  if (stage.kind === 'path') {
    const counts = warriorCounts(viewOf(legal, stage).along)
    return counts ? `Chọn số chiến binh đi từ ô ${stage.from + 1} sang ô ${stage.to + 1}, rồi bấm Enter` : `Chọn việc làm trên đường ô ${stage.from + 1} → ô ${stage.to + 1}`
  }
  if (stage.kind === 'at') return `Chọn việc làm ở ô ${stage.clearing + 1}`
  const types = new Set(legal.map(a => a.type))
  if (types.size === 1 && types.has('end-step')) return 'Bấm Continue để sang bước tiếp theo'
  if (types.has('marquise-end-march')) return 'Đi nước thứ hai của March, hoặc dừng March'
  const step = v.turn.step
  if (step === 'craft') return 'Chế tạo: chọn lá trên tay, hoặc bấm Continue'
  const left = marquiseActionsLeft(v)
  if (left !== null) return left > 0 ? `Chọn một hành động (còn ${left})` : 'Hết hành động: bấm Continue sang Evening'
  if (step === 'add-to-decree') return 'Thêm lá vào Decree, hoặc bấm Continue'
  if (step === 'decree') return 'Thực hiện Decree theo thứ tự từ trái sang phải'
  return `${STEP_NAME[step] ?? step}: chọn trên bản đồ hoặc ở bảng hành động`
}

/** Decision titles start with the faction's name ("Marquise de Cat: trả 2 lá…"); the banner speaks to that player. */
function withoutName(title: string, seat: FactionId): string {
  const name = FACTION_NAME[seat]
  if (title.startsWith(`${name}: `)) return title.slice(name.length + 2)
  if (title.startsWith(`${name} `)) return title.slice(name.length + 1)
  return title
}

/** After an action button (RD-M04), what to pick on the map. */
const FOCUS_PROMPT: Record<string, string> = {
  'marquise-build': 'Chọn ô để xây', move: 'Chọn ô có chiến binh để March, rồi ô đến', battle: 'Chọn ô để đánh', 'marquise-overwork': 'Chọn sawmill để Overwork',
}

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

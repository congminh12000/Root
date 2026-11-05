import type { Action } from '@root/game-engine'

/**
 * RD-M04: the Marquise's six fixed action buttons, in Root Digital's order (docs/07-ui/root-digital/marquise.md §1):
 * March, Build, Recruit, Battle, an extra action for a bird card, Overwork (ROOT-6.5.1–6.5.5). A button is enabled only
 * when some legal action has its type; the client never decides what is legal.
 */

export interface MarquiseButton {
  type: Action['type']
  label: string
  icon: string
  /** What the button does: light the clearings on the map, send the only choice, or list the choices. */
  mode: 'map' | 'send' | 'list'
  enabled: boolean
}

const BUTTONS: Omit<MarquiseButton, 'enabled' | 'mode'>[] = [
  { type: 'move', label: 'March', icon: 'boots' },
  { type: 'marquise-build', label: 'Xây', icon: 'hammer' },
  { type: 'marquise-recruit', label: 'Recruit', icon: 'marquise' },
  { type: 'battle', label: 'Đánh', icon: 'sword' },
  { type: 'marquise-spend-bird', label: 'Lá chim: +1 hành động', icon: 'card' },
  { type: 'marquise-overwork', label: 'Overwork', icon: 'saw' },
]

/** Types the six buttons cover; the panel lists any other legal type (craft, dominance…) as text. */
export const MARQUISE_BUTTON_TYPES: ReadonlySet<string> = new Set(BUTTONS.map(b => b.type))

/** Action types picked on the map after their button: the map then offers only that type (interaction/prompt.ts). */
export const MAP_FOCUS: ReadonlySet<string> = new Set(['move', 'marquise-build', 'battle', 'marquise-overwork'])

export function marquiseButtons(legal: Action[]): MarquiseButton[] {
  return BUTTONS.map(b => {
    const mine = legal.filter(a => a.type === b.type)
    const mode = MAP_FOCUS.has(b.type) ? 'map' : mine.length === 1 ? 'send' : 'list'
    return { ...b, mode, enabled: mine.length > 0 }
  })
}

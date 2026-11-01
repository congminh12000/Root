import type { FactionId, LastRoll } from '@root/game-engine'
import { FACTION_NAME, SUIT_NAME } from '../names.ts'
import { icon } from './icons.ts'

/** Small shared pieces of HTML, used by the game screen and shown in every state on ui-kit.html. */

/** A faction: its icon and name on its colour (style-guide §6: colour and shape together). */
export const factionChip = (f: FactionId) =>
  `<span class="fchip" style="--chip:var(--faction-${f})">${icon(f)}${FACTION_NAME[f]}</span>`

type CardSuit = keyof typeof SUIT_NAME
/** A suit pip for crafting costs and card heads; `bird` is wild. */
export const suitPip = (suit: string) => {
  const known = suit in SUIT_NAME
  const name = known ? SUIT_NAME[suit as CardSuit] : 'bất kỳ'
  return `<span class="pip" style="--icon-fill:${known ? `var(--suit-${suit})` : 'var(--rock)'}" title="${name}">${icon(known ? suit as CardSuit : 'star', name)}</span>`
}

/** The battle roll panel (game.ts shows it over the board for a few seconds). */
export function diceHtml(r: LastRoll): string {
  const die = (n: number) => `<span class="die">${n}</span>`
  return `${die(r.dice[0])}${die(r.dice[1])}<div class="what">${factionChip(r.attacker)} đánh ${factionChip(r.defender)} ở ô ${r.clearing + 1}<br>
    ${FACTION_NAME[r.attacker]} gây <b>${r.hits.attacker}</b> hit, ${FACTION_NAME[r.defender]} gây <b>${r.hits.defender}</b>${r.defender === 'alliance' ? ' (Guerrilla: Alliance lấy số cao)' : ''}</div>`
}

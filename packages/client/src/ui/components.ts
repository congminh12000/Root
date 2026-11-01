import { signal } from '@preact/signals'
import type { FactionId, LastRoll } from '@root/game-engine'
import { html } from 'htm/preact'
import { useEffect } from 'preact/hooks'
import { cardDesign, cardName, FACTION_NAME, ITEM_NAME, SUIT_COLOR, SUIT_NAME } from '../names.ts'
import type { IconName } from './icons.ts'

/** Shared pieces of the interface, used by the screens and shown in every state on ui-kit.html (docs/07-ui). */

/** An icon from the sprite (icons.ts); with `label` it is announced to screen readers. */
export const Icon = ({ name, label }: { name: IconName; label?: string }) => label
  ? html`<svg class="icon" role="img" aria-label=${label}><use href=${`#i-${name}`} /></svg>`
  : html`<svg class="icon" aria-hidden="true"><use href=${`#i-${name}`} /></svg>`

/** A faction: its icon and name on its colour (style-guide §6: colour and shape together). */
export const FactionChip = ({ f }: { f: FactionId }) =>
  html`<span class="fchip" style=${{ '--chip': `var(--faction-${f})` }}><${Icon} name=${f} />${FACTION_NAME[f]}</span>`

type CardSuit = keyof typeof SUIT_NAME
/** A suit pip for crafting costs and card heads; `bird` is wild. */
export function SuitPip({ suit }: { suit: string }) {
  const known = suit in SUIT_NAME
  const name = known ? SUIT_NAME[suit as CardSuit] : 'bất kỳ'
  return html`<span class="pip" style=${{ '--icon-fill': known ? `var(--suit-${suit})` : 'var(--rock)' }} title=${name}>
    <${Icon} name=${known ? suit as CardSuit : 'star'} label=${name} /></span>`
}

/** The card whose details are open; any CardChip opens it, CardDetailOverlay shows it. */
export const openCard = signal<string | null>(null)

/** A clickable chip for one physical card, e.g. "anvil#1". */
export const CardChip = ({ card, state }: { card: string; state?: string }) =>
  html`<button type="button" class=${`cardchip${state ? ` ${state}` : ''}`} data-card=${card} style=${{ borderColor: SUIT_COLOR[cardDesign(card).suit] }}
    onClick=${(e: Event) => { e.stopPropagation(); openCard.value = card }}>${cardName(card)}</button>`

const KIND: Record<string, string> = {
  item: 'Item: chế tạo để lấy item và điểm, rồi bỏ lá (§4.1.2)',
  immediate: 'Dùng ngay: chế tạo, làm theo hiệu ứng, rồi bỏ lá (§4.1.2)',
  persistent: 'Lâu dài: chế tạo rồi đặt vào play area, dùng được về sau (§4.1.3)',
  ambush: 'Ambush: không chế tạo; chơi trong battle ở ô cùng chất (§2.1.2, §4.3.1)',
  dominance: 'Dominance: không chế tạo; kích hoạt để thắng theo điều kiện trên lá (§2.1.3, §3.3)',
}

/** Card details: game-data only, our own wording around the printed summary. */
export function CardDetail({ card, onClose }: { card: string; onClose?: () => void }) {
  const d = cardDesign(card)
  const effect = d.kind === 'item'
    ? html`Nhận <b>${ITEM_NAME[d.item!]}</b>, +${d.vp ?? 0} điểm.`
    : d.kind === 'ambush'
      ? 'Phòng thủ: gây 2 hit ngay trước khi tung xúc xắc. Tấn công: chơi lá cùng chất để phá ambush của đối thủ.'
      : d.text ?? ''
  return html`
    <div class="carddetail-head" style=${{ borderColor: SUIT_COLOR[d.suit] }}>
      <b>${d.name}</b> <span class="note">· ${SUIT_NAME[d.suit]}</span>
      ${onClose && html`<button type="button" class="close" aria-label="Đóng" onClick=${onClose}><${Icon} name="close" /></button>`}
    </div>
    <div class="note">${KIND[d.kind] ?? d.kind}</div>
    ${d.cost.length > 0 && html`<div>Chi phí chế tạo: ${d.cost.map(s => html`<${SuitPip} suit=${s} />`)}</div>`}
    <div class="effect">${effect}</div>
    <div class="note">${d.libraryId}</div>`
}

/** The open card's panel; closes on Escape or a click outside it. */
export function CardDetailOverlay() {
  const card = openCard.value
  useEffect(() => {
    if (!card) return
    const close = () => { openCard.value = null }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const click = (e: MouseEvent) => { if (!(e.target as Element).closest('.carddetail')) close() }
    document.addEventListener('keydown', key)
    document.addEventListener('click', click)
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('click', click) }
  }, [card])
  return card ? html`<div class="carddetail" role="dialog" aria-label=${cardName(card)}><${CardDetail} card=${card} onClose=${() => { openCard.value = null }} /></div>` : null
}

/** The battle roll: both dice, then the hits each side deals (after the §4.3.3 cap). */
export const Dice = ({ roll: r }: { roll: LastRoll }) => html`
  <span class="die">${r.dice[0]}</span><span class="die">${r.dice[1]}</span>
  <div class="what"><${FactionChip} f=${r.attacker} /> đánh <${FactionChip} f=${r.defender} /> ở ô ${r.clearing + 1}<br />
    ${FACTION_NAME[r.attacker]} gây <b>${r.hits.attacker}</b> hit, ${FACTION_NAME[r.defender]} gây <b>${r.hits.defender}</b>${r.defender === 'alliance' ? ' (Guerrilla: Alliance lấy số cao)' : ''}</div>`

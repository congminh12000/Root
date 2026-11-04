import { signal } from '@preact/signals'
import type { Action, FactionId, ItemType, LastRoll, PlayerView } from '@root/game-engine'
import { describe, GROUP } from '../describe.ts'
import { actionsForCard } from '../interaction/cards.ts'
import { craftPieces, matchCost, type CraftPiece } from '../interaction/craft.ts'
import { html } from 'htm/preact'
import type { ComponentChildren } from 'preact'
import { useEffect } from 'preact/hooks'
import { cardDesign, cardName, FACTION_NAME, ITEM_NAME, SUIT_COLOR, SUIT_NAME } from '../names.ts'
import type { IconName } from './icons.ts'
import { displayCardText } from './card-text.ts'
import { CardFace } from './card-face.ts'
import { SuitBadge } from './suit-badge.ts'

/** Shared pieces of the interface, used by the screens and shown in every state on ui-kit.html (docs/07-ui). */

/** An icon from the sprite (icons.ts); with `label` it is announced to screen readers. */
export const Icon = ({ name, label }: { name: IconName; label?: string }) => label
  ? html`<svg class="icon" role="img" aria-label=${label}><use href=${`#i-${name}`} /></svg>`
  : html`<svg class="icon" aria-hidden="true"><use href=${`#i-${name}`} /></svg>`

/** A faction: its icon and name on its colour (style-guide §6: colour and shape together). */
export const FactionChip = ({ f }: { f: FactionId }) =>
  html`<span class="fchip" style=${{ '--chip': `var(--faction-${f})` }}><${Icon} name=${f} />${FACTION_NAME[f]}</span>`

type CardSuit = keyof typeof SUIT_NAME
/** A suit in running text (clearing panel, faction boards): its badge; `bird` is wild, anything else reads "bất kỳ". */
export function SuitPip({ suit }: { suit: string }) {
  if (suit in SUIT_NAME) return html`<span class="pip"><${SuitBadge} suit=${suit as CardSuit} label=${SUIT_NAME[suit as CardSuit]} /></span>`
  return html`<span class="pip" style=${{ '--icon-fill': 'var(--rock)' }} title="bất kỳ"><${Icon} name="star" label="bất kỳ" /></span>`
}

/** The card whose details are open; any CardChip opens it, CardDetailOverlay shows it. */
export const openCard = signal<string | null>(null)

/** A clickable chip for one physical card, e.g. "anvil#1". */
export const CardChip = ({ card, state }: { card: string; state?: string }) =>
  html`<button type="button" class=${`cardchip${state ? ` ${state}` : ''}`} data-card=${card} style=${{ borderColor: SUIT_COLOR[cardDesign(card).suit] }}
    onClick=${(e: Event) => { e.stopPropagation(); openCard.value = card }}><span class="cardchip-suit"><${SuitBadge} suit=${cardDesign(card).suit} /></span>${cardName(card)}</button>`

const KIND: Record<string, string> = {
  item: 'Item: chế tạo để lấy item và điểm, rồi bỏ lá (§4.1.2)',
  immediate: 'Dùng ngay: chế tạo, làm theo hiệu ứng, rồi bỏ lá (§4.1.2)',
  persistent: 'Lâu dài: chế tạo rồi đặt vào play area, dùng được về sau (§4.1.3)',
  ambush: 'Ambush: không chế tạo; chơi trong battle ở ô cùng chất (§2.1.2, §4.3.1)',
  dominance: 'Dominance: không chế tạo; kích hoạt để thắng theo điều kiện trên lá (§2.1.3, §3.3)',
}

/** Card details: the full card face, then what kind of card it is, the printed English summary and its library id. */
export function CardDetail({ card, onClose }: { card: string; onClose?: () => void }) {
  const d = cardDesign(card)
  return html`
    ${onClose && html`<button type="button" class="close" aria-label="Đóng" onClick=${onClose}><${Icon} name="close" /></button>`}
    <${CardFace} card=${card} size="full" />
    <div class="note">${displayCardText(KIND[d.kind] ?? d.kind)}</div>
    ${d.text && html`<details class="printed"><summary>Bản in tiếng Anh</summary><p lang="en">${d.text}</p></details>`}
    <div class="note">${d.libraryId}</div>`
}

/** Each faction's crafting piece, by name (§6.2.1, §7.2.1, §8.2.1, §9.2.1). */
const PIECE_NAME: Record<FactionId, string> = { marquise: 'Workshop', eyrie: 'Roost', alliance: 'Sympathy', vagabond: 'Búa' }
const where = (p: CraftPiece) => p.clearing === null ? 'pawn' : `ô ${p.clearing + 1}`

/**
 * Crafting the open card (§4.1.1): each cost icon with the piece that pays it, and every crafting piece of the seat
 * (lit when it pays this card, struck through once activated this turn). Whether it can be crafted now is the engine's.
 */
export function CraftPanel({ card, view, seat, craftable }: { card: string; view: PlayerView; seat: FactionId; craftable: boolean }) {
  const d = cardDesign(card)
  if (!d.cost.length || d.kind === 'ambush' || d.kind === 'dominance') return null
  const pieces = craftPieces(view, seat)
  const icons = matchCost(card, pieces)
  const paying = new Set(icons.flatMap(c => (c.piece ? [c.piece] : [])))
  const paid = icons.every(c => c.piece)
  const name = PIECE_NAME[seat]
  return html`<div class="craftpanel" aria-label="Chế tạo">
    <div class="craft-cost">Chi phí: ${icons.map(c => html`<span class=${`craft-icon${c.piece ? ' paid' : ' missing'}`}>
      <${SuitPip} suit=${c.icon} />${c.piece ? where(c.piece) : 'thiếu'}</span>`)}</div>
    <div class="craft-pieces">${name}: ${pieces.length ? pieces.map(p => html`<span
      class=${`craft-piece${paying.has(p) ? ' paying' : ''}${p.used ? ' used' : ''}`}
      title=${p.used ? 'Đã kích hoạt lượt này' : paying.has(p) ? 'Dùng cho lá này' : 'Còn dùng được'}><${SuitPip} suit=${p.suit} />${where(p)}${p.used ? ' (đã dùng)' : ''}</span>`)
      : html`<span class="note">chưa có</span>`}</div>
    <div class="note">${craftable ? `Chế tạo được ngay${paid ? `: kích hoạt ${icons.length} ${name.toLowerCase()} sáng màu` : ''}.`
      : paid ? 'Đủ công trình, nhưng lúc này chưa chế tạo được lá này.' : `Chưa đủ ${name.toLowerCase()} đúng chất để chế tạo.`}</div></div>`
}

/** The open card's panel; closes on Escape or a click outside it. With `legal`, it offers what can be done with the card; with `view` and `seat`, how crafting it would be paid. */
export function CardDetailOverlay({ legal = [], send, view, seat }: { legal?: Action[]; send?: (a: Action) => void; view?: PlayerView; seat?: FactionId | null }) {
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
  if (!card) return null
  const uses = send ? actionsForCard(legal, card) : []
  const mine = !!view && !!seat && view.hand.includes(card)
  return html`<div class="carddetail" role="dialog" aria-label=${cardName(card)}><${CardDetail} card=${card} onClose=${() => { openCard.value = null }} />
    ${mine && html`<${CraftPanel} card=${card} view=${view} seat=${seat} craftable=${uses.some(a => a.type === 'craft')} />`}
    ${uses.length > 0 && html`<div class="carduses">${uses.map(a => html`<button onClick=${() => { openCard.value = null; send!(a) }}>${GROUP[a.type] ?? a.type}${describe(a) === cardName(card) ? '' : `: ${describe(a)}`}</button>`)}</div>`}</div>`
}

/** The battle roll: both dice, then the hits each side deals (after the §4.3.3 cap). */
export const Dice = ({ roll: r }: { roll: LastRoll }) => html`
  <span class="die">${r.dice[0]}</span><span class="die">${r.dice[1]}</span>
  <div class="what"><${FactionChip} f=${r.attacker} /> đánh <${FactionChip} f=${r.defender} /> ở ô ${r.clearing + 1}<br />
    ${FACTION_NAME[r.attacker]} gây <b>${r.hits.attacker}</b> hit, ${FACTION_NAME[r.defender]} gây <b>${r.hits.defender}</b>${r.defender === 'alliance' ? ' (Guerrilla: Alliance lấy số cao)' : ''}</div>`

/** An item, by its icon; exhausted items lie on their side, damaged ones are red (§9.2.5–9.2.7). */
export const ItemIcon = ({ item, state }: { item: ItemType; state?: 'exhausted' | 'damaged' }) =>
  html`<span class=${`item${state ? ` ${state}` : ''}`} title=${`${ITEM_NAME[item]}${state === 'exhausted' ? ' (úp)' : state === 'damaged' ? ' (hỏng)' : ''}`}>
    <${Icon} name=${item} label=${ITEM_NAME[item]} /></span>`

/** A card at hand size: the card face as a button; usable cards are lit. Click for details. */
export function MiniCard({ card, usable, style }: { card: string; usable?: boolean; style?: Record<string, string> }) {
  return html`<button type="button" class=${`minicard${usable ? ' usable' : ''}`} style=${style} data-card=${card}
    aria-label=${`${cardName(card)}${usable ? ', dùng được' : ''}`} onClick=${(e: Event) => { e.stopPropagation(); openCard.value = card }}>
    <${CardFace} card=${card} size="mini" /></button>`
}

export interface Space { top?: string; bottom?: string; filled: boolean; bonus?: boolean; current?: boolean }
/** A row of spaces from a faction board: what still sits on the track is `filled`; `top`/`bottom` print costs and points. */
export const Track = ({ label, spaces, color: c }: { label: ComponentChildren; spaces: Space[]; color: string }) => html`
  <div class="track" style=${{ '--track': c }}><div class="track-label">${label}</div><div class="spaces">${spaces.map(s => html`
    <span class=${`space${s.filled ? ' filled' : ''}${s.bonus ? ' bonus' : ''}${s.current ? ' current' : ''}`}>
      ${s.top !== undefined && html`<small class="top">${s.top}</small>`}${s.bonus && html`<small class="plus" title="Rút thêm 1 lá">+1</small>`}
      ${s.bottom !== undefined && html`<small class="bottom">${s.bottom}</small>`}</span>`)}</div></div>`

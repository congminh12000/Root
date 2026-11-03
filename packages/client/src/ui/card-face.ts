import type { CardDef, QuestDef } from '@root/game-data'
import { html } from 'htm/preact'
import type { ComponentChildren } from 'preact'
import { cardDesign, ITEM_NAME, questDesign, SUIT_NAME } from '../names.ts'
import { cardArt, questArt } from './card-art.ts'
import { ambushText, cardText, displayCardText, questText } from './card-text.ts'
import { Icon } from './components.ts'
import { SuitBadge } from './suit-badge.ts'
import type { IconName } from './icons.ts'

/**
 * A card face in the layout of the printed cards (docs/07-ui/style-guide.md §6), drawn in our style: the suit band
 * with its round badge and the crafting cost, a scene in the middle (card-art.ts), a wooden plaque with what the card
 * gives, and a paper box with the name and, at full size, the effect. All deck cards show their full effect, including in the hand and decisions.
 * Quest faces retain their compact variant.
 */

const KIND_NAME: Record<CardDef['kind'], string> = { item: 'item', immediate: 'dùng ngay', persistent: 'lâu dài', ambush: 'ambush', dominance: 'dominance' }
const PLAQUE: Record<Exclude<CardDef['kind'], 'item'>, IconName> = { immediate: 'flame', persistent: 'card', ambush: 'eye', dominance: 'crown' }

/** One crafting cost as a suit badge; the three-colour "?" is any suit (§4.1.1). */
const CostPip = ({ suit }: { suit: CardDef['cost'][number] }) => suit === 'any'
  ? html`<span class="cf-pip any" title="bất kỳ chất nào">?</span>`
  : html`<span class="cf-pip suit"><${SuitBadge} suit=${suit} label=${SUIT_NAME[suit]} /></span>`

/** Decorative parchment edge shared by single-use card effects. */
const PaperEdge = () => html`<svg class="cf-paper-edge" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
  <path d="M1 2 L29 1 L30 3 L31 1 L98 2 L98 26 L96 29 L99 31 L98 69 L96 72 L98 73 L99 98 L95 97 L94 94 L93 98 L58 99 L57 97 L56 99 L2 98 L3 75 L1 73 L3 69 L2 42 L1 40 L3 38 Z" />
  <path class="crease" d="M2 42 L5 45 M98 31 L95 34 M94 94 L92 91 M3 75 L5 79" />
</svg>`

function Frame({ suit, cost, art, plaque, name, sub, text, size, label, paper = false }: {
  suit: CardDef['suit']; cost: ComponentChildren; art: string; plaque: ComponentChildren; name: string; sub: string; text: string; size: 'mini' | 'full'; label: string; paper?: boolean
}) {
  return html`<div class=${`cardface ${size}`} style=${{ '--suit': `var(--suit-${suit})` }} role="img" aria-label=${label}>
    <div class="cf-head"><span class="cf-badge"><${SuitBadge} suit=${suit} label=${SUIT_NAME[suit]} /></span><span class="cf-cost">${cost}</span></div>
    <div class="cf-art" dangerouslySetInnerHTML=${{ __html: art }}></div>
    <div class="cf-plaque">${plaque}</div>
    <div class=${`cf-text${paper ? ' cf-paper' : ''}`}>${paper && html`<${PaperEdge} />`}<b class=${`cf-name${name.length > 18 ? ' long longer' : name.length > 13 ? ' long' : ''}`}>${name}</b>${size === 'mini' ? html`<small>${sub}</small>` : html`<p>${displayCardText(text)}</p>`}</div>
  </div>`
}

/**
 * An ambush card, laid out like the printed one (§4.3.1): the name in the suit band beside the badge, the scene filling
 * the card, and one paper box with where it can be played (italic) and, at full size, what it does. Nothing to craft,
 * so no cost and no plaque.
 */
function AmbushFrame({ d, copy, size }: { d: CardDef; copy: number; size: 'mini' | 'full' }) {
  const t = ambushText(d)
  return html`<div class=${`cardface ambush ${size}`} style=${{ '--suit': `var(--suit-${d.suit})` }} role="img" aria-label=${`${d.name}, ${SUIT_NAME[d.suit]}, ambush`}>
    <div class="cf-head"><span class="cf-badge"><${SuitBadge} suit=${d.suit} label=${SUIT_NAME[d.suit]} /></span><b class="cf-title">${d.name}</b></div>
    <div class="cf-art" dangerouslySetInnerHTML=${{ __html: cardArt(d, copy) }}></div>
    <div class="cf-text cf-paper"><${PaperEdge} /><i>${t.where}</i>${size === 'full' ? html`<p>${displayCardText(t.effect)}</p>` : null}</div>
  </div>`
}

const copyOf = (card: string) => Number(card.split('#')[1] ?? 1)

/** A physical card, e.g. "armorers#2". */
export function CardFace({ card }: { card: string; size: 'mini' | 'full' }) {
  const size = 'full'
  const d = cardDesign(card)
  if (d.kind === 'ambush') return html`<${AmbushFrame} d=${d} copy=${copyOf(card)} size=${size} />`
  const plaque = d.kind === 'item'
    ? html`<span style=${{ '--icon-fill': 'var(--paper-raised)' }}><${Icon} name=${d.item!} /></span><b>+${d.vp ?? 0}</b>`
    : html`<span style=${{ '--icon-fill': 'var(--paper-raised)' }}><${Icon} name=${PLAQUE[d.kind]} /></span>`
  const sub = d.kind === 'item' ? `${ITEM_NAME[d.item!]} · +${d.vp ?? 0}` : KIND_NAME[d.kind]
  return html`<${Frame} suit=${d.suit} cost=${d.cost.map(s => html`<${CostPip} suit=${s} />`)} art=${cardArt(d, copyOf(card))} plaque=${plaque}
    paper=${d.kind === 'item' || d.kind === 'immediate'} name=${d.name} sub=${sub} text=${cardText(d)} size=${size} label=${`${d.name}, ${SUIT_NAME[d.suit]}, ${sub}`} />`
}

/** A Vagabond quest (§9.5.5): the two items to exhaust sit where a card's cost would be. */
export function QuestFace({ quest, size }: { quest: string; size: 'mini' | 'full' }) {
  const q = questDesign(quest) as QuestDef
  const items = q.items.map(i => html`<span class="cf-pip item" title=${ITEM_NAME[i]}><${Icon} name=${i} /></span>`)
  const plaque = html`<span style=${{ '--icon-fill': 'var(--autumn-gold)' }}><${Icon} name="star" /></span><span style=${{ '--icon-fill': 'var(--paper-raised)' }}><${Icon} name="card" /></span>`
  const sub = `quest · ${q.items.map(i => ITEM_NAME[i]).join(' + ')}`
  return html`<${Frame} suit=${q.suit} cost=${items} art=${questArt(q)} plaque=${plaque} name=${q.name} sub=${sub} text=${questText(q)} size=${size}
    label=${`Quest ${q.name}, ${SUIT_NAME[q.suit]}, ${sub}`} />`
}

import { EYRIE, VAGABOND } from '@root/game-data'
import type { Action, FactionId, PlayerView } from '@root/game-engine'
import { html } from 'htm/preact'
import { useEffect, useRef } from 'preact/hooks'
import { describe, GROUP } from '../../describe.ts'
import type { Decision } from '../../interaction/decisions.ts'
import { FACTION_NAME } from '../../names.ts'
import { FactionChip, ItemIcon, MiniCard } from '../components.ts'

/** Our own summaries of the leader and character cards (§7.8, §V), for choosing at setup and after Turmoil. */
const LEADER: Record<string, { name: string; text: string }> = {
  builder: { name: 'Builder', text: 'Khi chế tạo, bỏ qua Disdain for Trade (§7.8.1).' },
  charismatic: { name: 'Charismatic', text: 'Mỗi lần Recruit đặt hai chiến binh thay vì một (§7.8.2).' },
  commander: { name: 'Commander', text: 'Khi tấn công trong battle, gây thêm một hit (§7.8.3).' },
  despot: { name: 'Despot', text: 'Khi gỡ ít nhất một công trình hoặc token địch trong battle, thêm một điểm (§7.8.4).' },
}
const CHARACTER: Record<string, { name: string; text: string }> = {
  thief: { name: 'Thief', text: 'Steal: úp một đuốc để lấy ngẫu nhiên một lá của người có quân ở ô của bạn (§V.1.2).' },
  tinker: { name: 'Tinker', text: 'Day Labor: úp một đuốc để lấy một lá cùng chất ô của bạn từ chồng bỏ (§V.2.2).' },
  ranger: { name: 'Ranger', text: 'Hideout: úp một đuốc để sửa ba item, rồi kết thúc Daylight ngay (§V.3.2).' },
}
const COLUMN: Record<string, string> = { recruit: 'Recruit', move: 'Move', battle: 'Battle', build: 'Build' }

function Option({ a, send }: { a: Action; send: (a: Action) => void }) {
  const p = a.payload as Record<string, unknown>
  if (a.type === 'eyrie-choose-leader') {
    const l = LEADER[p.leader as string]!
    return html`<button class="option choice" onClick=${() => send(a)}><b>${l.name}</b>
      <small>Vizier ở ${EYRIE.leaders[p.leader as keyof typeof EYRIE.leaders].map(c => COLUMN[c]).join(' và ')}</small><span>${l.text}</span></button>`
  }
  if (a.type === 'vagabond-choose-character') {
    const c = CHARACTER[p.character as string]!
    return html`<button class="option choice" onClick=${() => send(a)}><b>${c.name}</b>
      <span class="items">${VAGABOND.characters[p.character as keyof typeof VAGABOND.characters].items.map(i => html`<${ItemIcon} item=${i} />`)}</span><span>${c.text}</span></button>`
  }
  const card = typeof p.card === 'string' ? p.card : typeof p.dominance === 'string' ? p.dominance : null
  if (card) return html`<div class="option withcard"><${MiniCard} card=${card} /><button onClick=${() => send(a)}>${GROUP[a.type] ?? a.type}${a.type === 'take-dominance' ? `: ${describe(a)}` : ''}</button></div>`
  const bare = describe(a) === GROUP[a.type]
  return html`<button class="option" onClick=${() => send(a)}>${bare ? describe(a) : html`<small>${GROUP[a.type] ?? a.type}</small> ${describe(a)}`}</button>`
}

/** The battle in progress, as context for decisions taken inside it (§4.3). */
function BattleLine({ view: v }: { view: PlayerView }) {
  const b = v.battle
  if (!b) return null
  const rolled = b.step !== 'ambush' && b.step !== 'foil' && b.step !== 'ambush-hits' && b.step !== 'ambush-check' && b.step !== 'roll'
  return html`<p class="battleline"><${FactionChip} f=${b.attacker} /> đánh <${FactionChip} f=${b.defender} /> ở ô ${b.clearing + 1}
    ${rolled ? html` · hit tung được: ${FACTION_NAME[b.attacker]} ${b.rolled.attacker}${b.extra.attacker ? ` + ${b.extra.attacker}` : ''}, ${FACTION_NAME[b.defender]} ${b.rolled.defender}${b.extra.defender ? ` + ${b.extra.defender}` : ''}` : ''}</p>`
}

/** Title, clause, the battle around it and every legal option as a button: shared by the dialog and the map callout. */
function DecisionBody({ decision, view, legal, send }: { decision: Decision; view: PlayerView; legal: Action[]; send: (a: Action) => void }) {
  const choices: Action[] = legal.filter(a => a.type === 'eyrie-choose-leader' || a.type === 'vagabond-choose-character')
  const cards = legal.filter(a => !choices.includes(a) && (typeof (a.payload as { card?: unknown }).card === 'string' || a.type === 'take-dominance'))
  const rest = legal.filter(a => !choices.includes(a) && !cards.includes(a))
  return html`<header><${FactionChip} f=${decision.player} /><h2 id="decision-title">${decision.title}</h2><small class="rule">${decision.rule}</small></header>
    <${BattleLine} view=${view} />
    ${choices.length > 0 && html`<div class="options choices">${choices.map(a => html`<${Option} a=${a} send=${send} />`)}</div>`}
    ${cards.length > 0 && html`<div class="options cards">${cards.map(a => html`<${Option} a=${a} send=${send} />`)}</div>`}
    ${rest.length > 0 && html`<div class="options">${rest.map(a => html`<${Option} a=${a} send=${send} />`)}</div>`}`
}

/**
 * A decision that happens in a clearing (ambush, hits, Field Hospitals, Outrage…), shown at that clearing on the map
 * (docs/07-ui/gameplay-map-only.md §3) instead of over the whole screen, so the battle stays in view.
 */
export function DecisionCallout({ decision, view, legal, send, at }: {
  decision: Decision; view: PlayerView; legal: Action[]; send: (a: Action) => void; at: [number, number]
}) {
  const box = useRef<HTMLElement>(null)
  useEffect(() => { box.current?.querySelector<HTMLElement>('button.option, .option button')?.focus({ preventScroll: true }) }, [decision.title, legal.length])
  const below = at[1] < 320, x = Math.min(Math.max(at[0], 240), innerWidth - 240)
  return html`<section class=${`map-decision${below ? ' below' : ''}`} style=${{ left: `${x}px`, top: `${at[1]}px` }} role="dialog" aria-labelledby="decision-title" ref=${box}>
    <${DecisionBody} decision=${decision} view=${view} legal=${legal} send=${send} /></section>`
}

/**
 * A decision only you can take, as a dialog over the game (style-guide §6): who decides what and the clause, the
 * battle around it, and every legal option as a button. "Xem bàn cờ" folds it into a bar to look at the board first.
 */
export function DecisionDialog({ decision, view, legal, send, onFold }: {
  decision: Decision; view: PlayerView; legal: Action[]; send: (a: Action) => void; onFold: () => void
}) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { box.current?.querySelector<HTMLElement>('button.option, .option button')?.focus() }, [decision.title, legal.length])
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onFold() } }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onFold])
  return html`<div class="dialog-backdrop"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="decision-title" ref=${box}>
    <${DecisionBody} decision=${decision} view=${view} legal=${legal} send=${send} />
    <footer><button class="secondary" onClick=${onFold}>Xem bàn cờ (Esc)</button></footer>
  </div></div>`
}

/** A folded dialog, or someone else's decision: who the game waits on and why. */
export function DecisionBar({ decision, mine, onOpen }: { decision: Decision; mine: boolean; onOpen?: () => void }) {
  return html`<div class=${`decisionbar${mine ? ' mine' : ''}`} role="status">
    <${FactionChip} f=${decision.player as FactionId} /> <span>${mine ? 'Bạn cần quyết định: ' : 'Đang chờ: '}${decision.title}</span> <small class="rule">${decision.rule}</small>
    ${onOpen && html`<button onClick=${onOpen}>Mở lại</button>`}</div>`
}

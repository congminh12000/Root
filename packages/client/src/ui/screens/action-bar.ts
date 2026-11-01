import type { Action } from '@root/game-engine'
import { html } from 'htm/preact'
import { useEffect, useState } from 'preact/hooks'
import { clearingsOf, describe, GROUP } from '../../describe.ts'
import { generalActions, IDLE, viewOf, warriorCounts, type Stage } from '../../interaction/select.ts'

type Preview = (c: number[] | null) => void
const label = (a: Action) => {
  const bare = a.type === 'end-step' || a.type.startsWith('decline') || a.type === 'end-battle-cards' || a.type === 'outrage-reveal' || a.type === 'marquise-end-march'
  return bare ? GROUP[a.type] ?? a.type : describe(a)
}
const typing = (e: KeyboardEvent) => e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement

/** A button for one legal action; hovering it lights the clearings it is about. */
function ActButton({ a, send, onPreview, text, primary }: { a: Action; send: (a: Action) => void; onPreview: Preview; text?: string; primary?: boolean }) {
  return html`<button class=${primary ? '' : 'secondary'} onClick=${() => { onPreview(null); send(a) }}
    onMouseEnter=${() => onPreview(clearingsOf(a))} onMouseLeave=${() => onPreview(null)} onFocus=${() => onPreview(clearingsOf(a))} onBlur=${() => onPreview(null)}>${text ?? label(a)}</button>`
}

/**
 * The actions of the moment, chosen on the board first (interaction/select.ts): click a lit clearing, then a
 * destination and a count for moves. Actions with no clearing are buttons. Every legal action also stays in the
 * full list below. Keys: Esc deselects, a digit picks how many warriors, Enter confirms the move.
 */
export function ActionBar({ legal, stage, setStage, onPreview, send }: {
  legal: Action[]; stage: Stage; setStage: (s: Stage) => void; onPreview: Preview; send: (a: Action) => void
}) {
  const v = viewOf(legal, stage)
  const counts = warriorCounts(v.along)
  const pathKey = stage.kind === 'path' ? `${stage.from}-${stage.to}` : ''
  const [count, setCount] = useState(0)
  useEffect(() => setCount(counts ? counts[counts.length - 1]! : 0), [pathKey, counts?.join()])
  const chosen = counts ? v.along.find(a => (a.payload as { warriors: number }).warriors === count) : undefined

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Escape' && stage.kind !== 'idle') { setStage(IDLE); e.preventDefault() }
      if (counts && /^[1-9]$/.test(e.key) && counts.includes(Number(e.key))) setCount(Number(e.key))
      if (e.key === 'Enter' && stage.kind === 'path' && (chosen ?? (v.along.length === 1 ? v.along[0] : undefined))) {
        e.preventDefault(); send((chosen ?? v.along[0])!)
      }
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [stage, count, legal])

  const general = generalActions(legal)
  const groups = new Map<string, Action[]>()
  for (const a of general) groups.set(a.type, [...(groups.get(a.type) ?? []), a])

  return html`<section class="card act"><h3>Lựa chọn của bạn</h3>
    ${stage.kind === 'idle' && v.targets.length > 0 && html`<p class="prompt">Bấm một ô có viền vàng trên bàn cờ để xem hành động ở đó.</p>`}
    ${stage.kind !== 'idle' && html`<div class="stage">
      <b>${stage.kind === 'at' ? `Ô ${stage.clearing + 1}` : `Ô ${stage.from + 1} → ô ${stage.to + 1}`}</b>
      <button class="secondary" onClick=${() => setStage(IDLE)} aria-keyshortcuts="Escape">Bỏ chọn (Esc)</button></div>`}

    ${stage.kind === 'path' && (counts
      ? html`<div class="group"><label>Số chiến binh (bấm số trên bàn phím)</label>
          <div class="counts" role="group" aria-label="Số chiến binh">${counts.map(n => html`<button class="secondary" aria-pressed=${n === count} onClick=${() => setCount(n)}>${n}</button>`)}</div>
          ${chosen && html`<${ActButton} a=${chosen} send=${send} onPreview=${onPreview} primary text=${`${GROUP[chosen.type] ?? chosen.type}: ${describe(chosen)} (Enter)`} />`}</div>`
      : html`<div class="group buttons">${v.along.map(a => html`<${ActButton} a=${a} send=${send} onPreview=${onPreview} primary text=${`${GROUP[a.type] ?? a.type}: ${describe(a)}`} />`)}</div>`)}

    ${stage.kind === 'at' && v.destinations.length > 0 && html`<p class="prompt">Di chuyển: bấm ô đến (${v.destinations.map(d => `ô ${d + 1}`).join(', ')}).</p>`}
    ${stage.kind !== 'idle' && v.here.length > 0 && html`<div class="group buttons">
      ${v.here.map(a => html`<${ActButton} a=${a} send=${send} onPreview=${onPreview} primary=${v.here.length === 1} text=${`${GROUP[a.type] ?? a.type}: ${describe(a)}`} />`)}</div>`}

    ${[...groups].map(([type, list]) => html`<div class="group buttons" key=${type}>
      ${!(list.length === 1 && label(list[0]!) === (GROUP[type] ?? type)) && html`<label>${GROUP[type] ?? type}${list.length > 1 ? ` (${list.length})` : ''}</label>`}
      ${list.map(a => html`<${ActButton} a=${a} send=${send} onPreview=${onPreview} primary=${a.type === 'end-step'} />`)}</div>`)}

    <details class="fulllist"><summary>Danh sách đầy đủ (${legal.length})</summary><${FullList} legal=${legal} onPreview=${onPreview} send=${send} /></details>
  </section>`
}

/** Every legal action grouped by type, as before UI-4: the fallback that always shows everything. */
function FullList({ legal, onPreview, send }: { legal: Action[]; onPreview: Preview; send: (a: Action) => void }) {
  const groups = new Map<string, Action[]>()
  for (const a of legal) groups.set(a.type, [...(groups.get(a.type) ?? []), a])
  return html`${[...groups].map(([type, list]) => html`<${ActionGroup} key=${type} type=${type} list=${list} onPreview=${onPreview} send=${send} />`)}`
}

function ActionGroup({ type, list, onPreview, send }: { type: string; list: Action[]; onPreview: Preview; send: (a: Action) => void }) {
  const [index, setIndex] = useState(0)
  const name = GROUP[type] ?? type
  if (list.length === 1) return html`<div class="group"><button onClick=${() => send(list[0]!)}>${name}${label(list[0]!) === name ? '' : `: ${label(list[0]!)}`}</button></div>`
  const i = Math.min(index, list.length - 1)
  const look = (n: number) => { setIndex(n); onPreview(clearingsOf(list[n]!)) }
  return html`<div class="group"><label for=${`g-${type}`}>${name} (${list.length})</label>
    <select id=${`g-${type}`} value=${i} onChange=${(e: Event) => look(Number((e.target as HTMLSelectElement).value))} onFocus=${() => look(i)}>
      ${list.map((a, n) => html`<option value=${n}>${describe(a)}</option>`)}</select>
    <button onClick=${() => send(list[i]!)}>Thực hiện</button></div>`
}

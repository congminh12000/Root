import type { Action } from '@root/game-engine'
import { html } from 'htm/preact'
import { useState } from 'preact/hooks'
import { clearingsOf, describe, GROUP } from '../../describe.ts'

type Preview = (c: number[] | null) => void
const label = (a: Action) => {
  const bare = a.type === 'end-step' || a.type.startsWith('decline') || a.type === 'end-battle-cards' || a.type === 'outrage-reveal' || a.type === 'marquise-end-march'
  return bare ? GROUP[a.type] ?? a.type : describe(a)
}

/** Every legal action, grouped by kind: the fallback behind the HUD's "Tất cả lựa chọn" (docs/07-ui/gameplay-map-only.md §3). */
export function FullList({ legal, onPreview, send }: { legal: Action[]; onPreview: Preview; send: (a: Action) => void }) {
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

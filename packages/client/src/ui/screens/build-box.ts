import type { Action, PlayerView } from '@root/game-engine'
import { html } from 'htm/preact'
import { useState } from 'preact/hooks'
import { clearingsOf } from '../../describe.ts'
import { buildOptions, type Building } from '../../interaction/build.ts'
import { Icon } from '../components.ts'

/**
 * RD-M02: the Build box at a clearing, laid out like Root Digital (docs/07-ui/root-digital/marquise.md §1): one column
 * per building with the points it scores and the wood it costs; one click builds, taking wood the suggested way. Ticking
 * "Tự chọn gỗ" lists every legal way to pay for the building clicked next. Icons and styling are our own.
 */

const NAME: Record<Building, string> = { workshop: 'Workshop', sawmill: 'Sawmill', recruiter: 'Recruiter' }
const ICON: Record<Building, string> = { workshop: 'hammer', sawmill: 'saw', recruiter: 'marquise' }
const where = (wood: number[]) => [...new Set(wood)].map(c => `ô ${c + 1}${wood.filter(x => x === c).length > 1 ? ` ×${wood.filter(x => x === c).length}` : ''}`).join(', ')

export function BuildBox({ view, legal, clearing, send, onPreview, ownWood = false, opened = null }: {
  view: PlayerView; legal: Action[]; clearing: number; send: (a: Action) => void; onPreview: (c: number[] | null) => void
  /** Start with "Tự chọn gỗ" ticked and one building open (UI kit only). */
  ownWood?: boolean; opened?: Building | null
}) {
  const [own, setOwn] = useState(ownWood)
  const [open, setOpen] = useState<Building | null>(opened)
  const options = buildOptions(view, legal, clearing)
  if (!options.length) return null
  const chosen = options.find(o => o.building === open)
  const go = (a: Action) => { onPreview(null); send(a) }
  return html`<div class="build-box" role="group" aria-label=${`Xây ở ô ${clearing + 1}`}>
    <div class="build-cols">${options.map(o => html`<button class=${`build-col${open === o.building ? ' on' : ''}`} key=${o.building}
        aria-label=${`Xây ${NAME[o.building]} ở ô ${clearing + 1}: được ${o.points} điểm, tốn ${o.wood} gỗ`}
        onMouseEnter=${() => onPreview(clearingsOf(o.auto))} onMouseLeave=${() => onPreview(null)}
        onClick=${() => (own && o.ways.length > 1 ? setOpen(o.building) : go(o.auto))}>
      <b>${NAME[o.building]}</b>
      <span class="build-pic"><${Icon} name=${ICON[o.building]} /></span>
      <span class="build-vp" title="Điểm khi xây"><${Icon} name="star" /> ${o.points}</span>
      <span class="build-wood" title="Gỗ cần">${o.wood} gỗ</span>
    </button>`)}</div>
    <label class="build-own"><input type="checkbox" checked=${own} onChange=${(e: Event) => { setOwn((e.target as HTMLInputElement).checked); setOpen(null) }} /> Tự chọn gỗ</label>
    ${own && chosen && html`<div class="acts" role="group" aria-label=${`Cách lấy gỗ cho ${NAME[chosen.building]}`}>${chosen.ways.map(a => html`<button class="secondary"
        onMouseEnter=${() => onPreview(clearingsOf(a))} onMouseLeave=${() => onPreview(null)} onClick=${() => go(a)}>Gỗ từ ${where(a.payload.wood) || 'không cần gỗ'}</button>`)}</div>`}
  </div>`
}

import { AUTUMN } from '@root/game-data'
import type { Action, LastRoll, PlayerView } from '@root/game-engine'
import { html } from 'htm/preact'
import { useEffect, useState } from 'preact/hooks'
import { clearingsOf, describe, GROUP } from '../../describe.ts'
import { generalActions, IDLE, viewOf, warriorCounts, type Stage } from '../../interaction/select.ts'
import { SUIT_NAME } from '../../names.ts'
import type { Changes } from '../../net/changes.ts'
import { Dice, FactionChip, Icon, SuitPip } from '../components.ts'
import { BuildBox } from './build-box.ts'
import { ClearingInfo } from './clearing-info.ts'
import type { Project } from './map-view.ts'

/**
 * What the map shows over itself (docs/07-ui/gameplay-map-only.md §3): a keyboard anchor on every clearing that does
 * something, a menu at the chosen clearing (its actions, where pieces can go, how many), and the actions with no
 * clearing in a bubble at the top. Every element is one of `legal` (interaction/select.ts); nothing here is a rule.
 */

type Preview = (c: number[] | null) => void
const bare = (a: Action) => a.type === 'end-step' || a.type.startsWith('decline') || a.type === 'end-battle-cards' || a.type === 'outrage-reveal' || a.type === 'marquise-end-march'
const label = (a: Action) => (bare(a) ? GROUP[a.type] ?? a.type : `${GROUP[a.type] ?? a.type}: ${describe(a)}`)
const typing = (e: KeyboardEvent) => e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement

function Act({ a, send, onPreview, text, primary }: { a: Action; send: (a: Action) => void; onPreview: Preview; text?: string; primary?: boolean }) {
  return html`<button class=${primary ? '' : 'secondary'} onClick=${() => { onPreview(null); send(a) }}
    onMouseEnter=${() => onPreview(clearingsOf(a))} onMouseLeave=${() => onPreview(null)} onFocus=${() => onPreview(clearingsOf(a))} onBlur=${() => onPreview(null)}>${text ?? label(a)}</button>`
}

/** Keyboard anchors: one per clearing that can be chosen now. Pointers pass through to the map underneath. */
function Anchors({ project, clearings, selected, onPick }: { project: Project; clearings: number[]; selected: number[]; onPick: (c: number) => void }) {
  return html`${clearings.map(c => {
    const at = project(c)
    if (!at) return null
    const def = AUTUMN.clearings[c]!
    return html`<button key=${c} class=${`map-anchor${selected.includes(c) ? ' on' : ''}`} style=${{ left: `${at[0]}px`, top: `${at[1]}px` }}
      aria-label=${`Ô ${c + 1}, ${SUIT_NAME[def.suit]}`} aria-pressed=${selected.includes(c)} data-clearing=${c} onClick=${() => onPick(c)}></button>`
  })}`
}

/** The menu at the chosen clearing; on a path, at the destination with the warrior count. */
function ClearingMenu({ project, view: v, legal, stage, setStage, send, onPreview }: {
  project: Project; view: PlayerView; legal: Action[]; stage: Stage; setStage: (s: Stage) => void; send: (a: Action) => void; onPreview: Preview
}) {
  const b = viewOf(legal, stage)
  const counts = warriorCounts(b.along)
  const [count, setCount] = useState(0)
  const pathKey = stage.kind === 'path' ? `${stage.from}-${stage.to}` : ''
  useEffect(() => setCount(counts ? counts[counts.length - 1]! : 0), [pathKey, counts?.join()])
  const chosen = counts ? b.along.find(a => (a.payload as { warriors: number }).warriors === count) : b.along.length === 1 ? b.along[0] : undefined

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Escape') { setStage(IDLE); e.preventDefault() }
      if (counts && /^[1-9]$/.test(e.key) && counts.includes(Number(e.key))) setCount(Number(e.key))
      if (e.key === 'Enter' && stage.kind === 'path' && chosen && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); send(chosen) }
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [stage, count, legal])

  if (stage.kind === 'idle') return null
  const anchor = stage.kind === 'at' ? stage.clearing : stage.to
  const at = project(anchor)
  if (!at) return null
  const def = AUTUMN.clearings[anchor]!, lord = v.rulers[anchor]
  // Marquise builds fold into the Build box (RD-M02); everything else stays a plain list.
  const others = b.here.filter(a => a.type !== 'marquise-build')
  const below = at[1] < 260, x = Math.min(Math.max(at[0], 190), innerWidth - 190)
  return html`<section class=${`map-menu${below ? ' below' : ''}`} style=${{ left: `${x}px`, top: `${at[1]}px` }} role="dialog" aria-label=${`Ô ${anchor + 1}`}>
    <header><b>${stage.kind === 'at' ? `Ô ${anchor + 1}` : `Ô ${stage.from + 1} → ô ${stage.to + 1}`}</b> <${SuitPip} suit=${def.suit} />
      ${lord && html`<${FactionChip} f=${lord} />`}
      <button class="secondary close" aria-label="Bỏ chọn (Esc)" onClick=${() => setStage(IDLE)}>×</button></header>
    ${stage.kind === 'path' && (counts
      ? html`<div class="counts" role="group" aria-label="Số chiến binh">${counts.map(n => html`<button class="secondary" aria-pressed=${n === count} onClick=${() => setCount(n)}>${n}</button>`)}</div>
          ${chosen && html`<${Act} a=${chosen} send=${send} onPreview=${onPreview} primary text=${`${label(chosen)} · Enter`} />`}`
      : html`<div class="acts">${b.along.map(a => html`<${Act} a=${a} send=${send} onPreview=${onPreview} primary />`)}</div>`)}
    ${stage.kind === 'at' && b.destinations.length > 0 && html`<p class="hint">Di chuyển: kéo quân sang ô khác, hoặc chạm ô đến (${b.destinations.map(d => `ô ${d + 1}`).join(', ')}).</p>`}
    ${stage.kind === 'at' && others.length > 0 && html`<div class="acts">${others.map(a => html`<${Act} a=${a} send=${send} onPreview=${onPreview} primary=${b.here.length === 1} />`)}</div>`}
    ${stage.kind === 'at' && others.length < b.here.length && html`<${BuildBox} view=${v} legal=${b.here} clearing=${anchor} send=${send} onPreview=${onPreview} />`}
  </section>`
}

/** Actions with no clearing (end the step, craft, play a card…), at the top of the map; big groups fold. */
function ActionBubble({ legal, send, onPreview }: { legal: Action[]; send: (a: Action) => void; onPreview: Preview }) {
  const [open, setOpen] = useState<string | null>(null)
  const general = generalActions(legal)
  if (!general.length) return null
  const groups = new Map<string, Action[]>()
  for (const a of general) groups.set(a.type, [...(groups.get(a.type) ?? []), a])
  return html`<section class="map-bubble" aria-label="Hành động chung">${[...groups].map(([type, list]) => list.length <= 3 || open === type
    ? html`<div class="group" key=${type}>${list.length > 3 && html`<button class="secondary" onClick=${() => setOpen(null)}>‹ ${GROUP[type] ?? type}</button>`}
        ${list.map(a => html`<${Act} a=${a} send=${send} onPreview=${onPreview} primary=${a.type === 'end-step'} />`)}</div>`
    : html`<button class="secondary" key=${type} aria-expanded="false" onClick=${() => setOpen(type)}>${GROUP[type] ?? type} (${list.length}) ›</button>`)}</section>`
}

export function MapOverlay({ project, view, legal, stage, setStage, send, onPreview, onPick, bubble = true }: {
  project: Project; view: PlayerView; legal: Action[]; stage: Stage; setStage: (s: Stage) => void
  send: (a: Action) => void; onPreview: Preview; onPick: (c: number) => void
  /** False while a decision dialog shows the same choices. */
  bubble?: boolean
}) {
  const b = viewOf(legal, stage)
  return html`
    <${Anchors} project=${project} clearings=${[...new Set([...b.targets, ...b.selected])]} selected=${b.selected} onPick=${onPick} />
    <${ClearingMenu} project=${project} view=${view} legal=${legal} stage=${stage} setStage=${setStage} send=${send} onPreview=${onPreview} />
    ${bubble && html`<${ActionBubble} legal=${legal} send=${send} onPreview=${onPreview} />`}`
}

/** The latest battle roll, at the clearing it was rolled in, for a few seconds. */
export function MapDice({ project, changes, below }: { project: Project; changes: Changes; below?: number | null }) {
  const [roll, setRoll] = useState<LastRoll | null>(null)
  useEffect(() => {
    if (!changes.roll) return
    setRoll(changes.roll)
    const id = setTimeout(() => setRoll(null), 3500)
    return () => clearTimeout(id)
  }, [changes.seq])
  const at = roll && project(roll.clearing)
  if (!roll || !at) return null
  // Keyed by revision so two rolls in a row both replay their entry animation.
  // Below the clearing when a decision callout already sits above it.
  // RD-M08: the rest of the map dims around the clearing of battle, and the two sides face off over the dice.
  return html`<div class="battle-spot" key=${`spot-${roll.revision}`} aria-hidden="true" style=${{ '--x': `${at[0]}px`, '--y': `${at[1]}px` }}></div>
    <div class=${`dice map-dice${below === roll.clearing ? ' below' : ''}`} key=${roll.revision} role="status" style=${{ left: `${Math.min(Math.max(at[0], 236), innerWidth - 236)}px`, top: `${at[1]}px` }}>
    <div class="vs"><span class="side" style=${{ '--chip': `var(--faction-${roll.attacker})` }}><${Icon} name=${roll.attacker} /><b>${roll.hits.attacker}</b></span>
      <span class="vs-word">VS</span><span class="side" style=${{ '--chip': `var(--faction-${roll.defender})` }}><b>${roll.hits.defender}</b><${Icon} name=${roll.defender} /></span></div>
    <${Dice} roll=${roll} /></div>`
}

/** What is in a clearing, next to it on the map (hover with a mouse, hold with a finger). */
export function MapInfo({ project, view, clearing, onClose }: { project: Project; view: PlayerView; clearing: number; onClose: () => void }) {
  const at = project(clearing)
  if (!at) return null
  const right = at[0] < innerWidth - 360
  return html`<div class=${`map-info${right ? '' : ' left'}`} style=${{ left: `${at[0]}px`, top: `${Math.min(Math.max(at[1], 250), innerHeight - 160)}px` }}>
    <${ClearingInfo} view=${view} clearing=${clearing} onClose=${onClose} /></div>`
}

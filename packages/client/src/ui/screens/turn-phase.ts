import type { FactionId, PlayerView } from '@root/game-engine'
import { html } from 'htm/preact'
import { useEffect, useState } from 'preact/hooks'
import { FACTION_NAME, PHASE_NAME } from '../../names.ts'
import { Icon } from '../components.ts'

/** Turn ownership is independent of the player answering an interrupt (Ambush, Outrage…). */
export function turnOwner(v: PlayerView): FactionId | null {
  return v.stage === 'play' && !v.winner ? v.seats[v.turn.seat]?.faction ?? null : null
}

export function PhaseMark({ phase }: { phase: PlayerView['turn']['phase'] }) {
  return html`<span class="phase-mark" title=${PHASE_NAME[phase]}><${Icon} name=${phase === 'birdsong' ? 'bird' : phase === 'daylight' ? 'sun' : 'moon'} />${PHASE_NAME[phase]}</span>`
}

export function TurnBanner({ faction, number }: { faction: FactionId; number: number }) {
  return html`<aside class="turn-banner" role="status" aria-live="polite"><${Icon} name=${faction} /><span>Lượt của <b>${FACTION_NAME[faction]}</b><small>Lượt ${number}</small></span></aside>`
}

/** Repeated revisions, phase changes and temporary responders do not replay the banner. */
export function TurnNotice({ view }: { view: PlayerView }) {
  const owner = turnOwner(view)
  const key = owner ? `${view.gameId}:${view.turn.number}:${owner}` : null
  const [visible, setVisible] = useState<string | null>(key)
  useEffect(() => {
    setVisible(key)
    if (!key) return
    const timer = setTimeout(() => setVisible(null), 2400)
    return () => clearTimeout(timer)
  }, [key])
  return owner && visible === key ? html`<${TurnBanner} key=${key} faction=${owner} number=${view.turn.number} />` : null
}

/** RD-M09: the newest faction event (Revolt, Outrage, Coalition, Dominance, Turmoil) as a banner for a moment. */
export function EventNotice({ changes }: { changes: import('../../net/changes.ts').Changes }) {
  const [event, setEvent] = useState<import('../../interaction/events.ts').GameEvent | null>(null)
  useEffect(() => {
    const last = changes.events[changes.events.length - 1]
    if (!last) return
    setEvent(last)
    const timer = setTimeout(() => setEvent(null), 2600)
    return () => clearTimeout(timer)
  }, [changes.seq])
  return event ? html`<${EventBanner} key=${event.key} event=${event} />` : null
}

export function EventBanner({ event }: { event: import('../../interaction/events.ts').GameEvent }) {
  return html`<aside class="turn-banner event-banner" role="status" aria-live="polite" style=${{ '--chip': `var(--faction-${event.faction})` }}>
    <${Icon} name=${event.faction} /><span><b>${event.title}</b><small>${FACTION_NAME[event.faction]}${event.note ? ` · ${event.note}` : ''}</small></span></aside>`
}

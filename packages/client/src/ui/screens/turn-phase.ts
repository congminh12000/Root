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

import type { FactionId, PlayerView } from '@root/game-engine'
import { html } from 'htm/preact'
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import { DEAL_FLY_MS, DEAL_GAP_MS, DEAL_START_MS, dealPlan, handIncoming, handLanded, shouldDeal, type Draw } from '../../interaction/deal.ts'
import type { Changes } from '../../net/changes.ts'
import { CardFace } from '../card-face.ts'

interface Flying extends Draw { id: number }

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const dealtKey = (gameId: string) => `root-dealt:${gameId}`
const withCard = (set: ReadonlySet<string>, card: string, on: boolean) => {
  const out = new Set(set)
  if (on) out.add(card); else out.delete(card)
  return out
}

/**
 * Cards off the shared deck, which sits past the right edge of the screen (RD opening). Once the map is drawn, a game
 * still in setup deals the starting hands one card per seat round the table; afterwards every draw flies in the same
 * way. Opponents' cards go face down to their badges at the top left; yours fly face up into your hand, each set down
 * in turn. The opening plays once per game per browser tab. Nothing flies with reduced motion.
 */
export function CardFlights({ gameId, view, seat, start, changes }: {
  gameId: string; view: PlayerView; seat: FactionId | null; changes: Changes
  /** The map is drawn. */
  start: boolean
}) {
  const [flying, setFlying] = useState<Flying[]>([])
  const nextId = useRef(0)
  const timers = useRef<number[]>([])
  const latest = useRef({ view, seat })
  latest.current = { view, seat }

  /** Sends `draws` one after another from `delay`; your own cards wait as empty slots in the hand until they land. */
  const send = (draws: Draw[], delay: number) => {
    for (const d of draws) if (d.card) handIncoming.value = withCard(handIncoming.value, d.card, true)
    draws.forEach((d, i) => timers.current.push(window.setTimeout(() => setFlying(f => [...f, { ...d, id: nextId.current++ }]), delay + i * DEAL_GAP_MS)))
  }

  // Decided on arrival, so your hand stays empty from the first frame until its opening cards land.
  const opening = useRef<Draw[] | null>(null)
  if (opening.current === null) {
    let seen = false
    try { seen = sessionStorage.getItem(dealtKey(gameId)) === '1' } catch { /* private mode */ }
    opening.current = !seen && shouldDeal(view) && !reduced()
      ? dealPlan(view.seats.map(s => s.faction), view.handCounts).map(s => ({ faction: s.faction, card: s.faction === seat ? view.hand[s.nth] ?? null : null }))
      : []
    for (const d of opening.current) if (d.card) handIncoming.value = withCard(handIncoming.value, d.card, true)
  }
  useEffect(() => () => {
    timers.current.forEach(clearTimeout)
    handIncoming.value = new Set()
    handLanded.value = null
  }, [])
  useEffect(() => {
    if (!start || !opening.current?.length) return
    try { sessionStorage.setItem(dealtKey(gameId), '1') } catch { /* private mode */ }
    handIncoming.value = new Set()
    send(opening.current, DEAL_START_MS)
    opening.current = []
  }, [start])
  useEffect(() => {
    if (changes.draws.length && !reduced()) send(changes.draws, 0)
  }, [changes.seq])

  const landed = (f: Flying) => {
    setFlying(list => list.filter(x => x.id !== f.id))
    if (f.card) { handIncoming.value = withCard(handIncoming.value, f.card, false); handLanded.value = f.card }
  }
  if (!flying.length) return null
  return html`<div class="deal-layer" aria-hidden="true">${flying.map(f => html`<${DealCard} key=${f.id} flying=${f} onLand=${() => landed(f)} />`)}</div>`
}

function DealCard({ flying, onLand }: { flying: Flying; onLand: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const own = flying.card !== null
  useLayoutEffect(() => {
    const el = box.current
    if (!el || typeof el.animate !== 'function') { onLand(); return }
    const slot = own ? document.querySelector(`.hud-hand [data-card="${CSS.escape(flying.card!)}"]`)?.closest('.hand-slot') : null
    const target = (slot ?? document.querySelector(`.hud-faction[data-faction="${flying.faction}"]`))?.getBoundingClientRect()
    const w = el.offsetWidth, h = el.offsetHeight
    const cx = target ? target.left + (slot ? target.width / 2 : 34) : window.innerWidth / 2
    const cy = target ? target.top + target.height / 2 : window.innerHeight / 2
    el.style.left = `${cx - w / 2}px`
    el.style.top = `${cy - h / 2}px`
    const from = `translate(${window.innerWidth + w - cx}px, ${window.innerHeight * 0.42 - cy}px) rotate(-10deg)`
    const frames = slot
      ? [{ transform: from }, { transform: 'none' }]
      : [{ transform: from, opacity: 1 }, { transform: 'scale(0.55)', opacity: 1, offset: 0.85 }, { transform: 'scale(0.35)', opacity: 0 }]
    const a = el.animate(frames, { duration: DEAL_FLY_MS, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' })
    // A background tab may never finish the animation, so a timer lands the card anyway.
    let done = false
    const land = () => { if (!done) { done = true; onLand() } }
    a.onfinish = land
    const fallback = window.setTimeout(land, DEAL_FLY_MS + 150)
    return () => { a.onfinish = null; clearTimeout(fallback) }
  }, [])
  return html`<div class=${`deal-card${own ? ' own' : ''}`} ref=${box}>${own ? html`<${CardFace} card=${flying.card!} size="mini" />` : html`<span class="deal-back" />`}</div>`
}

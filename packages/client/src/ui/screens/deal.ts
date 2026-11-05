import type { FactionId, PlayerView } from '@root/game-engine'
import { html } from 'htm/preact'
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import { DEAL_FLY_MS, DEAL_GAP_MS, DEAL_START_MS, dealPlan, dealShown, shouldDeal, type DealStep } from '../../interaction/deal.ts'
import { CardFace } from '../card-face.ts'

interface Flying extends DealStep { id: number; card: string | null }

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const dealtKey = (gameId: string) => `root-dealt:${gameId}`

/**
 * The opening deal (RD opening): cards fly in from the right edge, in seat order. Opponents' cards go face down to
 * their badges at the top left; your own fly face up straight into your hand and each is set down there in turn.
 * Starts once the map is drawn; plays once per game per browser tab, only while the game is in setup.
 */
export function OpeningDeal({ gameId, view, seat, start }: { gameId: string; view: PlayerView; seat: FactionId | null; /** The map is drawn. */ start: boolean }) {
  const [flying, setFlying] = useState<Flying[]>([])
  const latest = useRef({ view, seat })
  latest.current = { view, seat }
  // Decided on arrival, so your hand stays empty from the first frame until its cards land.
  const willDeal = useRef<boolean | null>(null)
  if (willDeal.current === null) {
    let seen = false
    try { seen = sessionStorage.getItem(dealtKey(gameId)) === '1' } catch { /* private mode */ }
    willDeal.current = !seen && shouldDeal(view) && !reduced()
    if (willDeal.current && seat && (view.handCounts[seat] ?? 0) > 0) dealShown.value = 0
  }
  useEffect(() => () => { dealShown.value = null }, [])
  useEffect(() => {
    if (!start || !willDeal.current) return
    try { sessionStorage.setItem(dealtKey(gameId), '1') } catch { /* private mode */ }
    const { view: v, seat: own } = latest.current
    const plan = dealPlan(v.seats.map(s => s.faction), v.handCounts)
    const timers = plan.map((step, i) => window.setTimeout(() => setFlying(f => [...f, {
      ...step, id: i, card: step.faction === own ? v.hand[step.nth] ?? null : null,
    }]), DEAL_START_MS + i * DEAL_GAP_MS))
    const end = window.setTimeout(() => { dealShown.value = null }, DEAL_START_MS + plan.length * DEAL_GAP_MS + DEAL_FLY_MS + 400)
    return () => { timers.forEach(clearTimeout); clearTimeout(end); dealShown.value = null }
  }, [start])
  const landed = (f: Flying) => {
    setFlying(list => list.filter(x => x.id !== f.id))
    if (f.card !== null && dealShown.value !== null) dealShown.value = Math.max(dealShown.value, f.nth + 1)
  }
  if (!flying.length) return null
  return html`<div class="deal-layer" aria-hidden="true">${flying.map(f => html`<${DealCard} key=${f.id} flying=${f} own=${f.card !== null} onLand=${() => landed(f)} />`)}</div>`
}

function DealCard({ flying, own, onLand }: { flying: Flying; own: boolean; onLand: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = box.current
    if (!el || typeof el.animate !== 'function') { onLand(); return }
    const target = own
      ? document.querySelectorAll('.hud-hand .hand-slot')[flying.nth]?.getBoundingClientRect()
      : document.querySelector(`.hud-faction[data-faction="${flying.faction}"]`)?.getBoundingClientRect()
    const w = el.offsetWidth, h = el.offsetHeight
    const cx = target ? target.left + (own ? target.width / 2 : 34) : window.innerWidth / 2
    const cy = target ? target.top + target.height / 2 : window.innerHeight / 2
    el.style.left = `${cx - w / 2}px`
    el.style.top = `${cy - h / 2}px`
    const from = `translate(${window.innerWidth + w - cx}px, ${window.innerHeight * 0.42 - cy}px) rotate(-10deg)`
    const frames = own
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

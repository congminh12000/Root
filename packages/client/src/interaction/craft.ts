import { MAPS, type Suit } from '@root/game-data'
import type { FactionId, PlayerView } from '@root/game-engine'
import { cardDesign } from '../names.ts'

/**
 * Showing crafting (§4.1.1): which crafting pieces the seat has and which of them the open card would activate.
 * Display only, read from the PlayerView; whether a card can be crafted now comes from the legal craft actions.
 */

/** One crafting piece: its clearing (null for the Vagabond's hammers, §9.2.1) and suit, and whether it was activated this turn. */
export interface CraftPiece { clearing: number | null; suit: Suit; used: boolean }

/** A cost icon of the card and the piece that pays it, if any. */
export interface CostIcon { icon: Suit | 'any'; piece: CraftPiece | null }

/** Each faction's crafting piece (§6.2.1 workshop, §7.2.1 roost, §8.2.1 sympathy, §9.2.1 face-up hammer). */
export function craftPieces(v: PlayerView, f: FactionId): CraftPiece[] {
  const map = MAPS[v.map.id]
  if (!map) return []
  if (f === 'vagabond') {
    const vb = v.factions.vagabond
    if (vb?.pawn?.kind !== 'clearing') return []
    const suit = map.clearings[vb.pawn.id]!.suit
    return vb.satchel.filter(i => i.type === 'hammer' && !i.exhausted).map(() => ({ clearing: null, suit, used: false }))
  }
  const out: CraftPiece[] = []
  v.map.clearings.forEach((c, id) => {
    const n = f === 'alliance'
      ? c.tokens.filter(t => t.faction === 'alliance' && t.type === 'sympathy').length
      : c.slots.filter(s => s?.kind === 'building' && s.faction === f && s.type === (f === 'marquise' ? 'workshop' : 'roost')).length
    const used = v.craftingUsed.filter(u => u === id).length // §4.1.1: once per turn, one entry per activated piece
    for (let k = 0; k < n; k++) out.push({ clearing: id, suit: map.clearings[id]!.suit, used: k < used })
  })
  return out
}

/** The card's cost, each icon matched to a distinct unused piece of its suit; "any" icons are matched last (§4.1.1). */
export function matchCost(card: string, pieces: CraftPiece[]): CostIcon[] {
  const left = pieces.filter(p => !p.used)
  const cost = cardDesign(card).cost
  const order = cost.map((icon, i) => ({ icon, i })).sort((a, b) => Number(a.icon === 'any') - Number(b.icon === 'any'))
  const out: CostIcon[] = cost.map(icon => ({ icon, piece: null }))
  for (const { icon, i } of order) {
    const k = left.findIndex(p => icon === 'any' || p.suit === icon)
    if (k >= 0) out[i]!.piece = left.splice(k, 1)[0]!
  }
  return out
}

/** Clearings holding the pieces that would pay for `card`, for lighting them on the map. */
export const craftClearings = (icons: CostIcon[]) =>
  [...new Set(icons.flatMap(c => (c.piece?.clearing ?? null) === null ? [] : [c.piece!.clearing!]))].sort((a, b) => a - b)

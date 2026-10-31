import { mapOf } from './board.ts'
import { dealHits, offerFieldHospital, removeAllEnemies } from './removal.ts'
import { award, cardDef, discardCard, takeFromHand } from './rules.ts'
import type { CardId, ClearingId, FactionId, GameState, ItemType, Suit } from './state.ts'

/** A crafting piece that can still be activated this turn (§4.1.1): its id and the suit of its clearing. */
export interface CraftingPiece { id: ClearingId | 'vagabond'; suit: Suit }

/**
 * Matches each cost icon to a distinct piece of that suit (§4.1.1); "any" takes any suit. Specific icons are
 * matched first, so a greedy pass is exact. Returns the pieces used, or null if the cost cannot be paid.
 */
export function payCost(cost: (Suit | 'any')[], pieces: CraftingPiece[]): CraftingPiece[] | null {
  const left = [...pieces], used: CraftingPiece[] = []
  for (const icon of [...cost].sort((a, b) => Number(a === 'any') - Number(b === 'any'))) {
    const i = left.findIndex(p => icon === 'any' || p.suit === icon)
    if (i < 0) return null
    used.push(left.splice(i, 1)[0]!)
  }
  return used
}

/** Whether `f` can craft `card` with these pieces: craftable, payable, item in supply, no duplicate (§4.1). */
export function canCraft(state: GameState, f: FactionId, card: CardId, pieces: CraftingPiece[]): boolean {
  const def = cardDef(card)
  if (def.kind === 'ambush' || def.kind === 'dominance') return false // §2.1.2, §2.1.3
  if (!payCost(def.cost, pieces)) return false
  if (def.item && !(state.itemSupply[def.item]! > 0)) return false // §4.1.2
  if (def.kind === 'persistent' && state.playAreas[f]!.some(c => cardDef(c).id === def.id)) return false // §4.1.4
  return true
}

const TRACKED = ['tea', 'coin', 'bag']

/** Gives a crafted item to its crafter: Crafted Items box, or face up in the Vagabond's Satchel/track (§4.1.2, §9.2.1). */
function takeItem(state: GameState, f: FactionId, item: ItemType) {
  state.itemSupply[item]! -= 1
  if (f !== 'vagabond') { state.factions[f]!.craftedItems.push(item); return }
  const v = state.factions.vagabond!
  if (TRACKED.includes(item) && v.tracks[item as 'tea'] < 3) v.tracks[item as 'tea'] += 1
  else v.satchel.push({ type: item, exhausted: false })
}

/**
 * Crafts `card` (§4.1): activates the pieces, then resolves the card. Callers check canCraft. Item cards score
 * their points (§3.2.2; Eyrie score 1 unless led by the Builder, §7.2.3, §7.8.1).
 */
export function craft(state: GameState, f: FactionId, card: CardId, pieces: CraftingPiece[]) {
  const def = cardDef(card)
  const used = payCost(def.cost, pieces)
  if (!used) throw new Error(`cannot pay for ${card}`)
  for (const p of used) if (p.id !== 'vagabond') state.craftingUsed.push(p.id) // the Vagabond ignores the once-per-turn limit
  takeFromHand(state, f, card)

  if (def.kind === 'persistent') { state.playAreas[f]!.push(card); return } // §4.1.3
  if (def.item) {
    takeItem(state, f, def.item)
    const disdain = f === 'eyrie' && state.factions.eyrie!.leader !== 'builder'
    award(state, f, disdain ? 1 : def.vp ?? 0)
  } else if (def.id.startsWith('favor-of-the-')) {
    favor(state, f, def.suit as Suit)
  }
  discardCard(state, card) // §4.1.2
}

/** Favor of the Foxes / Mice / Rabbits: remove all enemy pieces in clearings of that suit (FAQ: not the Vagabond pawn). */
function favor(state: GameState, f: FactionId, suit: Suit) {
  const hits: { clearing: ClearingId; marquise: number; vagabond: boolean }[] = []
  for (const c of mapOf(state).clearings.filter(c => c.suit === suit)) {
    const r = removeAllEnemies(state, c.id, f)
    hits.push({ clearing: c.id, marquise: r.warriors.marquise ?? 0, vagabond: r.vagabondHit })
  }
  // Effects after every piece is removed (§1.5.4).
  for (const h of hits) {
    offerFieldHospital(state, h.clearing, h.marquise)
    if (h.vagabond) dealHits(state, 'vagabond', h.clearing, 3, { by: null }) // §9.2.2.I
  }
}

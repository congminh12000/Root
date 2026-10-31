import type { ClearingId, FactionId, GameState, ItemType, SlotContent, Suit, TokenType, VagabondItem } from './state.ts'
import { effectBatch } from './order.ts'
import { award, discardCard, isEnemy, matchesSuit, suitOf } from './rules.ts'

/**
 * Removing pieces (G.24) and taking hits (§4.3.6). Buildings and tokens go back to their track or supply, the
 * remover scores one point per enemy building or token (§3.2.1), and Field Hospitals (§6.2.3) is offered after
 * every removal batch (§1.5.4: remove everything first, then trigger effects).
 */

/** Return a building to its owner's board (G.24: rightmost empty space of its track). */
function returnBuilding(state: GameState, s: Extract<SlotContent, { kind: 'building' }>) {
  const { faction: f, type } = s
  if (f === 'marquise' && (type === 'sawmill' || type === 'workshop' || type === 'recruiter')) state.factions.marquise!.buildingsOnTrack[type] += 1
  else if (f === 'eyrie' && type === 'roost') state.factions.eyrie!.roostsOnTrack += 1
  else if (f === 'alliance' && type === 'base') loseBase(state, s.suit!)
}

/**
 * Removing Bases (§8.2.4): the base returns to the board, supporters of its suit (birds too) are discarded, half the
 * officers rounded up are removed, and without any base the Alliance discards down to five supporters.
 */
export function loseBase(state: GameState, suit: Suit) {
  const a = state.factions.alliance!
  a.basesOnBoard[suit] = null
  for (const card of a.supporters.filter(c => matchesSuit(c, suit))) discardCard(state, card)
  a.supporters = a.supporters.filter(c => !matchesSuit(c, suit))
  const lost = Math.ceil(a.officers / 2)
  a.officers -= lost
  a.warriorSupply += lost
  const anyBase = Object.values(a.basesOnBoard).some(c => c !== null)
  if (!anyBase && a.supporters.length > ALLIANCE_LIMIT) state.pending.push({ kind: 'discard-supporters', player: 'alliance', to: ALLIANCE_LIMIT, batch: effectBatch(state) })
}
const ALLIANCE_LIMIT = 5 // §8.2.3.I

function returnToken(state: GameState, type: TokenType, c: ClearingId, ctx: RemovalContext) {
  if (type === 'wood') state.factions.marquise!.woodSupply += 1
  else if (type === 'keep') state.factions.marquise!.keep = null // removed permanently (§6.2.2)
  else if (type === 'sympathy') {
    state.factions.alliance!.sympathyOnTrack += 1
    if (ctx.by && ctx.by !== 'alliance') outrage(state, ctx.by, c) // §8.2.6
  }
}

/** Outrage (§8.2.6): the player who removed sympathy or moved warriors into a sympathetic clearing owes a card. */
export function outrage(state: GameState, player: FactionId, c: ClearingId) {
  if (state.factions.alliance) state.pending.push({ kind: 'outrage', player, clearing: c, batch: effectBatch(state) })
}

/**
 * The Vagabond removed pieces of `target` (§9.2.9.III): a warrior of a non-Hostile faction makes it Hostile; then
 * in battle on his own turn every further piece of a Hostile faction scores one Infamy point (§9.2.9.III.a).
 */
function vagabondRemoved(state: GameState, target: FactionId, warriors: number, others: number, ctx: RemovalContext) {
  const v = state.factions.vagabond
  if (!v || target === 'vagabond' || (!warriors && !others)) return
  let counted = warriors
  if (warriors > 0 && v.relationships[target] !== 'hostile') { v.relationships[target] = 'hostile'; counted -= 1 }
  const onTurn = ctx.inBattle && state.seats[state.turn.seat]!.faction === 'vagabond'
  if (onTurn && v.relationships[target] === 'hostile') award(state, 'vagabond', counted + others)
}

/** Non-warrior pieces of `f` in a clearing, by type (buildings first, then tokens). */
export function otherPieces(state: GameState, f: FactionId, c: ClearingId): Record<string, number> {
  const clearing = state.map.clearings[c]!
  const out: Record<string, number> = {}
  for (const s of clearing.slots) if (s?.kind === 'building' && s.faction === f) out[s.type] = (out[s.type] ?? 0) + 1
  for (const t of clearing.tokens) if (t.faction === f) out[t.type] = (out[t.type] ?? 0) + 1
  return out
}

export interface RemovalContext {
  /** Who removes the pieces and scores for them; null when no one does. */
  by: FactionId | null
  /** Set when the removal happens in battle, for Despot (§7.8.4). */
  inBattle?: boolean
}

/** Removes `count` buildings or tokens of one type. Returns how many were removed. */
export function removeType(state: GameState, f: FactionId, c: ClearingId, type: string, count: number, ctx: RemovalContext): number {
  const clearing = state.map.clearings[c]!
  let removed = 0
  for (let i = clearing.slots.length - 1; i >= 0 && removed < count; i--) {
    const s = clearing.slots[i]
    if (s?.kind === 'building' && s.faction === f && s.type === type) { clearing.slots[i] = null; returnBuilding(state, s); removed++ }
  }
  for (let i = clearing.tokens.length - 1; i >= 0 && removed < count; i--) {
    const t = clearing.tokens[i]!
    if (t.faction === f && t.type === type) { clearing.tokens.splice(i, 1); returnToken(state, t.type, c, ctx); removed++ }
  }
  if (ctx.by && isEnemy(state, ctx.by, f)) scoreRemoval(state, ctx, removed)
  if (ctx.by === 'vagabond') vagabondRemoved(state, f, 0, removed, ctx)
  return removed
}

function scoreRemoval(state: GameState, ctx: RemovalContext, removed: number) {
  if (!removed || !ctx.by) return
  award(state, ctx.by, removed) // §3.2.1
  const battle = state.battle
  if (ctx.inBattle && battle && !battle.despotScored && ctx.by === 'eyrie' && state.factions.eyrie?.leader === 'despot') {
    award(state, 'eyrie', 1) // Despot: once per battle (§7.8.4, FAQ)
    battle.despotScored = true
  }
}

/** Removes warriors to their owner's supply; returns how many. */
export function removeWarriors(state: GameState, f: FactionId, c: ClearingId, n: number): number {
  const w = state.map.clearings[c]!.warriors
  const k = Math.min(n, w[f] ?? 0)
  if (!k) return 0
  w[f] = w[f]! - k
  if (!w[f]) delete w[f]
  state.factions[f]!.warriorSupply += k
  return k
}

/** Removes warriors as `ctx.by` (Strike, Revolt): Hostility (§9.2.9.III) and Field Hospitals follow. */
export function removeWarriorsBy(state: GameState, f: FactionId, c: ClearingId, n: number, ctx: RemovalContext): number {
  const k = removeWarriors(state, f, c, n)
  if (ctx.by === 'vagabond') vagabondRemoved(state, f, k, 0, ctx)
  if (f === 'marquise') offerFieldHospital(state, c, k)
  return k
}

/** Removes every enemy piece of `by` in a clearing, e.g. Favor cards (§1.5.4 removes all before effects). */
export function removeAllEnemies(state: GameState, c: ClearingId, by: FactionId): { warriors: Partial<Record<FactionId, number>>; vagabondHit: boolean } {
  const warriors: Partial<Record<FactionId, number>> = {}
  let vagabondHit = false
  for (const { faction: f } of state.seats) {
    if (!isEnemy(state, by, f)) continue
    const k = removeWarriors(state, f, c, Infinity)
    if (k) warriors[f] = k
    if (by === 'vagabond') vagabondRemoved(state, f, k, 0, { by })
    for (const [type, count] of Object.entries(otherPieces(state, f, c))) removeType(state, f, c, type, count, { by })
    const pawn = f === 'vagabond' ? state.factions.vagabond?.pawn : null
    if (pawn?.kind === 'clearing' && pawn.id === c) vagabondHit = true // pawn stays; three items are damaged (§9.2.2.I)
  }
  return { warriors, vagabondHit }
}

/** Offer Field Hospitals for Marquise warriors removed from a clearing (§6.2.3). */
export function offerFieldHospital(state: GameState, c: ClearingId, warriors: number) {
  const m = state.factions.marquise
  if (!m || m.keep === null || warriors < 1) return
  if (!state.hands.marquise?.some(card => matchesSuit(card, suitOf(state, c)))) return
  state.pending.push({ kind: 'field-hospital', player: 'marquise', clearing: c, warriors, batch: effectBatch(state) })
}

// ── Taking hits (§4.3.6, §9.2.7) ───────────────────────────────────────────────

/** Key of an item in action payloads: `type` when face up, `type:exhausted` when face down. */
export const itemKey = (i: VagabondItem) => (i.exhausted ? `${i.type}:exhausted` : i.type)

/** Undamaged Vagabond items, keyed `type` (face up) or `type:exhausted` (face down). */
export function undamagedItems(state: GameState): Record<string, number> {
  const v = state.factions.vagabond!
  const out: Record<string, number> = {}
  for (const i of v.satchel) out[itemKey(i)] = (out[itemKey(i)] ?? 0) + 1
  for (const [type, n] of Object.entries(v.tracks)) if (n) out[type] = (out[type] ?? 0) + n
  return out
}

function damageItems(state: GameState, choice: Record<string, number>) {
  const v = state.factions.vagabond!
  for (const [key, count] of Object.entries(choice)) {
    const [type, flag] = key.split(':') as [ItemType, string | undefined]
    for (let k = 0; k < count; k++) {
      const i = v.satchel.findIndex(x => x.type === type && x.exhausted === (flag === 'exhausted'))
      if (i >= 0) v.damaged.push(v.satchel.splice(i, 1)[0]!)
      else if (!flag && (type === 'tea' || type === 'coin' || type === 'bag') && v.tracks[type] > 0) {
        v.tracks[type] -= 1
        v.damaged.push({ type, exhausted: false })
      } else throw new Error(`no undamaged ${key} to damage`)
    }
  }
}

/** Every way to pick `k` pieces from a pool of counts by type. */
export function choices(pool: Record<string, number>, k: number): Record<string, number>[] {
  const types = Object.keys(pool).sort()
  const out: Record<string, number>[] = []
  const go = (i: number, left: number, acc: Record<string, number>) => {
    if (left === 0) { out.push({ ...acc }); return }
    if (i >= types.length) return
    const t = types[i]!
    for (let n = Math.min(left, pool[t]!); n >= 0; n--) {
      if (n) acc[t] = n; else delete acc[t]
      go(i + 1, left - n, acc)
    }
    delete acc[t]
  }
  go(0, k, {})
  return out
}

/** Allied warriors the attacking Vagabond may remove instead of items (§9.2.9.II.d), as pool key `ally`. */
function allyPool(state: GameState, c: ClearingId): Record<string, number> {
  const ally = state.battle?.ally
  const n = ally ? state.map.clearings[c]!.warriors[ally] ?? 0 : 0
  return n ? { ally: n } : {}
}

/** The removable pool once warriors are gone: other pieces, or the Vagabond's undamaged items (and Allied warriors). */
export const hitPool = (state: GameState, f: FactionId, c: ClearingId) =>
  (f === 'vagabond' ? { ...undamagedItems(state), ...allyPool(state, c) } : otherPieces(state, f, c))

/**
 * Deals `n` hits to `f` in a clearing (§4.3.6): warriors first, then buildings/tokens chosen by `f`; for the
 * Vagabond each hit damages an item (§9.2.7). Pushes a take-hits decision when there is a real choice and returns
 * false; returns true when all hits are resolved. Field Hospitals is offered for warriors removed here.
 */
export function dealHits(state: GameState, f: FactionId, c: ClearingId, n: number, ctx: RemovalContext): boolean {
  if (f !== 'vagabond') {
    const k = removeWarriors(state, f, c, n)
    if (ctx.by === 'vagabond') vagabondRemoved(state, f, k, 0, ctx)
    if (f === 'marquise') offerFieldHospital(state, c, k)
    n -= k
  }
  const pool = hitPool(state, f, c)
  const total = Object.values(pool).reduce((a, b) => a + b, 0)
  n = Math.min(n, total)
  if (n <= 0) return true
  const options = choices(pool, n)
  if (options.length === 1) { applyHitChoice(state, f, c, options[0]!, ctx); return true }
  state.pending.push({ kind: 'take-hits', player: f, clearing: c, hits: n, by: ctx.by })
  return false
}

/** Applies a chosen set of buildings/tokens (or items) for the remaining hits. */
export function applyHitChoice(state: GameState, f: FactionId, c: ClearingId, choice: Record<string, number>, ctx: RemovalContext) {
  if (f === 'vagabond') {
    const { ally: allyWarriors = 0, ...items } = choice
    const b = state.battle
    if (allyWarriors && b?.ally) {
      const k = removeWarriors(state, b.ally, c, allyWarriors)
      if (b.ally === 'marquise') offerFieldHospital(state, c, k)
      b.allyHits += k
    }
    damageItems(state, items)
    if (b) b.itemHits += Object.values(items).reduce((x, y) => x + y, 0)
    return
  }
  for (const [type, count] of Object.entries(choice)) removeType(state, f, c, type, count, ctx)
}

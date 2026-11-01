import type { Action } from '@root/game-engine'

/**
 * Choosing an action on the board instead of from a list. Every legal action has one anchor: a path (from one
 * clearing to another), one clearing, or none (general actions shown as buttons). Clicking clearings walks a small
 * state machine; the result is always one element of `legal`, never something the client made up.
 */

export type Anchor = { kind: 'path'; from: number; to: number } | { kind: 'clearing'; clearing: number } | { kind: 'none' }
export type Stage = { kind: 'idle' } | { kind: 'at'; clearing: number } | { kind: 'path'; from: number; to: number }
export const IDLE: Stage = { kind: 'idle' }

export function anchorOf(a: Action): Anchor {
  const p = a.payload as Record<string, unknown>
  if (typeof p.from === 'number' && typeof p.to === 'number') return { kind: 'path', from: p.from, to: p.to }
  if (typeof p.clearing === 'number') return { kind: 'clearing', clearing: p.clearing }
  if (typeof p.to === 'number') return { kind: 'clearing', clearing: p.to }
  const to = p.to as { kind?: string; id?: number } | undefined
  if (to && typeof to === 'object' && to.kind === 'clearing' && typeof to.id === 'number') return { kind: 'clearing', clearing: to.id }
  return { kind: 'none' }
}

/** Actions anchored at clearing `c` (not paths). */
export const actionsAt = (legal: Action[], c: number) => legal.filter(a => { const k = anchorOf(a); return k.kind === 'clearing' && k.clearing === c })
/** Actions along the path `from` → `to`. */
export const actionsAlong = (legal: Action[], from: number, to: number) =>
  legal.filter(a => { const k = anchorOf(a); return k.kind === 'path' && k.from === from && k.to === to })
/** Where pieces can go from `from`. */
export const destinations = (legal: Action[], from: number) =>
  [...new Set(legal.flatMap(a => { const k = anchorOf(a); return k.kind === 'path' && k.from === from ? [k.to] : [] }))].sort((x, y) => x - y)
/** Actions with no clearing: end step, craft, choices of cards or leaders, decisions. */
export const generalActions = (legal: Action[]) => legal.filter(a => anchorOf(a).kind === 'none')

/** Clearings worth clicking from idle: anywhere an action is anchored, or a path starts. */
export function startClearings(legal: Action[]): number[] {
  const out = new Set<number>()
  for (const a of legal) {
    const k = anchorOf(a)
    if (k.kind === 'path') out.add(k.from)
    if (k.kind === 'clearing') out.add(k.clearing)
  }
  return [...out].sort((x, y) => x - y)
}

/** What the board and the action bar show for a stage. */
export interface View {
  /** Clearings that do something when clicked now (soft ring). */
  targets: number[]
  /** The chosen clearings (strong ring). */
  selected: number[]
  /** Actions at the chosen clearing. */
  here: Action[]
  /** Destinations from the chosen clearing. */
  destinations: number[]
  /** Actions along the chosen path. */
  along: Action[]
}

export function viewOf(legal: Action[], stage: Stage): View {
  const starts = startClearings(legal)
  if (stage.kind === 'idle') return { targets: starts, selected: [], here: [], destinations: [], along: [] }
  const from = stage.kind === 'at' ? stage.clearing : stage.from
  const dests = destinations(legal, from)
  return {
    targets: [...new Set([...dests, ...starts])].filter(c => c !== from).sort((x, y) => x - y),
    selected: stage.kind === 'at' ? [from] : [from, stage.to],
    here: actionsAt(legal, from),
    destinations: dests,
    along: stage.kind === 'path' ? actionsAlong(legal, stage.from, stage.to) : [],
  }
}

/** The next stage after clicking clearing `c`. Clicking the chosen clearing again goes back one step. */
export function click(legal: Action[], stage: Stage, c: number): Stage {
  const startHere = (): Stage => (startClearings(legal).includes(c) ? { kind: 'at', clearing: c } : IDLE)
  if (stage.kind === 'idle') return startHere()
  const from = stage.kind === 'at' ? stage.clearing : stage.from
  if (stage.kind === 'path' && c === stage.to) return { kind: 'at', clearing: from }
  if (c === from) return IDLE
  if (destinations(legal, from).includes(c)) return { kind: 'path', from, to: c }
  return startHere()
}

/** A stage that no longer fits the legal actions (after an update) falls back to idle. */
export function stillValid(legal: Action[], stage: Stage): Stage {
  if (stage.kind === 'idle') return stage
  if (stage.kind === 'at') return startClearings(legal).includes(stage.clearing) ? stage : IDLE
  return actionsAlong(legal, stage.from, stage.to).length ? stage : IDLE
}

/**
 * When the actions along a path differ only in how many warriors go, the bar shows a count picker; otherwise one
 * button per action. Returns the counts in order, or null.
 */
export function warriorCounts(along: Action[]): number[] | null {
  if (along.length < 2) return null
  const strip = (a: Action) => { const { warriors: _w, ...rest } = a.payload as Record<string, unknown>; return JSON.stringify([a.type, rest]) }
  const key = strip(along[0]!)
  if (!along.every(a => typeof (a.payload as { warriors?: unknown }).warriors === 'number' && strip(a) === key)) return null
  return along.map(a => (a.payload as { warriors: number }).warriors).sort((x, y) => x - y)
}

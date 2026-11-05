import { MARQUISE } from '@root/game-data'
import type { Action, PlayerView } from '@root/game-engine'

/**
 * RD-M02: the Marquise Build box (ROOT-6.5.4), laid out like Root Digital: one column per building at the chosen
 * clearing, with the points it scores and the wood it costs, and one click to build. Every choice here is an element of
 * `legal`; the client never decides what is legal, only how to group it and which legal wood source to suggest.
 */

export type BuildAction = Extract<Action, { type: 'marquise-build' }>
export type Building = BuildAction['payload']['building']

export interface BuildOption {
  building: Building
  /** Wood the build costs (the length of every legal `wood` list for it). */
  wood: number
  /** Points for the space it uncovers on the Buildings track (faction board data, §6.5.4.III). */
  points: number
  /** The suggested way to pay: the legal choice that takes the most wood from the clearing itself. */
  auto: BuildAction
  /** Every legal way to pay, for players who pick the wood themselves. */
  ways: BuildAction[]
}

/** Root Digital's column order. */
const ORDER: Building[] = ['workshop', 'sawmill', 'recruiter']

const isBuild = (a: Action): a is BuildAction => a.type === 'marquise-build'

/** Legal builds at `clearing`, grouped by building; empty when the Marquise cannot build there now. */
export function buildOptions(view: PlayerView, legal: Action[], clearing: number): BuildOption[] {
  const here = legal.filter(isBuild).filter(a => a.payload.clearing === clearing)
  const board = view.factions.marquise
  return ORDER.flatMap(building => {
    const ways = here.filter(a => a.payload.building === building)
    if (!ways.length) return []
    const fromHere = (a: BuildAction) => a.payload.wood.filter(c => c === clearing).length
    const auto = ways.reduce((best, a) => (fromHere(a) > fromHere(best) ? a : best))
    const built = board ? MARQUISE.buildingsPerType - board.buildingsOnTrack[building] : 0
    return [{ building, wood: auto.payload.wood.length, points: MARQUISE.points[building][built] ?? 0, auto, ways }]
  })
}

/** Clearings where the Marquise can build now, for the "choose a clearing" step. */
export const buildClearings = (legal: Action[]) => [...new Set(legal.filter(isBuild).map(a => a.payload.clearing))].sort((x, y) => x - y)

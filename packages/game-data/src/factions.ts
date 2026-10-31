import type { ItemType, Suit } from './types.ts'

/**
 * Printed faction board data for the four base factions.
 * Tracks are read from the 3rd-printing faction boards in the Root Update Kit (SRC-006, pp. 1–8);
 * piece counts, leaders and characters from the Law (§6–§9, §C.1, §V), which the board backs repeat.
 *
 * Track indexing: space 0 is the leftmost. A track's spaces are uncovered left to right as pieces leave it,
 * so with n pieces of a type on the map, spaces 0..n-1 are uncovered.
 */

export type MarquiseBuildingType = 'sawmill' | 'workshop' | 'recruiter'
export type EyrieLeaderId = 'builder' | 'charismatic' | 'commander' | 'despot'
export type DecreeColumnId = 'recruit' | 'move' | 'battle' | 'build'
export type VagabondCharacterId = 'thief' | 'tinker' | 'ranger'

export const MARQUISE = {
  warriors: 25, wood: 8, keep: 1, buildingsPerType: 6, // §6.3.1, §C.1.2
  /**
   * Building the next one of a type, with n already on the map, costs woodCost[n] wood and scores points[type][n]
   * (§6.5.4). Space 0 is left empty at setup (§6.3.5), so it is never paid or scored.
   */
  woodCost: [0, 1, 2, 3, 3, 4],
  points: {
    sawmill: [0, 1, 2, 3, 4, 5],
    workshop: [0, 2, 2, 3, 4, 5],
    recruiter: [0, 1, 2, 3, 3, 4],
  } satisfies Record<MarquiseBuildingType, number[]>,
  /** Uncovered spaces that add one Evening draw (§6.6). Only recruiters have them. */
  drawBonusAt: { sawmill: [], workshop: [], recruiter: [2, 4] } satisfies Record<MarquiseBuildingType, number[]>,
} as const

export const EYRIE = {
  warriors: 20, roosts: 7, // §7.3.1, §C.1.2
  /** Evening score is roostPoints[n - 1] with n roosts on the map (§7.6.1), 0 with none. */
  roostPoints: [0, 1, 2, 3, 4, 4, 5],
  roostDrawBonusAt: [2, 5], // §7.6.2
  /** Columns the two Loyal Viziers start in (§7.8). */
  leaders: {
    builder: ['recruit', 'move'],
    charismatic: ['recruit', 'battle'],
    commander: ['move', 'battle'],
    despot: ['move', 'build'],
  } satisfies Record<EyrieLeaderId, [DecreeColumnId, DecreeColumnId]>,
} as const

export const ALLIANCE = {
  warriors: 10, sympathy: 10, // §8.3.1, §8.2.5
  /** One base per suit; each base on the map uncovers one Evening draw bonus (§8.6.2). */
  bases: ['fox', 'rabbit', 'mouse'] satisfies Suit[],
  supporterLimitWithoutBase: 5, // §8.2.3.I
  /**
   * Placing the next sympathy token, with n already on the map, costs sympathyCost[n] matching supporters
   * (plus one under Martial Law, §8.4.2.II.a) and scores sympathyPoints[n] (§8.4.2.III, §8.6.1.IV).
   */
  sympathyCost: [1, 1, 1, 2, 2, 2, 3, 3, 3, 3],
  sympathyPoints: [0, 1, 1, 1, 2, 2, 3, 4, 4, 4],
} as const

export const VAGABOND = {
  /**
   * Relationship levels: 0 Indifferent, 1, 2, 3 Allied (§9.2.9). Moving from level k to k + 1 takes
   * aidToAdvance[k] Aid actions in one turn and scores advancePoints[k].
   */
  aidToAdvance: [1, 2, 3],
  advancePoints: [1, 2, 2],
  alliedAidPoints: 2, // §9.2.9.II.a
  infamyPoints: 1, // §9.2.9.III.a
  trackSize: 3, // tea, coin and bag tracks (§9.2.5.I)
  refresh: { base: 3, perTea: 2 }, // §9.4.1
  draw: { base: 1, perCoin: 1 }, // §9.6.2
  itemLimit: { base: 6, perBag: 2 }, // §9.6.4
  /** Items marked "R", one under each ruin (§9.3.4). */
  ruinItems: ['bag', 'boots', 'hammer', 'sword'] satisfies ItemType[],
  /** Starting items marked "S" (§V.1–V.3). */
  characters: {
    thief: { items: ['boots', 'torch', 'tea', 'sword'], special: 'steal' },
    tinker: { items: ['boots', 'torch', 'bag', 'hammer'], special: 'day-labor' },
    ranger: { items: ['boots', 'torch', 'crossbow', 'sword'], special: 'hideout' },
  } satisfies Record<VagabondCharacterId, { items: ItemType[]; special: string }>,
} as const

import { AUTUMN } from './maps/autumn.ts'
import type { MapDef } from './types.ts'

export type * from './types.ts'
export { AUTUMN }
export { BASE_DECK } from './cards/base-deck.ts'
export { BASE_QUESTS } from './cards/quests.ts'
export { BATTLE_DIE } from './components.ts'
export { ALLIANCE, EYRIE, MARQUISE, MIN_REACH, REACH, VAGABOND } from './factions.ts'
export type { BaseFactionId, DecreeColumnId, EyrieLeaderId, MarquiseBuildingType, VagabondCharacterId } from './factions.ts'

/** Every playable map by id. */
export const MAPS: Record<string, MapDef> = { autumn: AUTUMN }

/** Bump when any content changes; stored in GameState.meta.dataVersion. */
export const DATA_VERSION = 'base-2026-10-31'

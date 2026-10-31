export type * from './types.ts'
export { AUTUMN } from './maps/autumn.ts'
export { BASE_DECK } from './cards/base-deck.ts'
export { BASE_QUESTS } from './cards/quests.ts'
export { BATTLE_DIE } from './components.ts'
export { ALLIANCE, EYRIE, MARQUISE, VAGABOND } from './factions.ts'
export type { DecreeColumnId, EyrieLeaderId, MarquiseBuildingType, VagabondCharacterId } from './factions.ts'

/** Bump when any content changes; stored in GameState.meta.dataVersion. */
export const DATA_VERSION = 'base-2026-10-31'

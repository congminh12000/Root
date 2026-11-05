import { BASE_DECK, DATA_VERSION, MAPS } from '@root/game-data'
import { drawCards } from './board.ts'
import { shuffle, type Rng } from './rng.ts'
import { advanceSetup, factionMixAllowed, queueSetup } from './setup.ts'
import { advanceTurn } from './turn.ts'
import type { FactionId, GameState, Seat } from './state.ts'

export const RULES_VERSION = 'rules-library-p16'

export interface GameOptions {
  gameId: string
  mapId?: string
  /** In any order; seating and the starting player are randomised (§5.1.1). */
  players: { playerId: string; faction: FactionId; controller: Seat['controller'] }[]
  /** Standard Setup (§5.1, default) or Advanced Setup with faction setup cards (App. A, decisions/0006). */
  setup?: 'standard' | 'advanced'
}

/** Standard Setup (§5.1) or Advanced Setup (App. A). Returns a game waiting on the first faction setup choice. */
export function createGame(options: GameOptions, rng: Rng): GameState {
  const factions = options.players.map(p => p.faction)
  if (!factionMixAllowed(factions)) throw new Error(`faction mix not allowed (decision 0003): ${factions.join(', ')}`)
  if (new Set(options.players.map(p => p.playerId)).size !== options.players.length) throw new Error('duplicate playerId')
  const advanced = options.setup === 'advanced'
  const mapId = options.mapId ?? 'autumn'
  const map = MAPS[mapId]
  if (!map) throw new Error(`unknown map ${mapId}`)

  // §5.1.1 random seating; seats[0] starts.
  const seats: Seat[] = shuffle(options.players.map(p => ({ faction: p.faction, playerId: p.playerId, controller: p.controller })), rng)

  // §5.1.3 two players play without the dominance cards. Each physical copy gets its own id.
  const deck = BASE_DECK
    .filter(c => !(seats.length === 2 && c.kind === 'dominance'))
    .flatMap(c => Array.from({ length: c.copies }, (_, i) => `${c.id}#${i + 1}`))

  const state: GameState = {
    meta: { gameId: options.gameId, rulesVersion: RULES_VERSION, dataVersion: DATA_VERSION, revision: 0, recentActionIds: [] },
    stage: 'setup',
    ...(advanced ? { setupMode: 'advanced' as const, homelands: {} } : {}),
    seats,
    turn: { seat: 0, phase: 'birdsong', step: 'setup', number: 0 },
    map: {
      id: mapId,
      // §5.1.4 ruins fill the slots marked "R"; they sit in the last slots so buildings fill from the first.
      clearings: map.clearings.map(c => ({
        slots: Array.from({ length: c.slots }, (_, i) => (i >= c.slots - c.ruins ? { kind: 'ruin' as const, items: [] } : null)),
        warriors: {}, tokens: [],
      })),
    },
    deck: shuffle(deck, rng),
    discard: [], availableDominance: [],
    hands: {}, playAreas: {},
    itemSupply: { ...map.itemSupply }, // §5.1.5
    questDeck: [], questsAvailable: [],
    factions: {},
    score: {}, // §5.1.2
    craftingUsed: [], cardsUsed: [], reveals: [],
    pending: [],
    battle: null,
    winner: null,
  }
  for (const seat of seats) {
    state.score[seat.faction] = 0
    state.playAreas[seat.faction] = []
    state.hands[seat.faction] = drawCards(state, advanced ? 5 : 3, rng) // §5.1.3 or A.7, in seating order
  }
  queueSetup(state) // §5.1.7
  advanceSetup(state, rng)
  advanceTurn(state, rng)
  return state
}

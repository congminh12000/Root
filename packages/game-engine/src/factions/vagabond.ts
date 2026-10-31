import { BASE_QUESTS, VAGABOND, type VagabondCharacterId } from '@root/game-data'
import type { Action } from '../actions.ts'
import { mapOf } from '../board.ts'
import { shuffle } from '../rng.ts'
import type { SetupStep } from '../setup.ts'
import type { VagabondState } from '../state.ts'

const CHARACTERS = Object.keys(VAGABOND.characters) as VagabondCharacterId[]
const TRACKED = ['tea', 'coin', 'bag'] as const

/** Vagabond setup, §9.3. */
export const VAGABOND_SETUP: SetupStep[] = [
  {
    id: '9.3.1', // Choose Character
    options: () => CHARACTERS.map((character): Action => ({ type: 'vagabond-choose-character', payload: { character } })),
    apply: (state, action) => {
      if (action.type !== 'vagabond-choose-character') return false
      const board: VagabondState = {
        warriorSupply: 0, craftedItems: [], character: action.payload.character, pawn: null,
        satchel: [], tracks: { tea: 0, coin: 0, bag: 0 }, damaged: [],
        relationships: {}, aidThisTurn: {}, completedQuests: [], coalition: null,
      }
      state.factions.vagabond = board
      return true
    },
  },
  {
    id: '9.3.2', // Place Pawn in any forest
    options: state => mapOf(state).forests.map((_, forest): Action => ({ type: 'vagabond-place-pawn', payload: { forest } })),
    apply: (state, action) => {
      if (action.type !== 'vagabond-place-pawn') return false
      state.factions.vagabond!.pawn = { kind: 'forest', id: action.payload.forest }
      return true
    },
  },
  {
    id: '9.3.3', // Get Quests, Populate Ruins, Take Starting Items, Set Relationships (§9.3.3–9.3.6)
    auto: (state, rng) => {
      const board = state.factions.vagabond!
      state.questDeck = shuffle(BASE_QUESTS.map(q => q.id), rng)
      state.questsAvailable = state.questDeck.splice(0, 3)

      // One "R" item under each ruin, ruin stacks shuffled: a random assignment of items to ruin slots.
      const items = shuffle([...VAGABOND.ruinItems], rng)
      for (const clearing of state.map.clearings) for (const slot of clearing.slots)
        if (slot?.kind === 'ruin') slot.items = [items.shift()!]

      for (const type of VAGABOND.characters[board.character!].items) {
        if ((TRACKED as readonly string[]).includes(type)) board.tracks[type as (typeof TRACKED)[number]] += 1
        else board.satchel.push({ type, exhausted: false })
      }
      for (const seat of state.seats) if (seat.faction !== 'vagabond') board.relationships[seat.faction] = 0
    },
  },
]

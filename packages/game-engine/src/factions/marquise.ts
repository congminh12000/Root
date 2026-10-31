import { MARQUISE } from '@root/game-data'
import type { Action } from '../actions.ts'
import { adjacent, canPlaceIn, corners, mapOf, oppositeCorner, openSlots, placeInSlot, placeWarriors } from '../board.ts'
import type { SetupStep } from '../setup.ts'
import type { MarquiseBuilding, MarquiseState } from '../state.ts'

const BUILDINGS: MarquiseBuilding[] = ['sawmill', 'workshop', 'recruiter']

/** Marquise setup, §6.3. Step ids match the Law's steps. */
export const MARQUISE_SETUP: SetupStep[] = [
  {
    id: '6.3.1', // Gather Warriors and Wood
    auto: state => {
      const board: MarquiseState = {
        warriorSupply: MARQUISE.warriors, craftedItems: [], woodSupply: MARQUISE.wood,
        buildingsOnTrack: { sawmill: MARQUISE.buildingsPerType, workshop: MARQUISE.buildingsPerType, recruiter: MARQUISE.buildingsPerType },
        keep: null, recruitedThisTurn: false, actionsRemaining: 0,
      }
      state.factions.marquise = board
    },
  },
  {
    id: '6.3.2', // Place Keep: any corner; it becomes the starting clearing
    options: state => corners(mapOf(state)).map((clearing): Action => ({ type: 'marquise-place-keep', payload: { clearing } })),
    apply: (state, action) => {
      if (action.type !== 'marquise-place-keep') return false
      const { clearing } = action.payload
      state.factions.marquise!.keep = clearing
      state.map.clearings[clearing]!.tokens.push({ faction: 'marquise', type: 'keep' })
      return true
    },
  },
  {
    id: '6.3.3', // Garrison: one warrior everywhere except the corner opposite the keep
    auto: state => {
      const map = mapOf(state)
      const skip = oppositeCorner(map, state.factions.marquise!.keep!)
      for (const c of map.clearings) if (c.id !== skip) placeWarriors(state, 'marquise', c.id, 1)
    },
  },
  {
    id: '6.3.4', // Place Starting Buildings: one of each, in the keep's clearing or adjacent ones, in any combination
    options: state => {
      const board = state.factions.marquise!
      const keep = board.keep!
      const where = [keep, ...adjacent(mapOf(state), keep)].filter(c => openSlots(state, c) > 0 && canPlaceIn(state, 'marquise', c))
      return BUILDINGS.filter(b => board.buildingsOnTrack[b] === MARQUISE.buildingsPerType)
        .flatMap(building => where.map((clearing): Action => ({ type: 'marquise-place-building', payload: { building, clearing } })))
    },
    apply: (state, action) => {
      if (action.type !== 'marquise-place-building') return false
      const { building, clearing } = action.payload
      const board = state.factions.marquise!
      placeInSlot(state, clearing, { kind: 'building', faction: 'marquise', type: building })
      board.buildingsOnTrack[building] -= 1
      // §6.3.5 Fill Buildings Tracks: the remaining five of each type stay on the track, leftmost space empty.
      return BUILDINGS.every(b => board.buildingsOnTrack[b] < MARQUISE.buildingsPerType)
    },
  },
]

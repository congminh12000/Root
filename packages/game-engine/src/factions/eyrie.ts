import { EYRIE, type EyrieLeaderId } from '@root/game-data'
import type { Action } from '../actions.ts'
import { canPlaceIn, corners, mapOf, oppositeCorner, openSlots, placeInSlot, placeWarriors } from '../board.ts'
import type { SetupStep } from '../setup.ts'
import type { ClearingId, EyrieState, GameState } from '../state.ts'

const LEADERS = Object.keys(EYRIE.leaders) as EyrieLeaderId[]

/** Corners where another faction started (§7.3.2). In the base game only the Marquise has one. */
const startingCorners = (state: GameState): ClearingId[] => {
  const keep = state.factions.marquise?.keep
  return keep === null || keep === undefined ? [] : [keep]
}

/** Eyrie setup, §7.3. */
export const EYRIE_SETUP: SetupStep[] = [
  {
    id: '7.3.1', // Gather Warriors
    auto: state => {
      const board: EyrieState = {
        warriorSupply: EYRIE.warriors, craftedItems: [], roostsOnTrack: EYRIE.roosts, leader: null, leadersFaceUp: [],
        decree: { recruit: [], move: [], battle: [], build: [] }, resolved: { recruit: 0, move: 0, battle: 0, build: 0 },
      }
      state.factions.eyrie = board
    },
  },
  {
    id: '7.3.2', // Place Roost and Starting Warriors in a free corner, diagonally opposite a starting corner if possible
    options: state => {
      const map = mapOf(state)
      const taken = startingCorners(state)
      const free = corners(map).filter(c => !taken.includes(c) && openSlots(state, c) > 0 && canPlaceIn(state, 'eyrie', c))
      const opposite = free.filter(c => taken.some(t => oppositeCorner(map, t) === c))
      return (opposite.length ? opposite : free).map((clearing): Action => ({ type: 'eyrie-place-roost', payload: { clearing } }))
    },
    apply: (state, action) => {
      if (action.type !== 'eyrie-place-roost') return false
      const { clearing } = action.payload
      placeInSlot(state, clearing, { kind: 'building', faction: 'eyrie', type: 'roost' })
      state.factions.eyrie!.roostsOnTrack -= 1 // §7.3.5 the other six fill the Roosts track
      placeWarriors(state, 'eyrie', clearing, 6)
      return true
    },
  },
  {
    id: '7.3.3', // Choose Leader; §7.3.4 Tuck Viziers into the leader's two columns
    options: () => LEADERS.map((leader): Action => ({ type: 'eyrie-choose-leader', payload: { leader } })),
    apply: (state, action) => {
      if (action.type !== 'eyrie-choose-leader') return false
      const board = state.factions.eyrie!
      board.leader = action.payload.leader
      board.leadersFaceUp = LEADERS.filter(l => l !== action.payload.leader)
      EYRIE.leaders[action.payload.leader].forEach((column, index) => board.decree[column].push({ kind: 'vizier', index: index as 0 | 1 }))
      return true
    },
  },
]

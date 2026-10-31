import { ALLIANCE } from '@root/game-data'
import { drawCards } from '../board.ts'
import type { SetupStep } from '../setup.ts'

/** Alliance setup, §8.3. No choices: warriors, bases and sympathy start on the board, then three supporters. */
export const ALLIANCE_SETUP: SetupStep[] = [
  {
    id: '8.3',
    auto: (state, rng) => {
      state.factions.alliance = {
        warriorSupply: ALLIANCE.warriors, craftedItems: [], // §8.3.1
        basesOnBoard: { fox: null, rabbit: null, mouse: null }, // §8.3.2 bases sit in the Bases box
        sympathyOnTrack: ALLIANCE.sympathy, // §8.3.3
        officers: 0,
        supporters: drawCards(state, 3, rng), // §8.3.4
      }
    },
  },
]

import type { GameCommand } from './command.ts'
import { createGame, type GameOptions } from './create.ts'
import { applyCommand } from './engine.ts'
import { replayRng } from './rng.ts'
import type { GameState } from './state.ts'

/**
 * Everything needed to rebuild a game without its seed: the options, the random values createGame drew, and each
 * accepted command with the random values it drew (game-state.md, rng-replay).
 */
export interface GameRecord {
  options: GameOptions
  setupRandom: number[]
  commands: { command: GameCommand; random: number[] }[]
}

/** Rebuilds the state; throws if any command is rejected or the random values do not line up exactly. */
export function replay(record: GameRecord): GameState {
  const setup = replayRng(record.setupRandom)
  let state = createGame(record.options, setup)
  if (setup.remaining()) throw new Error('replay: setup left random values unused')
  for (const [i, { command, random }] of record.commands.entries()) {
    const rng = replayRng(random)
    const out = applyCommand(state, command, rng)
    if (!out.result.ok) throw new Error(`replay: command ${i} rejected: ${out.result.code}`)
    if (rng.remaining()) throw new Error(`replay: command ${i} left random values unused`)
    state = out.state
  }
  return state
}

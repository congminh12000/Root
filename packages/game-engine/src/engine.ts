import { sameJson, type Action } from './actions.ts'
import { battleDecisionOptions, continueBattle, performBattleDecision } from './battle.ts'
import type { CommandResult, GameCommand } from './command.ts'
import { commonDecisionOptions, dominanceActions, performCommonDecision, performDominance } from './common.ts'
import type { Rng } from './rng.ts'
import { checkVictory } from './rules.ts'
import { advanceSetup, setupStep } from './setup.ts'
import type { FactionId, GameState } from './state.ts'

const RECENT_ACTION_IDS = 64
const BATTLE_DECISIONS = new Set(['ambush', 'battle-effects', 'take-hits'])

/** The faction the game is waiting on: the top pending decision's owner, otherwise the active seat. */
export function currentActor(state: GameState): FactionId | null {
  if (state.winner) return null
  const top = state.pending.at(-1)
  return top ? top.player : state.seats[state.turn.seat]!.faction
}

/** Every action `faction` may take now. Empty when it is not their decision. */
export function legalActions(state: GameState, faction: FactionId): Action[] {
  if (currentActor(state) !== faction) return []
  const top = state.pending.at(-1)
  if (top?.kind === 'setup') {
    const step = setupStep(top.player, top.step)
    return 'options' in step ? step.options(state) : []
  }
  if (top && BATTLE_DECISIONS.has(top.kind)) return battleDecisionOptions(state)
  if (top) return commonDecisionOptions(state)
  // Turn actions: the factions' own (plan steps 3–6) plus dominance in Daylight (§3.3).
  return state.turn.phase === 'daylight' ? dominanceActions(state, faction) : []
}

/**
 * Validates and applies one command. The input state is never modified: the command runs on a copy and the copy
 * is returned only if the whole command succeeded, so no action is ever half applied.
 */
export function applyCommand(state: GameState, command: GameCommand, rng: Rng): { state: GameState; result: CommandResult } {
  const reject = (code: Extract<CommandResult, { ok: false }>['code'], message: string) => ({ state, result: { ok: false as const, code, message } })
  if (command.gameId !== state.meta.gameId) return reject('wrong-game', `command for ${command.gameId}`)
  if (state.meta.recentActionIds.includes(command.actionId)) return { state, result: { ok: true, revision: state.meta.revision, duplicate: true } }
  if (command.expectedRevision !== state.meta.revision) return reject('stale-revision', `game is at revision ${state.meta.revision}`)
  if (state.winner) return reject('game-over', 'the game has ended')
  const seat = state.seats.find(s => s.playerId === command.playerId)
  if (!seat) return reject('unknown-player', `${command.playerId} is not seated in this game`)
  if (currentActor(state) !== seat.faction) return reject('not-your-turn', `waiting on ${currentActor(state)}`)
  const action = { type: command.type, payload: command.payload }
  if (!legalActions(state, seat.faction).some(a => sameJson(a, action))) return reject('illegal-action', `${command.type} is not a legal action now`)

  const next: GameState = JSON.parse(JSON.stringify(state))
  perform(next, seat.faction, action as Action, rng)
  next.meta.revision += 1
  next.meta.recentActionIds = [...next.meta.recentActionIds, command.actionId].slice(-RECENT_ACTION_IDS)
  return { state: next, result: { ok: true, revision: next.meta.revision } }
}

function perform(state: GameState, faction: FactionId, action: Action, rng: Rng) {
  const top = state.pending.at(-1)
  if (top?.kind === 'setup') {
    const step = setupStep(top.player, top.step)
    if (!('apply' in step)) throw new Error(`setup step ${top.step} takes no choice`)
    if (step.apply(state, action)) state.pending.pop()
    advanceSetup(state, rng)
    return
  }
  if (top && BATTLE_DECISIONS.has(top.kind)) performBattleDecision(state, action)
  else if (top) performCommonDecision(state, action)
  else if (action.type === 'activate-dominance' || action.type === 'take-dominance') performDominance(state, faction, action)
  else throw new Error(`no handler for ${action.type}`)

  // A decision may have paused a battle; resume it, then check for a winner (§3.1).
  if (state.battle) continueBattle(state, rng)
  if (!state.battle) checkVictory(state)
}

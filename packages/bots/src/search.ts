import { currentActor, legalActions, perform, type Action, type FactionId, type GameState, type PlayerView, type Rng } from '@root/game-engine'
import { determinize } from './determinize.ts'
import { weight, type Bot } from './index.ts'

export interface SearchOptions {
  /** Thinking time per decision (ms). */
  budgetMs: number
  /** Root actions searched, best by heuristic first; the rest are never tried. */
  candidates: number
  /** Rollouts stop after this many rounds of turns, then the position is scored. */
  rounds: number
  /** Hard cap on commands per rollout. */
  maxPlies: number
  /** UCB1 exploration constant. */
  exploration: number
}

export const SEARCH_DEFAULTS: SearchOptions = { budgetMs: 1000, candidates: 10, rounds: 2, maxPlies: 400, exploration: 0.7 }

/** Rollout policy: the simple heuristic, on the full sampled state (it only reads the map and whose turn it is). */
function rolloutAction(state: GameState, f: FactionId, legal: Action[], rng: Rng): Action {
  const scored = legal.map(a => ({ a, w: weight(f, state.map.clearings, a) }))
  const best = Math.max(...scored.map(x => x.w))
  const top = scored.filter(x => x.w >= best - 1)
  return top[rng.int(top.length)]!.a
}

/**
 * Value of a position for `me`, in [0, 1]: 1 for a win, 0 for a loss; otherwise the score lead over the best
 * opponent. The Vagabond in a coalition counts its partner's score.
 */
export function evaluate(state: GameState, me: FactionId): number {
  if (state.winner) return state.winner.factions.includes(me) ? 1 : 0
  const scoreOf = (f: FactionId) => {
    if (f === 'vagabond' && state.factions.vagabond?.coalition) return state.score[state.factions.vagabond.coalition] ?? 20
    return state.score[f] ?? 20 // an activated dominance is a strong threat but no score
  }
  const mine = scoreOf(me)
  const best = Math.max(...state.seats.map(s => s.faction).filter(f => f !== me).map(scoreOf))
  return Math.min(1, Math.max(0, 0.5 + (mine - best) / 40 + mine / 300))
}

function rollout(state: GameState, me: FactionId, opts: SearchOptions, rng: Rng): number {
  const endTurn = state.turn.number + opts.rounds * state.seats.length
  for (let ply = 0; ply < opts.maxPlies && !state.winner && state.turn.number < endTurn; ply++) {
    const f = currentActor(state)
    if (!f) break
    const legal = legalActions(state, f)
    if (!legal.length) break
    perform(state, f, rolloutAction(state, f, legal, rng), rng)
  }
  return evaluate(state, me)
}

/** Root candidates: the heuristic's favourites, ties shuffled, always keeping end-step when it is legal. */
function candidates(view: PlayerView, legal: Action[], n: number, rng: Rng): Action[] {
  const keyed = legal.map(a => ({ a, w: weight(view.self!, view.map.clearings, a), r: rng.int(1 << 30) }))
  keyed.sort((x, y) => y.w - x.w || x.r - y.r)
  const chosen = keyed.slice(0, n).map(k => k.a)
  const end = legal.find(a => a.type === 'end-step')
  if (end && !chosen.includes(end)) chosen.push(end)
  return chosen
}

/**
 * Determinized Monte Carlo search with UCB1 over the root actions. Each iteration guesses the hidden information
 * from the view, plays the candidate, and rolls the game forward with the heuristic policy. Uses only the view.
 */
export function searchBot(options: Partial<SearchOptions> = {}, id = 'search'): Bot {
  const opts = { ...SEARCH_DEFAULTS, ...options }
  return {
    id,
    choose(view, legal, rng) {
      if (legal.length === 1) return legal[0]!
      const me = view.self!
      const roots = candidates(view, legal, opts.candidates, rng)
      const n = roots.map(() => 0), total = roots.map(() => 0)
      const stop = Date.now() + opts.budgetMs
      let iterations = 0
      while (Date.now() < stop || iterations < roots.length) {
        const k = iterations < roots.length ? iterations
          : roots.reduce((best, _, i) => {
            const ucb = (j: number) => total[j]! / n[j]! + opts.exploration * Math.sqrt(Math.log(iterations) / n[j]!)
            return ucb(i) > ucb(best) ? i : best
          }, 0)
        iterations++
        let value = 0
        try {
          const state = determinize(view, rng)
          perform(state, me, roots[k]!, rng)
          value = rollout(state, me, opts, rng)
        } catch {
          continue // a guess the engine cannot continue from; try another
        }
        n[k]! += 1
        total[k]! += value
        if (iterations > 50_000) break
      }
      let best = 0
      for (let i = 1; i < roots.length; i++) if (n[i]! > n[best]! || (n[i] === n[best] && total[i]! > total[best]!)) best = i
      return roots[best]!
    },
  }
}

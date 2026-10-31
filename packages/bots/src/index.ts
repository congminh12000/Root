import type { Action, FactionId, PlayerView, Rng } from '@root/game-engine'
import { searchBot } from './search.ts'

/**
 * A bot sees exactly what a player sees: its PlayerView and the legal actions the server computed for its seat
 * (AGENTS.md: no deck order, no other hands, no ruin contents, no seed). It returns one of those actions.
 */
export interface Bot {
  id: string
  choose(view: PlayerView, legal: Action[], rng: Rng): Action
}

/** Uniformly random legal action. Used for fuzzing and as the weakest opponent. */
export const randomBot: Bot = {
  id: 'random',
  choose: (_view, legal, rng) => legal[rng.int(legal.length)]!,
}

type Clearings = { warriors: Partial<Record<FactionId, number>> }[]
const warriorsAt = (map: Clearings, f: FactionId, c: number) => map[c]?.warriors[f] ?? 0

/**
 * How much the simple bot likes an action, from the view alone. Higher is better; ties and near-ties are broken at
 * random. This is a hand-written heuristic, not a trained or searched policy.
 */
export function weight(me: FactionId, map: Clearings, a: Action): number {
  switch (a.type) {
    case 'end-step': return 1
    case 'craft': return 8
    case 'marquise-build': return 9
    case 'marquise-recruit': return 6
    case 'marquise-overwork': return 4
    case 'marquise-spend-bird': return 2
    case 'alliance-revolt': return 10
    case 'alliance-spread': return 9
    case 'alliance-organize': return 7
    case 'alliance-train': return 5
    case 'alliance-mobilize': return 3
    case 'alliance-recruit': return 5
    case 'vagabond-quest': return 9
    case 'vagabond-explore': return 8
    case 'vagabond-aid': return 6
    case 'vagabond-repair': return 6
    case 'vagabond-strike': return 4
    case 'eyrie-build': return 9
    case 'eyrie-recruit': return 6
    case 'activate-dominance': return 3
    case 'vagabond-coalition': return 3
    case 'take-dominance': return 0.5
    case 'play-ambush': return 7
    case 'field-hospital': return 6
    case 'use-battle-card': return 5
    case 'battle':
    case 'eyrie-battle':
    case 'command-warren': {
      const { clearing, defender } = a.payload
      const mine = warriorsAt(map, me, clearing), theirs = warriorsAt(map, defender, clearing)
      return mine > theirs ? 7 : mine === theirs ? 3 : 1
    }
    case 'vagabond-battle': return 4
    case 'move':
    case 'eyrie-move':
    case 'cobbler': return 2 + Math.min(a.payload.warriors, 3) * 0.3
    default: return 2
  }
}

/** Picks among the best-weighted actions, at random among those within one point of the best. */
export const simpleBot: Bot = {
  id: 'simple',
  choose(view, legal, rng) {
    const scored = legal.map(a => ({ a, w: weight(view.self!, view.map.clearings, a) }))
    const best = Math.max(...scored.map(x => x.w))
    const top = scored.filter(x => x.w >= best - 1)
    return top[rng.int(top.length)]!.a
  },
}

/** `search` thinks about one second per decision; `search-fast` 0.3 s, for tests and quick games. */
export const BOTS: Record<string, Bot> = {
  random: randomBot,
  simple: simpleBot,
  search: searchBot(),
  'search-fast': searchBot({ budgetMs: 300 }, 'search-fast'),
}
export { determinize } from './determinize.ts'
export { evaluate, searchBot, SEARCH_DEFAULTS, type SearchOptions } from './search.ts'

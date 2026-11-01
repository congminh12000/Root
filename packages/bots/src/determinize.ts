import { BASE_DECK, BASE_QUESTS, DATA_VERSION, VAGABOND } from '@root/game-data'
import { RULES_VERSION, shuffle, type CardId, type FactionId, type GameState, type PlayerView, type Rng } from '@root/game-engine'

/**
 * Builds one full GameState that agrees with everything `view` shows, guessing the rest at random: other hands, the
 * deck order, another faction's supporters, ruin items and the quest deck. The bot never sees the real hidden state
 * (AGENTS.md); it searches over many such guesses (information-set sampling).
 */
export function determinize(view: PlayerView, rng: Rng): GameState {
  const self = view.self
  const players = view.seats.length
  const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x))

  // Every physical card in this game, minus the ones whose place is known.
  const unseen = new Map<string, number>()
  for (const c of BASE_DECK) if (!(players === 2 && c.kind === 'dominance')) for (let i = 1; i <= c.copies; i++) unseen.set(`${c.id}#${i}`, 1)
  const known: CardId[] = [...view.discard, ...view.availableDominance, ...view.hand, ...Object.values(view.playAreas).flat(), ...(view.supporters ?? [])]
  const eyrie = view.factions.eyrie
  if (eyrie) for (const col of Object.values(eyrie.decree)) for (const d of col) if (d.kind === 'card') known.push(d.id)
  if (view.battle?.ambushCard) known.push(view.battle.ambushCard)
  for (const c of known) unseen.delete(c)
  const pool = shuffle([...unseen.keys()], rng)
  const take = (n: number) => {
    if (pool.length < n) throw new Error('determinize: hidden card counts do not add up')
    return pool.splice(0, n)
  }

  const hands: Partial<Record<FactionId, CardId[]>> = {}
  for (const { faction } of view.seats) hands[faction] = faction === self ? [...view.hand] : take(view.handCounts[faction] ?? 0)
  const factions = copy(view.factions) as GameState['factions']
  if (factions.alliance) factions.alliance.supporters = self === 'alliance' ? [...view.supporters!] : take(view.supporterCount)
  const deck = take(view.deckCount)

  // Ruin items: any of the four "R" items, as many as each ruin still holds.
  const ruinItems = shuffle([...VAGABOND.ruinItems], rng)
  const clearings = view.map.clearings.map(c => ({
    warriors: { ...c.warriors },
    tokens: c.tokens.map(t => ({ ...t })),
    slots: c.slots.map(s => (s === null ? null : s.kind === 'ruin' ? { kind: 'ruin' as const, items: ruinItems.splice(0, s.itemCount) } : { ...s })),
  }))

  const done = new Set([...view.questsAvailable, ...(view.factions.vagabond?.completedQuests ?? [])])
  const questDeck = shuffle(BASE_QUESTS.map(q => q.id).filter(q => !done.has(q)), rng).slice(0, view.questDeckCount)

  return {
    meta: { gameId: view.gameId, rulesVersion: RULES_VERSION, dataVersion: DATA_VERSION, revision: view.revision, recentActionIds: [] },
    stage: view.stage,
    seats: view.seats.map(s => ({ faction: s.faction, playerId: s.faction, controller: { kind: 'bot', profile: 'sample' } })),
    turn: { ...view.turn },
    map: { id: view.map.id, clearings },
    deck, discard: [...view.discard], availableDominance: [...view.availableDominance],
    hands, playAreas: copy(view.playAreas),
    itemSupply: { ...view.itemSupply },
    questDeck, questsAvailable: [...view.questsAvailable],
    factions,
    score: { ...view.score },
    craftingUsed: [...view.craftingUsed], cardsUsed: [...view.cardsUsed],
    reveals: [],
    pending: copy(view.pending),
    battle: copy(view.battle),
    lastRoll: copy(view.lastRoll),
    winner: copy(view.winner),
  }
}

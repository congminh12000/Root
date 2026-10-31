// Plays bots against each other and prints win rates.
// Usage: node packages/bots/scripts/arena.ts <challenger> <field> <games> [seedPrefix]
//   e.g. node packages/bots/scripts/arena.ts search simple 40
// Four-player games; the challenger takes each faction in turn, the other seats play `field`.
import { applyCommand, createGame, currentActor, legalActions, seededRng, viewFor, type FactionId } from '@root/game-engine'
import { BOTS } from '../src/index.ts'

const [challengerId = 'search', fieldId = 'simple', gamesArg = '20', prefix = 'arena'] = process.argv.slice(2)
const challenger = BOTS[challengerId]!, field = BOTS[fieldId]!
const FACTIONS: FactionId[] = ['marquise', 'eyrie', 'alliance', 'vagabond']
const wins: Record<string, number> = {}, played: Record<string, number> = {}
let total = 0, won = 0
for (let g = 0; g < Number(gamesArg); g++) {
  const hero = FACTIONS[g % 4]!
  const rng = seededRng(`${prefix}-${g}`)
  let s = createGame({ gameId: 'a', players: FACTIONS.map(f => ({ playerId: f, faction: f, controller: { kind: 'bot', profile: f === hero ? challengerId : fieldId } })) }, rng)
  const start = Date.now()
  for (let n = 0; n < 5000 && !s.winner; n++) {
    const f = currentActor(s)!
    const bot = f === hero ? challenger : field
    const action = bot.choose(viewFor(s, f), legalActions(s, f), rng)
    s = applyCommand(s, { gameId: 'a', playerId: f, expectedRevision: s.meta.revision, actionId: `${n}`, ...action }, rng).state
  }
  const win = !!s.winner?.factions.includes(hero)
  total++; if (win) won++
  played[hero] = (played[hero] ?? 0) + 1
  if (win) wins[hero] = (wins[hero] ?? 0) + 1
  console.log(`game ${g}: ${challengerId} as ${hero} ${win ? 'WON' : 'lost'} (${s.winner?.factions.join('+') ?? 'no winner'} by ${s.winner?.reason ?? '-'}, turn ${s.turn.number}, scores ${JSON.stringify(s.score)}, ${Math.round((Date.now() - start) / 1000)} s)`)
}
console.log(`${challengerId} vs 3× ${fieldId}: won ${won}/${total} = ${(100 * won / total).toFixed(1)}% (equal strength would be 25%)`)
for (const f of FACTIONS) console.log(`  as ${f}: ${wins[f] ?? 0}/${played[f] ?? 0}`)

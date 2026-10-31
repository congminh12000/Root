# Golden scenario: Walking Through Root (SRC-003)

Test: `packages/game-engine/test/walkthrough.test.ts`. Replays Leder's two-turn example game (four factions, two rounds) command by command through `applyCommand`, using only actions from `legalActions`, and checks the board, scores, hands and Vagabond state after every step the booklet describes.

## Mapping the booklet onto the Autumn map (game-data ids)

| Booklet | Clearing |
|---|---|
| top-left fox (keep, first sawmill) | 0 |
| top rabbit (new sawmill, then workshop) | 1 |
| mouse clearing the Marquise marches through | 2 |
| rabbit with the starting workshop | 3 |
| mouse with the recruiter | 4 |
| central fox (sympathy, revolt, ruin) | 5 |
| fox the Marquise marches into, later an Eyrie roost | 7 |
| bottom mouse (Eyrie roost, Vagabond fights) | 10 |
| bottom-right rabbit (Eyrie start) | 11 |

The Vagabond starts in forest 4 (between clearings 5, 6, 10 and 11). Seats are set to the booklet's order: Marquise, Eyrie, Alliance, Vagabond.

## What the booklet leaves open, and what the test picks

- Cards drawn during the walkthrough are not named. The deck is stacked with cards that raise no questions (no bird, ambush or dominance cards).
- The item under the central ruin is random in the booklet; the test uses a hammer.
- The two quests drawn next to Errand (fox) are Escort and Fundraising.
- The Vagabond gives "either fox card"; the test gives Root Tea (fox).
- Ambush, Field Hospitals in the Eyrie and Alliance turns, and the Vagabond's final discard are declined or picked as the first option; the booklet does not use them.
- Dice: Vagabond 1/0, Marquise 2/1, Eyrie 3/1, as printed.

## Expected end state

Scores Marquise 3, Eyrie 3, Alliance 2, Vagabond 3. Eyrie roosts at 7, 10 and 11; Alliance fox base and two warriors at 5, sympathy at 10; Marquise sawmill and workshop at 1; the Vagabond holds five cards, has completed Errand (fox) and has a hammer from the ruin.

Result on 2026-10-31: every step matches the booklet; no engine change was needed.

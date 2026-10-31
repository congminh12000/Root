import type { CardDef } from '../types.ts'

/**
 * The 54-card shared deck of the base game (Law §C.1.4).
 * Suit, cost, item, points and text come from the Leder Card Library (SRC-005), read from each card image.
 * The library lists each design once, so copy counts come from elsewhere:
 *   law          ambush and dominance counts (§2.1.2, §2.1.3)
 *   walkthrough  at least that many copies are dealt in Walking Through Root (SRC-003)
 *   unverified   not in any official source we hold; check against a physical deck (open-questions OQ-04)
 */
export const BASE_DECK: CardDef[] = [
  // ── Bird ────────────────────────────────────────────────────────────────────
  { id: 'ambush-bird', name: 'Ambush!', suit: 'bird', copies: 2, copiesEvidence: 'law', kind: 'ambush', cost: [], libraryId: 'ROOT-46' },
  { id: 'armorers', name: 'Armorers', suit: 'bird', copies: 2, copiesEvidence: 'unverified', kind: 'persistent', cost: ['fox'], text: 'In battle, may discard this to ignore all rolled hits taken.', libraryId: 'ROOT-51' },
  { id: 'arms-trader', name: 'Arms Trader', suit: 'bird', copies: 1, copiesEvidence: 'unverified', kind: 'item', cost: ['fox', 'fox'], item: 'sword', vp: 2, libraryId: 'ROOT-52' },
  { id: 'birdy-bindle', name: 'Birdy Bindle', suit: 'bird', copies: 1, copiesEvidence: 'walkthrough', kind: 'item', cost: ['mouse'], item: 'bag', vp: 1, libraryId: 'ROOT-56' },
  { id: 'brutal-tactics', name: 'Brutal Tactics', suit: 'bird', copies: 2, copiesEvidence: 'walkthrough', kind: 'persistent', cost: ['fox', 'fox'], text: 'In battle as attacker, may deal an extra hit, but defender scores one point.', libraryId: 'ROOT-58' },
  { id: 'crossbow-bird', name: 'Crossbow', suit: 'bird', copies: 1, copiesEvidence: 'unverified', kind: 'item', cost: ['fox'], item: 'crossbow', vp: 1, libraryId: 'ROOT-65' },
  { id: 'dominance-bird', name: 'Dominance', suit: 'bird', copies: 1, copiesEvidence: 'law', kind: 'dominance', cost: [], text: 'You win the game if you rule two opposite corners at the start of your Birdsong.', libraryId: 'ROOT-67' },
  { id: 'royal-claim', name: 'Royal Claim', suit: 'bird', copies: 1, copiesEvidence: 'unverified', kind: 'persistent', cost: ['any', 'any', 'any', 'any'], text: 'In Birdsong, may discard this to score one point per clearing you rule.', libraryId: 'ROOT-92' },
  { id: 'sappers', name: 'Sappers', suit: 'bird', copies: 2, copiesEvidence: 'unverified', kind: 'persistent', cost: ['mouse'], text: 'In battle as defender, may discard this to deal an extra hit.', libraryId: 'ROOT-94' },
  { id: 'woodland-runners', name: 'Woodland Runners', suit: 'bird', copies: 1, copiesEvidence: 'unverified', kind: 'item', cost: ['rabbit'], item: 'boots', vp: 1, libraryId: 'ROOT-109' },

  // ── Fox ─────────────────────────────────────────────────────────────────────
  { id: 'ambush-fox', name: 'Ambush!', suit: 'fox', copies: 1, copiesEvidence: 'law', kind: 'ambush', cost: [], libraryId: 'ROOT-48' },
  { id: 'anvil', name: 'Anvil', suit: 'fox', copies: 1, copiesEvidence: 'walkthrough', kind: 'item', cost: ['fox'], item: 'hammer', vp: 2, libraryId: 'ROOT-50' },
  { id: 'dominance-fox', name: 'Dominance', suit: 'fox', copies: 1, copiesEvidence: 'law', kind: 'dominance', cost: [], text: 'You win the game if you rule three fox clearings at the start of your Birdsong.', libraryId: 'ROOT-69' },
  { id: 'favor-of-the-foxes', name: 'Favor of the Foxes', suit: 'fox', copies: 1, copiesEvidence: 'unverified', kind: 'immediate', cost: ['fox', 'fox', 'fox'], text: 'Remove all enemy pieces in fox clearings, then discard.', libraryId: 'ROOT-73' },
  { id: 'foxfolk-steel', name: 'Foxfolk Steel', suit: 'fox', copies: 1, copiesEvidence: 'unverified', kind: 'item', cost: ['fox', 'fox'], item: 'sword', vp: 2, libraryId: 'ROOT-76' },
  { id: 'gently-used-knapsack', name: 'Gently Used Knapsack', suit: 'fox', copies: 1, copiesEvidence: 'unverified', kind: 'item', cost: ['mouse'], item: 'bag', vp: 1, libraryId: 'ROOT-78' },
  { id: 'protection-racket', name: 'Protection Racket', suit: 'fox', copies: 1, copiesEvidence: 'walkthrough', kind: 'item', cost: ['rabbit', 'rabbit'], item: 'coin', vp: 3, libraryId: 'ROOT-87' },
  { id: 'root-tea-fox', name: 'Root Tea', suit: 'fox', copies: 1, copiesEvidence: 'walkthrough', kind: 'item', cost: ['mouse'], item: 'tea', vp: 2, libraryId: 'ROOT-90' },
  { id: 'stand-and-deliver', name: 'Stand and Deliver!', suit: 'fox', copies: 2, copiesEvidence: 'unverified', kind: 'persistent', cost: ['mouse', 'mouse', 'mouse'], text: 'Once in Birdsong, you may take a random card from an enemy. If you do, they score one point.', libraryId: 'ROOT-102' },
  { id: 'tax-collector', name: 'Tax Collector', suit: 'fox', copies: 3, copiesEvidence: 'unverified', kind: 'persistent', cost: ['rabbit', 'fox', 'mouse'], text: 'Once in Daylight, you may remove a warrior of your faction from a clearing on the map to draw one card.', libraryId: 'ROOT-105' },
  { id: 'travel-gear-fox', name: 'Travel Gear', suit: 'fox', copies: 1, copiesEvidence: 'unverified', kind: 'item', cost: ['rabbit'], item: 'boots', vp: 1, libraryId: 'ROOT-106' },

  // ── Rabbit ──────────────────────────────────────────────────────────────────
  { id: 'ambush-rabbit', name: 'Ambush!', suit: 'rabbit', copies: 1, copiesEvidence: 'law', kind: 'ambush', cost: [], libraryId: 'ROOT-47' },
  { id: 'a-visit-to-friends', name: 'A Visit to Friends', suit: 'rabbit', copies: 1, copiesEvidence: 'walkthrough', kind: 'item', cost: ['rabbit'], item: 'boots', vp: 1, libraryId: 'ROOT-53' },
  { id: 'bake-sale', name: 'Bake Sale', suit: 'rabbit', copies: 1, copiesEvidence: 'walkthrough', kind: 'item', cost: ['rabbit', 'rabbit'], item: 'coin', vp: 3, libraryId: 'ROOT-54' },
  { id: 'better-burrow-bank', name: 'Better Burrow Bank', suit: 'rabbit', copies: 2, copiesEvidence: 'unverified', kind: 'persistent', cost: ['rabbit', 'rabbit'], text: 'At start of Birdsong, you may draw one card. If you do, choose an enemy to draw one card.', libraryId: 'ROOT-55' },
  { id: 'cobbler', name: 'Cobbler', suit: 'rabbit', copies: 2, copiesEvidence: 'unverified', kind: 'persistent', cost: ['rabbit', 'rabbit'], text: 'At start of Evening, may take a move.', libraryId: 'ROOT-60' },
  { id: 'command-warren', name: 'Command Warren', suit: 'rabbit', copies: 2, copiesEvidence: 'unverified', kind: 'persistent', cost: ['rabbit', 'rabbit'], text: 'At start of Daylight, may initiate a battle.', libraryId: 'ROOT-63' },
  { id: 'dominance-rabbit', name: 'Dominance', suit: 'rabbit', copies: 1, copiesEvidence: 'law', kind: 'dominance', cost: [], text: 'You win the game if you rule three rabbit clearings at the start of your Birdsong.', libraryId: 'ROOT-68' },
  { id: 'favor-of-the-rabbits', name: 'Favor of the Rabbits', suit: 'rabbit', copies: 1, copiesEvidence: 'unverified', kind: 'immediate', cost: ['rabbit', 'rabbit', 'rabbit'], text: 'Remove all enemy pieces in rabbit clearings, then discard.', libraryId: 'ROOT-75' },
  { id: 'root-tea-rabbit', name: 'Root Tea', suit: 'rabbit', copies: 1, copiesEvidence: 'unverified', kind: 'item', cost: ['mouse'], item: 'tea', vp: 2, libraryId: 'ROOT-89' },
  { id: 'smugglers-trail', name: "Smuggler's Trail", suit: 'rabbit', copies: 1, copiesEvidence: 'unverified', kind: 'item', cost: ['mouse'], item: 'bag', vp: 1, libraryId: 'ROOT-96' },

  // ── Mouse ───────────────────────────────────────────────────────────────────
  { id: 'ambush-mouse', name: 'Ambush!', suit: 'mouse', copies: 1, copiesEvidence: 'law', kind: 'ambush', cost: [], libraryId: 'ROOT-49' },
  { id: 'codebreakers', name: 'Codebreakers', suit: 'mouse', copies: 2, copiesEvidence: 'unverified', kind: 'persistent', cost: ['mouse'], text: "Once in Daylight, may look at another player's hand.", libraryId: 'ROOT-61' },
  { id: 'crossbow-mouse', name: 'Crossbow', suit: 'mouse', copies: 1, copiesEvidence: 'walkthrough', kind: 'item', cost: ['fox'], item: 'crossbow', vp: 1, libraryId: 'ROOT-66' },
  { id: 'dominance-mouse', name: 'Dominance', suit: 'mouse', copies: 1, copiesEvidence: 'law', kind: 'dominance', cost: [], text: 'You win the game if you rule three mouse clearings at the start of your Birdsong.', libraryId: 'ROOT-70' },
  { id: 'favor-of-the-mice', name: 'Favor of the Mice', suit: 'mouse', copies: 1, copiesEvidence: 'unverified', kind: 'immediate', cost: ['mouse', 'mouse', 'mouse'], text: 'Remove all enemy pieces in mouse clearings, then discard.', libraryId: 'ROOT-74' },
  { id: 'investments', name: 'Investments', suit: 'mouse', copies: 1, copiesEvidence: 'unverified', kind: 'item', cost: ['rabbit', 'rabbit'], item: 'coin', vp: 3, libraryId: 'ROOT-80' },
  { id: 'mouse-in-a-sack', name: 'Mouse-in-a-Sack', suit: 'mouse', copies: 1, copiesEvidence: 'unverified', kind: 'item', cost: ['mouse'], item: 'bag', vp: 1, libraryId: 'ROOT-83' },
  { id: 'root-tea-mouse', name: 'Root Tea', suit: 'mouse', copies: 1, copiesEvidence: 'unverified', kind: 'item', cost: ['mouse'], item: 'tea', vp: 2, libraryId: 'ROOT-91' },
  { id: 'scouting-party', name: 'Scouting Party', suit: 'mouse', copies: 2, copiesEvidence: 'unverified', kind: 'persistent', cost: ['mouse', 'mouse'], text: 'As attacker in battle, you are not affected by ambush cards.', libraryId: 'ROOT-95' },
  { id: 'sword', name: 'Sword', suit: 'mouse', copies: 1, copiesEvidence: 'unverified', kind: 'item', cost: ['fox', 'fox'], item: 'sword', vp: 2, libraryId: 'ROOT-104' },
  { id: 'travel-gear-mouse', name: 'Travel Gear', suit: 'mouse', copies: 1, copiesEvidence: 'walkthrough', kind: 'item', cost: ['rabbit'], item: 'boots', vp: 1, libraryId: 'ROOT-107' },
]

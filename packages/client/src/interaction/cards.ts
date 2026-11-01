import type { Action } from '@root/game-engine'

/** Payload fields that name a card the action uses (actions.ts). */
const CARD_FIELDS = ['card', 'spend', 'dominance'] as const

/** Legal actions that use this physical card: craft it, discard it, add it to the Decree, spend it… */
export function actionsForCard(legal: Action[], card: string): Action[] {
  return legal.filter(a => CARD_FIELDS.some(k => (a.payload as Record<string, unknown>)[k] === card))
}

/** Cards in `cards` that some legal action uses now, to mark them in the hand. */
export const usableCards = (legal: Action[], cards: string[]) => new Set(cards.filter(c => actionsForCard(legal, c).length > 0))

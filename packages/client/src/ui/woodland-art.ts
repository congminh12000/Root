import type { CardSuit } from '@root/game-data'

/** Original indie character illustrations. One painting per design; physical duplicates share it. */
export const WOODLAND_PANELS: Record<CardSuit, readonly string[]> = {
  bird: ['armorers', 'arms-trader', 'birdy-bindle', 'brutal-tactics', 'crossbow-bird', 'royal-claim', 'sappers', 'woodland-runners'],
  fox: ['anvil', 'favor-of-the-foxes', 'foxfolk-steel', 'gently-used-knapsack', 'protection-racket', 'root-tea-fox', 'stand-and-deliver', 'tax-collector', 'travel-gear-fox'],
  rabbit: ['a-visit-to-friends', 'bake-sale', 'better-burrow-bank', 'cobbler', 'command-warren', 'favor-of-the-rabbits', 'root-tea-rabbit', 'smugglers-trail'],
  mouse: ['codebreakers', 'crossbow-mouse', 'favor-of-the-mice', 'investments', 'mouse-in-a-sack', 'root-tea-mouse', 'scouting-party', 'sword', 'travel-gear-mouse'],
}

const SHEETS = {
  bird: new URL('../assets/cards/woodland-bird.webp', import.meta.url).href,
  fox: new URL('../assets/cards/woodland-fox.webp', import.meta.url).href,
  rabbit: new URL('../assets/cards/woodland-rabbit.webp', import.meta.url).href,
  mouse: new URL('../assets/cards/woodland-mouse.webp', import.meta.url).href,
}

/** Generated square sheets use an exact 3×3 grid. Insets remove the thin panel separator. */
export function woodlandArt(id: string, suit: CardSuit): string {
  const index = WOODLAND_PANELS[suit].indexOf(id)
  if (index < 0) throw new Error(`Missing woodland illustration: ${id} (${suit})`)
  const cell = 418, inset = 3
  const x = (index % 3) * cell + inset, y = Math.floor(index / 3) * cell + inset, size = cell - inset * 2
  const clip = `woodland-${id}`
  // Keep the whole painted panel and fill the card beneath the header, including behind the text slip.
  // A dedicated clip prevents neighbouring scenes from entering the card.
  return `<svg class="cf-scene cf-woodland-art" data-design="${id}" data-suit="${suit}" viewBox="${x} ${y} ${size} ${size}" preserveAspectRatio="none" aria-hidden="true">`
    + `<defs><clipPath id="${clip}"><rect x="${x}" y="${y}" width="${size}" height="${size}"/></clipPath></defs>`
    + `<image href="${SHEETS[suit]}" width="1254" height="1254" clip-path="url(#${clip})"/></svg>`
}

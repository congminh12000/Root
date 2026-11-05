import type { FactionId, PlayerView } from '@root/game-engine'

/**
 * Painted panels for your own faction badge (bottom left), original art made for the project
 * (`assets/factions/README.md`). Rows give the order of the resource icons painted on the right of the panel, top to
 * bottom, by the icon name `ownResources` uses; each value is written beside its painted icon.
 */
export const OWN_PANEL: Partial<Record<FactionId, { src: string; rows: readonly string[] }>> = {
  marquise: { src: new URL('../assets/factions/marquise-panel.webp', import.meta.url).href, rows: ['marquise', 'wood', 'card'] },
}

/** Owner-supplied opponent portrait; the laurel carries the live score. */
export const ALLIANCE_OPPONENT_ART = new URL('../assets/factions/alliance-opponent.png', import.meta.url).href

const VAGABOND_OPPONENT_ART = {
  ranger: new URL('../assets/factions/vagabond-ranger-opponent.png', import.meta.url).href,
  tinker: new URL('../assets/factions/vagabond-tinker-opponent.png', import.meta.url).href,
}

/** Only public character data chooses the opponent painting; Thief keeps the plain badge. */
export function opponentPortrait(view: PlayerView, faction: FactionId) {
  if (faction === 'alliance') return { src: ALLIANCE_OPPONENT_ART, x: '22%', y: '75.4cqw' }
  if (faction !== 'vagabond') return null
  const character = view.factions.vagabond?.character
  if (character === 'ranger') return { src: VAGABOND_OPPONENT_ART.ranger, x: '22.5%', y: '78.5cqw' }
  if (character === 'tinker') return { src: VAGABOND_OPPONENT_ART.tinker, x: '21%', y: '78.8cqw' }
  return null
}

import type { FactionId } from '@root/game-engine'

/**
 * Painted panels for your own faction badge (bottom left), original art made for the project
 * (`assets/factions/README.md`). Rows give the order of the resource icons painted on the right of the panel, top to
 * bottom, by the icon name `ownResources` uses; each value is written beside its painted icon.
 */
export const OWN_PANEL: Partial<Record<FactionId, { src: string; rows: readonly string[] }>> = {
  marquise: { src: new URL('../assets/factions/marquise-panel.webp', import.meta.url).href, rows: ['marquise', 'wood', 'card'] },
}

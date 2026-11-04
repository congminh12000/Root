import type { QuestDef } from '@root/game-data'

/** Original quest scenes, ordered left to right, top to bottom in the 5×2 atlas. */
export const QUEST_PANELS = [
  'escort', 'errand-fox', 'errand-rabbit', 'fend-off-a-bear-rabbit', 'expel-bandits-mouse',
  'expel-bandits-rabbit', 'give-a-speech-rabbit', 'fundraising', 'fend-off-a-bear-mouse', 'guard-duty-mouse',
] as const

const sheet = new URL('../assets/cards/quest-indie.webp', import.meta.url).href

/** Unlisted quests retain their existing SVG scene. Crop and clip prevent atlas bleed. */
export function questPainting(q: QuestDef): string | undefined {
  const index = QUEST_PANELS.findIndex(id => id === q.id)
  if (index < 0) return undefined
  const inset = .008, size = 1 - inset * 2
  const x = index % 5 + inset, y = Math.floor(index / 5) + inset
  const clip = `quest-${q.id}`
  return `<svg class="cf-scene cf-quest-art" data-design="${q.id}" data-suit="${q.suit}" viewBox="${x} ${y} ${size} ${size}" preserveAspectRatio="xMidYMin slice" aria-hidden="true">`
    + `<defs><clipPath id="${clip}"><rect x="${x}" y="${y}" width="${size}" height="${size}"/></clipPath></defs>`
    + `<image href="${sheet}" width="5" height="2" preserveAspectRatio="none" clip-path="url(#${clip})"/></svg>`
}

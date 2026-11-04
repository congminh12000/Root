/// <reference types="vite/client" />
import type { FactionId } from '@root/game-engine'

/**
 * Faction pictures saved from Root Database into the gitignored docs/01-official-sources/rootdb/<faction>/ (README
 * there), for personal / LAN use only (docs/00-governance/licensing.md). Like official-cards.ts: absent files, Node
 * tests and the visual baselines (VITE_OFFICIAL_CARDS=off) show nothing extra.
 */
let found: Record<string, string> = {}
try {
  if (import.meta.env.VITE_OFFICIAL_CARDS !== 'off') {
    found = import.meta.glob('../../../../docs/01-official-sources/rootdb/*/*.{webp,png,jpg}', { eager: true, query: '?url', import: 'default' })
  }
} catch { /* not built by Vite (node --test) */ }

/** What each saved file shows, in the order the UI lists them. */
export const PICTURES = [
  ['board-front', 'Bảng phe, mặt trước'], ['board-back', 'Bảng phe, mặt sau'], ['adset-card', 'Lá giới thiệu phe'],
  ['art-eyriepic', 'Tranh phe'], ['icon-eyrie100', 'Icon phe'], ['piece-warrior', 'Chiến binh'], ['piece-roost', 'Roost'],
  ['card-leader-icon', 'Lá Leader'], ['card-loyal-vizier-icon', 'Lá Loyal Vizier'], ['box-art-base-game', 'Bìa hộp Root'],
] as const
export type PictureId = (typeof PICTURES)[number][0]

const BY_FACTION = new Map<string, Map<string, string>>()
for (const [file, url] of Object.entries(found)) {
  const [faction, name] = file.split('/').slice(-2) as [string, string]
  if (!BY_FACTION.has(faction)) BY_FACTION.set(faction, new Map())
  BY_FACTION.get(faction)!.set(name.slice(0, name.lastIndexOf('.')), url)
}

/** The saved picture, or undefined. */
export const factionPicture = (faction: FactionId, id: PictureId): string | undefined => BY_FACTION.get(faction)?.get(id)

/** Every saved picture of a faction, in PICTURES order. */
export const factionPictures = (faction: FactionId) =>
  PICTURES.flatMap(([id, label]) => { const src = factionPicture(faction, id); return src ? [{ id, label, src }] : [] })

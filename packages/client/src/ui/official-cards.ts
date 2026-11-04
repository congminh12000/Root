/// <reference types="vite/client" />

/**
 * Printed card faces cut from the owner's screenshots by `npm run cards:crop` (scripts/crop-official-cards). They live
 * in the gitignored assets/official-cards/ for personal / LAN use only (docs/00-governance/licensing.md), so a checkout
 * without them, Node tests and the visual baselines (VITE_OFFICIAL_CARDS=off) keep the drawn faces in card-face.ts.
 * Keys: deck design id, `quest-<id>`, `leader-<id>`, `character-<id>`.
 */
let found: Record<string, string> = {}
try {
  if (import.meta.env.VITE_OFFICIAL_CARDS !== 'off') {
    found = import.meta.glob('../assets/official-cards/*.webp', { eager: true, query: '?url', import: 'default' })
  }
} catch { /* not built by Vite (node --test): no official faces */ }

const FACES = new Map(Object.entries(found).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -'.webp'.length), url]))

/** The printed face for this key, or undefined to draw our own. */
export const officialFace = (key: string): string | undefined => FACES.get(key)

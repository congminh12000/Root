import type { MapDef } from '../types.ts'

/**
 * The Autumn map (Law §M.1, no special rules).
 * Read from the map art in Walking Through Root p. 3 (SRC-003): clean background image for paths and
 * forests, the overlaid walkthrough board for suit markers and slot boxes, and Learning to Play p. 5
 * (SRC-002) for the bottom-right slots hidden under walkthrough pieces. Slot counts were rechecked on an
 * empty board image (SRC-013). Ids run roughly row by row.
 */
export const AUTUMN: MapDef = {
  id: 'autumn',
  name: 'Autumn',
  evidence: 'map-art',
  clearings: [
    { id: 0, where: 'top-left corner', suit: 'fox', slots: 1, ruins: 0, at: [0.09, 0.13] },
    { id: 1, where: 'top centre', suit: 'rabbit', slots: 2, ruins: 0, at: [0.53, 0.1] },
    { id: 2, where: 'top-right corner', suit: 'mouse', slots: 2, ruins: 0, at: [0.87, 0.22] },
    { id: 3, where: 'upper middle, river bend', suit: 'rabbit', slots: 2, ruins: 1, at: [0.41, 0.3] },
    { id: 4, where: 'left edge', suit: 'mouse', slots: 2, ruins: 0, at: [0.09, 0.41] },
    { id: 5, where: 'centre left', suit: 'fox', slots: 2, ruins: 1, at: [0.31, 0.56] },
    { id: 6, where: 'centre, by the mill', suit: 'mouse', slots: 3, ruins: 1, at: [0.62, 0.48] },
    { id: 7, where: 'right edge', suit: 'fox', slots: 2, ruins: 1, at: [0.89, 0.53] },
    { id: 8, where: 'bottom-left corner', suit: 'rabbit', slots: 1, ruins: 0, at: [0.09, 0.8] },
    { id: 9, where: 'bottom, left of centre', suit: 'fox', slots: 2, ruins: 0, at: [0.36, 0.88] },
    { id: 10, where: 'bottom centre, by the river', suit: 'mouse', slots: 2, ruins: 0, at: [0.57, 0.75] },
    { id: 11, where: 'bottom-right corner', suit: 'rabbit', slots: 1, ruins: 0, at: [0.82, 0.85] },
  ],
  paths: [
    [0, 1], [0, 3], [0, 4], [1, 2], [2, 3], [2, 7], [3, 5], [4, 5], [4, 8],
    [5, 6], [5, 8], [5, 10], [6, 7], [6, 11], [7, 11], [8, 9], [9, 10], [10, 11],
  ],
  forests: [
    [0, 1, 2, 3],
    [0, 3, 5, 4],
    [3, 2, 7, 6, 5],
    [4, 5, 8],
    [5, 6, 11, 10],
    [6, 7, 11],
    [8, 5, 10, 9],
  ],
  corners: { topLeft: 0, topRight: 2, bottomLeft: 8, bottomRight: 11 },
  // Outer loop 1–2–3–8–12–11–10–9–5–1 (ids + 1) along the paths above; 4, 6 and 7 are inside (OQ-20).
  edge: [0, 1, 2, 4, 7, 8, 9, 10, 11],
  // §5.1.5 and the supply printed on the map: two rows of bag, boots, crossbow|hammer, sword, tea, coin.
  itemSupply: { bag: 2, boots: 2, crossbow: 1, hammer: 1, sword: 2, tea: 2, coin: 2 },
}

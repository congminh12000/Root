import type { Clearing } from './types'

export const MAP_SIZE = { width: 1311, height: 1200 }

// Presentation coordinates only; replay IDs, rules and model inputs stay valid.
export const CLEARING_ANCHORS = [
  { x: 143, y: 192 }, { x: 744, y: 158 }, { x: 1145, y: 308 },
  { x: 161, y: 475 }, { x: 447, y: 672 }, { x: 590, y: 449 },
  { x: 1162, y: 683 }, { x: 194, y: 987 }, { x: 856, y: 623 },
  { x: 778, y: 892 }, { x: 501, y: 1091 }, { x: 1079, y: 1058 },
] as const

export const FOREST_ANCHORS = [
  { x: 290, y: 370 }, { x: 405, y: 220 }, { x: 962, y: 172 },
  { x: 260, y: 705 }, { x: 637, y: 593 }, { x: 1010, y: 445 },
  { x: 337, y: 858 }, { x: 681, y: 1000 }, { x: 1015, y: 829 },
] as const

export function clearingPosition(clearing: Pick<Clearing, 'id' | 'x' | 'y'>) {
  return CLEARING_ANCHORS[clearing.id] ?? {
    x: clearing.x / 960 * MAP_SIZE.width,
    y: clearing.y / 755 * MAP_SIZE.height,
  }
}

export function forestPosition(position: number) {
  return FOREST_ANCHORS[-position - 1] ?? FOREST_ANCHORS[0]
}

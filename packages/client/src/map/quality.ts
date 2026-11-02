/**
 * How much the map draws on this device (docs/07-ui/gameplay-map-only.md §G6). A touch tablet gets fewer pixels, a
 * smaller shadow map and a thinner apron forest, so it keeps 30 fps and opens as fast as a laptop; the board, the
 * pieces and everything that is part of play are the same at every tier.
 */
export interface Quality { tier: 'full' | 'tablet'; pixelRatio: number; shadowSize: number; apronTrees: number }

export function qualityFor(device: { coarse: boolean; dpr: number }): Quality {
  return device.coarse
    ? { tier: 'tablet', pixelRatio: Math.min(device.dpr, 1.5), shadowSize: 1024, apronTrees: 4500 }
    : { tier: 'full', pixelRatio: Math.min(device.dpr, 2), shadowSize: 2048, apronTrees: 7500 }
}

/** This browser's tier: a primary pointer that is a finger means a tablet or phone. */
export const deviceQuality = (): Quality => qualityFor({ coarse: matchMedia('(pointer: coarse)').matches, dpr: devicePixelRatio })

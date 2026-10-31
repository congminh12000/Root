import lowlands from '../../../maps/lowlands.json'
import lakeside from '../../../maps/lakeside.json'
import lakesideArt from '../../../maps/lakeside.webp?url'

export type Pt = [number, number]
export type Suit = 'fox' | 'rabbit' | 'mouse'

export interface ClearingSpec {
  name: string; suit: Suit; slots: number; x: number; y: number; paths: number[]
  /** Building plots placed on open ground in the artwork; defaults to a row under the clearing. */
  plots?: Pt[]
  /** Starts with a ruin on its last plot; the plot becomes buildable once the ruin is explored. */
  ruin?: boolean
}
export interface TerrainSpec {
  treeSpacing: number
  rivers: { width: number; points: Pt[] }[]
  lakes: { points: Pt[] }[]
  rocks: { x: number; y: number; r: number }[]
}
/** One file per map in /maps: the engine reads clearings and forests, the renderer reads everything. */
export interface MapSpec {
  id: string; name: string; season: string; seed: number; size: Pt
  clearings: ClearingSpec[]; forests: number[][]; terrain: TerrainSpec
  /** Illustrated board drawn as-is instead of the procedural terrain; resolved to a URL below. */
  background?: string
  /** Side of a building plot in map units; defaults to SLOT.size. */
  plotSize?: number
}

// JSON imports widen tuples to number[]; validateLayout checks the shape in tests.
export const MAPS: Record<string, MapSpec> = {
  lowlands: lowlands as unknown as MapSpec,
  lakeside: { ...lakeside, background: lakesideArt } as unknown as MapSpec,
}

/** Must match MAP_ID in backend/root/content.py. */
export const ACTIVE_MAP = MAPS.lakeside

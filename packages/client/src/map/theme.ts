import type * as THREE from 'three'
import type { Placement } from '../board/pieces.ts'
import type { Bounds } from './limits.ts'
import type { Quality } from './quality.ts'

/**
 * A playable look for the Autumn map (docs/07-ui/gameplay-map-only.md §5). Every theme shows the same topology from
 * game-data; it only decides scenery, the apron around the board, and where pieces stand.
 */
export interface MapTheme {
  id: 'autumn-diorama' | 'classic'
  name: string
  bounds: Bounds
  /** Depth of a clearing in world units: the closest zoom shows one at about 60% of the screen. */
  clearingDepth: number
  /** Colour behind everything, the same as the apron's forest, should any gap ever appear. */
  background: string
  placement: Placement
  /**
   * Builds what play needs into `scene` (`picking` meshes carry `userData.clearing`); `later` adds decoration (trees,
   * apron), one task per frame after the first frame, so opening a game never blocks the page for long.
   */
  build(scene: THREE.Scene, quality: Quality): { picking: THREE.Object3D[]; later: (() => void)[]; dispose(): void }
}

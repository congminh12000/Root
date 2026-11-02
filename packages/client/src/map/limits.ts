/**
 * Camera limits for the map-only game screen (docs/07-ui/gameplay-map-only.md): how far it may zoom, tilt and pan,
 * and how far the scenery must reach so that no empty background ever shows. Pure geometry, tested without a
 * browser (test/map.test.ts). The camera is orthographic, so it never sees a horizon.
 */

/** Board half-extents in world units. */
export interface Bounds { halfW: number; halfD: number }

/** Nearly straight down to about 50°: the ground always fills the view. */
export const MIN_POLAR = .04, MAX_POLAR = .87
/** Viewport aspect ratios the game supports: a tablet held upright to an ultrawide monitor. */
export const MIN_ASPECT = .45, MAX_ASPECT = 2.6
/** At the closest zoom a clearing fills about this share of the screen height. */
const CLOSE_SHARE = .6

/** Frustum half-height at zoom 1: the whole board fits the screen, a little margin around it. */
export const baseHalfHeight = (b: Bounds, aspect: number) => Math.max(b.halfD, b.halfW / aspect) * 1.04

/** Zoom 1 shows the whole board; the closest zoom shows one clearing large (`clearingDepth` in world units). */
export function zoomRange(b: Bounds, aspect: number, clearingDepth: number): [number, number] {
  const h = baseHalfHeight(b, aspect)
  return [1, Math.max(1.5, (2 * h * CLOSE_SHARE) / clearingDepth)]
}

/** Distance from the look-at point to the furthest ground point in view (an orthographic footprint, any heading). */
export function footprintRadius(halfHeight: number, aspect: number, zoom: number, polar: number): number {
  const hh = halfHeight / zoom
  return Math.hypot(hh * aspect, hh / Math.cos(polar))
}

/** The furthest any visible ground can be from the board centre, over every allowed camera. */
export function furthestVisible(b: Bounds): number {
  let far = 0
  for (const aspect of [MIN_ASPECT, 1, MAX_ASPECT]) far = Math.max(far, footprintRadius(baseHalfHeight(b, aspect), aspect, 1, MAX_POLAR))
  // The look-at point stays on the board, at worst in a corner.
  return far + Math.hypot(b.halfW, b.halfD)
}

/** How far the apron (scenery around the board) reaches: past everything visible, with a safety margin. */
export const apronRadius = (b: Bounds) => furthestVisible(b) * 1.12

/** Keep the look-at point on the board. */
export const clampTarget = (b: Bounds, x: number, z: number): [number, number] =>
  [Math.max(-b.halfW, Math.min(b.halfW, x)), Math.max(-b.halfD, Math.min(b.halfD, z))]

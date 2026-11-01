/** Visual study traced from the manager's Lake reference, not an official playable map. */
export type Point = readonly [number, number]
export type SampleBuilding = 'sawmill' | 'workshop' | 'recruiter' | 'roost' | 'base'
export interface Plot { id: string; clearing: number; at: Point; angle: number; ruin: boolean }
export interface Village { id: number; at: Point; home: Point; slots: Plot[] }
export const WIDTH = 28, DEPTH = 25
export const PLOT_HALF = .019
const village = (id: number, at: Point, home: Point, slots: Point[], ruin = -1): Village => ({
  id, at, home, slots: slots.map((p, i) => ({ id: `${id}.${i + 1}`, clearing: id, at: p, angle: 0, ruin: i === ruin })),
})
// IDs follow the reference clockwise by rows; they do not refer to Autumn clearing IDs.
export const VILLAGES: Village[] = [
  village(1, [.14, .18], [.105, .15], [[.16, .205]]),
  village(2, [.45, .12], [.425, .10], [[.47, .14]]),
  village(3, [.69, .23], [.72, .205], [[.66, .245], [.71, .265]]),
  village(4, [.90, .35], [.935, .32], [[.88, .37]]),
  village(5, [.31, .35], [.26, .30], [[.29, .335], [.303, .385], [.35, .35]], 2),
  village(6, [.105, .48], [.08, .445], [[.125, .505]]),
  village(7, [.64, .445], [.575, .395], [[.62, .425], [.66, .47], [.69, .415]], 2),
  village(8, [.875, .575], [.84, .515], [[.85, .56], [.90, .56], [.89, .615]], 2),
  village(9, [.34, .69], [.335, .655], [[.30, .70], [.35, .715], [.385, .675]], 0),
  village(10, [.12, .80], [.09, .77], [[.14, .82]]),
  village(11, [.44, .86], [.415, .825], [[.47, .875]]),
  village(12, [.85, .865], [.925, .85], [[.82, .865], [.875, .885]]),
]
export const PLOTS = VILLAGES.flatMap(c => c.slots)
export const LAKE: Point[] = [
  [.43,.33],[.48,.325],[.49,.38],[.47,.43],[.52,.46],[.59,.46],[.60,.50],[.65,.52],
  [.68,.55],[.68,.59],[.69,.65],[.73,.69],[.80,.73],[.85,.78],[.82,.82],[.76,.82],
  [.70,.79],[.64,.78],[.61,.73],[.58,.70],[.53,.69],[.48,.68],[.43,.65],[.39,.62],
  [.33,.62],[.29,.65],[.25,.65],[.20,.63],[.18,.60],[.20,.56],[.23,.53],[.26,.48],
  [.27,.43],[.31,.41],[.36,.41],[.39,.38],[.40,.35],
]
/** Hand-drawn visible paths only; no gameplay adjacency is asserted. Routed away from plot footprints. */
export const PATHS: Point[][] = [
  [[.18,.15],[.28,.13],[.40,.11]], [[.515,.14],[.56,.18],[.65,.21]],
  [[.755,.235],[.80,.27],[.89,.31]], [[.44,.18],[.40,.25],[.35,.30]],
  [[.59,.21],[.58,.31],[.63,.39]], [[.10,.23],[.08,.32],[.09,.41]],
  [[.15,.44],[.21,.40],[.25,.37]], [[.73,.47],[.79,.51],[.82,.53]],
  [[.90,.41],[.89,.46],[.88,.51]], [[.89,.66],[.89,.74],[.87,.82]],
  [[.08,.54],[.07,.65],[.10,.74]], [[.17,.77],[.23,.74],[.26,.71]],
  [[.17,.84],[.26,.88],[.38,.87]], [[.39,.73],[.42,.78],[.43,.81]],
  [[.51,.89],[.65,.90],[.77,.88]],
]
export const DOCKS = [
  { at: [.355,.415] as Point, w: .085, h: .014 },
  { at: [.59,.50] as Point, w: .075, h: .015 },
  { at: [.325,.64] as Point, w: .10, h: .014 },
  { at: [.83,.825] as Point, w: .09, h: .014 },
]
export const BUILDINGS: SampleBuilding[] = ['sawmill', 'workshop', 'recruiter', 'roost', 'base']
export const BUILDING_NAME: Record<SampleBuilding, string> = { sawmill: 'Sawmill · xưởng cưa', workshop: 'Workshop · xưởng chế tác', recruiter: 'Recruiter · trại tuyển quân', roost: 'Roost · tổ chim', base: 'Base · căn cứ' }
export const world = ([x, y]: Point): [number, number, number] => [(x - .5) * WIDTH, 0, (y - .5) * DEPTH]
export function inside(p: Point, polygon: readonly Point[]): boolean {
  let hit = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!, b = polygon[j]!
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit
  }
  return hit
}
export function segmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
}
export const shoreDistance = (p: Point) => Math.min(...LAKE.map((a, i) => segmentDistance(p, a, LAKE[(i + 1) % LAKE.length]!)))
export const pathDistance = (p: Point) => Math.min(...PATHS.flatMap(line => line.slice(1).map((b, i) => segmentDistance(p, line[i]!, b))))
export const inPlot = (p: Point, margin = 0) => PLOTS.some(s => Math.abs(p[0] - s.at[0]) < PLOT_HALF + margin && Math.abs(p[1] - s.at[1]) < PLOT_HALF + margin)
export const inDock = (p: Point, margin = 0) => DOCKS.some(d => Math.abs(p[0] - d.at[0]) < d.w / 2 + margin && Math.abs(p[1] - d.at[1]) < d.h / 2 + margin)
export const inVillage = (p: Point) => VILLAGES.some(c => Math.hypot((p[0] - c.at[0]) / .077, (p[1] - c.at[1]) / .068) < 1 || Math.hypot(p[0] - c.home[0], p[1] - c.home[1]) < .04)
export const treeAllowed = (p: Point) => !inside(p, LAKE) && shoreDistance(p) > .012 && !inVillage(p) && !inPlot(p, .018) && !inDock(p, .02) && pathDistance(p) > .018 && p[1] > .08 && p[1] < .92 && !(p[0] < .39 && p[1] < .12)

export interface DemoState { selected: string | null; buildings: Record<string, SampleBuilding>; cleared: string[] }
export const initialDemo = (): DemoState => ({ selected: null, buildings: {}, cleared: [] })
export const hasRuin = (s: DemoState, p: Plot) => p.ruin && !s.cleared.includes(p.id)
export type DemoAction = { type: 'select'; id: string } | { type: 'place'; building: SampleBuilding } | { type: 'remove' | 'clear' | 'reset' }
export function changeDemo(s: DemoState, a: DemoAction): DemoState {
  if (a.type === 'reset') return initialDemo()
  if (a.type === 'select') return PLOTS.some(p => p.id === a.id) ? { ...s, selected: a.id } : s
  const plot = PLOTS.find(p => p.id === s.selected)
  if (!plot) return s
  if (a.type === 'clear') return hasRuin(s, plot) ? { ...s, cleared: [...s.cleared, plot.id] } : s
  if (a.type === 'place') return !hasRuin(s, plot) && BUILDINGS.includes(a.building) ? { ...s, buildings: { ...s.buildings, [plot.id]: a.building } } : s
  const buildings = { ...s.buildings }; delete buildings[plot.id]
  return { ...s, buildings }
}

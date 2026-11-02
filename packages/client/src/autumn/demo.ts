import { BUILDINGS, type SampleBuilding } from '../lake/layout.ts'
import { PLOTS, type Plot } from './layout.ts'

/** Review-only demo on the Autumn slots, the same moves as the Lake review (lake/layout.ts). Not game state. */
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

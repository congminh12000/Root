import type { PlayerView } from '@root/game-engine'
import { html } from 'htm/preact'
import { useEffect, useRef } from 'preact/hooks'
import { renderBoard } from '../../board.ts'
import type { Travel } from '../../motion.ts'
import type { Changes } from '../../net/changes.ts'

type Board3D = { update(v: PlayerView, h: number[], changed?: number[], travels?: Travel[]): void; resetCamera(): void; dispose(): void }
export type BoardMode = '3d' | '2d'

/**
 * The board: three.js (loaded on demand) or the SVG fallback, both drawn imperatively into a host Preact leaves
 * alone. Each update's animations run once (`changes.seq`); re-renders for a new highlight do not replay them.
 */
export function BoardView({ view, highlight, changes, mode, onPick, onNoWebGL, cameraHome = 0 }: {
  view: PlayerView; highlight: number[]; changes: Changes; mode: BoardMode; onPick: (c: number) => void; onNoWebGL: () => void
  /** Bump it to glide the 3D camera back to the default view. */
  cameraHome?: number
}) {
  const host = useRef<HTMLDivElement>(null)
  const board3d = useRef<Board3D | null>(null)
  const shown = useRef(0)
  const pick = useRef(onPick)
  pick.current = onPick
  const latest = useRef({ view, highlight })
  latest.current = { view, highlight }

  // Mount or drop the 3D board when the mode changes.
  useEffect(() => {
    if (mode !== '3d') return
    let alive = true
    void import('../../board3d.ts').then(m => {
      if (!alive || !host.current) return
      if (!m.webglAvailable()) { onNoWebGL(); return }
      host.current.innerHTML = ''
      board3d.current = m.mountBoard3D(host.current, c => pick.current(c))
      board3d.current.update(latest.current.view, latest.current.highlight)
    })
    return () => { alive = false; board3d.current?.dispose(); board3d.current = null; if (host.current) host.current.innerHTML = '' }
  }, [mode])

  // Redraw on every new view or highlight; animate only what this update changed, once.
  useEffect(() => {
    const fresh = changes.seq !== shown.current
    shown.current = changes.seq
    const changed = fresh ? changes.changed : [], travels = fresh ? changes.travels : []
    if (mode === '3d') { board3d.current?.update(view, highlight, changed, travels); return }
    if (host.current) host.current.innerHTML = renderBoard(view, highlight, changed, travels)
  }, [view, highlight, changes, mode])

  useEffect(() => { if (cameraHome) board3d.current?.resetCamera() }, [cameraHome])

  const click = (e: MouseEvent) => {
    if (mode !== '2d') return
    const el = (e.target as Element).closest<SVGElement>('[data-clearing]')
    if (el) onPick(Number(el.dataset.clearing))
  }
  return html`<div class="map" ref=${host} onClick=${click}></div>`
}

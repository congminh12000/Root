import type { PlayerView } from '@root/game-engine'
import { html } from 'htm/preact'
import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import type { Changes } from '../../net/changes.ts'
import { loadTheme, type MapId } from '../../map/choice.ts'
import type { MapStage } from '../../map/stage.ts'

/** Screen position of a clearing on the map, for menus anchored to it; null until the map is ready. */
export type Project = (clearing: number) => [number, number] | null

/**
 * The full-screen map (docs/07-ui/gameplay-map-only.md), drawn by map/stage.ts into a host Preact leaves alone, with
 * an `overlay` of menus anchored to clearings that follows the camera. Each update's animations run once
 * (`changes.seq`); re-renders for a new highlight do not replay them.
 */
export function MapView({ map, view, highlight, targets, draggable, changes, onPick, onDrag, onDragOver, onHover, onHold, onReady, cameraHome, overlay }: {
  /** Which theme draws the map; changing it rebuilds the map in place. */
  map: MapId
  view: PlayerView; highlight: number[]; targets: number[]; changes: Changes
  /** Clearings pieces can be dragged from. */
  draggable: number[]
  onPick: (c: number) => void
  onDrag: (from: number, to: number) => void
  onDragOver: (from: number, to: number | null) => void
  onHover: (c: number | null) => void
  onHold: (c: number) => void
  /** Called once the map is drawn (or known not to draw), so the opening can fade it in and start dealing. */
  onReady?: () => void
  /** Bump it to send the camera back to the default view. */
  cameraHome: number
  overlay: (project: Project) => ComponentChildren
}) {
  const host = useRef<HTMLDivElement>(null)
  const stage = useRef<MapStage | null>(null)
  const shown = useRef(0)
  const handlers = useRef({ onPick, onDrag, onDragOver, onHover, onHold, onReady })
  handlers.current = { onPick, onDrag, onDragOver, onHover, onHold, onReady }
  const [ready, setReady] = useState(false)
  const markReady = () => { setReady(true); handlers.current.onReady?.() }
  const latest = useRef({ view, highlight, targets, draggable })
  latest.current = { view, highlight, targets, draggable }
  const [failed, setFailed] = useState(false)
  // Bumped whenever the camera moves, so the overlay re-anchors.
  const [, setMoves] = useState(0)

  useEffect(() => {
    let alive = true, unsubscribe = () => {}
    void Promise.all([import('../../map/stage.ts'), loadTheme(map)]).then(([m, theme]) => {
      if (!alive || !host.current) return
      if (!m.webglAvailable()) { setFailed(true); markReady(); return }
      const s = m.mountMap(host.current, theme, {
        pick: c => handlers.current.onPick(c),
        drag: (a, b) => handlers.current.onDrag(a, b),
        dragOver: (a, b) => handlers.current.onDragOver(a, b),
        hover: c => handlers.current.onHover(c),
        hold: c => handlers.current.onHold(c),
      })
      stage.current = s
      s.update(latest.current.view, latest.current.highlight, [], [], latest.current.targets)
      s.setDraggable(latest.current.draggable)
      unsubscribe = s.onView(() => setMoves(n => n + 1))
      setMoves(n => n + 1)
      // A timer, not requestAnimationFrame: a background tab runs no frames, and the hand waits on this.
      window.setTimeout(markReady, 50)
    }).catch(() => { if (alive) markReady() })
    return () => { alive = false; unsubscribe(); stage.current?.dispose(); stage.current = null }
  }, [map])

  useEffect(() => {
    const fresh = changes.seq !== shown.current
    shown.current = changes.seq
    stage.current?.update(view, highlight, fresh ? changes.changed : [], fresh ? changes.travels : [], targets)
  }, [view, highlight.join(), targets.join(), changes])
  useEffect(() => { stage.current?.setDraggable(draggable) }, [draggable.join()])
  useEffect(() => { if (cameraHome) stage.current?.resetCamera() }, [cameraHome])

  const project: Project = c => (stage.current ? stage.current.project(c) : null)
  return html`<div class=${`game-map${ready ? ' ready' : ''}`} ref=${host}>${failed && html`<p class="map-fallback" role="alert">Trình duyệt này không chạy được WebGL 2 nên không vẽ được bản đồ. Hãy mở trận bằng Chrome, Edge, Safari hoặc Firefox bản mới. Trong lúc đó vẫn theo dõi và chơi được bằng danh sách: menu ☰ → “Tất cả lựa chọn”, nhật ký và bảng phe.</p>`}</div>
    ${stage.current && html`<div class="map-overlay">${overlay(project)}</div>`}`
}

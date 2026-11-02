import type { PlayerView } from '@root/game-engine'
import { html } from 'htm/preact'
import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import type { Changes } from '../../net/changes.ts'
import type { MapStage } from '../../map/stage.ts'

/** Screen position of a clearing on the map, for menus anchored to it; null until the map is ready. */
export type Project = (clearing: number) => [number, number] | null

/**
 * The full-screen map (docs/07-ui/gameplay-map-only.md), drawn by map/stage.ts into a host Preact leaves alone, with
 * an `overlay` of menus anchored to clearings that follows the camera. Each update's animations run once
 * (`changes.seq`); re-renders for a new highlight do not replay them.
 */
export function MapView({ view, highlight, targets, draggable, changes, onPick, onDrag, onDragOver, cameraHome, overlay }: {
  view: PlayerView; highlight: number[]; targets: number[]; changes: Changes
  /** Clearings pieces can be dragged from. */
  draggable: number[]
  onPick: (c: number) => void
  onDrag: (from: number, to: number) => void
  onDragOver: (from: number, to: number | null) => void
  /** Bump it to send the camera back to the default view. */
  cameraHome: number
  overlay: (project: Project) => ComponentChildren
}) {
  const host = useRef<HTMLDivElement>(null)
  const stage = useRef<MapStage | null>(null)
  const shown = useRef(0)
  const handlers = useRef({ onPick, onDrag, onDragOver })
  handlers.current = { onPick, onDrag, onDragOver }
  const latest = useRef({ view, highlight, targets, draggable })
  latest.current = { view, highlight, targets, draggable }
  const [failed, setFailed] = useState(false)
  // Bumped whenever the camera moves, so the overlay re-anchors.
  const [, setMoves] = useState(0)

  useEffect(() => {
    let alive = true, unsubscribe = () => {}
    void Promise.all([import('../../map/stage.ts'), import('../../map/autumn-theme.ts')]).then(([m, t]) => {
      if (!alive || !host.current) return
      if (!m.webglAvailable()) { setFailed(true); return }
      const s = m.mountMap(host.current, t.AUTUMN_DIORAMA, {
        pick: c => handlers.current.onPick(c),
        drag: (a, b) => handlers.current.onDrag(a, b),
        dragOver: (a, b) => handlers.current.onDragOver(a, b),
      })
      stage.current = s
      s.update(latest.current.view, latest.current.highlight, [], [], latest.current.targets)
      s.setDraggable(latest.current.draggable)
      unsubscribe = s.onView(() => setMoves(n => n + 1))
      setMoves(n => n + 1)
    })
    return () => { alive = false; unsubscribe(); stage.current?.dispose(); stage.current = null }
  }, [])

  useEffect(() => {
    const fresh = changes.seq !== shown.current
    shown.current = changes.seq
    stage.current?.update(view, highlight, fresh ? changes.changed : [], fresh ? changes.travels : [], targets)
  }, [view, highlight.join(), targets.join(), changes])
  useEffect(() => { stage.current?.setDraggable(draggable) }, [draggable.join()])
  useEffect(() => { if (cameraHome) stage.current?.resetCamera() }, [cameraHome])

  const project: Project = c => (stage.current ? stage.current.project(c) : null)
  return html`<div class="game-map" ref=${host}>${failed && html`<p class="map-fallback" role="alert">Trình duyệt này không chạy được WebGL 2 nên không vẽ được bản đồ. Hãy mở trận bằng Chrome, Edge, Safari hoặc Firefox bản mới.</p>`}</div>
    ${stage.current && html`<div class="map-overlay">${overlay(project)}</div>`}`
}

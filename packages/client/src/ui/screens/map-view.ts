import type { PlayerView } from '@root/game-engine'
import { html } from 'htm/preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import type { Changes } from '../../net/changes.ts'
import type { MapStage } from '../../map/stage.ts'

/**
 * The full-screen map (docs/07-ui/gameplay-map-only.md), drawn by map/stage.ts into a host Preact leaves alone.
 * Each update's animations run once (`changes.seq`); re-renders for a new highlight do not replay them.
 */
export function MapView({ view, highlight, targets, changes, onPick, cameraHome }: {
  view: PlayerView; highlight: number[]; targets: number[]; changes: Changes; onPick: (c: number) => void
  /** Bump it to send the camera back to the default view. */
  cameraHome: number
}) {
  const host = useRef<HTMLDivElement>(null)
  const stage = useRef<MapStage | null>(null)
  const shown = useRef(0)
  const pick = useRef(onPick)
  pick.current = onPick
  const latest = useRef({ view, highlight, targets })
  latest.current = { view, highlight, targets }
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    void Promise.all([import('../../map/stage.ts'), import('../../map/autumn-theme.ts')]).then(([m, t]) => {
      if (!alive || !host.current) return
      if (!m.webglAvailable()) { setFailed(true); return }
      stage.current = m.mountMap(host.current, t.AUTUMN_DIORAMA, c => pick.current(c))
      stage.current.update(latest.current.view, latest.current.highlight, [], [], latest.current.targets)
    })
    return () => { alive = false; stage.current?.dispose(); stage.current = null }
  }, [])

  useEffect(() => {
    const fresh = changes.seq !== shown.current
    shown.current = changes.seq
    stage.current?.update(view, highlight, fresh ? changes.changed : [], fresh ? changes.travels : [], targets)
  }, [view, highlight.join(), targets.join(), changes])

  useEffect(() => { if (cameraHome) stage.current?.resetCamera() }, [cameraHome])

  return html`<div class="game-map" ref=${host}>${failed && html`<p class="map-fallback" role="alert">Trình duyệt này không chạy được WebGL 2 nên không vẽ được bản đồ. Hãy mở trận bằng Chrome, Edge, Safari hoặc Firefox bản mới.</p>`}</div>`
}

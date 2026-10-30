import { useEffect, useRef, useState } from 'react'
import { Application, Container, Graphics, Text } from 'pixi.js'
import woodlandMap from './assets/woodland-reference.png'
import { CLEARING_ANCHORS, MAP_SIZE, clearingPosition, forestPosition } from './map-layout'
import type { Snapshot } from './types'

function label(text: string, x: number, y: number, size = 14, color = '#fff4d8') {
  const t = new Text({ text, style: { fontFamily: 'Georgia', fontSize: size, fill: color, fontWeight: '600' } })
  t.anchor.set(.5)
  t.position.set(x, y)
  return t
}

interface BoardProps {
  state?: Snapshot | null
  selected: number | null
  onSelect: (id: number) => void
}

export function Board({ state, selected, onSelect }: BoardProps) {
  const host = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const previousPawn = useRef<{ x: number; y: number } | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [showPieces, setShowPieces] = useState(false)
  const [showNames, setShowNames] = useState(false)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    const element = host.current
    if (!element) return
    let disposed = false
    const app = new Application()
    let observer: ResizeObserver | undefined
    void app.init({ width: MAP_SIZE.width, height: MAP_SIZE.height, backgroundAlpha: 0,
      antialias: true, autoStart: false, resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true, preference: 'webgl' }).then(() => {
      if (disposed) { app.destroy(true, { children: true }); return }
      element.appendChild(app.canvas)
      appRef.current = app
      observer = new ResizeObserver(() => {
        const width = element.clientWidth
        if (width > 0) {
          app.renderer.resize(width, width * MAP_SIZE.height / MAP_SIZE.width)
          app.stage.scale.set(width / MAP_SIZE.width)
          app.render()
        }
      })
      observer.observe(element)
      setReady(true)
    }).catch(() => setError('Không tải được lớp quân cờ WebGL. Bản đồ vẫn xem và chọn vùng được.'))
    return () => {
      disposed = true
      observer?.disconnect()
      if (appRef.current === app) {
        appRef.current = null
        app.destroy(true, { children: true })
      }
    }
  }, [])

  useEffect(() => {
    const app = appRef.current
    if (!ready || !app) return
    if (!state || !showPieces) {
      app.stop()
      app.render()
      return
    }
    const layer = new Container()
    app.stage.addChild(layer)
    state.clearings.forEach(c => {
      const position = clearingPosition(c)
      const armies = c.warriors.map((n, i) => ({ n, i })).filter(x => x.n)
      const buildingCount = c.buildings.length + Number(c.keep) + Number(c.sympathy) + Number(Boolean(c.wood))
      if (!armies.length && !buildingCount) return
      const width = Math.max(42, armies.length * 30 + 14, buildingCount * 20 + 14)
      const height = armies.length && buildingCount ? 61 : 35
      const plaque = new Graphics().roundRect(position.x - width / 2 + 2, position.y + 4, width, height, 7)
        .fill({ color: 0x172a20, alpha: .2 })
        .roundRect(position.x - width / 2, position.y, width, height, 7)
        .fill({ color: 0x25342a, alpha: .88 }).stroke({ color: 0xd4bd8d, width: 1, alpha: .8 })
      layer.addChild(plaque)
      armies.forEach(({ n, i }, j) => {
        const x = position.x + (j - (armies.length - 1) / 2) * 30
        const token = new Graphics().roundRect(x - 11, position.y + 8, 22, 21, 4)
          .fill(state.players[i].color).stroke({ color: 0xf5dfb4, width: 1 })
        layer.addChild(token)
        layer.addChild(label(String(n), x, position.y + 19, 13))
      })
      const symbols = [
        ...c.buildings.map(b => ({ color: state.players[b.player].color,
          char: b.kind === 'roost' ? '⌂' : b.kind === 'base' ? '⚑' : b.kind === 'mill' ? '✳' : b.kind === 'workshop' ? '⚒' : '▥' })),
        ...(c.keep ? [{ color: '#e7a46a', char: '♜' }] : []),
        ...(c.sympathy ? [{ color: '#b6c58a', char: '❧' }] : []),
        ...(c.wood ? [{ color: '#e2c192', char: `${c.wood}w` }] : []),
      ]
      symbols.forEach((s, j) => layer.addChild(label(s.char,
        position.x + (j - (symbols.length - 1) / 2) * 20, position.y + (armies.length ? 45 : 18), 15, s.color)))
    })
    const ranger = state.players.find(p => p.faction === 'ranger')
    let animate: (() => void) | undefined
    if (ranger) {
      const clearing = state.clearings.find(c => c.id === ranger.position)
      const location = clearing ? clearingPosition(clearing) : forestPosition(ranger.position)
      const target = { x: location.x + (clearing ? 64 : 0), y: location.y + 12 }
      const pawn = new Graphics().ellipse(3, 20, 15, 5).fill({ color: 0x14231b, alpha: .3 })
        .circle(0, -10, 8).fill(ranger.color).stroke({ color: 0xffe9be, width: 2 })
        .poly([0, -2, -12, 18, 12, 18]).fill(ranger.color).stroke({ color: 0xffe9be, width: 2 })
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      pawn.position.copyFrom(reduced ? target : previousPawn.current || target)
      previousPawn.current = target
      layer.addChild(pawn)
      animate = () => {
        const f = Math.min(1, app.ticker.deltaMS / 100)
        pawn.x += (target.x - pawn.x) * f
        pawn.y += (target.y - pawn.y) * f
      }
      if (!reduced) app.ticker.add(animate)
    }
    app.render()
    app.start()
    return () => {
      if (animate) app.ticker?.remove(animate)
      if (!layer.destroyed) layer.destroy({ children: true })
    }
  }, [state, ready, showPieces])

  const regions = CLEARING_ANCHORS.map((anchor, id) => ({
    ...anchor, id, name: state?.clearings.find(c => c.id === id)?.name ?? `Vùng ${id + 1}`,
  }))

  return <div className="reference-map-view">
    <div className="map-controls" aria-label="Hiển thị bản đồ">
      <div className="map-zoom-controls">
        <button aria-label="Thu nhỏ bản đồ" disabled={zoom === 1} onClick={() => setZoom(z => Math.max(1, z - .25))}>−</button>
        <button className="map-reset" onClick={() => setZoom(1)} title="Hiển thị toàn bộ bản đồ">{Math.round(zoom * 100)}%</button>
        <button aria-label="Phóng to bản đồ" disabled={zoom === 3} onClick={() => setZoom(z => Math.min(3, z + .25))}>+</button>
      </div>
      <div className="map-layer-controls">
        <label><input type="checkbox" checked={showNames} onChange={e => setShowNames(e.target.checked)} />Tên vùng</label>
        {state && <label><input type="checkbox" checked={showPieces} onChange={e => setShowPieces(e.target.checked)} />Quân cờ</label>}
        {(showNames || showPieces || selected !== null) && <button onClick={() => {
          setShowNames(false); setShowPieces(false); setZoom(1); onSelect(-1)
        }}>Bản đồ gốc</button>}
      </div>
    </div>
    <div className={`map-viewport ${zoom > 1 ? 'is-zoomed' : ''}`}>
      <div className="board-renderer reference-map" style={{ width: `${zoom * 100}%`, aspectRatio: `${MAP_SIZE.width}/${MAP_SIZE.height}` }}>
        <img className="map-illustration" src={woodlandMap} width={MAP_SIZE.width} height={MAP_SIZE.height}
          alt="Bản đồ rừng mùa thu do bạn cung cấp: rừng thông, làng nhỏ, núi đá và sông uốn lượn."
          draggable={false} fetchPriority="high" />
        <div className="map-piece-layer" ref={host} aria-hidden="true" />
        <div className="map-region-layer" aria-label="Các vùng trên bản đồ">
          {regions.map(region => <button key={region.id}
            className={`map-region ${selected === region.id ? 'is-selected' : ''} ${showNames ? 'show-name' : ''} ${region.y > 1000 ? 'label-above' : ''}`}
            style={{ left: `${region.x / MAP_SIZE.width * 100}%`, top: `${(region.y - 32) / MAP_SIZE.height * 100}%` }}
            aria-label={`Xem ${region.name}`} aria-pressed={selected === region.id}
            onClick={() => onSelect(selected === region.id ? -1 : region.id)}>
            <span>{region.name}</span>
          </button>)}
        </div>
      </div>
    </div>
    {error && <p className="map-render-error" role="alert">{error}</p>}
  </div>
}

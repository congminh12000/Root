import { useEffect, useRef, useState } from 'react'
import { Application, Container, Ellipse, Graphics, Sprite, Text, Texture } from 'pixi.js'
import { buildLayout, PLATEAU, plotPositions, SLOT } from './map/layout'
import { paintMap } from './map/paint'
import { ACTIVE_MAP } from './map/spec'
import type { Snapshot } from './types'

const MAP = ACTIVE_MAP
const [BASE_W, BASE_H] = MAP.size
const PLOT = MAP.plotSize ?? SLOT.size

function label(text: string, x: number, y: number, size = 12, color = '#344d3f', family = 'Georgia') {
  const t = new Text({ text, style: { fontFamily: family, fontSize: size, fill: color, fontWeight: '500', letterSpacing: .4 } })
  t.anchor.set(.5)
  t.position.set(x, y)
  return t
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

export function Board({ state, selected, onSelect }: { state: Snapshot; selected: number | null; onSelect: (id: number) => void }) {
  const host = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const previousPawn = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const element = host.current
    if (!element) return
    let disposed = false
    const app = new Application()
    let observer: ResizeObserver | undefined
    const art = MAP.background ? loadImage(MAP.background) : Promise.resolve(undefined)
    void Promise.all([art, app.init({ width: BASE_W, height: BASE_H, backgroundAlpha: 0, antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, preference: 'webgl' })]).then(([image]) => {
      if (disposed) { app.destroy(true, { children: true }); return }
      element.appendChild(app.canvas)
      appRef.current = app
      const layout = buildLayout(MAP)
      const backdrop = new Sprite()
      app.stage.addChild(backdrop)
      let painted = 0, timer = 0
      // The board is painted once per display density, one texel per screen pixel, so it stays sharp.
      const paint = (width: number) => {
        const scale = Math.min(3, Math.max(1, width * Math.min(window.devicePixelRatio || 1, 2) / BASE_W))
        if (Math.abs(scale - painted) < .25) return
        painted = scale
        const previous = backdrop.texture
        backdrop.texture = Texture.from(paintMap(MAP, layout, scale, image))
        backdrop.width = BASE_W
        backdrop.height = BASE_H
        if (previous !== Texture.EMPTY) previous.destroy(true)
      }
      paint(element.clientWidth || BASE_W)
      observer = new ResizeObserver(() => {
        const width = element.clientWidth
        if (width > 0) {
          app.renderer.resize(width, width * BASE_H / BASE_W)
          app.stage.scale.set(width / BASE_W)
          window.clearTimeout(timer)
          timer = window.setTimeout(() => { if (!disposed) paint(width) }, 250)
        }
      })
      observer.observe(element)
      setReady(true)
    }).catch(() => setError('Không khởi tạo được WebGL. Bạn vẫn có thể theo dõi bảng trạng thái bên dưới.'))
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
    const layer = new Container()
    app.stage.addChild(layer)
    const lastLocation = [...state.events].reverse().find(e => e.loc !== undefined)?.loc
    let pulse: Graphics | null = null
    state.clearings.forEach(c => {
      const g = new Graphics()
      if (selected === c.id || lastLocation === c.id) {
        g.ellipse(c.x, c.y + 4, PLATEAU.rx + 12, PLATEAU.ry + 11).fill({ color: 0xf8e7a8, alpha: .14 })
          .stroke({ color: 0xf3d27a, alpha: .9, width: 3 })
        if (lastLocation === c.id) pulse = g
      }
      layer.addChild(g)
      const hit = new Container()
      hit.hitArea = new Ellipse(c.x, c.y, PLATEAU.rx + 4, PLATEAU.ry + 6)
      hit.eventMode = 'static'
      hit.cursor = 'pointer'
      hit.on('pointertap', () => onSelect(c.id))
      layer.addChild(hit)
      const armies = c.warriors.map((n, i) => ({ n, i })).filter(x => x.n)
      armies.forEach(({ n, i }, j) => {
        const x = c.x + (j - (armies.length - 1) / 2) * 27, y = c.y - 6
        const token = new Graphics().ellipse(x + 3, y + 15, 12, 4).fill({ color: 0x141a10, alpha: .4 })
          .roundRect(x - 12, y - 11, 24, 26, 6).fill({ color: state.players[i].color })
          .stroke({ color: 0xfff7df, width: 1.5 })
        token.circle(x, y - 16, 5).fill({ color: state.players[i].color }).stroke({ color: 0xfff7df, width: 1.3 })
        layer.addChild(token)
        layer.addChild(label(String(n), x, y + 3, 12, '#fff8e8', 'monospace'))
      })
      // Buildings sit on the painted slots; other markers stack on the plateau's left rim.
      const plots = plotPositions(MAP.clearings[c.id])
      c.buildings.forEach((b, k) => {
        const [x, y] = plots[k], half = PLOT / 2 - 2
        layer.addChild(new Graphics().roundRect(x - half, y - half, half * 2, half * 2, 3)
          .fill({ color: state.players[b.player].color }).stroke({ color: 0xfff7df, width: 1.4 }))
        layer.addChild(label(b.kind === 'roost' ? '⌂' : b.kind === 'base' ? '⚑' : b.kind === 'mill' ? '✳' : b.kind === 'workshop' ? '⚒' : '▥',
          x, y, 12, '#fff8e8'))
      })
      // A ruin fills the last plot until it is explored; buildings fill plots from the first, so they never meet.
      if (c.ruin) {
        const [x, y] = plots[plots.length - 1], half = PLOT / 2 - 2
        layer.addChild(new Graphics().roundRect(x - half, y - half, half * 2, half * 2, 3).fill(0x8f8a76).stroke({ color: 0x2a271f, width: 1.6 })
          .rect(x - half + 3, y - half + 3, half * 2 - 6, 5).fill(0xb3ad97).rect(x - half + 3, y - half + 8, 5, half * 2 - 11).fill(0xb3ad97)
          .moveTo(x + 2, y - 8).lineTo(x + 2, y + 10).moveTo(x - 4, y - 5).lineTo(x + 2, y + 1).lineTo(x + 8, y - 5)
          .moveTo(x - 4, y + 9).lineTo(x + 2, y + 4).lineTo(x + 8, y + 9).stroke({ color: 0x8ff0dc, width: 2.2, cap: 'round' }))
      }
      const markers = [...(c.keep ? [{ color: '#bf704b', char: '♜' }] : []), ...(c.sympathy ? [{ color: '#87944e', char: '❧' }] : []),
        ...(c.wood ? [{ color: '#8f724c', char: `${c.wood}w` }] : [])]
      markers.forEach((m, j) => {
        const x = c.x - PLATEAU.rx - 2, y = c.y - 12 + j * 17
        layer.addChild(new Graphics().circle(x + 1.5, y + 2, 8).fill({ color: 0x141a10, alpha: .35 })
          .circle(x, y, 8).fill(0xf2e8cb).stroke({ color: 0x2a271f, width: 1, alpha: .6 }))
        layer.addChild(label(m.char, x, y, m.char.length > 1 ? 8 : 11, m.color))
      })
    })
    const ranger = state.players.find(p => p.faction === 'ranger')!
    const pos = state.clearings[ranger.position]
    const target = pos ? { x: pos.x + 47, y: pos.y - 27 } : { x: 225, y: 210 + (-ranger.position - 1) * 30 }
    const pawn = new Graphics().circle(0, -12, 7).fill(ranger.color).stroke({ color: 0xfff5e2, width: 2 })
      .poly([0, -5, -10, 14, 10, 14]).fill(ranger.color).stroke({ color: 0xfff5e2, width: 2 })
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    pawn.position.copyFrom(previousPawn.current || target)
    if (reduced) pawn.position.copyFrom(target)
    previousPawn.current = target
    layer.addChild(pawn)
    let elapsed = 0
    const animate = () => {
      elapsed += app.ticker.deltaMS
      const f = Math.min(1, app.ticker.deltaMS / 100)
      pawn.x += (target.x - pawn.x) * f
      pawn.y += (target.y - pawn.y) * f
      if (pulse && !reduced) pulse.alpha = .8 + Math.sin(elapsed / 500) * .2
    }
    app.ticker.add(animate)
    return () => {
      // React can run the application's cleanup before this layer's cleanup.
      app.ticker?.remove(animate)
      if (!layer.destroyed) layer.destroy({ children: true })
    }
  }, [state, ready, selected, onSelect])

  return <div className="board-renderer">
    <div ref={host} role="img" aria-label={`Bản đồ ${MAP.clearings.length} vùng. Bảng vùng bên dưới cung cấp dữ liệu tương đương.`} />
    {error && <p role="alert">{error}</p>}
  </div>
}

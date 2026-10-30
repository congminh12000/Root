import { useEffect, useRef, useState } from 'react'
import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js'
import mapArt from './assets/lowlands.webp'
import type { Clearing, Snapshot } from './types'

const SUIT_COLORS: Record<string, number> = { fox: 0xb96f48, rabbit: 0xb5a35d, mouse: 0x708f9c }
const BASE_W = 1311, BASE_H = 1200

function label(text: string, x: number, y: number, size = 12, color = '#344d3f', family = 'Georgia') {
  const t = new Text({ text, style: { fontFamily: family, fontSize: size, fill: color, fontWeight: '500', letterSpacing: .4 } })
  t.anchor.set(.5)
  t.position.set(x, y)
  return t
}

async function landscape(stage: Container) {
  // User-supplied map art; clearing coordinates in content.py are pixels of this image.
  const art = new Sprite(await Assets.load<Texture>(mapArt))
  art.width = BASE_W
  art.height = BASE_H
  stage.addChild(art)
}

function forestCenter(clearings: Clearing[], forest: number[] | undefined) {
  if (!forest?.length) return { x: BASE_W / 2, y: BASE_H / 2 }
  const at = forest.map(id => clearings[id])
  return { x: at.reduce((n, c) => n + c.x, 0) / at.length, y: at.reduce((n, c) => n + c.y, 0) / at.length }
}

export function Board({ state, selected, onSelect, forests }: { state: Snapshot; selected: number | null; onSelect: (id: number) => void; forests: number[][] }) {
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
    const start = async () => {
      await app.init({ width: BASE_W, height: BASE_H, backgroundAlpha: 0, antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, preference: 'webgl' })
      if (!disposed) await landscape(app.stage)
      if (disposed) { app.destroy(true, { children: true }); return }
      element.appendChild(app.canvas)
      appRef.current = app
      observer = new ResizeObserver(() => {
        const width = element.clientWidth
        if (width > 0) {
          app.renderer.resize(width, width * BASE_H / BASE_W)
          app.stage.scale.set(width / BASE_W)
        }
      })
      observer.observe(element)
      setReady(true)
    }
    start().catch(() => setError('Không khởi tạo được WebGL. Bạn vẫn có thể theo dõi bảng trạng thái bên dưới.'))
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
        g.ellipse(c.x, c.y + 3, 77, 57).fill({ color: 0xf8edbc, alpha: .3 })
        g.ellipse(c.x, c.y + 3, 76, 56).stroke({ color: 0x9c7f40, alpha: .5, width: 1.5 })
        if (lastLocation === c.id) pulse = g
      }
      g.ellipse(c.x, c.y + 2, 65, 43).fill({ color: 0xf3eedb, alpha: .28 }).stroke({ color: 0xfff7df, width: 2, alpha: .85 })
      g.circle(c.x, c.y - 40, 10).fill(SUIT_COLORS[c.suit]).stroke({ color: 0xf3eedb, width: 2 })
      g.eventMode = 'static'
      g.cursor = 'pointer'
      g.on('pointertap', () => onSelect(c.id))
      layer.addChild(g)
      layer.addChild(label(c.suit === 'fox' ? '◆' : c.suit === 'rabbit' ? '✦' : '●', c.x, c.y - 40, 11, '#fff8e7'))
      const armies = c.warriors.map((n, i) => ({ n, i })).filter(x => x.n)
      armies.forEach(({ n, i }, j) => {
        const x = c.x + (j - (armies.length - 1) / 2) * 27
        const token = new Graphics().roundRect(x - 12, c.y - 11, 24, 26, 6).fill({ color: state.players[i].color })
          .stroke({ color: 0xfff7df, width: 1.5 })
        token.circle(x, c.y - 16, 5).fill({ color: state.players[i].color }).stroke({ color: 0xfff7df, width: 1.3 })
        layer.addChild(token)
        layer.addChild(label(String(n), x, c.y + 3, 12, '#fff8e8', 'monospace'))
      })
      const symbols = [...c.buildings.map(b => ({ color: state.players[b.player].color, char: b.kind === 'roost' ? '⌂' : b.kind === 'base' ? '⚑' : b.kind === 'mill' ? '✳' : b.kind === 'workshop' ? '⚒' : '▥' })),
        ...(c.keep ? [{ color: '#bf704b', char: '♜' }] : []), ...(c.sympathy ? [{ color: '#87944e', char: '❧' }] : []),
        ...(c.wood ? [{ color: '#8f724c', char: `${c.wood}w` }] : []), ...(c.ruin ? [{ color: '#9b987e', char: '◇' }] : [])]
      symbols.forEach((s, j) => {
        const x = c.x + (j - (symbols.length - 1) / 2) * 21
        layer.addChild(new Graphics().circle(x, c.y + 28, 10).fill({ color: 0xfff7df, alpha: .9 }))
        layer.addChild(label(s.char, x, c.y + 28, 14, s.color))
      })
      const name = label(c.name.toUpperCase(), c.x, c.y + 59, 11, '#fff8e7', 'monospace')
      layer.addChild(new Graphics().roundRect(c.x - name.width / 2 - 6, c.y + 50, name.width + 12, 18, 5)
        .fill({ color: 0x24301f, alpha: .72 }))
      layer.addChild(name)
    })
    const ranger = state.players.find(p => p.faction === 'ranger')!
    const pos = state.clearings[ranger.position]
    const target = pos ? { x: pos.x + 47, y: pos.y - 27 } : forestCenter(state.clearings, forests[-ranger.position - 1])
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
  }, [state, ready, selected, onSelect, forests])

  return <div className="board-renderer">
    <div ref={host} role="img" aria-label="Bản đồ 12 vùng theo ảnh bản đồ rừng mùa thu. Bảng vùng bên dưới cung cấp dữ liệu tương đương." />
    {error && <p role="alert">{error}</p>}
  </div>
}

import { useEffect, useRef, useState } from 'react'
import { Application, Container, Graphics, Text } from 'pixi.js'
import type { Clearing, Snapshot } from './types'

const SUIT_COLORS: Record<string, number> = { fox: 0xb96f48, rabbit: 0xb5a35d, mouse: 0x708f9c }
const BASE_W = 960, BASE_H = 755

function label(text: string, x: number, y: number, size = 12, color = '#344d3f', family = 'Georgia') {
  const t = new Text({ text, style: { fontFamily: family, fontSize: size, fill: color, fontWeight: '500', letterSpacing: .4 } })
  t.anchor.set(.5)
  t.position.set(x, y)
  return t
}

function random(seed: number) {
  let n = seed
  return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296 }
}

function tree(stage: Container, x: number, y: number, r: number, variant: number) {
  const g = new Graphics()
  g.ellipse(x + 3, y + r * .6, r * .8, r * .35).fill({ color: 0x2f4936, alpha: .07 })
  g.moveTo(x, y + r).lineTo(x, y - r * .3).stroke({ color: 0x6b7754, width: 1.8, alpha: .6 })
  if (variant > .5) {
    g.poly([x, y - r, x - r * .65, y + r * .35, x + r * .65, y + r * .35]).fill({ color: 0x7f9774, alpha: .65 })
    g.poly([x, y - r * 1.3, x - r * .48, y - r * .15, x + r * .48, y - r * .15]).fill({ color: 0x6b8567, alpha: .65 })
  } else {
    g.circle(x - r * .32, y - r * .15, r * .6).circle(x + r * .35, y - r * .1, r * .65)
      .circle(x, y - r * .55, r * .7).fill({ color: variant > .25 ? 0x8ca17a : 0xa3ad7b, alpha: .65 })
  }
  stage.addChild(g)
}

function landscape(stage: Container, clearings: Clearing[]) {
  const bg = new Graphics().rect(0, 0, BASE_W, BASE_H).fill(0xe2e5cc)
  stage.addChild(bg)
  const land = new Graphics()
  land.poly([0, 0, 380, 0, 290, 140, 120, 220, 0, 210]).fill({ color: 0xc0cea9, alpha: .45 })
  land.poly([650, 0, 960, 0, 960, 480, 830, 430, 740, 210]).fill({ color: 0xb4c8aa, alpha: .4 })
  land.poly([0, 470, 230, 390, 390, 590, 670, 750, 0, 755]).fill({ color: 0xc4cea5, alpha: .5 })
  // Original river and contour strokes; all generated locally.
  for (let i = 0; i < 5; i++) {
    land.moveTo(-60, 220 + i * 8).bezierCurveTo(130, 150 + i * 12, 70, 400 + i * 8, 300, 360 + i * 8)
      .bezierCurveTo(500, 330 + i * 9, 500, 570 + i * 7, 1000, 480 + i * 8)
      .stroke({ color: i === 0 ? 0xb5c8bc : 0xc6d4c2, width: i === 0 ? 43 : 2, alpha: .7 })
  }
  land.moveTo(-60, 218).bezierCurveTo(130, 150, 70, 400, 300, 360).bezierCurveTo(500, 330, 500, 570, 1000, 480)
    .stroke({ color: 0x93b7b5, width: 30, alpha: .52 })
  stage.addChild(land)
  const rng = random(1984)
  for (let i = 0; i < 650; i++) {
    const x = rng() * BASE_W, y = rng() * BASE_H
    if (!clearings.some(c => Math.hypot(c.x - x, (c.y - y) * 1.15) < 85)) tree(stage, x, y, 8 + rng() * 10, rng())
  }
  const roads = new Graphics()
  clearings.forEach(c => c.paths.filter(id => id > c.id).forEach(id => {
    const d = clearings[id]
    const length = Math.hypot(d.x - c.x, d.y - c.y)
    for (let t = 0; t < length; t += 11) {
      const a = t / length, b = Math.min(1, (t + 5) / length)
      roads.moveTo(c.x + (d.x - c.x) * a, c.y + (d.y - c.y) * a)
        .lineTo(c.x + (d.x - c.x) * b, c.y + (d.y - c.y) * b)
        .stroke({ color: 0x9b9c7a, width: 2, alpha: .8 })
    }
  }))
  stage.addChild(roads)
  stage.addChild(label('N', 905, 55, 13, '#60765b'))
  const compass = new Graphics().poly([905, 68, 900, 88, 905, 82, 910, 88]).fill(0x60765b)
  stage.addChild(compass)
  stage.addChild(label('THE LOWLANDS', 480, 716, 15, '#52694c'))
  stage.addChild(label('AN ORIGINAL EXPERIMENTAL MAP', 480, 736, 8, '#687c60', 'monospace'))
}

export function Board({ state, selected, onSelect }: { state: Snapshot; selected: number | null; onSelect: (id: number) => void }) {
  const host = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const previousPawn = useRef<{ x: number; y: number } | null>(null)
  const clearingsRef = useRef(state.clearings)

  useEffect(() => {
    const element = host.current
    if (!element) return
    let disposed = false
    const app = new Application()
    let observer: ResizeObserver | undefined
    void app.init({ width: BASE_W, height: BASE_H, backgroundAlpha: 0, antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, preference: 'webgl' }).then(() => {
      if (disposed) { app.destroy(true, { children: true }); return }
      element.appendChild(app.canvas)
      appRef.current = app
      landscape(app.stage, clearingsRef.current)
      observer = new ResizeObserver(() => {
        const width = element.clientWidth
        if (width > 0) {
          app.renderer.resize(width, width * BASE_H / BASE_W)
          app.stage.scale.set(width / BASE_W)
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
        g.ellipse(c.x, c.y + 3, 77, 57).fill({ color: 0xf8edbc, alpha: .3 })
        g.ellipse(c.x, c.y + 3, 76, 56).stroke({ color: 0x9c7f40, alpha: .5, width: 1.5 })
        if (lastLocation === c.id) pulse = g
      }
      g.ellipse(c.x + 3, c.y + 9, 65, 43).fill({ color: 0x304d33, alpha: .12 })
      g.ellipse(c.x, c.y + 2, 65, 43).fill(0xf3eedb).stroke({ color: 0xbbbea0, width: 1.5 })
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
        layer.addChild(label(s.char, x, c.y + 28, 14, s.color))
      })
      layer.addChild(label(c.name.toUpperCase(), c.x, c.y + 59, 9, '#3c5140', 'monospace'))
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
    <div ref={host} role="img" aria-label="Bản đồ 12 vùng. Bảng vùng bên dưới cung cấp dữ liệu tương đương." />
    {error && <p role="alert">{error}</p>}
  </div>
}

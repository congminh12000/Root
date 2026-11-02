import type { FactionId } from '@root/game-engine'

/**
 * Design tokens: the only place colours, type, spacing and motion are written down (docs/07-ui/style-guide.md).
 * CSS reads them as variables (`installTokens`), three.js and SVG import them directly. test/tokens.test.ts fails on
 * any colour literal elsewhere in the client.
 */

/** The palette of the style reference, named by role (style-guide §2). */
export const color = {
  ink: '#2a2118',
  inkSoft: '#6b5d45',
  paper: '#f4ecd8',
  paperRaised: '#fffaf0',
  paperShade: '#e8dcc0',
  meadow: '#8f9a4c',
  meadowLight: '#aeb063',
  pine: '#244232',
  pineLight: '#3d6b48',
  path: '#c9a66b',
  pathEdge: '#9c7a45',
  water: '#3f86c6',
  waterShallow: '#7cb8de',
  rock: '#8d8a82',
  wood: '#7a5232',
  woodLight: '#93653f',
  autumnOrange: '#e0662b',
  autumnGold: '#e9b23a',
  roofRed: '#b84a32',
  roofBlue: '#3b4f73',
  white: '#ffffff',
} as const

/** Faction colours; every faction also has its own icon and piece shape (style-guide §2). */
export const factionColor: Record<FactionId, string> = { marquise: '#d9772b', eyrie: '#2f6fd1', alliance: '#3a9e4f', vagabond: '#6b6b6b' }
/** Card and clearing suits; bird is wild on cards (§2.2.2). */
export const suitColor = { fox: '#d6453d', rabbit: '#e8c33a', mouse: '#e98a3c', bird: '#7cb2d8' } as const

export const font = {
  display: "'Pangolin', 'Be Vietnam Pro', system-ui, sans-serif",
  body: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
} as const
/** Type scale in px (style-guide §5). */
export const fontSize = { xs: 12, sm: 14, md: 16, lg: 20, xl: 28 } as const
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32 } as const
export const radius = { sm: 6, md: 10, lg: 14, pill: 999 } as const
/** Soft contact shadows, as paper and wood lying on a table in the late-afternoon light (style-guide §6). */
export const shadow = {
  card: `0 1px 1px ${alpha(color.ink, 0.22)}, 0 4px 10px ${alpha(color.ink, 0.16)}`,
  raised: `0 2px 3px ${alpha(color.ink, 0.24)}, 0 14px 30px ${alpha(color.ink, 0.24)}`,
  pressed: `inset 0 2px 0 ${alpha(color.ink, 0.25)}`,
  die: `inset 0 -4px 0 ${alpha(color.ink, 0.3)}`,
} as const
/**
 * The tabletop look (style-guide §3–4): late-afternoon light on a model board, then the photo treatment. Colours are
 * linear-free hex like the palette; numbers are what the renderer and the post-processing shaders read.
 */
export const light = {
  sun: '#ffd29a',
  sky: '#fff1d8',
  ground: '#3a2a1a',
  /** Sun intensity and direction (from the upper left, low enough for long soft shadows). */
  sunIntensity: 4.2, sunAt: [-22, 17, -12] as const,
  skyIntensity: .9, envIntensity: .45, exposure: 1.05,
  /** Far apron fades into warm haze (world units from the camera). */
  fogNear: 70, fogFar: 150, fogMix: .25,
} as const
export const grade = {
  /** Warm print: per-channel gain, then saturation. */
  warm: [1.06, 1, .9] as const, saturation: 1.12,
  /** Vignette: brightness left at the corners, and where it starts. */
  vignette: .62, vignetteFrom: .35,
  grain: .025,
  /** Tilt-shift blur in px at zoom 1, more per zoom step, never above `tiltMax` so pieces and labels stay readable. */
  tiltBase: 1.2, tiltPerZoom: .9, tiltMax: 5,
} as const
/**
 * Paper fibre and wood grain for the HTML surfaces (style-guide §6): seeded SVG noise, tinted by alpha only, laid
 * over a panel's own colour. No image files, nothing downloaded.
 */
function noiseUrl(frequency: string, octaves: number, tint: [number, number, number], strength: number, size: number): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='${frequency}' numOctaves='${octaves}' seed='7' stitchTiles='stitch'/>`
    + `<feColorMatrix values='0 0 0 0 ${tint[0]} 0 0 0 0 ${tint[1]} 0 0 0 0 ${tint[2]} ${strength} 0 0 0 0'/></filter><rect width='100%' height='100%' filter='url(%23g)'/></svg>`
  return `url("data:image/svg+xml,${svg.replace(/</g, '%3C').replace(/>/g, '%3E')}")`
}
export const grain = {
  paper: noiseUrl('.85', 3, [.42, .33, .22], .2, 220),
  wood: noiseUrl('.012 .35', 3, [.25, .15, .08], .45, 260),
}
/** Durations in ms (style-guide §7). */
export const motion = { dialog: 180, card: 240, dice: 700, travel: 750, pop: 380, pulse: 1200, bump: 600 } as const

/** `#rrggbb` at an opacity, as an rgba() string. */
export function alpha(hex: string, a: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

const kebab = (s: string) => s.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)

/** Every token as a CSS custom property, e.g. `--ink`, `--faction-eyrie`, `--fs-md`, `--motion-pop`. */
export function cssVariables(): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const [k, v] of Object.entries(color)) vars[`--${kebab(k)}`] = v
  for (const [k, v] of Object.entries(factionColor)) vars[`--faction-${k}`] = v
  for (const [k, v] of Object.entries(suitColor)) vars[`--suit-${k}`] = v
  vars['--ink-a10'] = alpha(color.ink, 0.1)
  vars['--ink-a25'] = alpha(color.ink, 0.25)
  vars['--ink-a85'] = alpha(color.ink, 0.85)
  vars['--paper-a96'] = alpha(color.paperRaised, 0.96)
  vars['--gold-a35'] = alpha(color.autumnGold, 0.35)
  vars['--white-a30'] = alpha(color.white, 0.3)
  vars['--grain-paper'] = grain.paper
  vars['--grain-wood'] = grain.wood
  for (const [k, v] of Object.entries(font)) vars[`--font-${k}`] = v
  for (const [k, v] of Object.entries(fontSize)) vars[`--fs-${k}`] = `${v}px`
  for (const [k, v] of Object.entries(space)) vars[`--sp-${k}`] = `${v}px`
  for (const [k, v] of Object.entries(radius)) vars[`--r-${k}`] = `${v}px`
  for (const [k, v] of Object.entries(shadow)) vars[`--shadow-${k}`] = v
  for (const [k, v] of Object.entries(motion)) vars[`--motion-${k}`] = `${v}ms`
  return vars
}

/** Puts the tokens on `:root` before anything renders. */
export function installTokens(doc: Document = document) {
  const style = doc.createElement('style')
  style.dataset.tokens = ''
  style.textContent = `:root{${Object.entries(cssVariables()).map(([k, v]) => `${k}:${v}`).join(';')}}`
  doc.head.prepend(style)
}

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
/** Offset "printed" shadows in ink, never soft grey glows (style-guide §6). */
export const shadow = {
  card: `0 3px 0 ${alpha(color.ink, 0.2)}`,
  raised: `0 6px 0 ${alpha(color.ink, 0.18)}, 0 10px 24px ${alpha(color.ink, 0.18)}`,
  pressed: `inset 0 2px 0 ${alpha(color.ink, 0.25)}`,
  die: `inset 0 -4px 0 ${alpha(color.ink, 0.3)}`,
} as const
/** Durations in ms (style-guide §7). */
export const motion = { dialog: 180, dice: 700, travel: 750, pop: 380, pulse: 1200, bump: 600 } as const

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

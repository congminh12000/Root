import { html } from 'htm/preact'
import { useMemo } from 'preact/hooks'
import { color, suitColor } from './tokens.ts'

/**
 * The suit badge (docs/07-ui/style-guide.md §3): a disc in the suit colour inside a paper ring, with the animal as a
 * solid ink silhouette whose eyes are cut through to the disc. Our own drawings (licensing.md), not the printed suit
 * marks. Clearings are fox, rabbit or mouse (§2.2); bird is the wild card suit (§2.2.2) and
 * only appears on cards. One SVG string serves the HTML (`SuitBadge`) and the map's canvas sprites (board/toon.ts).
 */
export type BadgeSuit = keyof typeof suitColor

const INK = `fill="${color.ink}"`
const eye = (suit: BadgeSuit) => `fill="${suitColor[suit]}"`

/** `a` mixed toward `b` by `t` (0–1), as #rrggbb: the ring is the suit colour washed out toward paper. */
function mix(a: string, b: string, t: number): string {
  const ch = (h: string, i: number) => Number.parseInt(h.slice(1 + i * 2, 3 + i * 2), 16)
  return `#${[0, 1, 2].map(i => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t).toString(16).padStart(2, '0')).join('')}`
}
const pale = (suit: BadgeSuit, t = .72) => mix(suitColor[suit], color.paperRaised, t)

/** The animals on a 48×48 grid; the badge shrinks them so they keep clear of the ring. */
const GLYPH: Record<BadgeSuit, string> = {
  fox: `<path ${INK} d="M11 8 L18.5 15.5 L21 13.6 L24 16 L27 13.6 L29.5 15.5 L37 8 L36.2 19.5 L40.2 23.6 L35.2 25.2 L37.6 29 L31.6 29.6 L24 39 L16.4 29.6 L10.4 29 L12.8 25.2 L7.8 23.6 L11.8 19.5 Z"/>
    <path ${eye('fox')} d="M16.2 21.8 L22.6 24.6 L17.6 26.3 Z M31.8 21.8 L25.4 24.6 L30.4 26.3 Z"/>`,
  rabbit: `<rect ${INK} x="16.6" y="5.6" width="6" height="19.5" rx="3"/><rect ${INK} x="25.4" y="5.6" width="6" height="19.5" rx="3"/>
    <circle ${INK} cx="24" cy="29.2" r="10.2"/>
    <ellipse ${eye('rabbit')} cx="20.2" cy="28" rx="1.9" ry="2.7"/><ellipse ${eye('rabbit')} cx="27.8" cy="28" rx="1.9" ry="2.7"/>`,
  mouse: `<circle ${INK} cx="14" cy="16.4" r="7.6"/><circle ${INK} cx="34" cy="16.4" r="7.6"/>
    <path ${INK} d="M13.2 25.6 C13.2 19.4 18.2 16.6 24 16.6 C29.8 16.6 34.8 19.4 34.8 25.6 C34.8 31.6 28.8 37.2 24 38.4 C19.2 37.2 13.2 31.6 13.2 25.6 Z"/>
    <circle ${eye('mouse')} cx="19.8" cy="25.6" r="2.1"/><circle ${eye('mouse')} cx="28.2" cy="25.6" r="2.1"/><path ${eye('mouse')} d="M22.6 31 H25.4 L24 32.8 Z"/>
    <path fill="none" stroke="${color.ink}" stroke-width="1.4" stroke-linecap="round" d="M16.4 30.6 L7.6 28.8 M16.4 32.6 L8.2 34.2 M31.6 30.6 L40.4 28.8 M31.6 32.6 L39.8 34.2"/>`,
  // A bird's face, seen from the front: crest, round head, eyes and beak cut through.
  bird: `<path ${INK} d="M24 8.5 L26.6 14.2 L30.8 10.6 L30.4 16.6 C34.6 19 36.4 23.2 35.6 27.6 L39.6 30.2 L34.2 31.6 C32 35.6 28.2 37.8 24 37.8 C19.8 37.8 16 35.6 13.8 31.6 L8.4 30.2 L12.4 27.6 C11.6 23.2 13.4 19 17.6 16.6 L17.2 10.6 L21.4 14.2 Z"/>
    <path ${eye('bird')} d="M16.6 23.4 Q19.6 21.4 22 24.2 Q19.4 26.2 16.6 23.4 Z M31.4 23.4 Q28.4 21.4 26 24.2 Q28.6 26.2 31.4 23.4 Z"/>
    <path ${eye('bird')} d="M24 26.4 L27.4 29.4 L24 35 L20.6 29.4 Z"/><path fill="none" stroke="${color.ink}" stroke-width="1" d="M20.6 29.4 H27.4"/>`,
}

const RING_R = 20.9

const ring = (suit: BadgeSuit) => `<circle cx="24" cy="24" r="${RING_R}" fill="none" stroke="${pale(suit)}" stroke-width="4.4"/>`

let uid = 0
/** The whole badge as standalone SVG markup, `px` wide; its gradient and clip ids are unique to this copy. */
export function suitBadgeSvg(suit: BadgeSuit, px = 48): string {
  const id = `${suit}-${++uid}`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="${px}" height="${px}" aria-hidden="true">
    <defs><radialGradient id="sb-${id}" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="${color.white}" stop-opacity=".22"/><stop offset=".65" stop-color="${color.white}" stop-opacity="0"/><stop offset="1" stop-color="${color.ink}" stop-opacity=".16"/></radialGradient><clipPath id="sbc-${id}"><circle cx="24" cy="24" r="18.7"/></clipPath></defs>
    <circle cx="24" cy="24" r="23.8" fill="${color.ink}" fill-opacity=".75"/>
    ${ring(suit)}
    <circle cx="24" cy="24" r="18.7" fill="${suitColor[suit]}"/>
    <circle cx="24" cy="24" r="18.7" fill="url(#sb-${id})"/>
    <g clip-path="url(#sbc-${id})"><g transform="translate(24 24) scale(.74) translate(-24 -24)">${GLYPH[suit]}</g></g>
    <circle cx="24" cy="24" r="18.7" fill="none" stroke="${color.ink}" stroke-width=".8" stroke-opacity=".35"/>
  </svg>`
}

/** `suitBadgeSvg` as a data URL, for canvas drawing and CSS backgrounds. */
export const suitBadgeUrl = (suit: BadgeSuit) => `data:image/svg+xml,${encodeURIComponent(suitBadgeSvg(suit, 128))}`

/**
 * The badge in the interface, sized by CSS (`.suit-badge`); with `label` it is announced to screen readers. Each copy
 * keeps its own ids, so a badge still draws when an earlier one sits in a hidden drawer.
 */
export function SuitBadge({ suit, label }: { suit: BadgeSuit; label?: string }) {
  const svg = useMemo(() => suitBadgeSvg(suit), [suit])
  return label
    ? html`<span class="suit-badge" role="img" aria-label=${label} title=${label} dangerouslySetInnerHTML=${{ __html: svg }}></span>`
    : html`<span class="suit-badge" aria-hidden="true" dangerouslySetInnerHTML=${{ __html: svg }}></span>`
}

/**
 * Our own icons (no official art, licensing.md), drawn on a 24×24 grid in the ink style of style-guide §3: a flat
 * fill (`--icon-fill`, else the text colour) with an ink outline. One hidden SVG sprite holds them all.
 */

export type IconName =
  | 'marquise' | 'eyrie' | 'alliance' | 'vagabond'
  | 'fox' | 'rabbit' | 'mouse' | 'bird'
  | 'close' | 'dice' | 'clock' | 'star' | 'card'

const F = 'style="fill:var(--icon-fill,currentColor);stroke:var(--ink);stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round"'
const INK = 'style="fill:var(--ink)"'
const LINE = 'style="fill:none;stroke:var(--ink);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round"'

const SHAPES: Record<IconName, string> = {
  // Factions: a head or emblem each, so they read without colour.
  marquise: `<path ${F} d="M5 10 L5.5 3.5 L10 7.5 H14 L18.5 3.5 L19 10 C20 15 16.5 19.5 12 19.5 C7.5 19.5 4 15 5 10 Z"/>
    <circle ${INK} cx="9.3" cy="12" r="1.1"/><circle ${INK} cx="14.7" cy="12" r="1.1"/><path ${LINE} d="M11 15 L12 15.8 L13 15"/>`,
  eyrie: `<path ${F} d="M5.5 19 C3.5 13 5.5 6 12 5 C16 4.4 18.3 6.8 18.4 9.2 L22 11.2 L18 12.6 C17.3 16.5 14.3 19 10.5 19 Z"/>
    <circle ${INK} cx="14.2" cy="9.6" r="1.1"/>`,
  alliance: `<path ${LINE} d="M6 3 V21"/><path ${F} d="M6.5 4.5 C10 2.5 13.5 6.5 18.5 4.5 V12.5 C13.5 14.5 10 10.5 6.5 12.5 Z"/>`,
  vagabond: `<path ${F} d="M12 3 C8 3 6.2 6.8 6.2 10.8 L4.5 20.5 H19.5 L17.8 10.8 C17.8 6.8 16 3 12 3 Z"/>
    <ellipse ${INK} cx="12" cy="10.5" rx="3.2" ry="3.6"/>`,
  // Suits: animal faces.
  fox: `<path ${F} d="M3.5 4.5 L9 9 H15 L20.5 4.5 L18.5 13 L12 20 L5.5 13 Z"/>
    <circle ${INK} cx="9.4" cy="12.2" r="1"/><circle ${INK} cx="14.6" cy="12.2" r="1"/><circle ${INK} cx="12" cy="17.6" r="1"/>`,
  rabbit: `<ellipse ${F} cx="9" cy="6.5" rx="2.2" ry="5"/><ellipse ${F} cx="15" cy="6.5" rx="2.2" ry="5"/>
    <circle ${F} cx="12" cy="15" r="5.8"/><circle ${INK} cx="9.8" cy="14.4" r="1"/><circle ${INK} cx="14.2" cy="14.4" r="1"/>`,
  mouse: `<circle ${F} cx="6.5" cy="8" r="4"/><circle ${F} cx="17.5" cy="8" r="4"/><ellipse ${F} cx="12" cy="14.5" rx="6.5" ry="5.8"/>
    <circle ${INK} cx="9.6" cy="13.6" r="1"/><circle ${INK} cx="14.4" cy="13.6" r="1"/><circle ${INK} cx="12" cy="17" r="1.1"/>`,
  bird: `<path ${F} d="M3 13.5 C5.5 8.5 10.5 7.2 14.8 9 L21 7 L18.2 11.2 C18.2 16 13.6 19.2 8.8 18.4 C5.4 17.8 3 15.8 3 13.5 Z"/>
    <path ${LINE} d="M8 13.5 C10 15 12.5 15 14.5 13.5"/><circle ${INK} cx="15.6" cy="10.8" r="0.9"/>`,
  // Interface.
  close: `<path ${LINE} d="M6 6 L18 18 M18 6 L6 18"/>`,
  dice: `<rect ${F} x="4" y="4" width="16" height="16" rx="3.5"/><circle ${INK} cx="9" cy="9" r="1.4"/><circle ${INK} cx="15" cy="15" r="1.4"/><circle ${INK} cx="12" cy="12" r="1.4"/>`,
  clock: `<circle ${F} cx="12" cy="12" r="8.5"/><path ${LINE} d="M12 7.5 V12 L15 14"/>`,
  star: `<path ${F} d="M12 3 L14.6 8.6 L20.6 9.3 L16.1 13.4 L17.4 19.4 L12 16.4 L6.6 19.4 L7.9 13.4 L3.4 9.3 L9.4 8.6 Z"/>`,
  card: `<rect ${F} x="6" y="3" width="12" height="18" rx="2"/><path ${LINE} d="M9 8 H15 M9 11.5 H15 M9 15 H13"/>`,
}

export const ICONS = Object.keys(SHAPES) as IconName[]

/** The hidden sprite every `icon()` points into. */
export function iconSprite(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">${ICONS
    .map(n => `<symbol id="i-${n}" viewBox="0 0 24 24">${SHAPES[n]}</symbol>`).join('')}</svg>`
}

export function installIcons(doc: Document = document) {
  if (doc.getElementById('i-close')) return
  doc.body.insertAdjacentHTML('afterbegin', iconSprite())
}

/** An icon; with `label` it is announced to screen readers, otherwise it is decoration. */
export function icon(name: IconName, label?: string): string {
  const a11y = label ? `role="img" aria-label="${label.replace(/"/g, '&quot;')}"` : 'aria-hidden="true"'
  return `<svg class="icon" ${a11y}><use href="#i-${name}"/></svg>`
}

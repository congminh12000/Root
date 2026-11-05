import { color } from './tokens.ts'

/**
 * Our own icons (no official art, licensing.md), drawn on a 24×24 grid in the ink style of style-guide §3: a flat
 * fill (`--icon-fill`, else the text colour) with an ink outline. One hidden SVG sprite holds them all.
 */

export type IconName =
  | 'marquise' | 'eyrie' | 'alliance' | 'vagabond'
  | 'fox' | 'rabbit' | 'mouse' | 'bird'
  | 'close' | 'dice' | 'clock' | 'star' | 'card' | 'sun'
  | 'boots' | 'sword' | 'crossbow' | 'torch' | 'hammer' | 'tea' | 'coin' | 'bag'
  | 'saw' | 'crown' | 'eye' | 'flame' | 'shield' | 'pick' | 'mace' | 'throne' | 'scales' | 'chest' | 'horn' | 'spyglass' | 'map' | 'mask'

const F = 'style="fill:var(--icon-fill,currentColor);stroke:var(--ink);stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round"'
const INK = 'style="fill:var(--ink)"'
const FLAME = 'style="fill:var(--autumn-orange);stroke:var(--ink);stroke-width:1.6;stroke-linejoin:round"'
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
  // Daylight sun: eight short rays round a disc, for the Marquise actions-left badge (Root Digital shows a numbered sun).
  sun: `<path ${F} d="M12 1.5 L13.6 5 H10.4 Z M12 22.5 L13.6 19 H10.4 Z M1.5 12 L5 10.4 V13.6 Z M22.5 12 L19 10.4 V13.6 Z M4.6 4.6 L8.2 6 L6 8.2 Z M19.4 19.4 L15.8 18 L18 15.8 Z M19.4 4.6 L18 8.2 L15.8 6 Z M4.6 19.4 L6 15.8 L8.2 18 Z"/><circle ${F} cx="12" cy="12" r="6.2"/>`,
  card: `<rect ${F} x="6" y="3" width="12" height="18" rx="2"/><path ${LINE} d="M9 8 H15 M9 11.5 H15 M9 15 H13"/>`,
  // Vagabond items (§9.2.5): our own drawings.
  boots: `<path ${F} d="M7 3.5 H12.5 V12.5 L18.5 14.5 C20 15 20.5 16 20.5 17.5 V19.5 H5.5 V12 C6.5 9 6.8 6 7 3.5 Z"/><path ${LINE} d="M5.5 17 H20.5"/>`,
  sword: `<path ${F} d="M15.5 3.5 L20.5 3.5 L20.5 8.5 L10.5 18.5 L5.5 13.5 Z"/><path ${LINE} d="M4 12 L12 20 M6.5 17.5 L3.5 20.5"/>`,
  crossbow: `<path ${LINE} d="M4 9 C8 4 16 4 20 9"/><path ${F} d="M11 6 H13 V20 H11 Z"/><path ${LINE} d="M4 9 L12 13 L20 9 M12 3 V6"/>`,
  torch: `<path ${F} d="M10 11 H14 L13 21 H11 Z"/><path ${FLAME} d="M12 2.5 C15 5.5 16 8 14 11 H10 C8 8.5 9.5 6.5 11 6 C11 4.5 11.3 3.5 12 2.5 Z"/>`,
  hammer: `<path ${F} d="M4.5 4.5 H14.5 V9.5 H4.5 Z"/><path ${F} d="M8.5 9.5 H10.5 V20.5 H8.5 Z"/><path ${LINE} d="M14.5 6 H19"/>`,
  tea: `<path ${F} d="M4.5 9.5 H16.5 V14 C16.5 17.5 14 20 10.5 20 C7 20 4.5 17.5 4.5 14 Z"/><path ${LINE} d="M16.5 11 C19.5 11 19.5 15 16.5 15 M8 3.5 C7 5 9 6 8 7.5 M12 3.5 C11 5 13 6 12 7.5"/>`,
  coin: `<circle ${F} cx="12" cy="12" r="8.5"/><circle ${LINE} cx="12" cy="12" r="5"/>`,
  bag: `<path ${F} d="M9 4.5 H15 L13.5 8 C18 9 20 13 19.5 16.5 C19 19.5 16.5 20.5 12 20.5 C7.5 20.5 5 19.5 4.5 16.5 C4 13 6 9 10.5 8 Z"/><path ${LINE} d="M9.5 8 H14.5"/>`,
  // Card kinds and card motifs (card faces, docs/07-ui/style-guide.md §6): our own drawings.
  saw: `<path ${F} d="M3 9 H21 V13 L19.5 15.5 L18 13 L16.5 15.5 L15 13 L13.5 15.5 L12 13 L10.5 15.5 L9 13 L7.5 15.5 L6 13 L4.5 15.5 L3 13 Z"/><path ${F} d="M3 5.5 H8 V9 H3 Z"/>`,
  crown: `<path ${F} d="M3.5 8 L8 12 L12 5 L16 12 L20.5 8 L19 18.5 H5 Z"/><path ${LINE} d="M5.5 15.5 H18.5"/>`,
  eye: `<path ${F} d="M2.5 12 C6 6.5 18 6.5 21.5 12 C18 17.5 6 17.5 2.5 12 Z"/><circle ${INK} cx="12" cy="12" r="2.8"/>`,
  flame: `<path ${FLAME} d="M12 2.5 C17 7 19.5 11 18 15.5 C17 18.5 14.8 20.5 12 20.5 C9.2 20.5 7 18.5 6 15.5 C5 12.5 7 10 8.5 9 C8.8 11 9.8 12 11 12.3 C10 9 10.5 5.5 12 2.5 Z"/>`,
  shield: `<path ${F} d="M12 3 L19.5 5.5 V11 C19.5 15.5 16.5 19 12 21 C7.5 19 4.5 15.5 4.5 11 V5.5 Z"/><path ${LINE} d="M12 6 V18 M7.5 10.5 H16.5"/>`,
  pick: `<path ${F} d="M3.5 8 C8 3.5 16 3.5 20.5 8 C16 6.5 8 6.5 3.5 8 Z"/><path ${F} d="M11 6 H13 V21 H11 Z"/>`,
  mace: `<circle ${F} cx="15" cy="9" r="4.5"/><path ${LINE} d="M15 2.5 V4.5 M21.5 9 H19.5 M19.6 4.4 L18.2 5.8 M12 13 L5 20"/>`,
  throne: `<path ${F} d="M7 3.5 H17 V12 H7 Z"/><path ${F} d="M5 12 H19 V15 H5 Z"/><path ${LINE} d="M6.5 15 V21 M17.5 15 V21 M9.5 6.5 L12 5 L14.5 6.5"/>`,
  scales: `<path ${LINE} d="M12 4 V20 M8 20 H16 M5 7 H19 M5 7 L3 13 M5 7 L7 13 M19 7 L17 13 M19 7 L21 13"/><path ${F} d="M2.5 13 H7.5 C7.5 15 2.5 15 2.5 13 Z M16.5 13 H21.5 C21.5 15 16.5 15 16.5 13 Z"/>`,
  chest: `<path ${F} d="M4 10 H20 V19.5 H4 Z"/><path ${F} d="M4 10 C4 5 20 5 20 10 Z"/><path ${F} d="M10.5 11.5 H13.5 V15 H10.5 Z"/>`,
  horn: `<path ${F} d="M3.5 14.5 L5.5 10.5 C11 11 16 8 19.5 4 C21 8 20.5 15 15 18 C11 20 7 18 3.5 14.5 Z"/><path ${LINE} d="M7 12.5 L9 16.5"/>`,
  spyglass: `<path ${F} d="M3 16 L14.5 7.5 L17.5 11.5 L6 20 Z"/><path ${F} d="M14 5.5 L18 3 L21.5 7.5 L18 10.5 Z"/><path ${LINE} d="M9 13 L11 16"/>`,
  map: `<path ${F} d="M3.5 6 L9 4 L15 6 L20.5 4 V18 L15 20 L9 18 L3.5 20 Z"/><path ${LINE} d="M9 4 V18 M15 6 V20"/><path ${LINE} d="M5.5 14 C8 12 10.5 15 13 12 L17.5 9"/>`,
  mask: `<path ${F} d="M2.5 9 C6 7 18 7 21.5 9 C21.5 13.5 18 16 15 14.5 L12 13 L9 14.5 C6 16 2.5 13.5 2.5 9 Z"/><ellipse ${INK} cx="7.5" cy="10.8" rx="1.8" ry="1.2"/><ellipse ${INK} cx="16.5" cy="10.8" rx="1.8" ry="1.2"/>`,
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

/** One icon as a standalone SVG image (for canvas labels on the 3D board), filled with `fill`, outlined in ink. */
export function iconSvg(name: IconName, fill: string, size = 96): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" style="--icon-fill:${fill};--ink:${color.ink};--autumn-orange:${color.autumnOrange}">${SHAPES[name]}</svg>`
}

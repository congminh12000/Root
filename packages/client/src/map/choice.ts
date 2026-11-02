import { signal } from '@preact/signals'
import { html } from 'htm/preact'
import type { MapTheme } from './theme.ts'

/**
 * Which map this player sees (docs/07-ui/gameplay-map-only.md §5). Kept in this browser's localStorage only: never
 * sent to the server, never part of the rules. Light on purpose, so the lobby can show it without loading three.js.
 */
export type MapId = MapTheme['id']
export const MAPS: { id: MapId; name: string; note: string }[] = [
  { id: 'autumn-diorama', name: 'Autumn diorama', note: 'bản đồ minh họa, sông và hồ' },
  { id: 'classic', name: 'Bàn cổ điển', note: 'bàn 3D đơn giản, ô có vòng màu chất' },
]
const KEY = 'root-map'
const saved = (): MapId => { try { const v = localStorage.getItem(KEY); return MAPS.some(m => m.id === v) ? v as MapId : 'autumn-diorama' } catch { return 'autumn-diorama' } }

export const mapChoice = signal<MapId>(saved())
export function chooseMap(id: MapId) {
  mapChoice.value = id
  try { localStorage.setItem(KEY, id) } catch { /* private mode: this session only */ }
}

/** The theme module for a map, loaded on demand (each pulls in its own scenery). */
export const loadTheme = (id: MapId): Promise<MapTheme> => id === 'classic'
  ? import('./classic-theme.ts').then(m => m.CLASSIC_BOARD)
  : import('./autumn-theme.ts').then(m => m.AUTUMN_DIORAMA)

/** Map choice as radio buttons, for the lobby and the in-game menu. */
export function MapPicker() {
  return html`<fieldset class="map-picker"><legend>Bản đồ <small class="note">(chỉ lưu trên máy này, đổi được giữa trận trong menu ☰)</small></legend>${MAPS.map(m => html`<label key=${m.id}>
    <input type="radio" name="map" value=${m.id} checked=${mapChoice.value === m.id} onChange=${() => chooseMap(m.id)} /> <b>${m.name}</b> <small class="note">${m.note}</small></label>`)}</fieldset>`
}

import { signal } from '@preact/signals'

/**
 * "Cảnh động" (style-guide §7): trees sway and the resin water drifts. It needs a frame every 1/30 s, so it is on by
 * default only on a desktop pointer and never with reduced motion; the player's choice is kept in this browser.
 */
const KEY = 'root-live-scene'
const initial = (): boolean => {
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false
    const v = localStorage.getItem(KEY)
    return v === null ? !matchMedia('(pointer: coarse)').matches : v === '1'
  } catch { return false }
}
export const liveScene = signal<boolean>(typeof matchMedia === 'function' ? initial() : false)
export function setLiveScene(on: boolean) {
  liveScene.value = on
  try { localStorage.setItem(KEY, on ? '1' : '0') } catch { /* private mode: this session only */ }
}

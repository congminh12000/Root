/**
 * How much the map draws on this device (docs/07-ui/gameplay-map-only.md §G6, style-guide §4). A touch tablet gets
 * fewer pixels, a smaller shadow map, a thinner apron and no contact shadows, so it keeps 30 fps and opens as fast as a
 * laptop; a software renderer (no GPU) gets no post-processing at all. The board, the pieces and everything that is
 * part of play are the same at every tier.
 */
export interface Quality {
  tier: 'full' | 'tablet' | 'low'
  pixelRatio: number; shadowSize: number; apronTrees: number
  /** Photo treatment (map/post.ts): any at all, and contact shadows (GTAO) on top. */
  post: boolean; ao: boolean
}

export function qualityFor(device: { coarse: boolean; dpr: number; software?: boolean; force?: Quality['tier'] | null }): Quality {
  const tier = device.force ?? (device.software ? 'low' : device.coarse ? 'tablet' : 'full')
  if (tier === 'low') return { tier, pixelRatio: Math.min(device.dpr, 1.5), shadowSize: 1024, apronTrees: 4500, post: false, ao: false }
  if (tier === 'tablet') return { tier, pixelRatio: Math.min(device.dpr, 1.5), shadowSize: 1024, apronTrees: 4500, post: true, ao: false }
  return { tier, pixelRatio: Math.min(device.dpr, 2), shadowSize: 2048, apronTrees: 7500, post: true, ao: true }
}

const TIERS = ['full', 'tablet', 'low'] as const
/**
 * This browser's tier: a finger as the primary pointer means a tablet; a software renderer means `low`. `?quality=`
 * in the address forces a tier (review pages and tests).
 */
export function deviceQuality(gl?: WebGLRenderingContext | WebGL2RenderingContext): Quality {
  const asked = new URLSearchParams(location.search).get('quality')
  const info = gl?.getExtension('WEBGL_debug_renderer_info')
  const name = info ? String(gl!.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
  return qualityFor({
    coarse: matchMedia('(pointer: coarse)').matches, dpr: devicePixelRatio, software: /swiftshader|llvmpipe|software/i.test(name),
    force: TIERS.find(t => t === asked) ?? null,
  })
}


/** A sustained slow window lowers one tier; idle time, hidden tabs and loading are never FPS samples. */
export function frameQuality(initial: Quality['tier'], forced = false) {
  let tier = initial, last: number | null = null, elapsed = 0, frames = 0, slow = 0
  const reset = () => { last = null; elapsed = frames = slow = 0 }
  return {
    reset,
    sample(now: number, active: boolean): Quality['tier'] | null {
      if (forced || tier === 'low' || !active) { reset(); return null }
      const dt = last === null ? 0 : now - last; last = now
      // The caller resets on idle/hidden frames. Even very slow active frames must count.
      if (dt <= 0) { elapsed = frames = slow = 0; return null }
      elapsed += dt; frames++
      if (elapsed < 2000) return null
      const fps = frames * 1000 / elapsed
      slow = fps < (tier === 'full' ? 45 : 24) ? slow + 1 : 0
      elapsed = frames = 0
      if (slow < 2) return null
      tier = tier === 'full' ? 'tablet' : 'low'
      reset()
      return tier
    },
  }
}

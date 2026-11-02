import { SURFACES, surface } from './texture-gen.ts'

// Generates every tabletop surface off the main thread (board/look.ts) and hands the bytes back without copying.
self.onmessage = () => {
  const out = SURFACES.map(name => ({ name, ...surface(name) }))
  ;(self as unknown as Worker).postMessage(out, out.flatMap(s => [s.color.buffer, s.normal.buffer]))
}

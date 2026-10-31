// Dev-only page (npm run dev → /map3d.html?map=lakeside&debug=classes&labels=1): the Three.js board without a running match.
import { createMapScene, type DebugMode } from './map3d/scene'
import { MAPS } from './map/spec'

const params = new URLSearchParams(location.search)
const spec = MAPS[params.get('map') || 'lakeside']
const scene = await createMapScene(document.getElementById('map')!, spec, {
  debug: (params.get('debug') || 'none') as DebugMode,
  labels: params.has('labels'),
})
Object.assign(window, { mapScene: scene })

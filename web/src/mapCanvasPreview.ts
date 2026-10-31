// Dev-only page (npm run dev → /map-preview.html?map=lakeside&scale=2): paints a map without a running match.
import { buildLayout, validateLayout } from './map/layout'
import { paintMap } from './map/paint'
import { MAPS } from './map/spec'

const params = new URLSearchParams(location.search)
const spec = MAPS[params.get('map') || 'lakeside']
const scale = Number(params.get('scale') || 2)
const layout = buildLayout(spec)
const art = spec.background ? await new Promise<HTMLImageElement>(resolve => {
  const image = new Image()
  image.onload = () => resolve(image)
  image.src = spec.background!
}) : undefined
const canvas = paintMap(spec, layout, scale, art)
canvas.style.width = `${canvas.width / devicePixelRatio}px`
document.body.append(canvas)
const problems = validateLayout(spec, layout)
if (problems.length) {
  const note = document.createElement('p')
  note.textContent = problems.join(' · ')
  document.body.prepend(note)
}

import * as THREE from 'three'
import { color, font } from '../ui/tokens.ts'
import { iconSvg, type IconName } from '../ui/icons.ts'
import { material } from './look.ts'

/**
 * Shared pieces of the 3D board: cached shapes, parts made of the tabletop materials (board/look.ts) and the printed
 * labels (number and icon badges) that always face the camera.
 */

const geoCache = new Map<string, THREE.BufferGeometry>()
/** One geometry per shape, built once. */
export function shape(key: string, build: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = geoCache.get(key)
  if (!g) geoCache.set(key, g = build())
  return g
}

/** A mesh from the shape cache in the material of its colour (look.ts), placed and casting a shadow. */
export function part(key: string, build: () => THREE.BufferGeometry, c: string, at: [number, number, number] = [0, 0, 0], rot?: [number, number, number]): THREE.Mesh {
  const m = new THREE.Mesh(shape(key, build), material(c))
  m.position.set(...at)
  if (rot) m.rotation.set(...rot)
  m.castShadow = true
  return m
}

// ── Labels ─────────────────────────────────────────────────────────────────────

const iconImages = new Map<string, Promise<HTMLImageElement>>()
/** One of our icons as an image, for drawing on canvas labels. */
function iconImage(name: IconName, fill: string): Promise<HTMLImageElement> {
  const key = `${name}|${fill}`
  let p = iconImages.get(key)
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSvg(name, fill, 96))}`
    })
    iconImages.set(key, p)
  }
  return p
}

const stickerCache = new Map<string, THREE.MeshStandardMaterial>()
/**
 * A printed round sticker with an icon, as glued on the wooden pieces of the physical game (style-guide §3): paper
 * disc, ink rim, the icon in `fill`. Lies flat on top of a piece; cached by icon and colour.
 */
export function sticker(icon: IconName | null, fill: string = color.ink, text = ''): THREE.MeshStandardMaterial {
  const key = `${icon}|${fill}|${text}`
  let mat = stickerCache.get(key)
  if (mat) return mat
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4
  const draw = (img?: HTMLImageElement) => {
    const g = canvas.getContext('2d')!
    g.clearRect(0, 0, 128, 128)
    g.fillStyle = color.paperRaised; g.strokeStyle = color.ink; g.lineWidth = 6
    g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.fill(); g.stroke()
    if (img) g.drawImage(img, 18, 18, 92, 92)
    if (text) { g.fillStyle = color.ink; g.font = `bold 84px ${font.display}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 64, 70) }
    tex.needsUpdate = true
  }
  draw()
  if (icon) void iconImage(icon, fill).then(draw)
  if (text) void document.fonts.load(`bold 84px ${font.display}`, text).then(() => draw())
  stickerCache.set(key, mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: .5, roughness: .7 }))
  return mat
}
const stickerGeo = new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2)
/** A sticker of radius `r` lying on a top face at height `y`: an icon, or printed `text` such as a score. */
export function stickerOn(icon: IconName | null, r: number, y: number, fill?: string, text?: string): THREE.Mesh {
  const m = new THREE.Mesh(stickerGeo, sticker(icon, fill, text))
  m.scale.setScalar(r); m.position.y = y + .002
  return m
}

/** Labels live on their own layer, drawn after the photo treatment so they stay sharp (map/post.ts). */
export const LABEL_LAYER = 1

const labelCache = new Map<string, THREE.SpriteMaterial>()
/**
 * A camera-facing badge: an ink-bordered pill in `bg` with an optional icon and text in the display font. Redrawn
 * once the font and icon have loaded; cached by content.
 */
export function badge(text: string, opts: { bg?: string; fg?: string; icon?: IconName; iconFill?: string; size?: number } = {}): THREE.Sprite {
  const key = JSON.stringify([text, opts.bg, opts.fg, opts.icon, opts.iconFill])
  let mat = labelCache.get(key)
  if (!mat) {
    const canvas = document.createElement('canvas')
    const withIcon = !!opts.icon && text !== ''
    canvas.width = withIcon ? 224 : 128; canvas.height = 128
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    const draw = (img?: HTMLImageElement) => {
      const g = canvas.getContext('2d')!
      g.clearRect(0, 0, canvas.width, canvas.height)
      g.fillStyle = opts.bg ?? color.paperRaised
      g.strokeStyle = color.ink
      g.lineWidth = 10
      g.beginPath()
      g.roundRect(8, 8, canvas.width - 16, 112, 56)
      g.fill(); g.stroke()
      if (img) g.drawImage(img, withIcon ? 22 : 16, 16, 96, 96)
      g.fillStyle = opts.fg ?? color.ink
      g.font = `76px ${font.display}`
      g.textAlign = 'center'; g.textBaseline = 'middle'
      g.fillText(text, withIcon ? 158 : 64, 70)
      tex.needsUpdate = true
    }
    draw()
    void document.fonts.load(`76px ${font.display}`, text).then(() => draw())
    if (opts.icon) void iconImage(opts.icon, opts.iconFill ?? color.paperRaised).then(img => { void document.fonts.load(`76px ${font.display}`, text).then(() => draw(img)) })
    labelCache.set(key, mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, toneMapped: false, fog: false }))
  }
  const sprite = new THREE.Sprite(mat)
  const s = opts.size ?? 0.6
  sprite.scale.set(s * (opts.icon && text !== '' ? 224 / 128 : 1), s, 1)
  sprite.renderOrder = 10
  sprite.layers.set(LABEL_LAYER)
  return sprite
}

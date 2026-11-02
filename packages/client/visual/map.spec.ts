import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { devices, expect, test, type Page } from '@playwright/test'
import { DEPTH, WIDTH } from '../src/autumn/layout.ts'
import { GROUND_X, GROUND_Z } from '../src/board/geo.ts'
import { MAX_POLAR } from '../src/map/limits.ts'

// The map-only game screen (docs/07-ui/gameplay-map-only.md): no empty background at any allowed camera, zoom and
// tilt held to their limits, touch gestures. Uses map-kit.html (fixed sample position, no server).
test.setTimeout(90000)
const review = resolve(import.meta.dirname, '../test-results/map-review')
type Cam = { zoom: number; min: number; max: number; polar: number; target: [number, number] }
const cam = (page: Page) => page.evaluate(() => (window as unknown as { map: { camera(): Cam } }).map.camera())

/** Share of canvas pixels in the page's paper colour, in percent: what an empty background would look like. */
async function paperShare(page: Page): Promise<number> {
  const png = await page.locator('.game-map canvas').screenshot()
  return page.evaluate(async (b64: string) => {
    const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode()
    const c = new OffscreenCanvas(img.width, img.height), g = c.getContext('2d')!; g.drawImage(img, 0, 0)
    const d = g.getImageData(0, 0, img.width, img.height).data; let n = 0, all = 0
    for (let i = 0; i < d.length; i += 4 * 7) { all++; if (Math.abs(d[i]! - 0xf4) < 6 && Math.abs(d[i + 1]! - 0xec) < 6 && Math.abs(d[i + 2]! - 0xd8) < 6) n++ }
    return n / all * 100
  }, png.toString('base64'))
}
async function open(page: Page, map = '') {
  const errors: string[] = []; page.on('pageerror', e => errors.push(String(e)))
  await page.goto(`/map-kit.html${map && `?map=${map}`}`); await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('.game-map canvas')).toBeVisible(); await page.waitForTimeout(1500)
  await mkdir(review, { recursive: true })
  return errors
}

for (const [name, size, map] of [['1440', { width: 1440, height: 900 }, ''], ['1280', { width: 1280, height: 800 }, ''], ['classic-1440', { width: 1440, height: 900 }, 'classic']] as const) {
  test(`map fills the screen at every camera limit, desktop ${name}`, async ({ page }) => {
    await page.setViewportSize(size)
    const errors = await open(page, map)
    const box = (await page.locator('.game-map canvas').boundingBox())!, cx = box.x + box.width / 2, cy = box.y + box.height / 2
    expect(await paperShare(page)).toBeLessThan(.5)
    for (let i = 0; i < 30; i++) { await page.mouse.move(cx, cy); await page.mouse.wheel(0, 500) }
    await page.waitForTimeout(300)
    let c = await cam(page); expect(c.zoom).toBeCloseTo(c.min, 5)
    expect(await paperShare(page)).toBeLessThan(.5); await page.screenshot({ path: resolve(review, `map-${name}-far.png`) })
    // Tilt and turn as far as allowed, then drag towards a corner.
    await page.mouse.move(cx, cy); await page.mouse.down({ button: 'right' }); await page.mouse.move(cx + 400, cy - 600, { steps: 30 }); await page.mouse.up({ button: 'right' })
    await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 1200, cy + 900, { steps: 30 }); await page.mouse.up()
    await page.waitForTimeout(300)
    c = await cam(page)
    expect(c.polar).toBeLessThanOrEqual(MAX_POLAR + 1e-3)
    const [halfW, halfD] = map ? [GROUND_X / 2, GROUND_Z / 2] : [WIDTH / 2, DEPTH / 2]
    expect(Math.abs(c.target[0])).toBeLessThanOrEqual(halfW + 1e-6); expect(Math.abs(c.target[1])).toBeLessThanOrEqual(halfD + 1e-6)
    expect(await paperShare(page)).toBeLessThan(.5); await page.screenshot({ path: resolve(review, `map-${name}-tilted-corner.png`) })
    for (let i = 0; i < 40; i++) { await page.mouse.move(cx, cy); await page.mouse.wheel(0, -500) }
    await page.waitForTimeout(300)
    c = await cam(page); expect(c.zoom).toBeCloseTo(c.max, 5)
    await page.keyboard.press('0'); await page.waitForTimeout(200)
    c = await cam(page); expect(c.zoom).toBe(1); expect(c.target).toEqual([0, 0])
    await page.screenshot({ path: resolve(review, `map-${name}-home.png`) })
    expect(errors).toEqual([])
  })
}

for (const [name, device] of [['ipad', devices['iPad Pro 11 landscape']], ['ipad-portrait', devices['iPad Pro 11']]] as const) {
  test.describe(name, () => {
    const { defaultBrowserType: _browser, ...emulation } = device
    test.use(emulation)
    test(`touch: pinch zooms, one finger pans, still no empty background (${name})`, async ({ page }) => {
      const errors = await open(page)
      expect(await paperShare(page)).toBeLessThan(.5)
      const box = (await page.locator('.game-map canvas').boundingBox())!, cx = box.x + box.width / 2, cy = box.y + box.height / 2
      const cdp = await page.context().newCDPSession(page)
      const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', points: [number, number][]) =>
        cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], id) => ({ x, y, id })) })
      const before = await cam(page)
      await touch('touchStart', [[cx - 40, cy], [cx + 40, cy]])
      for (let s = 1; s <= 10; s++) await touch('touchMove', [[cx - 40 - s * 22, cy], [cx + 40 + s * 22, cy]])
      await touch('touchEnd', [])
      const pinched = await cam(page)
      expect(pinched.zoom).toBeGreaterThan(before.zoom * 1.3)
      await touch('touchStart', [[cx, cy]])
      for (let s = 1; s <= 10; s++) await touch('touchMove', [[cx - s * 25, cy - s * 15]])
      await touch('touchEnd', [])
      const panned = await cam(page)
      expect(Math.hypot(panned.target[0] - pinched.target[0], panned.target[1] - pinched.target[1])).toBeGreaterThan(.5)
      expect(await paperShare(page)).toBeLessThan(.5)
      await page.screenshot({ path: resolve(review, `map-${name}.png`) })
      expect(await page.locator('.game-map canvas').getAttribute('data-quality')).toBe('tablet')
      // Turning the tablet: limits are worked out again for the new shape, and still no empty background.
      const { width, height } = page.viewportSize()!
      await page.setViewportSize({ width: height, height: width }); await page.waitForTimeout(600)
      const turned = await cam(page)
      expect(turned.zoom).toBeGreaterThanOrEqual(turned.min - 1e-6); expect(turned.zoom).toBeLessThanOrEqual(turned.max + 1e-6)
      expect(await paperShare(page)).toBeLessThan(.5)
      await page.screenshot({ path: resolve(review, `map-${name}-turned.png`) })
      expect(errors).toEqual([])
    })
  })
}

// Load budget (docs/07-ui/gameplay-map-only.md "Tốc độ tải"): what blocks the page while the map opens. Shader
// compilation and the first frame are GPU work, measured on the real machine, not in software WebGL here.
for (const map of ['', 'classic']) test(`map loading stays within budget: short main-thread work, decoration after the first frame${map && ` (${map})`}`, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`/map-kit.html${map && `?map=${map}`}`)
  await page.waitForFunction(() => performance.getEntriesByName('map:complete').length > 0, null, { timeout: 60000 })
  const m = await page.evaluate(() => Object.fromEntries(performance.getEntriesByType('measure').map(e => [e.name, e.duration])))
  expect(m['map:build']!, 'scenery needed for play, before the first frame').toBeLessThan(120)
  expect(m['map:apron']!, 'apron, one later task').toBeLessThan(80)
  expect(m['map:first-frame']!).toBeLessThan(m['map:complete']!)
})

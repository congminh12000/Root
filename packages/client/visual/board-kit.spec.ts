import { expect, test } from '@playwright/test'

// The board alone on a fixed seeded position (board-kit.html), with fonts and icons loaded.

test('board 2d', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/board-kit.html?only=2d')
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('.map').first()).toHaveScreenshot('board-2d.png', { animations: 'disabled' })
})

// Software WebGL in headless Chromium never gives two identical frames in a row, so the 3D board is not compared
// pixel by pixel: it must draw, show the palette's main colours, and raise no errors. Look at it in board-kit.html.
test('board 3d draws', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(String(e)))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/board-kit.html?only=3d')
  await page.waitForTimeout(1500)
  const shot = await page.locator('#b3 canvas').screenshot()
  const stats = await page.evaluate(async (png: string) => {
    const img = new Image()
    img.src = `data:image/png;base64,${png}`
    await img.decode()
    const c = new OffscreenCanvas(img.width, img.height)
    const g = c.getContext('2d')!
    g.drawImage(img, 0, 0)
    const d = g.getImageData(0, 0, img.width, img.height).data
    const buckets = new Set<number>()
    let greenish = 0, dirt = 0
    for (let i = 0; i < d.length; i += 4 * 37) {
      const [r, gr, b] = [d[i]!, d[i + 1]!, d[i + 2]!]
      buckets.add((r >> 4) << 8 | (gr >> 4) << 4 | (b >> 4))
      if (gr > r && gr > b) greenish++
      if (r > 150 && gr > 120 && b < 120 && r > b + 50) dirt++
    }
    return { colours: buckets.size, greenish, dirt, samples: d.length / (4 * 37) }
  }, shot.toString('base64'))
  expect(stats.colours, 'a drawn scene, not a blank canvas').toBeGreaterThan(150)
  expect(stats.greenish / stats.samples, 'meadow and forest dominate').toBeGreaterThan(0.4)
  expect(stats.dirt / stats.samples, 'dirt paths are visible').toBeGreaterThan(0.1)
  expect(errors).toEqual([])
})

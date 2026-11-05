import { expect, test } from '@playwright/test'

test('turn banner expires and only a new turn replays it', async ({ page }) => {
  await page.clock.install()
  await page.goto('/ui-kit.html')
  const demo = page.locator('[data-turn-demo]')
  const banner = demo.locator('.turn-banner')
  await demo.getByRole('button', { name: 'Lượt kế (thử)' }).click()
  await expect(banner).toBeVisible()
  await page.clock.fastForward(2500)
  await expect(banner).toHaveCount(0)
  await demo.getByRole('button', { name: 'Đổi pha (thử)' }).click()
  await expect(banner).toHaveCount(0)
  await demo.getByRole('button', { name: 'Đổi người trả lời (thử)' }).click()
  await expect(banner).toHaveCount(0)
  await demo.getByRole('button', { name: 'Lượt kế (thử)' }).click()
  await expect(banner).toBeVisible()
  await page.clock.fastForward(2500)
  await expect(banner).toHaveCount(0)
})

for (const [width, height] of [[1440, 900], [1280, 800], [1180, 820], [820, 1180]] as const) {
  test(`turn and phases fit at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/ui-kit.html')
    const section = page.locator('section.kit').filter({ has: page.getByRole('heading', { name: 'RD-M06 · Lượt và pha' }) })
    await section.scrollIntoViewIfNeeded()
    await expect(section.locator('.phase-mark')).toHaveCount(3)
    const banner = section.locator('.turn-banner').first()
    const bounds = await banner.boundingBox()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width)
    await section.screenshot({ path: `test-results/rd-m06-${width}.png` })
  })
}

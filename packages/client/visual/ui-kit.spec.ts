import { expect, test } from '@playwright/test'

// The UI kit at the two desktop sizes of the quality gate, with the bundled fonts loaded and no console errors.
for (const [width, height] of [[1440, 900], [1280, 800]] as const) {
  test(`ui-kit ${width}×${height}`, async ({ page }) => {
    const errors: string[] = []
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
    page.on('pageerror', e => errors.push(String(e)))
    await page.setViewportSize({ width, height })
    await page.goto('/ui-kit.html')
    await page.evaluate(() => document.fonts.ready)
    expect(await page.evaluate(() => [document.fonts.check('16px Pangolin', 'Rừng'), document.fonts.check('16px "Be Vietnam Pro"', 'Đường')])).toEqual([true, true])
    await expect(page).toHaveScreenshot(`ui-kit-${width}.png`, { fullPage: true, animations: 'disabled' })
    expect(errors).toEqual([])
  })
}

test('quick guide explains map controls and results keep board access', async ({ page }) => {
  await page.goto('/ui-kit.html')
  const guide = page.locator('.guide')
  await expect(guide).toContainText('kéo quân từ ô này sang ô khác')
  await expect(guide).toContainText('chụm hai ngón')
  await expect(page.getByRole('region', { name: 'Kết quả trận' })).toContainText('Thắng bằng điểm')
  await expect(page.locator('.log-entry button')).toHaveAttribute('aria-pressed', 'true')
})

for (const [width, height] of [[1440, 900], [1280, 800], [1194, 834], [834, 1194]]) {
  test(`new-player guide fits and stays readable ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width: width!, height: height! })
    await page.goto('/ui-kit.html'); await page.evaluate(() => document.fonts.ready)
    const guide = page.locator('.guide')
    await expect(guide).toContainText('Ván đầu')
    await expect(guide).toContainText('đang chờ ai')
    await expect(guide).toContainText('Tất cả lựa chọn')
    expect(await guide.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true)
    await guide.screenshot({ path: `test-results/guide-${width}.png` })
  })
}

test('Ambush paintings load locally with the correct suit and fill the card art', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const response = page.waitForResponse(r => /ambush-woodland.*\.png/.test(r.url()))
  await page.goto('/ui-kit.html')
  expect((await response).ok()).toBe(true)
  const paintings = page.locator('.kit-ambush .cf-ambush-art')
  await expect(paintings).toHaveCount(4)
  expect(await paintings.evaluateAll(nodes => nodes.map(n => n.getAttribute('data-suit')))).toEqual(['bird', 'rabbit', 'fox', 'mouse'])
  expect(await paintings.evaluateAll(nodes => new Set(nodes.map(n => n.getAttribute('viewBox'))).size)).toBe(4)
  for (const painting of await paintings.all()) {
    const box = await painting.boundingBox()
    const parent = await painting.locator('..').boundingBox()
    expect(box!.height).toBeCloseTo(parent!.height, 0)
  }
  await page.locator('.kit-ambush').screenshot({ path: 'test-results/ambush-four-suits.png' })
})

test('card typography hides citations and uses thin borders with regular effect copy', async ({ page }) => {
  await page.goto('/ui-kit.html')
  const card = page.locator('.kit-ambush .cardface').first()
  await expect(card).toHaveCSS('border-top-width', '1px')
  await expect(card.locator('.cf-title')).toHaveCSS('font-weight', '400')
  await expect(card.locator('.cf-text p')).toHaveCSS('font-weight', '400')
  expect((await page.locator('.cardface .cf-text').allTextContents()).join('')).not.toContain('§')
  await expect(card.locator('.cf-paper-edge')).toBeVisible()
  const title = await card.locator('.cf-title').boundingBox()
  const bounds = await card.boundingBox()
  expect(title!.y - bounds!.y).toBeGreaterThan(3)
  expect(bounds!.x + bounds!.width - title!.x - title!.width).toBeGreaterThan(8)
})

test('all 54 deck cards expose readable effects without opening details', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto('/ui-kit.html')
  await page.evaluate(() => document.fonts.ready)
  const cards = page.locator('.kit-deck').first().locator('.cardface')
  await expect(cards).toHaveCount(54)
  for (const card of await cards.all()) {
    await expect(card.locator('.cf-text p')).toBeVisible()
    expect(await card.locator('.cf-text').evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true)
    expect(await card.locator('.cf-text p').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14)
  }
})

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
  const response = page.waitForResponse(r => /ambush-woodland.*\.webp/.test(r.url()))
  await page.goto('/ui-kit.html')
  expect((await response).ok()).toBe(true)
  const paintings = page.locator('.kit-deck .cf-ambush-art')
  await expect(paintings).toHaveCount(5)
  expect(await paintings.evaluateAll(nodes => [...new Set(nodes.map(n => n.getAttribute('data-suit')))].sort())).toEqual(['bird', 'fox', 'mouse', 'rabbit'])
  expect(await paintings.evaluateAll(nodes => new Set(nodes.map(n => n.getAttribute('viewBox'))).size)).toBe(4)
  await page.locator('.kit-deck').first().screenshot({ path: 'test-results/ambush-deck.png' })
  for (const painting of await paintings.all()) {
    const box = await painting.boundingBox()
    const parent = await painting.locator('..').boundingBox()
    expect(box!.height).toBeCloseTo(parent!.height, 0)
  }
})

test('card typography hides citations and uses thin borders with regular effect copy', async ({ page }) => {
  await page.goto('/ui-kit.html')
  const card = page.locator('.kit-deck .cardface.ambush').first()
  await expect(card).toHaveCSS('border-top-width', '1px')
  await expect(card.locator('.cf-title')).toHaveCSS('font-weight', '400')
  await expect(card.locator('.cf-text p')).toHaveCSS('font-weight', '400')
  expect((await page.locator('.cardface .cf-text').allTextContents()).join('')).not.toContain('§')
  await expect(card.locator('.cf-paper-edge')).toBeVisible()
  const title = await card.locator('.cf-title').boundingBox()
  const bounds = await card.boundingBox()
  expect(title!.y - bounds!.y).toBeGreaterThan(bounds!.width * .01)
  expect(bounds!.x + bounds!.width - title!.x - title!.width).toBeGreaterThan(bounds!.width * .025)
})

test('UI kit groups compact cards and keeps copies together', async ({ page }) => {
  await page.setViewportSize({ width: 1224, height: 604 })
  await page.goto('/ui-kit.html')
  await expect(page.getByRole('heading', { name: 'Chi tiết lá bài', exact: true })).toHaveCount(0)
  await expect(page.locator('.kit-copies .cardface')).toHaveCount(54)
  await expect(page.locator('.kit-quests .cardface')).toHaveCount(15)
  await expect(page.getByRole('heading', { name: 'Ambush — bốn chất', exact: true })).toHaveCount(0)
  for (const group of await page.locator('.kit-copies').all()) {
    const cards = await group.locator('.minicard').evaluateAll(nodes => nodes.map(n => ({
      id: n.getAttribute('data-card')!.split('#')[0], top: n.getBoundingClientRect().top,
      width: n.getBoundingClientRect().width,
    })))
    expect(new Set(cards.map(c => c.id)).size).toBe(1)
    expect(new Set(cards.map(c => c.top)).size).toBe(1)
    expect(cards.every(c => c.width <= 180)).toBe(true)
  }
  await page.setViewportSize({ width: 390, height: 900 })
  expect(await page.locator('.kit-copies').evaluateAll(nodes => nodes.every(n => n.getBoundingClientRect().right <= 390))).toBe(true)

})

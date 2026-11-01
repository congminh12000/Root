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

test('quick guide opens with keyboard and results keep board access', async ({ page }) => {
  await page.goto('/ui-kit.html')
  const guide = page.locator('.guide')
  await expect(guide).not.toHaveAttribute('open', '')
  await guide.locator('summary').focus()
  await page.keyboard.press('Enter')
  await expect(guide).toHaveAttribute('open', '')
  await expect(guide).toContainText('chọn ô đi, ô đến')
  await expect(page.getByRole('region', { name: 'Kết quả trận' })).toContainText('Thắng bằng điểm')
  await expect(page.locator('.log-entry button')).toHaveAttribute('aria-pressed', 'true')
})

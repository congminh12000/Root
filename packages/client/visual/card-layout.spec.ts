import { test, expect } from '@playwright/test'

for (const width of [120, 180, 320]) {
  test(`ordinary cards use full art and compact readable content at ${width}px`, async ({ page }) => {
    await page.goto('/ui-kit.html')
    await page.evaluate(() => document.fonts.ready)
    const cards = page.locator('.kit-deck .cardface.standard')
    await expect(cards).toHaveCount(45)
    const results = await cards.evaluateAll((elements, width) => elements.map(card => {
      const root = card as HTMLElement
      root.style.setProperty('--cf-w', `${width}px`)
      const box = root.getBoundingClientRect()
      const el = (q: string) => root.querySelector(q) as HTMLElement
      const head = el('.cf-head').getBoundingClientRect(), badge = el('.cf-badge').getBoundingClientRect()
      const title = el('.cf-title'), text = el('.cf-text'), plaque = el('.cf-plaque')
      const art = el('.cf-art').getBoundingClientRect(), bottom = el('.cf-bottom').getBoundingClientRect()
      return {
        name: title.textContent,
        badgeOffset: Math.abs(badge.y + badge.height / 2 - (head.bottom - 1)),
        color: getComputedStyle(title).color, weight: getComputedStyle(title).fontWeight,
        titleFits: title.getBoundingClientRect().bottom <= head.bottom + 1,
        textFits: text.scrollHeight <= text.clientHeight + 1,
        costFits: el('.cf-cost').getBoundingClientRect().bottom <= plaque.getBoundingClientRect().bottom + 1,
        artToBottom: Math.abs(art.bottom - (box.bottom - 1.5)),
        compact: bottom.height / box.height,
        height: bottom.height,
      }
    }), width)
    for (const r of results) {
      expect(r.badgeOffset, r.name ?? '').toBeLessThanOrEqual(1.5)
      expect(r.color).toBe('rgb(255, 255, 255)')
      expect(r.weight).toBe('600')
      expect(r.titleFits && r.textFits && r.costFits, r.name ?? '').toBe(true)
      expect(r.artToBottom, r.name ?? '').toBeLessThan(1)
      expect(r.compact, r.name ?? '').toBeLessThan(.34)
    }
    expect(new Set(results.map(r => r.height)).size).toBeGreaterThan(2)
  })
}

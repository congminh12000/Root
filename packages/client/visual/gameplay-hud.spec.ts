import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { once } from 'node:events'
import { expect, test } from '@playwright/test'
import { currentActor, legalActions, type FactionId } from '@root/game-engine'
import { Room } from '../../server/src/room.ts'
import { startServer } from '../../server/src/server.ts'
import { PHASE_NAME } from '../src/names.ts'

test.setTimeout(90000)
for (const map of ['autumn-diorama', 'classic']) {
  for (const [width, height] of [[1440, 900], [1280, 800], [1180, 820], [820, 1180]] as const) {
    test(`live HUD: cancel and end Daylight, ${map}, ${width}x${height}`, async ({ page }) => {
      const dir = mkdtempSync(join(tmpdir(), 'root-hud-'))
      const server = startServer({ host: '127.0.0.1', port: 0, dataDir: dir, staticDir: resolve(import.meta.dirname, '../dist'), turnSeconds: 0 })
      try {
        await once(server.http, 'listening')
        const room = Room.create({ seats: (['marquise', 'eyrie'] as FactionId[]).map(faction => ({ faction, kind: 'human' })) }, () => {}, { turnSeconds: 0 })
        server.rooms.set(room.id, room)
        for (let n = 0; n < 1000; n++) {
          const s = room.state
          if (s.stage === 'play' && s.seats[s.turn.seat]!.faction === 'marquise' && s.turn.phase === 'daylight' && s.turn.step === 'actions') break
          const actor = currentActor(s)!
          const legal = legalActions(s, actor)
          const action = legal.find(a => a.type === 'end-step') ?? legal[0]!
          expect(room.submit(actor, `fixture-${n}`, room.saved.revision ?? s.meta.revision, action).ok).toBe(true)
        }
        expect(room.state.turn.step).toBe('actions')
        const turn = room.state.turn.number
        const revision = room.saved.revision ?? room.state.meta.revision
        const count = room.saved.record.commands.length
        const token = room.saved.seats.find(s => s.faction === 'marquise')!.token!
        const address = server.http.address() as { port: number }
        await page.setViewportSize({ width, height })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.addInitScript(map => localStorage.setItem('root-map', map), map)
        await page.goto(`http://127.0.0.1:${address.port}/?game=${room.id}&seat=${token}&quality=low`)
        const main = page.locator('.hud-actions .context-action')
        await expect(main).toHaveText('Sang Evening ▷')
        await expect(page.locator('.hud-self .phase-mark')).toHaveText('Daylight')
        const status = await page.locator('.hud-status').boundingBox()
        const prompt = await page.locator('.map-prompt').boundingBox()
        expect(prompt!.y).toBeGreaterThanOrEqual(status!.y + status!.height)
        await expect(page.locator('.game-map canvas')).toBeVisible()
        await expect(page.locator('.map-fallback')).toHaveCount(0)
        if (width === 820) {
          const hand = await page.locator('.hud-hand').boundingBox()
          const panel = await page.locator('.hud-actions').boundingBox()
          expect(hand!.x + hand!.width).toBeLessThanOrEqual(panel!.x)
        }
        await page.locator('.hud-marquise button[data-type="move"]').click()
        await expect(main).toHaveText('Huỷ')
        await main.click()
        await expect(main).toHaveText('Sang Evening ▷')
        expect(room.saved.record.commands.length).toBe(count)
        await page.locator('.hud-marquise button[data-type="move"]').click()
        await page.keyboard.press('Escape')
        await expect(main).toHaveText('Sang Evening ▷')
        expect(room.saved.revision ?? room.state.meta.revision).toBe(revision)
        await main.click({ trial: true })
        await page.screenshot({ path: `test-results/live-hud-${map}-${width}.png`, animations: 'disabled' })
        await main.focus()
        await page.keyboard.press('Enter')
        await expect.poll(() => room.saved.record.commands.length).toBe(count + 1)
        expect(room.saved.record.commands.at(-1)!.command.type).toBe('end-step')
        // Evening can draw and finish automatically when there is no decision to make.
        expect(room.state.turn.phase === 'evening' || room.state.turn.number > turn).toBe(true)
        await expect(page.locator('.hud-faction .phase-mark')).toHaveCount(1)
        await expect(page.locator('.hud-faction .phase-mark')).toHaveText(PHASE_NAME[room.state.turn.phase])
      } finally {
        await page.close()
        await server.close()
        rmSync(dir, { recursive: true, force: true })
      }
    })
  }
}

import { defineConfig } from '@playwright/test'

// Screenshot checks for the UI (docs/07-ui/README.md §3). Builds the client and serves it on 127.0.0.1 only for the
// run. Baselines live in visual/__screenshots__ and are made on macOS; refresh them on purpose with
// `npm run test:visual:update` and say why in the PR. Printed card faces (gitignored, licensing.md) are switched off so
// baselines never contain official art and match on machines without them.
const PORT = 4317
export default defineConfig({
  testDir: 'visual',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  // Tight on purpose: one recoloured icon row must fail. Same machine, same fonts, no animation: no noise to absorb.
  expect: { toHaveScreenshot: { maxDiffPixels: 50 } },
  use: { baseURL: `http://127.0.0.1:${PORT}`, browserName: 'chromium', deviceScaleFactor: 1, colorScheme: 'light' },
  webServer: { command: `VITE_OFFICIAL_CARDS=off npm run build && npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`, url: `http://127.0.0.1:${PORT}/ui-kit.html`, reuseExistingServer: false },
})

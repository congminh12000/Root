import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// `npm run dev` proxies the API and WebSocket to a server started with `npm run serve`.
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8080',
      '/ws': { target: 'ws://127.0.0.1:8080', ws: true },
    },
  },
  // three.js is its own lazily loaded chunk (board3d.ts), so its size does not delay the page.
  // ui-kit.html shows every shared piece in every state, board-kit.html the board alone (docs/07-ui).
  build: {
    outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 800,
    rollupOptions: { input: { main: resolve(import.meta.dirname, 'index.html'), lake: resolve(import.meta.dirname, 'lake-kit.html'), autumn: resolve(import.meta.dirname, 'autumn-kit.html'), kit: resolve(import.meta.dirname, 'ui-kit.html'), board: resolve(import.meta.dirname, 'board-kit.html') } },
  },
})

import { defineConfig } from 'vite'

// `npm run dev` proxies the API and WebSocket to a server started with `npm run serve`.
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8080',
      '/ws': { target: 'ws://127.0.0.1:8080', ws: true },
    },
  },
  build: { outDir: 'dist', emptyOutDir: true },
})

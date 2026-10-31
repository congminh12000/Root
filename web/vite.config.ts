import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Map files live in ../maps so the Python engine and the renderer share them.
  server: { fs: { allow: ['..'] }, proxy: { '/api': { target: 'http://127.0.0.1:8787', ws: true } } },
  build: { chunkSizeWarningLimit: 800 },
})

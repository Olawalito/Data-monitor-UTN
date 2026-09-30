import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true } } },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})

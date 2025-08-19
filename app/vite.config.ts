import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// ⚠️ base は必ずリポ名に合わせる
export default defineConfig({
  base: '/poker-preflop-trainer/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../docs',     // ルート配下に docs/ を作る
    emptyOutDir: true,     // 毎回ビルド時に docs/ を空にする
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      }
    }
  }
})

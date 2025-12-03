import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 設定相對路徑，確保在 GitHub Pages 子目錄能正常運作
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/ya-masa/kakeibo-app/',   // ← ここが重要（リポジトリ名）
  plugins: [vue()],
})


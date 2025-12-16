/* eslint-env node */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/media-api': {
        target: process.env.VITE_MEDIA_PROXY_TARGET || 'http://localhost:4000',
        changeOrigin: true,
      },
      '/media-files': {
        target: process.env.VITE_MEDIA_PROXY_TARGET || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api-glpi': {
        target: 'http://glpi.local:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-glpi/, '')
      },
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      }
    }
  }
})

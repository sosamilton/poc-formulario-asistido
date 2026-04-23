import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost',
        changeOrigin: true
      },
      '/config': {
        target: 'http://localhost',
        changeOrigin: true
      },
      '/forms': {
        target: 'http://localhost',
        changeOrigin: true
      },
      '/ddjj': {
        target: 'http://localhost',
        changeOrigin: true
      }
    }
  }
})

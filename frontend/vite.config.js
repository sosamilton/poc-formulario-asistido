import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://windmill.mdsoluciones.ar',
        changeOrigin: true
      },
      '/config': {
        target: 'https://windmill.mdsoluciones.ar',
        changeOrigin: true
      },
      '/forms': {
        target: 'https://windmill.mdsoluciones.ar',
        changeOrigin: true
      },
      '/ddjj': {
        target: 'https://windmill.mdsoluciones.ar',
        changeOrigin: true
      }
    }
  }
})

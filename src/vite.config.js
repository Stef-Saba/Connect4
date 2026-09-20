import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',

      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',

      injectRegister: 'auto',

      devOptions: {
        enabled: true
      },

      manifest: {
        name: 'Connect Four',
        short_name: 'Connect Four',
        description: 'Asynchronous Connect Four',
        theme_color: '#1769aa',
        background_color: '#f5f5f5',
        display: 'standalone',
        start_url: '/',
        icons: []
      }
    })
  ]
})
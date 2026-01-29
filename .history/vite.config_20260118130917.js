import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/FestaDelloSport_/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Festa dello Sport di Capralba',
        short_name: 'FestaSport',
        description: 'Programma eventi, menu completo e prenotazione tavoli',
        start_url: '/FestaDelloSport_/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#f8b400',
        icons: [
          {
            src: '/FestaDelloSport_/web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/FestaDelloSport_/web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50MB max
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache'
            }
          },
          {
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdnjs-cache'
            }
          }
        ]
      }
    })
  ]
})
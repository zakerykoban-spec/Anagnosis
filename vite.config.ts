import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/Anagnosis/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon-anagnosis-manuscript.png'],
      manifest: {
        name: 'Ἀνάγνωσις',
        short_name: 'Ἀνάγνωσις',
        description: 'A focused daily reader for Greek Scripture.',
        theme_color: '#30231b',
        background_color: '#30231b',
        display: 'standalone',
        lang: 'grc',
        start_url: '/Anagnosis/',
        scope: '/Anagnosis/',
        icons: [
          {
            src: 'icons/anagnosis-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/anagnosis-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/anagnosis-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,webp,webmanifest}',
        ],
      },
    }),
  ],
})

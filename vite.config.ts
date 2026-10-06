import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  // Changed from '/platform/' to './' to generate relative asset links. 
  // This allows the same build to be served from both a root domain and a subpath.
  base: './', 
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Platform',
        short_name: 'Platform',
        description: 'Your rail journeys, drawn on a map of India.',
        theme_color: '#0A1C33',
        background_color: '#0A1C33',
        display: 'standalone',
        orientation: 'portrait',
        // Changed from '/platform/' to '.' so the PWA launches relative to 
        // the domain or subpath it was installed from.
        start_url: '.', 
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/data\/stations\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'stations-v1',
              expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173 },
})
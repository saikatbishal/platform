import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  // Relative, so one build serves both platform.saikatbishal.com/ and
  // saikatbishal.com/platform/ (proxied there by the portfolio's vercel.json).
  // The cost: every asset and fetch resolves against the page URL, so the
  // subpath only works with its trailing slash — at /platform, ./assets/x.js
  // becomes /assets/x.js, which is the portfolio's catch-all, and the page is
  // blank. The portfolio redirects /platform → /platform/ for exactly this.
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
  build: {
    rolldownOptions: {
      output: {
        /*
         * Libraries in their own files, so a deploy that changes only app
         * code — most of them — leaves a returning visitor's cached React and
         * Supabase alone instead of re-downloading everything with the
         * changed bytes.
         *
         * React is on the first paint either way; Supabase is not. It arrives
         * through a dynamic import (src/lib/supabase.ts), and grouping it
         * here only names that file — nothing here pulls it forward.
         */
        codeSplitting: {
          groups: [
            { name: 'react', test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'supabase', test: /[\\/]node_modules[\\/](@supabase|iceberg-js)[\\/]/ },
          ],
        },
      },
    },
  },
  server: { port: 5173 },
})
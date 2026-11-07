import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

/**
 * The version the timetable shards are cached under.
 *
 * Everything the service worker precaches is already versioned per file —
 * Workbox stores a content hash beside each entry and replaces only what
 * changed. The shards are not precached (40 MB, 5,684 files; see the
 * runtime rule below), so their cache needs a version of its own, and the
 * app version alone is not enough: `npm run assets` can rebuild the
 * timetable without anyone bumping package.json, and a cache keyed only on
 * 0.1.0 would then serve last month's stop lists forever.
 *
 * So: the package version, for a human reading the cache name in DevTools,
 * plus a hash of the shards' actual bytes, for correctness. A deploy with the
 * same data keeps every cached shard; a deploy with new data starts a new
 * cache and src/lib/offline.ts deletes the old one. Only the three shard
 * directories, and never Finder's "x 2.json" copies, which are not data.
 */
function dataVersion(): string {
  const root = fileURLToPath(new URL('./public/maps', import.meta.url))
  const hash = createHash('sha256')
  for (const dir of ['stationtrains', 'trainstops', 'traintimes']) {
    const path = join(root, dir)
    if (!existsSync(path)) continue
    for (const file of readdirSync(path).filter((f) => f.endsWith('.json') && !/ \d+\.json$/.test(f)).sort()) {
      hash.update(`${dir}/${file}\0`)
      hash.update(readFileSync(join(path, file)))
    }
  }
  return `${pkg.version}-${hash.digest('hex').slice(0, 8)}`
}

export default defineConfig(({ command }) => {
  // Hashing 40 MB is ~100 ms, paid only by `vite build` — the dev server has
  // no service worker, so it has nothing to version.
  const DATA_VERSION = command === 'build' ? dataVersion() : `${pkg.version}-dev`
  const SHARD_CACHE = `platform-shards-${DATA_VERSION}`

  return {
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
        /*
         * 'prompt', not 'autoUpdate'. With autoUpdate a new worker takes over
         * an open tab underneath it and deletes the old build's files from the
         * cache — so the next lazy chunk that tab asks for (Supabase loads on
         * demand) belongs to a build that no longer exists. Instead the new
         * worker waits, and src/lib/offline.ts offers a reload.
         */
        registerType: 'prompt',
        // Registered from src/lib/offline.ts through the virtual module, not
        // an injected <script>, so the update prompt can reach the toast.
        injectRegister: false,
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
          /*
           * Namespaced, because this origin is shared: the portfolio proxies
           * saikatbishal.com/platform/ to this build, and Workbox's default
           * cache names would sit beside anything the portfolio stores.
           */
          cacheId: 'platform',
          cleanupOutdatedCaches: true,
          /*
           * Precached: everything the app needs to open and work with no
           * network at all — the shell, the fonts, and every file the map and
           * the add form load up front. About 470 KB gzipped of data on top of
           * the code. `maps/*.json` is the top level only, by design: the
           * shard directories beneath it are the runtime rule's job.
           *
           * Each entry carries a content hash, so a deploy re-downloads only
           * the files whose bytes changed — this is the per-file versioning.
           */
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}', 'maps/*.json', 'data/stations.json'],
          // og.png is the link-preview image for other sites; the app never shows it.
          globIgnores: ['**/* [0-9].json', '**/* [0-9]/**', 'og.png'],
          // stations.json is 0.8 MB; the default 2 MiB ceiling has room, and
          // this is stated so a bigger station file fails the build loudly
          // instead of quietly dropping out of the offline set.
          maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
          runtimeCaching: [
            {
              /*
               * The timetable shards: 5,684 files, 40 MB. Nobody needs all of
               * them, so none are installed up front; each is kept the first
               * time it is fetched. That covers the case offline matters for —
               * the trains on journeys already logged, which the map requests
               * on every online load, so they are on the device before anyone
               * goes into a tunnel.
               *
               * CacheFirst: a shard never changes within a data version, and
               * the version is in the cache name, so a new timetable is a new
               * cache rather than a revalidation of every file.
               */
              urlPattern: /\/maps\/(stationtrains|trainstops|traintimes)\/[^/ ]+\.json$/,
              handler: 'CacheFirst',
              options: {
                cacheName: SHARD_CACHE,
                // Far above what one person rides; a ceiling, not a working
                // limit. The oldest go first if it is ever reached.
                expiration: { maxEntries: 2000, purgeOnQuotaError: true },
                cacheableResponse: { statuses: [200] },
              },
            },
          ],
        },
      }),
    ],
    define: {
      // Read by src/lib/offline.ts to tell this build's shard cache from the
      // ones before it.
      __SHARD_CACHE__: JSON.stringify(SHARD_CACHE),
    },
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
  }
})
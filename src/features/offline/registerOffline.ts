import { registerSW } from 'virtual:pwa-register'
import { showToast } from '@/components/toast.ts'

/** This build's timetable-shard cache, versioned in vite.config.ts. */
declare const __SHARD_CACHE__: string

/**
 * The service worker, and the two things it has to say out loud.
 *
 * What it caches is decided in vite.config.ts: the shell and every up-front
 * data file are installed with the app, versioned per file by content hash;
 * the timetable shards are kept as they are fetched, in a cache named for the
 * data version. This file is the page's half — registering, offering the
 * update, and clearing out what older versions left behind.
 */
export function registerOffline(): void {
  if (!('serviceWorker' in navigator)) return

  const update = registerSW({
    /*
     * A new build is installed and waiting. It is not forced in underneath
     * the open page — see `registerType: 'prompt'` in vite.config.ts for the
     * blank-chunk failure that avoids. Ignoring this is fine: the new version
     * takes over the next time every Platform tab has closed.
     */
    onNeedRefresh() {
      showToast({
        id: 'app-update',
        message: 'A newer version of Platform is ready. It takes over the next time you open it, or now.',
        action: { label: 'Reload', run: () => { void update(true) } },
      })
    },
    /*
     * The first install has finished, so from now on the app opens with no
     * signal. Said once, because it changes what someone can rely on — on a
     * train, that is the whole question.
     */
    onOfflineReady() {
      showToast({
        id: 'offline-ready',
        message: 'Platform now opens without a connection. Journeys you log offline stay on this device.',
      })
    },
    onRegisteredSW(_url, registration) {
      // Only the newest build prunes. A page still running an older build —
      // one with a new worker waiting behind it — would otherwise delete the
      // newer build's cache as "not mine".
      if (registration && !registration.waiting) void pruneCaches(registration.scope)
    },
  })
}

/**
 * Deletes caches this app made under an older version. Workbox tidies its own
 * precache; the runtime cache's name is ours, so its old copies are ours to
 * remove — a new timetable would otherwise leave 40 MB of the previous one
 * behind on someone's phone.
 *
 * Matched by exact name or by our own prefix, never broadly: the portfolio
 * shares this origin through its proxy, and its caches are not ours.
 */
async function pruneCaches(scope: string): Promise<void> {
  if (!('caches' in window)) return
  const stale = (name: string) =>
    (name.startsWith('platform-shards-') && name !== __SHARD_CACHE__) ||
    // stations.json's runtime cache, from before it was precached.
    name === 'stations-v1' ||
    // The precache under Workbox's default prefix, before `cacheId`.
    name === `workbox-precache-v2-${scope}`
  try {
    for (const name of await caches.keys()) {
      if (stale(name)) await caches.delete(name)
    }
  } catch {
    // Storage blocked or evicted mid-loop. Nothing is lost by stopping:
    // a stale cache is wasted space, not wrong data — its name is never read.
  }
}

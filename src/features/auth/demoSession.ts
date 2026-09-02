import type { AuthUser } from './types.ts'

const STORAGE_KEY = 'platform.demo-session'

/**
 * The stand-in traveller for preview mode.
 *
 * The id is a fixed uuid rather than a random one on purpose: it is the same
 * shape as a Supabase `auth.users.id`, and anything keyed by user — journeys
 * in localStorage today, rows behind row-level security later — has to survive
 * a reload the way a real user id does. Keeping the shape identical means the
 * switch to live auth changes where the id comes from and nothing else.
 */
export const DEMO_USER: AuthUser = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Demo traveller',
  email: 'demo@platform.local',
  avatarUrl: null,
}

export function readDemoSession(): AuthUser | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'open' ? DEMO_USER : null
  } catch {
    // Private browsing, or storage switched off. The demo still runs; it just
    // forgets on reload, which beats throwing during first paint.
    return null
  }
}

export function openDemoSession(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, 'open')
  } catch {
    /* see above */
  }
}

export function closeDemoSession(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* see above */
  }
}

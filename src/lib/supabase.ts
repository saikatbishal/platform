import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined

/**
 * Supabase renamed the browser-side key. `sb_publishable_...` is the current
 * one (Settings → API Keys); the old JWT-shaped `anon` key still works but is
 * deprecated at the end of 2026. Both are read so an older .env keeps running,
 * and the newer name wins if somebody sets both.
 */
const publishableKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)

/** The mock values shipped in .env read as "not configured", not as errors. */
const isPlaceholder = (v: string | undefined) =>
  !v || v.includes('YOUR_') || v.includes('__FILL') || v.endsWith('...')

/**
 * True once .env carries real Supabase values. The app must keep working
 * without them — frontend-first development means the whole UI, including the
 * signed-in half, is buildable and reviewable before any backend exists.
 * When this is false the app runs in demo mode (see features/auth/types.ts).
 */
export const isSupabaseConfigured = !isPlaceholder(url) && !isPlaceholder(publishableKey)

/**
 * This key is meant to be public — it is compiled into the bundle and anyone
 * can read it. What protects the data is row-level security in
 * supabase/schema.sql, not secrecy of the key: the database refuses to hand
 * over another user's journeys even if a query here is wrong.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, publishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // After Google redirects back, the session arrives in the URL;
        // this tells the client to pick it up and store it automatically.
        detectSessionInUrl: true,
      },
    })
  : null

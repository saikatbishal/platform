import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** The mock values shipped in .env read as "not configured", not as errors. */
const isPlaceholder = (v: string | undefined) =>
  !v || v.includes('YOUR_') || v.includes('__FILL') || v.endsWith('...')

/**
 * True once .env carries real Supabase values. The app must keep working
 * without them — frontend-first development means the whole UI, including the
 * sign-in screen, is buildable and reviewable before any backend exists.
 */
export const isSupabaseConfigured = !isPlaceholder(url) && !isPlaceholder(anonKey)

/**
 * The anon key is meant to be public. What protects the data is row-level
 * security in supabase/schema.sql, not secrecy of this key — the database
 * refuses to hand over another user's journeys even if a query here is wrong.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // After Google redirects back, the session arrives in the URL;
        // this tells the client to pick it up and store it automatically.
        detectSessionInUrl: true,
      },
    })
  : null

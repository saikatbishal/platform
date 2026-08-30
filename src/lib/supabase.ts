import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in.',
  )
}

/**
 * The anon key is meant to be public. What protects the data is row-level
 * security in supabase/schema.sql, not secrecy of this key — the database
 * refuses to hand over another user's journeys even if a query here is wrong.
 * That is why a frontend bug cannot become a data leak.
 */
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
})

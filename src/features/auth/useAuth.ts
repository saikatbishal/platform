import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase.ts'

export interface AuthUser {
  id: string
  name: string
  email: string
  avatarUrl: string | null
}

export type AuthStatus =
  /** No .env values yet — the UI renders, sign-in explains itself. */
  | 'unconfigured'
  /** Asking Supabase whether a session already exists (first paint). */
  | 'loading'
  | 'signed-out'
  /** The redirect to Google is in flight. */
  | 'redirecting'
  | 'signed-in'

export interface AuthState {
  status: AuthStatus
  user: AuthUser | null
  error: string | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

function toUser(raw: { id: string; email?: string; user_metadata?: Record<string, unknown> }): AuthUser {
  const meta = raw.user_metadata ?? {}
  return {
    id: raw.id,
    name: String(meta['full_name'] ?? meta['name'] ?? raw.email ?? 'Traveller'),
    email: raw.email ?? '',
    avatarUrl: typeof meta['avatar_url'] === 'string' ? (meta['avatar_url'] as string) : null,
  }
}

/**
 * The one place auth state lives.
 *
 * Google sign-in via Supabase is a redirect flow: the browser leaves for
 * Google's consent page, comes back to this app with a session in the URL,
 * and the Supabase client stores it. So there is no password, no form, and
 * nothing here ever sees a credential — this hook only asks "who is the
 * session for?" and exposes the two actions.
 */
export function useAuth(): AuthState {
  const [status, setStatus] = useState<AuthStatus>(isSupabaseConfigured ? 'loading' : 'unconfigured')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return

    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      if (data.session?.user) {
        setUser(toUser(data.session.user))
        setStatus('signed-in')
      } else {
        setStatus('signed-out')
      }
    })

    // Fires on sign-in (including the return from Google), sign-out, and
    // token refresh — the single subscription that keeps the UI truthful.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(toUser(session.user))
        setStatus('signed-in')
      } else {
        setUser(null)
        setStatus('signed-out')
      }
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return
    setError(null)
    setStatus('redirecting')
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          // Ask Google to skip re-consent for returning users: sign-in in
          // two clicks, not five.
          access_type: 'online',
          prompt: 'select_account',
        },
      },
    })
    if (err) {
      setError('Could not reach the sign-in service. Check your connection and try again.')
      setStatus('signed-out')
    }
    // On success the browser navigates away; no state to set here.
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    // onAuthStateChange resets the rest.
  }, [])

  return { status, user, error, signInWithGoogle, signOut }
}

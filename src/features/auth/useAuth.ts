import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase.ts'
import { closeDemoSession, openDemoSession, readDemoSession } from './demoSession.ts'
import type { AuthMode, AuthState, AuthStatus, AuthUser } from './types.ts'

export type { AuthMode, AuthState, AuthStatus, AuthUser } from './types.ts'

const MODE: AuthMode = isSupabaseConfigured ? 'live' : 'demo'

function toUser(raw: {
  id: string
  email?: string | undefined
  user_metadata?: Record<string, unknown> | undefined
}): AuthUser {
  const meta = raw.user_metadata ?? {}
  return {
    id: raw.id,
    name: String(meta['full_name'] ?? meta['name'] ?? raw.email ?? 'Traveller'),
    email: raw.email ?? '',
    avatarUrl: typeof meta['avatar_url'] === 'string' ? meta['avatar_url'] : null,
  }
}

/**
 * Google can also send you *back* with a refusal instead of a session — you
 * dismissed the consent screen, or the provider is misconfigured. That arrives
 * as `#error=...` in the URL, and if nobody reads it the app just sits there
 * signed out with no explanation, which is the worst version of this bug.
 */
function readRedirectError(): string | null {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(window.location.search)
  const pick = (k: string) => hash.get(k) ?? query.get(k)

  const kind = pick('error')
  if (!kind) return null

  if (kind === 'access_denied') {
    return 'You left Google without finishing. Nothing was saved — the button is still here when you want it.'
  }
  const detail = pick('error_description')?.replace(/\+/g, ' ')
  return detail
    ? `Google sent you back without a session: ${detail}`
    : 'Google sent you back without a session. Try once more, and if it keeps happening the redirect URL needs checking.'
}

/**
 * Drop the error out of the URL so a refresh does not resurrect a stale
 * message — and so the address bar stops showing the user a failure they have
 * already read. Any unrelated query string the app might carry survives.
 */
function clearRedirectError(): void {
  const query = new URLSearchParams(window.location.search)
  for (const key of ['error', 'error_code', 'error_description', 'state']) query.delete(key)
  const rest = query.toString()
  window.history.replaceState({}, '', window.location.pathname + (rest ? `?${rest}` : ''))
}

/**
 * The one place auth state lives. Read it through `useAuth()` in
 * `AuthProvider.tsx`, not by calling this twice.
 *
 * Live mode is a redirect flow: the browser leaves for Google's consent page,
 * comes back with a session in the URL, and the Supabase client stores it. No
 * password exists anywhere and this app never touches a credential — it only
 * ever asks "who is this session for?".
 *
 * Demo mode answers that question from localStorage instead, so the signed-in
 * half of the app is buildable before the backend exists.
 */
export function useAuthState(): AuthState {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      const demo = readDemoSession()
      setUser(demo)
      setStatus(demo ? 'signed-in' : 'signed-out')
      return
    }

    const redirectError = readRedirectError()
    if (redirectError) {
      setError(redirectError)
      clearRedirectError()
    }

    let cancelled = false
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      if (data.session?.user) {
        setUser(toUser(data.session.user))
        setStatus('signed-in')
      } else {
        setStatus('signed-out')
      }
    })

    // Fires on sign-in (including the return from Google), sign-out, and token
    // refresh — the single subscription that keeps the UI truthful.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(toUser(session.user))
        setStatus('signed-in')
        setError(null)
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

  const signIn = useCallback(async () => {
    setError(null)

    if (!supabase) {
      openDemoSession()
      setUser(readDemoSession())
      setStatus('signed-in')
      return
    }

    setStatus('redirecting')
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          // Skip re-consent for returning users: sign-in in two clicks, not five.
          access_type: 'online',
          prompt: 'select_account',
        },
      },
    })
    if (err) {
      setError('Could not reach the sign-in service. Check your connection and try again.')
      setStatus('signed-out')
    }
    // On success the browser navigates away; there is no state to set here.
  }, [])

  const signOut = useCallback(async () => {
    setError(null)

    if (!supabase) {
      closeDemoSession()
      setUser(null)
      setStatus('signed-out')
      return
    }

    const { error: err } = await supabase.auth.signOut()
    if (err) {
      // The local session is already gone in every case worth worrying about;
      // say what happened rather than leaving a menu that looks broken.
      setError('Signed out here, but the server did not confirm it. If you are on a shared device, close the browser too.')
    }
    // onAuthStateChange resets user and status.
  }, [])

  return { mode: MODE, status, user, error, signIn, signOut }
}

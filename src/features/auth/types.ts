/** Shared auth vocabulary. Lives apart from the hook so the demo-session
 *  module can speak it without importing React. */

export interface AuthUser {
  id: string
  name: string
  email: string
  avatarUrl: string | null
}

/**
 * Which backend identity is coming from.
 *
 * `live`  — Supabase has real values in .env; Google is the identity provider.
 * `demo`  — .env still holds placeholders. Sign-in opens a session that exists
 *           only in this browser, so every signed-in screen can be built and
 *           reviewed before a backend exists. Decided by `isSupabaseConfigured`
 *           at module load; there is no runtime toggle, and no way for demo
 *           mode to appear in a deployed build that has real env values.
 */
export type AuthMode = 'live' | 'demo'

export type AuthStatus =
  /** Asking whether a session already exists. First paint only. */
  | 'loading'
  | 'signed-out'
  /** The redirect to Google is in flight; the browser is about to leave. */
  | 'redirecting'
  | 'signed-in'

export interface AuthState {
  mode: AuthMode
  status: AuthStatus
  user: AuthUser | null
  /** Written in the user's language, not the provider's. Null when fine. */
  error: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

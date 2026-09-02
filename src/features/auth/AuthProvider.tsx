import { createContext, useContext, type ReactNode } from 'react'
import { useAuthState } from './useAuth.ts'
import type { AuthState } from './types.ts'

const AuthContext = createContext<AuthState | null>(null)

/**
 * One auth subscription for the whole tree. Calling `useAuthState()` in two
 * components would open two Supabase listeners and let them disagree for a
 * frame; everything that needs the user — the menu, and soon every journey
 * query — reads this instead.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthState()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth() was called outside <AuthProvider>. Wrap the app in main.tsx.')
  return value
}

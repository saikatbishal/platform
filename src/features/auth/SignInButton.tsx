import { useState } from 'react'
import { isSupabaseConfigured } from '@/lib/supabase.ts'

interface Props {
  onSignIn: () => Promise<void>
  redirecting: boolean
}

/** Google's "G", per their brand spec — the four official colours, unaltered. */
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

/**
 * The one way into the app. Google's sign-in branding rules ask for their
 * logo on a plain light or dark surface — so this button stays neutral on
 * purpose, and the surrounding card carries the app's character instead.
 */
export function SignInButton({ onSignIn, redirecting }: Props) {
  const [pressed, setPressed] = useState(false)
  const disabled = !isSupabaseConfigured || redirecting

  return (
    <div className="flex flex-col items-stretch gap-2.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setPressed(true)
          void onSignIn().finally(() => { setPressed(false) })
        }}
        className="flex min-h-11 items-center justify-center gap-3 rounded-sm border border-line-strong
                   bg-surface px-5 py-2.5 font-semibold text-ink
                   transition-[background-color,border-color] duration-150
                   hover:bg-surface-2 active:bg-surface-2
                   disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleG />
        <span>{redirecting || pressed ? 'Opening Google…' : 'Continue with Google'}</span>
      </button>

      {!isSupabaseConfigured && (
        <p className="text-center text-xs leading-relaxed text-ink-faint">
          Sign-in isn&rsquo;t wired to a backend yet — fill in <code className="text-ink-soft">.env</code> and
          follow <code className="text-ink-soft">docs/09-auth-go-live.md</code>.
        </p>
      )}
    </div>
  )
}

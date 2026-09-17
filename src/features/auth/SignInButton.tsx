import { useEffect, useState } from 'react'
import type { AuthMode } from './types.ts'

interface Props {
  mode: AuthMode
  onSignIn: () => Promise<void>
  redirecting: boolean
  /**
   * `panel` is the full-width button with its label, for a context that has
   * already earned the ask — nothing currently calls it with `panel` inside
   * `src/`, but the branch stays: a settings screen or the future share page
   * (docs/00-decisions.md, decision 15) is exactly the kind of place a
   * labelled sign-in button belongs. `icon` is the corner affordance for
   * someone who has not asked for anything yet: the map is the pitch, and
   * sign-in should be available without being the first thing on screen.
   */
  variant?: 'panel' | 'icon'
  /**
   * `icon` only. True once this person has something on the device worth
   * losing — the `mine > 0` gate App.tsx already uses elsewhere. Adds a small
   * dot to the mark, and a tooltip that opens by itself for four seconds on
   * mount (and again if `nudge` turns true later in the same session), then
   * closes on its own — a nudge, not a banner: it does not wait to be
   * dismissed, and hovering the icon reopens the same tooltip independently
   * of that timer, at any point.
   */
  nudge?: boolean
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
 * Sign-in. No longer the way INTO the app — the map and the add-journey flow
 * both work without an account, and journeys logged that way are merged into
 * the account on first sign-in (see journeyStorage.mergeJourneys). This is the
 * way to stop losing them to one browser.
 *
 * Google's branding rules ask for their logo on a plain light or dark surface,
 * so the button stays neutral on purpose and whatever surrounds it carries the
 * app's character instead.
 *
 * In demo mode the Google mark is gone, because nothing about that session
 * involves Google and a borrowed logo would be a lie about where your data is.
 */
export function SignInButton({ mode, onSignIn, redirecting, variant = 'panel', nudge = false }: Props) {
  const [pressed, setPressed] = useState(false)
  const busy = redirecting || pressed
  const demo = mode === 'demo'

  const start = () => {
    setPressed(true)
    void onSignIn().finally(() => {
      setPressed(false)
    })
  }

  /*
   * `pressed` has the same bfcache bug `useAuth.ts` fixes for `redirecting`,
   * and fixing only that one is not enough — `busy` is `redirecting ||
   * pressed`, so a `pressed` stuck at `true` disables this button on its own.
   * It gets stuck the same way: click, land on Google, hit the browser's Back
   * button instead of cancelling, and most browsers restore this exact
   * component instance from the back/forward cache rather than remounting it
   * — so the `.finally()` above never runs, because the `onSignIn()` promise
   * it was chained to never settles; the request it was waiting on died with
   * the navigation away. `pageshow` with `event.persisted` is the signal that
   * restore happened; clearing `pressed` there is the direct fix, independent
   * of whatever useAuth.ts's own listener does for `redirecting`.
   */
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPressed(false)
    }
    window.addEventListener('pageshow', onPageShow)
    return () => { window.removeEventListener('pageshow', onPageShow) }
  }, [])

  /*
   * The tooltip's two independent ways of opening.
   *
   * `autoShown` fires once whenever `nudge` turns true — on mount, if this
   * visitor already had journeys before this load, or later in the same
   * session the moment they log their first one — and clears itself after
   * exactly 4000ms no matter what else is happening, per the instruction
   * that this closes itself rather than waiting for a dismissal. `hovered`
   * is unrelated to that timer: hovering the icon shows the same tooltip for
   * as long as the pointer stays there, on its own schedule, whether that is
   * during the automatic 4 seconds or an hour later. `open` is just whichever
   * of the two is currently true.
   */
  const [autoShown, setAutoShown] = useState(false)
  const [hovered, setHovered] = useState(false)
  useEffect(() => {
    if (!nudge) return
    setAutoShown(true)
    const timer = setTimeout(() => { setAutoShown(false) }, 4000)
    return () => { clearTimeout(timer) }
  }, [nudge])
  const tooltipOpen = nudge && (autoShown || hovered)

  /*
   * The corner variant. A bare mark with no text is weak affordance, so the
   * accessible name is carried by aria-label and the native title tooltip
   * rather than left to the logo — and in demo mode there is no Google logo to
   * lean on at all, because nothing about that session involves Google, so it
   * falls back to the word.
   */
  if (variant === 'icon') {
    const nudgeText = 'Sign in to save and sync across devices'
    const name = demo
      ? 'Look around with sample journeys'
      : nudge
        ? nudgeText
        : 'Sign in with Google'
    return (
      <button
        type="button"
        disabled={busy}
        onClick={start}
        onMouseEnter={() => { setHovered(true) }}
        onMouseLeave={() => { setHovered(false) }}
        onFocus={() => { setHovered(true) }}
        onBlur={() => { setHovered(false) }}
        aria-label={name}
        // The native browser tooltip is dropped once there is a custom one to
        // show — two overlapping tooltips on one hover reads as a bug, not two
        // features. Screen readers still get the sentence from aria-label
        // either way, so nothing here is accessible only visually.
        title={nudge ? undefined : name}
        className={`relative flex min-h-11 items-center justify-center gap-2 rounded-sm border border-line
                    bg-surface/90 backdrop-blur-sm transition-colors duration-150
                    hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60
                    ${demo ? 'px-3' : 'size-11'}`}
      >
        {demo ? (
          <span className="text-label font-semibold tracking-label text-ink-soft uppercase">Sign in</span>
        ) : (
          <GoogleG />
        )}
        {nudge && (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 size-2 rounded-full bg-board ring-2 ring-surface"
          />
        )}
        {nudge && (
          /* Decorative — the sentence itself lives in aria-label above, so a
             screen reader already has it without this element existing.
             pointer-events-none for the same reason the badge dot is
             harmless: nothing here should ever be able to intercept a tap
             meant for the map underneath, and this bubble sits low enough
             (top-3 right-3 corner, dropping below the icon) that it never
             overlaps the map's own controls. */
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute top-full right-0 z-10 mt-2 w-max max-w-56
                        rounded-sm border border-line bg-surface px-2.5 py-1.5 text-left text-xs
                        leading-relaxed text-ink-soft shadow-lg transition-[opacity,transform]
                        duration-150
                        ${tooltipOpen ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'}`}
          >
            {nudgeText}
          </span>
        )}
      </button>
    )
  }

  const label = demo
    ? 'Look around with sample journeys'
    : busy
      ? 'Opening Google…'
      : 'Continue with Google'

  return (
    <div className="flex flex-col items-stretch gap-2.5">
      <button
        type="button"
        disabled={busy}
        onClick={start}
        className="flex min-h-11 items-center justify-center gap-3 rounded-sm border border-line-strong
                   w-full bg-surface-2 px-5 py-2.5 font-semibold text-ink
                   transition-[background-color,border-color] duration-150
                   hover:bg-line active:bg-line
                   disabled:cursor-not-allowed disabled:opacity-60"
      >
        {!demo && <GoogleG />}
        <span>{label}</span>
      </button>

      {demo && (
        <p className="text-center text-xs leading-relaxed text-ink-faint">
          Google sign-in isn&rsquo;t connected yet, so this session lives in this browser
          alone. Turning it on is <code className="text-ink-soft">docs/09-auth-go-live.md</code>.
        </p>
      )}
    </div>
  )
}

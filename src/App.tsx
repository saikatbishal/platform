import { useCallback, useState } from 'react'
import { IndiaMap } from '@/features/map/IndiaMap.tsx'
import { SAMPLE_JOURNEYS } from '@/features/journeys/sampleJourneys.ts'
import { useAuth } from '@/features/auth/AuthProvider.tsx'
import { SignInButton } from '@/features/auth/SignInButton.tsx'
import { UserMenu } from '@/features/auth/UserMenu.tsx'
import { StationBoard, BoardBracket } from '@/components/StationBoard.tsx'
import { PlatformCanopy } from '@/components/PlatformCanopy.tsx'
import { useTimeOfDayTheme } from '@/features/theme/useTheme.ts'
import { formatKm } from '@/lib/distance.ts'

interface Stats { km: number; stations: number; states: number }

export default function App() {
  const [stats, setStats] = useState<Stats>({ km: 0, stations: 0, states: 0 })
  // The board can be taken down. Signed out, the map underneath is the whole
  // pitch, and a first-time visitor should be able to look at it without
  // dismissing anything permanently — so this is a hinge, not a dismissal, and
  // it deliberately does not persist: a returning visitor gets the way in back.
  const [boardUp, setBoardUp] = useState(true)
  const onStats = useCallback((s: Stats) => { setStats(s) }, [])
  const auth = useAuth()
  // The palette follows the clock, not the OS and not a switch. One call, at
  // the root; see src/features/theme/timeOfDay.ts for why 06:00 and 18:00.
  useTimeOfDayTheme()

  const signedIn = auth.status === 'signed-in'
  const demo = auth.mode === 'demo'
  // Signed out, the app demos itself with sample journeys rather than showing
  // a wall. Once real data exists this becomes: signedIn ? journeys : SAMPLE.
  const journeys = SAMPLE_JOURNEYS

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-ground">
      <IndiaMap journeys={journeys} onStats={onStats} />

      <header className="pointer-events-none absolute top-3 left-3 flex w-fit overflow-hidden rounded-sm border-2 border-line-strong">
        <span className="bg-accent px-3 py-1.5 text-xs font-semibold tracking-[0.14em] text-ground uppercase">
          Platform
        </span>
        <span className="bg-surface px-3 py-1.5 text-xs font-semibold tracking-[0.14em] text-ink-soft uppercase">
          v0.1
        </span>
      </header>

      {signedIn && auth.user && (
        <div className="pointer-events-auto absolute top-3 right-3">
          <UserMenu user={auth.user} onSignOut={auth.signOut} />
        </div>
      )}

      {!signedIn && auth.status !== 'loading' && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-48 flex justify-center px-4 sm:inset-x-auto sm:right-4 sm:top-16 sm:bottom-auto sm:px-0">
          {/* Bottom-anchored on a phone so the button is in thumb reach, but
              clear of the map's own furniture: the zoom/fit/sea stack is four
              40px buttons at bottom-3, so it ends 174px up, and bottom-48
              (192px) is the first step that leaves it fully tappable. The
              stat tiles at bottom-3 clear too. On sm and up the card moves to
              the top-right corner, where nothing else lives. */}
          {/* The way in is a station name board hung off a bracket, not a
              generic auth card. Structure borrowed from Relume's Log In 3
              (mark above, one column, heading + description, stacked actions)
              and then rebuilt on this project's tokens — the library itself
              stays out, per docs/00-decisions.md. */}
          {boardUp ? (
            <section
              aria-label="Sign in"
              className="relative w-full max-w-sm overflow-hidden rounded-sm border border-line bg-surface shadow-2xl"
            >
              <PlatformCanopy />

              <button
                type="button"
                onClick={() => { setBoardUp(false) }}
                aria-label="Take the board down and look at the map"
                className="absolute top-0 right-0 z-10 grid size-11 place-items-center text-ink-faint
                           transition-colors duration-150 hover:text-ink"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M1 1 L11 11 M11 1 L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>

              <div className="relative px-4 pt-9 pb-5 sm:px-5">
                <BoardBracket />
                <StationBoard
                  devanagari="प्लेटफ़ॉर्म"
                  latin="Platform"
                  regional="প্ল্যাটফর্ম"
                  code="PF"
                  zone="EST 2026"
                />

                <h1 className="mt-5 mb-0 text-lg leading-snug font-extrabold tracking-tight text-ink">
                  Your rail life, on one map.
                </h1>
                <p className="mt-1.5 mb-4 text-sm leading-relaxed text-ink-soft">
                  Log a journey in fifteen seconds and watch India fill in.
                  The map behind this board is a preview with sample journeys.
                </p>

                <SignInButton
                  mode={auth.mode}
                  onSignIn={auth.signIn}
                  redirecting={auth.status === 'redirecting'}
                />
                {auth.error && (
                  <p className="mt-2.5 mb-0 text-xs leading-relaxed text-vermillion">{auth.error}</p>
                )}
              </div>
            </section>
          ) : (
            <button
              type="button"
              onClick={() => { setBoardUp(true) }}
              className="relative flex min-h-11 items-center gap-2.5 rounded-[2px] bg-board px-3.5 py-2
                         shadow-[0_2px_0_0_rgba(18,40,63,0.35)] ring-2 ring-board-edge ring-inset
                         transition-transform duration-150 hover:-translate-y-px"
            >
              <span className="text-[0.6875rem] font-bold tracking-[0.2em] text-board-ink">PF</span>
              <span className="h-3.5 w-px bg-board-ink/30" />
              <span className="text-[0.8125rem] font-extrabold tracking-[0.1em] text-board-ink uppercase">
                Sign in
              </span>
            </button>
          )}
        </div>
      )}

      <section
        aria-label="Your totals"
        className="pointer-events-none absolute bottom-3 left-3 flex overflow-hidden rounded-sm border border-line bg-surface"
      >
        {([
          ['Kilometres', formatKm(stats.km).replace(' km', '')],
          ['Stations', stats.stations.toLocaleString('en-IN')],
          ['States', String(stats.states)],
        ] as const).map(([label, value]) => (
          <div key={label} className="border-r border-line px-4 py-3 last:border-r-0">
            <span className="tabular block text-2xl leading-none text-cream">{value}</span>
            <span className="mt-1.5 block text-[0.6rem] font-semibold tracking-[0.15em] text-ink-faint uppercase">
              {label}
            </span>
          </div>
        ))}
        {(demo || !signedIn) && (
          <div className="grid place-items-center border-l border-line bg-surface-2 px-3">
            <span className="text-[0.6rem] font-semibold tracking-[0.13em] text-ink-faint uppercase">
              {signedIn ? 'Demo' : 'Sample'}
            </span>
          </div>
        )}
      </section>
    </main>
  )
}

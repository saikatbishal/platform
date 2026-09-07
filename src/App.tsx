import { useCallback, useState } from 'react'
import { IndiaMap } from '@/features/map/IndiaMap.tsx'
import { useMapData } from '@/features/map/useMapData.ts'
import { SAMPLE_JOURNEYS } from '@/features/journeys/sampleJourneys.ts'
import { useAuth } from '@/features/auth/AuthProvider.tsx'
import { SignInButton } from '@/features/auth/SignInButton.tsx'
import { UserMenu } from '@/features/auth/UserMenu.tsx'
import { StationBoard, BoardBracket } from '@/components/StationBoard.tsx'
import { PlatformCanopy } from '@/components/PlatformCanopy.tsx'
import { useTimeOfDayTheme } from '@/features/theme/useTheme.ts'
import { formatKm } from '@/lib/distance.ts'

interface Stats {
  km: number
  stations: number
  states: number
  /** Journeys the map could not draw — see route.ts's RouteFailure. Counted
      separately rather than folded into the totals, because a journey that
      contributes 0 km to a number labelled "Kilometres" is a wrong number,
      not a missing one. */
  uncounted: number
}

export default function App() {
  const [stats, setStats] = useState<Stats>({ km: 0, stations: 0, states: 0, uncounted: 0 })
  // The board can be taken down. Signed out, the map underneath is the whole
  // pitch, and a first-time visitor should be able to look at it without
  // dismissing anything permanently — so this is a hinge, not a dismissal, and
  // it deliberately does not persist: a returning visitor gets the way in back.
  const [boardUp, setBoardUp] = useState(true)
  const onStats = useCallback((s: Stats) => { setStats(s) }, [])
  // Loaded here rather than inside IndiaMap so there is exactly one fetch of
  // the 8,696 stations and the rail graph for the whole app — the map draws
  // from it, and the add-journey flow will search the same station list.
  const { data: mapData, error: mapError, loadDistricts } = useMapData()
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
      <IndiaMap
        journeys={journeys}
        data={mapData}
        error={mapError}
        loadDistricts={loadDistricts}
        onStats={onStats}
      />

      {/* Roadmap Phase 1, item 8. This was the loudest thing on screen and it
          said "v0.1": full-strength accent on a 2px border, spending the one
          colour that means "you have travelled this" on a version number. It
          is now ink on surface with a hairline, and the radii nest properly —
          outer 2px, border 1px, inner 1px, so the inner corner is concentric
          with the outer instead of sitting inside a fatter curve. The yellow
          belongs to the route. */}
      <header className="pointer-events-none absolute top-3 left-3 flex w-fit overflow-hidden rounded-[2px] border border-line bg-surface/90 backdrop-blur-sm">
        <span className="rounded-l-[1px] px-2.5 py-1.5 text-label font-semibold tracking-label text-ink uppercase">
          Platform
        </span>
        <span className="rounded-r-[1px] border-l border-line px-2.5 py-1.5 text-label font-semibold tracking-label text-ink-faint uppercase">
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
              <span className="font-mono text-label font-semibold tracking-code text-board-ink">PF</span>
              <span className="h-3.5 w-px bg-board-ink/30" />
              <span className="text-sm font-extrabold tracking-label text-board-ink uppercase">
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
            <span className="mt-1.5 block text-label font-semibold tracking-label text-ink-faint uppercase">
              {label}
            </span>
          </div>
        ))}
        {stats.uncounted > 0 && (
          <div
            className="grid place-items-center border-l border-line bg-surface-2 px-3"
            title={
              `${stats.uncounted} ${stats.uncounted === 1 ? 'journey is' : 'journeys are'} not ` +
              'included in these totals: the rail graph has no route for them, so their ' +
              'distance and stops are unknown rather than zero. Their end stations are ' +
              'drawn hollow on the map.'
            }
          >
            <span className="tabular block text-center text-sm leading-none text-oxide">
              {stats.uncounted}
            </span>
            <span className="mt-1 block text-label font-semibold tracking-label text-ink-faint uppercase">
              Not drawn
            </span>
          </div>
        )}
        {(demo || !signedIn) && (
          <div className="grid place-items-center border-l border-line bg-surface-2 px-3">
            <span className="text-label font-semibold tracking-label text-ink-faint uppercase">
              {signedIn ? 'Demo' : 'Sample'}
            </span>
          </div>
        )}
      </section>
    </main>
  )
}

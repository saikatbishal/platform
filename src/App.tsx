import { useCallback, useMemo, useState } from 'react'
import { IndiaMap } from '@/features/map/IndiaMap.tsx'
import { useMapData } from '@/features/map/useMapData.ts'
import { SAMPLE_JOURNEYS } from '@/features/journeys/sampleJourneys.ts'
import { useJourneys } from '@/features/journeys/useJourneys.ts'
import { AddJourneyForm } from '@/features/journeys/AddJourneyForm.tsx'
import { useAuth } from '@/features/auth/AuthProvider.tsx'
import { SignInButton } from '@/features/auth/SignInButton.tsx'
import { UserMenu } from '@/features/auth/UserMenu.tsx'
import { StationBoard, BoardBracket } from '@/components/StationBoard.tsx'
import { PlatformCanopy } from '@/components/PlatformCanopy.tsx'
import { useTimeOfDayTheme } from '@/features/theme/useTheme.ts'
import { formatKm } from '@/lib/distance.ts'
import { evaluateMilestones } from '@/features/stats/milestones.ts'
import { Milestones } from '@/features/stats/Milestones.tsx'
import { PassportCard } from '@/features/passport/PassportCard.tsx'

interface Stats {
  km: number
  longestKm: number
  stations: number
  states: number
  /** Journeys the map could not draw — see route.ts's RouteFailure. Counted
      separately rather than folded into the totals, because a journey that
      contributes 0 km to a number labelled "Kilometres" is a wrong number,
      not a missing one. */
  uncounted: number
}

export default function App() {
  const [stats, setStats] = useState<Stats>({ km: 0, longestKm: 0, stations: 0, states: 0, uncounted: 0 })
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
  /*
   * Journeys are stored per user id, so two people sharing a browser — or one
   * person with two accounts — never see each other's travel. See
   * useJourneys.ts; it is still localStorage rather than Supabase, and it is
   * still the only file that changes when that lands.
   */
  const store = useJourneys(auth.user?.id ?? null)
  /*
   * The samples are a fallback for an empty map, not seed data written into
   * anyone's storage. A visitor with nothing logged gets a map that shows what
   * the app is for; the moment they log something it is theirs alone. A
   * signed-in user with nothing logged gets the real empty map, because
   * showing them someone else's sample travel as though it were theirs is
   * worse than showing them nothing.
   */
  const showingSamples = store.journeys.length === 0 && !signedIn
  const journeys = showingSamples ? SAMPLE_JOURNEYS : store.journeys
  const [entryOpen, setEntryOpen] = useState(false)
  const [milestonesOpen, setMilestonesOpen] = useState(false)
  const [passportOpen, setPassportOpen] = useState(false)
  // Card view at sm and up always shows all four — this only governs the
  // phone list, and starts collapsed so the totals don't compete with the
  // sign-in card and the log-journey/milestones buttons for the same strip
  // of screen on first open.
  const [statsExpanded, setStatsExpanded] = useState(false)
  const milestones = useMemo(
    () => evaluateMilestones({ km: stats.km, stations: stats.stations, states: stats.states, journeys }),
    [stats.km, stats.stations, stats.states, journeys],
  )

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

      {/* Stacked bottom-up in one flex column, not three independently
          positioned elements at fixed pixel offsets: the stats list below is
          one row on a wide screen but up to six on a phone, and a fixed
          `bottom-40`/`bottom-24` tuned for the short version is exactly what
          let the tall version paint over these buttons. First DOM child sits
          visually lowest with `flex-col-reverse`, so stats stays first here
          and everything else stacks above however tall it turns out to be. */}
      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-col-reverse items-start gap-2">
        <section
          aria-label="Your totals"
          className="flex flex-col overflow-hidden rounded-sm border border-line bg-surface sm:flex-row"
        >
          {/* Kilometres always shows and doubles as the phone list's
              expand/collapse control — a `<button>` rather than a `<div>` so
              the whole row is one thumb-sized tap target, not a tiny
              chevron. Inert at sm and up, where the card view never
              collapses and this control would have nothing to do. */}
          <button
            type="button"
            onClick={() => { setStatsExpanded((e) => !e) }}
            aria-expanded={statsExpanded}
            className="pointer-events-auto flex items-baseline gap-1.5 border-b border-line px-3 py-2 text-left last:border-b-0 sm:pointer-events-none sm:flex-col-reverse sm:items-start sm:gap-0 sm:border-b-0 sm:border-r sm:py-3 sm:last:border-r-0"
          >
            <span className="text-label font-semibold tracking-label text-ink-faint uppercase sm:mt-1.5">
              Kilometres
            </span>
            <span className="text-ink-faint sm:hidden">–</span>
            <span className="tabular text-sm leading-none text-cream sm:text-xl">
              {formatKm(stats.km).replace(' km', '')}
            </span>
            <span aria-hidden="true" className="ml-auto text-ink-faint sm:hidden">
              {statsExpanded ? '▾' : '▸'}
            </span>
          </button>
          {([
            ['Stations', stats.stations.toLocaleString('en-IN')],
            ['States', String(stats.states)],
            ['Longest', formatKm(stats.longestKm).replace(' km', '')],
          ] as const).map(([label, value]) => (
            <div
              key={label}
              className={`${statsExpanded ? 'flex' : 'hidden'} items-baseline gap-1.5 border-b border-line px-3 py-2 last:border-b-0 sm:flex sm:flex-col-reverse sm:items-start sm:gap-0 sm:border-b-0 sm:border-r sm:py-3 sm:last:border-r-0`}
            >
              <span className="text-label font-semibold tracking-label text-ink-faint uppercase sm:mt-1.5">
                {label}
              </span>
              <span className="text-ink-faint sm:hidden">–</span>
              <span className="tabular text-sm leading-none text-cream sm:text-xl">{value}</span>
            </div>
          ))}
          {stats.uncounted > 0 && (
            <div
              className={`${statsExpanded ? 'flex' : 'hidden'} items-baseline gap-1.5 border-b border-line bg-surface-2 px-3 py-2 last:border-b-0 sm:flex sm:flex-col-reverse sm:items-center sm:gap-0 sm:border-b-0 sm:border-l sm:py-3`}
              title={
                `${stats.uncounted} ${stats.uncounted === 1 ? 'journey is' : 'journeys are'} not ` +
                'included in these totals: the rail graph has no route for them, so their ' +
                'distance and stops are unknown rather than zero. Their end stations are ' +
                'drawn hollow on the map.'
              }
            >
              <span className="text-label font-semibold tracking-label text-ink-faint uppercase sm:mt-1">
                Not drawn
              </span>
              <span className="text-ink-faint sm:hidden">–</span>
              <span className="tabular text-sm leading-none text-oxide">{stats.uncounted}</span>
            </div>
          )}
          {(demo || showingSamples) && (
            <div className={`${statsExpanded ? 'block' : 'hidden'} border-b border-line bg-surface-2 px-3 py-2 last:border-b-0 sm:flex sm:items-center sm:justify-center sm:border-b-0 sm:border-l sm:py-3`}>
              <span className="text-label font-semibold tracking-label text-ink-faint uppercase">
                {/* "Sample" only while the samples are actually what is drawn —
                    once someone logs a journey the totals are their own, and
                    labelling them a sample would be a lie. */}
                {showingSamples ? 'Sample' : 'Demo'}
              </span>
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={() => { setEntryOpen(true) }}
          className="pointer-events-auto rounded-sm border border-line bg-surface px-4 py-3 text-label font-semibold tracking-label text-ink uppercase hover:bg-surface-2 hover:text-accent"
        >
          + Log a journey
        </button>

        <div className="pointer-events-auto flex gap-2">
          <button
            type="button"
            onClick={() => { setMilestonesOpen(true) }}
            className="rounded-sm border border-line bg-surface px-3 py-2 text-label font-semibold tracking-label text-ink-soft uppercase hover:bg-surface-2 hover:text-accent"
          >
            Milestones
          </button>
          <button
            type="button"
            onClick={() => { setPassportOpen(true) }}
            disabled={!mapData}
            className="rounded-sm border border-line bg-surface px-3 py-2 text-label font-semibold tracking-label text-ink-soft uppercase hover:bg-surface-2 hover:text-accent disabled:opacity-40"
          >
            Passport card
          </button>
        </div>
      </div>

      {milestonesOpen && (
        <div className="pointer-events-auto absolute inset-0 z-20 flex items-end justify-center bg-ground/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
          <div className="max-h-[88dvh] w-full overflow-auto rounded-t-lg border border-line bg-surface p-5 sm:max-w-md sm:rounded-lg">
            <h2 className="mb-4 text-label font-semibold tracking-label text-ink-faint uppercase">
              Milestones
            </h2>
            <Milestones milestones={milestones} onClose={() => { setMilestonesOpen(false) }} />
          </div>
        </div>
      )}

      {passportOpen && mapData && (
        <div className="pointer-events-auto absolute inset-0 z-20 flex items-end justify-center bg-ground/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
          <div className="max-h-[88dvh] w-full overflow-auto rounded-t-lg border border-line bg-surface p-5 sm:max-w-md sm:rounded-lg">
            <h2 className="mb-4 text-label font-semibold tracking-label text-ink-faint uppercase">
              Passport card
            </h2>
            <PassportCard
              data={mapData}
              journeys={journeys}
              stats={stats}
              onClose={() => { setPassportOpen(false) }}
            />
          </div>
        </div>
      )}

      {entryOpen && (
        <div className="pointer-events-auto absolute inset-0 z-20 flex items-end justify-center bg-ground/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
          <div className="max-h-[88dvh] w-full overflow-auto rounded-t-lg border border-line bg-surface p-5 sm:max-w-md sm:rounded-lg">
            <h2 className="mb-4 text-label font-semibold tracking-label text-ink-faint uppercase">
              Log a journey
            </h2>
            <AddJourneyForm
              stations={mapData?.stations}
              onAdd={(draft) => {
                store.add(draft, mapData?.graph ?? null)
                setEntryOpen(false)
              }}
              onClose={() => { setEntryOpen(false) }}
            />
          </div>
        </div>
      )}

    </main>
  )
}

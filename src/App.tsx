import { useCallback, useMemo, useRef, useState } from 'react'
import { IndiaMap, type IndiaMapHandle } from '@/features/map/IndiaMap.tsx'
import { useMapData } from '@/features/map/useMapData.ts'
import { SAMPLE_JOURNEYS } from '@/features/journeys/sampleJourneys.ts'
import { useJourneys } from '@/features/journeys/useJourneys.ts'
import { AddJourneyForm } from '@/features/journeys/AddJourneyForm.tsx'
import { useAuth } from '@/features/auth/AuthProvider.tsx'
import { SignInButton } from '@/features/auth/SignInButton.tsx'
import { UserMenu } from '@/features/auth/UserMenu.tsx'
import { JourneysSheet } from '@/components/JourneysSheet.tsx'
import { useTimeOfDayTheme } from '@/features/theme/useTheme.ts'
import { formatKm } from '@/lib/distance.ts'
import { evaluateMilestones } from '@/features/stats/milestones.ts'
import { Milestones } from '@/features/stats/Milestones.tsx'
import { RailPass } from '@/features/railpass/RailPass.tsx'

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
   * the app is for; the moment they log something — signed in or not — it is
   * theirs alone. A signed-in user with nothing logged gets the real empty
   * map, because showing them someone else's sample travel as though it were
   * theirs is worse than showing them nothing.
   *
   * `mine` is the honest count of this person's own journeys, and it is what
   * gates the chrome below. Signed out is no longer the same thing as having
   * nothing: an unsigned visitor can log journeys, and they are as real as
   * anyone's.
   */
  const mine = store.journeys.length
  const showingSamples = mine === 0 && !signedIn
  const journeys = showingSamples ? SAMPLE_JOURNEYS : store.journeys
  const [entryOpen, setEntryOpen] = useState(false)
  const [milestonesOpen, setMilestonesOpen] = useState(false)
  const [railPassOpen, setRailPassOpen] = useState(false)
  /**
   * The route whose tooltip was opened to full detail — there is no
   * standalone "browse everything" entry point, only a route's own tooltip.
   * Captured as the station pair, not the clicked journey's id: removing
   * that specific journey inside the sheet must not break the lookup for
   * the others still on the same route.
   */
  const [routeTarget, setRouteTarget] = useState<{ initialJourneyId: string; fromCode: string; toCode: string } | null>(null)
  const mapRef = useRef<IndiaMapHandle>(null)
  /** Every journey between the same two stations, either direction — a
      round trip traces the same line on the map, so it reads as one route,
      not two. */
  const routeJourneys = useMemo(() => {
    if (!routeTarget) return []
    return journeys.filter((j) =>
      (j.fromCode === routeTarget.fromCode && j.toCode === routeTarget.toCode) ||
      (j.fromCode === routeTarget.toCode && j.toCode === routeTarget.fromCode),
    )
  }, [routeTarget, journeys])
  // Card view at sm and up always shows all four — this only governs the
  // phone list, and starts collapsed so the totals don't compete with the
  // sign-in card and the log-journey/milestones buttons for the same strip
  // of screen on first open.
  const [statsExpanded, setStatsExpanded] = useState(false)
  const milestones = useMemo(
    () => evaluateMilestones({ km: stats.km, stations: stats.stations, states: stats.states, journeys }),
    [stats.km, stats.stations, stats.states, journeys],
  )

  /*
   * The primary action, declared once and placed twice: bottom-right on a
   * phone (where the +/-/Fit stack used to be) and in the bottom-left stack on
   * anything wider, above Milestones and Rail pass.
   *
   * Thumb reach is the whole argument. On a phone held one-handed the
   * bottom-right corner is the easiest thing on the screen to hit and the
   * bottom-left is the hardest, and the one thing this screen wants a visitor
   * to do should not be in the hardest corner. On a desktop the pointer makes
   * every corner equal, so it stays grouped with the other two buttons where
   * the grouping means something.
   */
  const addJourney = (
    <button
      type="button"
      onClick={() => { setEntryOpen(true) }}
      className="rounded-sm border border-line bg-surface px-4 py-3 text-label font-semibold tracking-label text-ink uppercase hover:bg-surface-2 hover:text-accent"
    >
      {/* "your" the first time, because it is an invitation; "a" after that,
          because it is a repeat action and "your" starts to sound like the app
          is introducing itself again. */}
      {mine === 0 ? '+ Add your journey' : '+ Add a journey'}
    </button>
  )

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-ground">
      <IndiaMap
        ref={mapRef}
        journeys={journeys}
        data={mapData}
        error={mapError}
        loadDistricts={loadDistricts}
        onStats={onStats}
        onOpenJourneyModal={(journeyId) => {
          const clicked = journeys.find((j) => j.id === journeyId)
          if (!clicked) return
          setRouteTarget({ initialJourneyId: journeyId, fromCode: clicked.fromCode, toCode: clicked.toCode })
        }}
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

      {/* The map is the pitch, so sign-in is a corner affordance rather than a
          wall. The station-name board that used to stand here — canopy,
          bracket, headline and all — was the loudest thing on the screen and
          it asked for a decision before anyone had seen what they were
          deciding about. The components survive in src/components/ for the
          share page; what changed is that nothing now stands between a first
          visit and the map. The ask moves to the point where it has been
          earned: the save prompt at the bottom-left, once journeys exist. */}
      {!signedIn && auth.status !== 'loading' && (
        <div className="pointer-events-auto absolute top-3 right-3 flex flex-col items-end gap-1.5">
          <SignInButton
            mode={auth.mode}
            onSignIn={auth.signIn}
            redirecting={auth.status === 'redirecting'}
            variant="icon"
          />
          {auth.error && (
            <p className="mb-0 max-w-56 rounded-sm border border-line bg-surface/90 px-2 py-1.5 text-right text-xs leading-relaxed text-vermillion backdrop-blur-sm">
              {auth.error}
            </p>
          )}
        </div>
      )}

      {/* `bottom-16` on phones, `bottom-3` from sm up. On a phone the primary
          action now sits at bottom-right on the same line this stack would
          occupy, and on a 320-360px screen the totals row plus that button is
          wider than the viewport — so the stack lifts clear of it rather than
          relying on both staying narrow. On a wide screen nothing shares that
          line and it sits in the corner as before.

          Stacked bottom-up in one flex column, not three independently
          positioned elements at fixed pixel offsets: the stats list below is
          one row on a wide screen but up to six on a phone, and a fixed
          `bottom-40`/`bottom-24` tuned for the short version is exactly what
          let the tall version paint over these buttons. First DOM child sits
          visually lowest with `flex-col-reverse`, so stats stays first here
          and everything else stacks above however tall it turns out to be. */}
      <div className="pointer-events-none absolute bottom-16 left-3 flex flex-col-reverse items-start gap-2 sm:bottom-3">
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

        {/* Ordering here is bottom-up (flex-col-reverse, first child lowest):
            totals, then milestones and the pass, then — on sm and up only —
            the primary action, then the save prompt. "Add your journey" sits
            ABOVE the two secondary buttons rather than under them, because it
            is the only thing on this screen a new visitor should feel any pull
            toward. On a phone it is not in this stack at all; it is in the
            bottom-right corner.

            What gates these is `mine`, not `signedIn`. An unsigned visitor can
            log journeys now, and the moment they have one the milestones and
            the pass are about their travel, so they appear. At zero they stay
            hidden: milestones would be counting progress against somebody
            else's sample journeys, and the pass would hand out a shareable
            card reading 0 km / 0 stations / 0 states, which looks broken
            rather than empty. */}
        {mine > 0 && (
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
              onClick={() => { setRailPassOpen(true) }}
              disabled={!mapData}
              className="rounded-sm border border-line bg-surface px-3 py-2 text-label font-semibold tracking-label text-ink-soft uppercase hover:bg-surface-2 hover:text-accent disabled:opacity-40"
            >
              Rail pass
            </button>
          </div>
        )}

        {/* On a phone this button is not here — it is bottom-right, in the
            corner the map's zoom stack used to hold. Rendered from one
            `addJourney` element in both places rather than written twice, so
            the label and the handler cannot drift apart. */}
        <div className="pointer-events-auto hidden sm:block">{addJourney}</div>

        {/* The ask, at the only moment it is honest: there is something on this
            device worth losing. It states the count rather than saying "don't
            lose your data", because the number is the argument. */}
        {!signedIn && auth.status !== 'loading' && mine > 0 && (
          <section
            aria-label="Save your journeys"
            className="pointer-events-auto max-w-72 rounded-sm border border-line bg-surface p-3"
          >
            <p className="mt-0 mb-2.5 text-sm leading-relaxed text-ink-soft">
              {mine === 1
                ? 'One journey, saved in this browser only.'
                : `${mine.toLocaleString('en-IN')} journeys, saved in this browser only.`}{' '}
              Sign in and they follow you to any device.
            </p>
            <SignInButton
              mode={auth.mode}
              onSignIn={auth.signIn}
              redirecting={auth.status === 'redirecting'}
            />
          </section>
        )}
      </div>

      {/* Phones only. Same element as the one in the stack above; see
          `addJourney`. bottom-3 right-3 puts it exactly where the zoom stack
          was, so the corner keeps a purpose instead of going empty. */}
      <div className="pointer-events-auto absolute right-3 bottom-3 sm:hidden">{addJourney}</div>

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

      {railPassOpen && mapData && (
        <div className="pointer-events-auto absolute inset-0 z-20 flex items-end justify-center bg-ground/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
          <div className="max-h-[88dvh] w-full overflow-auto rounded-t-lg border border-line bg-surface p-5 sm:max-w-md sm:rounded-lg">
            <h2 className="mb-4 text-label font-semibold tracking-label text-ink-faint uppercase">
              Rail pass
            </h2>
            <RailPass
              data={mapData}
              journeys={journeys}
              stats={stats}
              onClose={() => { setRailPassOpen(false) }}
            />
          </div>
        </div>
      )}

      {routeTarget && routeJourneys.length > 0 && (
        <JourneysSheet
          journeys={routeJourneys}
          initialJourneyId={routeTarget.initialJourneyId}
          data={mapData}
          onClose={() => { setRouteTarget(null) }}
          onShowOnMap={(journeyId) => {
            setRouteTarget(null)
            mapRef.current?.flyToJourney(journeyId)
          }}
          onRemove={(journeyId) => { store.remove(journeyId) }}
          readOnly={showingSamples}
        />
      )}

      {entryOpen && (
        <div className="pointer-events-auto absolute inset-0 z-20 flex items-end justify-center bg-ground/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
          <div className="max-h-[88dvh] w-full overflow-auto rounded-t-lg border border-line bg-surface p-5 sm:max-w-md sm:rounded-lg">
            <h2 className="mb-4 text-label font-semibold tracking-label text-ink-faint uppercase">
              Add a journey
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

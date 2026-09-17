import { useCallback, useMemo, useRef, useState } from 'react'
import { IndiaMap, type IndiaMapHandle } from '@/features/map/IndiaMap.tsx'
import { useMapData } from '@/features/map/useMapData.ts'
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
   * `mine` is the honest count of this person's own journeys, and it is what
   * gates the chrome below. Signed out is not the same thing as having
   * nothing: an unsigned visitor can log journeys, and they are as real as
   * anyone's.
   *
   * There used to be a fallback here — SAMPLE_JOURNEYS, drawn for anyone with
   * nothing of their own — deleted along with the file. It was seed data for
   * an empty map from the era this app was entirely behind a sign-in wall
   * (docs/00-decisions.md, decision 11); once logging works with no account,
   * showing someone else's trip to Vellore in place of an honest empty map
   * has no purpose, and it is data a visitor never asked for. Zero journeys
   * now means the map shows zero journeys.
   */
  const mine = store.journeys.length
  const journeys = store.journeys
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
   * Thumb reach is the whole argument for the placement. On a phone held
   * one-handed the bottom-right corner is the easiest thing on the screen to
   * hit and the bottom-left is the hardest, and the one thing this screen
   * wants a visitor to do should not be in the hardest corner. On a desktop
   * the pointer makes every corner equal, so it stays grouped with the other
   * two buttons where the grouping means something.
   *
   * Square rather than the wide text pill Milestones and Rail pass use —
   * shape is what marks it as the primary action instead of a third item in
   * that row. Filled with `--board`, not `--accent`: the header comment above
   * already states the rule ("the yellow belongs to the route"), and
   * tokens.css documents `--board` as the one deliberate exception — paint on
   * a real object, identical in both themes, not a palette colour. A square
   * yellow button with a plus reads as a control on the platform, not as a
   * route borrowing its colour.
   */
  const addJourney = (
    <button
      type="button"
      onClick={() => { setEntryOpen(true) }}
      aria-label={mine === 0 ? 'Add your first journey' : 'Add a journey'}
      title={mine === 0 ? 'Add your first journey' : 'Add a journey'}
      className="flex size-10 items-center justify-center rounded-sm bg-board text-2xl leading-none
                 font-semibold text-board-ink shadow-[0_1px_0_0_rgba(18,40,63,0.35)]
                 transition-transform duration-150 hover:-translate-y-px active:translate-y-0"
    >
      <span aria-hidden="true">+</span>
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
          said "v0.2": full-strength accent on a 2px border, spending the one
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
          v0.2
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
          earned — once `mine > 0` — and it lives entirely on the icon below;
          see the comment on SignInButton's `nudge` prop for the mechanism. */}
      {!signedIn && auth.status !== 'loading' && (
        <div className="pointer-events-auto absolute top-3 right-3 flex flex-col items-end gap-1.5">
          <SignInButton
            mode={auth.mode}
            onSignIn={auth.signIn}
            redirecting={auth.status === 'redirecting'}
            variant="icon"
            nudge={mine > 0}
          />
          {auth.error && (
            <p className="mb-0 max-w-56 rounded-sm border border-line bg-surface/90 px-2 py-1.5 text-right text-xs leading-relaxed text-vermillion backdrop-blur-sm">
              {auth.error}
            </p>
          )}
        </div>
      )}

      {/* `bottom-3` at every width, level with the + button on a phone: the
          collapsed row is just "Stats ▸" now, not "Kilometres — 1000", and a
          three-word pill on the left with a 56px square on the right leaves
          real clearance between them even at 320px. (It used to sit on
          `bottom-16` on phones specifically to clear that button, back when
          the collapsed label carried a value and was wide enough to reach
          under it — no longer true once "Stats" replaced the value.)

          Stacked bottom-up in one flex column, not three independently
          positioned elements at fixed pixel offsets: the stats list below is
          one row on a wide screen but up to six on a phone once expanded, and
          a fixed offset tuned for the short version is exactly what would let
          the tall version paint over these buttons. First DOM child sits
          visually lowest with `flex-col-reverse`, so stats stays first here
          and everything else stacks above however tall it turns out to be. */}
      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-col-reverse items-start gap-2">
        <section
          aria-label="Your totals"
          className="flex flex-col overflow-hidden rounded-sm border border-line bg-surface sm:flex-row"
        >
          {/* The expand/collapse control on a phone, and — from sm up,
              where the card view never collapses — the Kilometres column,
              which is why it keeps its own markup rather than joining the
              array below: the two screen sizes show genuinely different
              content in this cell, not just a relabelled one. A `<button>`
              rather than a `<div>` so the whole row is one thumb-sized tap
              target on the phone, not a tiny chevron; inert at sm and up.

              "Stats" replaces what used to be "Kilometres — <value>" here:
              with Kilometres now just one of four rows the button reveals
              rather than the row that stands in for all of them, showing its
              own value on the closed button was a leftover of the old
              layout, not something worth keeping on its own. */}
          <button
            type="button"
            onClick={() => { setStatsExpanded((e) => !e) }}
            aria-expanded={statsExpanded}
            className="pointer-events-auto flex items-baseline gap-1.5 border-b border-line px-3 py-2 text-left last:border-b-0 sm:pointer-events-none sm:flex-col-reverse sm:items-start sm:gap-0 sm:border-b-0 sm:border-r sm:py-3 sm:last:border-r-0"
          >
            <span className="text-label font-semibold tracking-label text-ink-faint uppercase sm:hidden">
              Stats
            </span>
            <span className="hidden text-label font-semibold tracking-label text-ink-faint uppercase sm:mt-1.5 sm:inline">
              Kilometres
            </span>
            <span className="hidden tabular text-sm leading-none text-cream sm:inline sm:text-xl">
              {formatKm(stats.km).replace(' km', '')}
            </span>
            <span aria-hidden="true" className="ml-auto text-ink-faint sm:hidden">
              {statsExpanded ? '▾' : '▸'}
            </span>
          </button>
          {/* Mobile expanded list: all four, Kilometres included — the
              button above no longer shows its value when collapsed, so it has
              to appear somewhere once expanded. sm:hidden unconditionally:
              this list is never the desktop presentation, the row below is. */}
          {([
            ['Kilometres', formatKm(stats.km).replace(' km', '')],
            ['Stations', stats.stations.toLocaleString('en-IN')],
            ['States', String(stats.states)],
            ['Longest', formatKm(stats.longestKm).replace(' km', '')],
          ] as const).map(([label, value]) => (
            <div
              key={label}
              className={`${statsExpanded ? 'flex' : 'hidden'} items-baseline gap-1.5 border-b border-line px-3 py-2 last:border-b-0 sm:hidden`}
            >
              <span className="text-label font-semibold tracking-label text-ink-faint uppercase">
                {label}
              </span>
              <span className="text-ink-faint">–</span>
              <span className="tabular text-sm leading-none text-cream">{value}</span>
            </div>
          ))}
          {/* Desktop row: Kilometres already has its own column via the
              button, so only the other three repeat here — always visible,
              never gated on statsExpanded, which does not exist as a concept
              at this width. Unchanged from before this edit. */}
          {([
            ['Stations', stats.stations.toLocaleString('en-IN')],
            ['States', String(stats.states)],
            ['Longest', formatKm(stats.longestKm).replace(' km', '')],
          ] as const).map(([label, value]) => (
            <div
              key={label}
              className="hidden items-baseline gap-1.5 border-line px-3 py-2 sm:flex sm:flex-col-reverse sm:items-start sm:gap-0 sm:border-r sm:py-3 sm:last:border-r-0"
            >
              <span className="text-label font-semibold tracking-label text-ink-faint uppercase sm:mt-1.5">
                {label}
              </span>
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
          {demo && (
            <div className={`${statsExpanded ? 'block' : 'hidden'} border-b border-line bg-surface-2 px-3 py-2 last:border-b-0 sm:flex sm:items-center sm:justify-center sm:border-b-0 sm:border-l sm:py-3`}>
              <span className="text-label font-semibold tracking-label text-ink-faint uppercase">
                Demo
              </span>
            </div>
          )}
        </section>

        {/* Ordering here is bottom-up (flex-col-reverse, first child lowest):
            totals, then milestones and the pass, then — on sm and up only —
            the primary action. "Add your journey" sits ABOVE the two
            secondary buttons rather than under them, because it is the only
            thing on this screen a new visitor should feel any pull toward.
            On a phone it is not in this stack at all; it is in the
            bottom-right corner.

            There used to be a fourth thing here — a "save your journeys"
            panel with its own full-width sign-in button, shown once
            `mine > 0`. Removed: it never closed itself, so it sat on screen
            for as long as someone stayed signed out, which read as a banner
            rather than a nudge. The ask for a returning visitor now lives
            entirely on the icon in the top-right corner — a small dot plus a
            tooltip that opens itself briefly and closes on its own; see the
            `nudge` prop on SignInButton.

            What gates these is `mine`, not `signedIn`. An unsigned visitor can
            log journeys now, and the moment they have one the milestones and
            the pass are about their travel, so they appear. At zero they stay
            hidden: there is nothing to open — milestones would show every
            milestone locked, and the pass would hand out a shareable card
            reading 0 km / 0 stations / 0 states, which looks broken rather
            than empty. */}
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

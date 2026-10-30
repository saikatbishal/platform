import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { IndiaMap, type IndiaMapHandle } from '@/features/map/IndiaMap.tsx'
import { useMapData } from '@/features/map/useMapData.ts'
import { useJourneys } from '@/features/journeys/useJourneys.ts'
import { AddJourneyForm } from '@/features/journeys/AddJourneyForm.tsx'
import { FindJourneySheet } from '@/features/journeys/FindJourneySheet.tsx'
import type { StationHit } from '@/features/journeys/searchStations.ts'
import { useAuth } from '@/features/auth/AuthProvider.tsx'
import { SignInButton } from '@/features/auth/SignInButton.tsx'
import { UserMenu } from '@/features/auth/UserMenu.tsx'
import { JourneysSheet } from '@/components/JourneysSheet.tsx'
import { Toaster } from '@/components/Toaster.tsx'
import { useTimeOfDayTheme } from '@/features/theme/useTheme.ts'
import { evaluateMilestones } from '@/features/stats/milestones.ts'
import { LedgerSheet } from '@/features/stats/LedgerSheet.tsx'
import { StatNumber } from '@/features/stats/StatNumber.tsx'
import { createTally } from '@/features/stats/tally.ts'
import { TILES, kmFigure } from '@/features/stats/tiles.ts'
import { TripsSheet, type TripTarget } from '@/features/trips/TripsSheet.tsx'
import { TripPanel } from '@/features/trips/TripPanel.tsx'
import { tripOptions } from '@/features/trips/TripField.tsx'
import { byTravelDate, samePlaceFrom, suggestTrips, unsortedJourneys } from '@/features/trips/trips.ts'
import { addDismissed, readDismissed } from '@/features/trips/tripStorage.ts'
import { showToast } from '@/components/toast.ts'

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
  // The map's per-frame totals while routes draw in, straight to the tiles —
  // see features/stats/tally.ts for why this is not React state.
  const [tally] = useState(createTally)
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
  /**
   * The station quick find's empty state offered to log a journey from — it
   * prefills the add form's origin. Null every other time the form opens.
   */
  const [prefillFrom, setPrefillFrom] = useState<StationHit | null>(null)
  const [findOpen, setFindOpen] = useState(false)
  /**
   * The ledger: totals, milestones and the rail pass, behind one control —
   * docs/features/ledger/prd.md. The ref is the control itself, so closing the
   * sheet can hand focus back to what opened it.
   */
  const [ledgerOpen, setLedgerOpen] = useState(false)
  const ledgerButton = useRef<HTMLButtonElement>(null)
  const closeLedger = useCallback(() => {
    setLedgerOpen(false)
    ledgerButton.current?.focus()
  }, [])

  /*
   * Trips — docs/features/trips/prd.md. The list is a sheet; a trip, once
   * opened, is a lens on the map plus a panel, with no scrim, because looking
   * at the map is the point of opening one. `entryTripId` seeds the add form
   * when a trip's own "Log a journey into it" opened it.
   */
  const trips = store.trips
  const [tripsOpen, setTripsOpen] = useState(false)
  const [tripTarget, setTripTarget] = useState<TripTarget | null>(null)
  const [entryTripId, setEntryTripId] = useState<string | null>(null)
  const openTrip = useCallback((target: TripTarget) => {
    setTripTarget(target)
    // Framed once, on opening — not again every time a leg joins or leaves.
    const ids = (target.kind === 'trip'
      ? journeys.filter((j) => j.tripId === target.id)
      : unsortedJourneys(journeys, trips)).map((j) => j.id)
    mapRef.current?.flyToJourneys(ids)
  }, [journeys, trips])

  const openedTrip = tripTarget?.kind === 'trip' ? trips.find((t) => t.id === tripTarget.id) ?? null : null
  const tripLegs = useMemo(() => {
    if (!tripTarget) return []
    return tripTarget.kind === 'trip'
      ? journeys.filter((j) => j.tripId === tripTarget.id).sort(byTravelDate)
      : unsortedJourneys(journeys, trips)
  }, [tripTarget, journeys, trips])
  const lens = useMemo(() => (tripTarget ? new Set(tripLegs.map((j) => j.id)) : null), [tripTarget, tripLegs])
  // A trip deleted while open — here, or by the sync bringing in a delete
  // from another device — takes its lens with it.
  useEffect(() => {
    if (tripTarget?.kind === 'trip' && !trips.some((t) => t.id === tripTarget.id)) setTripTarget(null)
  }, [tripTarget, trips])
  const tripChoices = useMemo(() => tripOptions(trips, journeys), [trips, journeys])

  /* "These journeys look like one trip" — offered, never applied, and
     forgotten per device once answered "Not a trip". */
  const viewer = auth.user?.id ?? null
  const [dismissedRev, setDismissedRev] = useState(0)
  const dismissed = useMemo(() => readDismissed(viewer), [viewer, dismissedRev])
  const samePlace = useMemo(() => samePlaceFrom(mapData?.byCode ?? null), [mapData])
  const suggestion = useMemo(
    () => suggestTrips({ journeys, trips, samePlace, dismissed })[0] ?? null,
    [journeys, trips, samePlace, dismissed],
  )

  /** Journeys moved by hand get the same quiet line as an add or a delete,
      with the way back on it. */
  const moveJourneys = useCallback((ids: readonly string[], tripId: string | null, message: string) => {
    const before = new Map<string | null, string[]>()
    for (const j of journeys) {
      if (!ids.includes(j.id) || j.tripId === tripId) continue
      const group = before.get(j.tripId)
      if (group) group.push(j.id)
      else before.set(j.tripId, [j.id])
    }
    store.setJourneysTrip(ids, tripId)
    showToast({
      id: `trip-move-${ids.join(',')}`,
      message,
      action: { label: 'Undo', run: () => { for (const [prev, group] of before) store.setJourneysTrip(group, prev) } },
    })
  }, [journeys, store])
  /**
   * The route whose tooltip was opened to full detail — there is no
   * standalone "browse everything" entry point: it opens from a route's own
   * tooltip, or from a quick-find result, and both set it the same way.
   * Captured as the station pair, not the clicked journey's id: removing
   * that specific journey inside the sheet must not break the lookup for
   * the others still on the same route.
   */
  const [routeTarget, setRouteTarget] = useState<{ initialJourneyId: string; fromCode: string; toCode: string } | null>(null)
  const mapRef = useRef<IndiaMapHandle>(null)

  /* Escape closes the entry sheet, the way it already closes JourneysSheet.
     A station field with its list open swallows the key first — closing the
     list the user is looking at, not the form around it. */
  useEffect(() => {
    if (!entryOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setEntryOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey) }
  }, [entryOpen])

  /**
   * Put focus back on the magnifier when quick find closes.
   *
   * Found in the document rather than held in a ref, and that is forced: the
   * button is one element rendered in two places (like `addJourney`), so a ref
   * would hold whichever of the two mounted last, and the hidden one cannot
   * take focus. Both are always mounted — the breakpoint hides one with CSS,
   * it does not unmount it — so `offsetParent` is what tells them apart.
   */
  const focusFindButton = useCallback(() => {
    for (const el of document.querySelectorAll<HTMLElement>('[data-find-button]')) {
      if (el.offsetParent !== null) { el.focus(); return }
    }
  }, [])

  /*
   * `/` opens quick find, the convention GitHub, YouTube and Slack share.
   *
   * Registered at every width even though the hint inside the input is
   * pointer-only: a tablet with a keyboard attached is a real case, and a
   * phone simply never sends the key.
   *
   * Three things have to be true. The key must not belong to something the
   * user is typing into — a station field with focus is the case the PRD calls
   * out, and `/` is a character someone can legitimately want in a note. It
   * must not be a shortcut with a modifier on it. And nothing else may be
   * open: opening a search over the add form would bury the form the user is
   * halfway through.
   */
  useEffect(() => {
    if (mine === 0) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      const el = e.target
      if (el instanceof HTMLElement &&
          (el.isContentEditable || el instanceof HTMLInputElement ||
           el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return
      if (entryOpen || ledgerOpen || routeTarget || findOpen || tripsOpen) return
      e.preventDefault()
      setFindOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey) }
  }, [mine, entryOpen, ledgerOpen, routeTarget, findOpen, tripsOpen])
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
      onClick={() => { setPrefillFrom(null); setEntryOpen(true) }}
      aria-label={mine === 0 ? 'Add your first journey' : 'Add a journey'}
      title={mine === 0 ? 'Add your first journey' : 'Add a journey'}
      className="flex size-10 items-center justify-center rounded-sm bg-board text-2xl leading-none
                 font-semibold text-board-ink shadow-[0_1px_0_0_rgba(18,40,63,0.35)]
                 transition-transform duration-150 hover:-translate-y-px active:translate-y-0"
    >
      <span aria-hidden="true">+</span>
    </button>
  )

  /*
   * Quick find — `docs/features/quick-find/`. Declared once and placed twice,
   * for the same reason `addJourney` is: directly above `+` in the bottom-right
   * corner on a phone, beside it in the bottom-left stack from `sm` up. Log and
   * find are the two things anyone does in this app, so they share a column.
   *
   * Secondary treatment on purpose. `+` keeps the only yellow fill in that
   * corner, because there is one primary action and this is not it.
   *
   * The button is 44px and the visible square inside it is 40px — same size as
   * `+`, but with the tap target the design system requires, which a bare 40px
   * button does not have. The 4px that buys sits inside the button, which is
   * why the stack below spaces these 6px apart rather than 8: 6 + 2 is the 8px
   * the two visible squares should have between them.
   *
   * Hidden at zero journeys, the way Milestones and Rail pass are: there is
   * nothing to find, and an icon-only button that opens an empty search is
   * worse than no button.
   */
  const findJourney = (
    <button
      type="button"
      data-find-button
      onClick={() => { setFindOpen(true) }}
      aria-label="Find a journey"
      /* The accessible name stays the label; the title carries the shortcut,
         which only a device with a pointer ever renders — and only a device
         with a keyboard can use. */
      title="Find a journey  /"
      className="group grid size-11 place-items-center"
    >
      <span
        className="grid size-10 place-items-center rounded-sm border border-line bg-surface text-ink-soft
                   transition-colors duration-150 group-hover:bg-surface-2 group-hover:text-accent"
      >
        {/* Drawn inline at the size it is used, 1.6px stroke, round caps, in
            currentColor — the design system's rule for a mark that is genuinely
            needed. There is no icon library in this project and this does not
            introduce one. */}
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="6.75" cy="6.75" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10.25 10.25 L14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
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
        onTally={tally.emit}
        onOpenJourneyModal={(journeyId) => {
          const clicked = journeys.find((j) => j.id === journeyId)
          if (!clicked) return
          setRouteTarget({ initialJourneyId: journeyId, fromCode: clicked.fromCode, toCode: clicked.toCode })
        }}
        lens={lens}
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

      {/* `bottom-3` at every width, level with the + button on a phone. The
          ledger control is one 44px row there — the kilometres and an arrow —
          and the + is a 40px square in the opposite corner, so the two clear
          each other even at 320px.

          Stacked bottom-up in one flex column, not independently positioned
          elements at fixed pixel offsets: the sync notice and the Trips row
          above the ledger come and go, and an offset tuned for one
          combination is exactly what would let another paint over them.
          First DOM child sits visually lowest with `flex-col-reverse`, so the
          ledger stays first here and everything else stacks above it. */}
      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-col-reverse items-start gap-2">
        {/* The ledger control — what were the Stats toggle, the Milestones
            button and the Rail pass button, as one (docs/features/ledger/).
            On a phone it is the kilometres and an arrow: the one figure worth
            a glance, counting up with the draw-in, and the way in to the rest.
            From sm up it is the four tiles, always showing, and the whole
            strip is the button.

            Hidden at zero journeys, as Milestones and Rail pass were: behind it
            would be every milestone locked and a pass reading 0 km, which
            looks broken rather than empty. The map at zero is honestly empty,
            and the + is the only thing on it asking for anything. */}
        {mine > 0 && (
          <button
            ref={ledgerButton}
            type="button"
            onClick={() => { setLedgerOpen(true) }}
            aria-haspopup="dialog"
            className="group pointer-events-auto flex min-h-11 items-stretch overflow-hidden rounded-sm border border-line bg-surface text-left transition-colors duration-150 hover:bg-surface-2"
          >
            <span className="sr-only">Open the ledger: </span>
            {/* Phone. --ink rather than --cream: at 13px cream is mud (trap 3). */}
            <span className="flex items-center gap-1.5 px-3 sm:hidden">
              <StatNumber
                tally={tally}
                field="km"
                value={stats.km}
                format={kmFigure}
                className="tabular text-sm leading-none text-ink"
              />
              <span className="text-label font-semibold tracking-label text-ink-faint uppercase transition-colors duration-150 group-hover:text-accent">
                km
              </span>
              {/* The figure beside it leaves these out, so it says so where
                  the figure is — not one tap away. */}
              {stats.uncounted > 0 && (
                <>
                  <span aria-hidden="true" className="text-ink-faint">·</span>
                  <span className="tabular text-sm leading-none text-oxide">{stats.uncounted}</span>
                  <span className="text-label font-semibold tracking-label text-ink-faint uppercase">
                    not drawn
                  </span>
                </>
              )}
              <span aria-hidden="true" className="ml-1.5 text-ink-faint">▸</span>
            </span>
            {/* sm and up: the four tiles, then the two exceptions. */}
            {TILES.map(([label, field, format]) => (
              <span key={label} className="hidden flex-col-reverse items-start border-r border-line px-3 py-3 sm:flex">
                <span className="mt-1.5 text-label font-semibold tracking-label text-ink-faint uppercase transition-colors duration-150 group-hover:text-accent">
                  {label}
                </span>
                <StatNumber
                  tally={tally}
                  field={field}
                  value={stats[field]}
                  format={format}
                  className="tabular text-xl leading-none text-cream"
                />
              </span>
            ))}
            {stats.uncounted > 0 && (
              <span className="hidden flex-col-reverse items-center justify-center border-r border-line bg-surface-2 px-3 py-3 sm:flex">
                <span className="mt-1 text-label font-semibold tracking-label text-ink-faint uppercase">Not drawn</span>
                <span className="tabular text-sm leading-none text-oxide">{stats.uncounted}</span>
              </span>
            )}
            {demo && (
              <span className="hidden items-center justify-center border-r border-line bg-surface-2 px-3 sm:flex">
                <span className="text-label font-semibold tracking-label text-ink-faint uppercase">Demo</span>
              </span>
            )}
            <span aria-hidden="true" className="hidden items-center px-3 text-ink-faint transition-colors duration-150 group-hover:text-accent sm:flex">
              ▸
            </span>
          </button>
        )}

        {/* Sync state, directly above the totals it qualifies. Silent until
            something has not reached the account — then it says what, that
            nothing is lost, and what will happen next, with the one action
            that helps. Not vermillion: the journeys are safe on this device,
            and an alarm colour for a tunnel on the Konkan line would teach
            people to ignore the colour. Hidden when all is well; there is no
            "Synced ✓" — the absence of this is the success state. */}
        {signedIn && !demo && (store.sync.readFailed || store.sync.pending > 0 || store.sync.tripChanges > 0) && (
          <div
            role="status"
            className="pointer-events-auto flex max-w-80 items-center gap-3 rounded-sm border border-line bg-surface py-1 pr-1 pl-3"
          >
            <p className="mb-0 py-1.5 text-xs leading-relaxed text-ink-soft">
              {store.sync.readFailed ? (
                <>Couldn&rsquo;t reach your account, so only the journeys saved on this device are showing. Nothing has been lost.</>
              ) : store.sync.pending > 0 ? (
                <>
                  <span className="tabular text-ink">{store.sync.pending}</span>{' '}
                  {store.sync.pending === 1 ? 'journey isn’t' : 'journeys aren’t'} in your account yet. They&rsquo;re
                  kept on this device and will go up when you&rsquo;re back online.
                </>
              ) : (
                <>
                  Your latest trip changes aren&rsquo;t in your account yet. They&rsquo;re kept on this device
                  and will go up when you&rsquo;re back online.
                </>
              )}
            </p>
            <button
              type="button"
              onClick={store.sync.retry}
              disabled={store.sync.busy}
              className="min-h-11 shrink-0 rounded-sm px-2.5 text-label font-semibold tracking-label text-ink uppercase transition-colors duration-150 hover:bg-surface-2 hover:text-accent disabled:opacity-50"
            >
              {store.sync.readFailed ? (store.sync.busy ? 'Checking' : 'Try again') : (store.sync.busy ? 'Sending' : 'Send now')}
            </button>
          </div>
        )}

        {/* Ordering here is bottom-up (flex-col-reverse, first child lowest):
            the ledger, then Trips, then — on sm and up only — the primary
            action. "Add your journey" sits ABOVE the secondary buttons rather
            than under them, because it is the only thing on this screen a new
            visitor should feel any pull toward. On a phone it is not in this
            stack at all; it is in the bottom-right corner.

            There used to be a fourth thing here — a "save your journeys"
            panel with its own full-width sign-in button, shown once
            `mine > 0`. Removed: it never closed itself, so it sat on screen
            for as long as someone stayed signed out, which read as a banner
            rather than a nudge. The ask for a returning visitor now lives
            entirely on the icon in the top-right corner — a small dot plus a
            tooltip that opens itself briefly and closes on its own; see the
            `nudge` prop on SignInButton.

            Milestones and Rail pass used to sit in this row too. They are in
            the ledger now: the milestones are thresholds on the same totals,
            and the pass is a picture of them, so it was one topic spread over
            three buttons. */}
        {/* Trips appears with a trip even at zero journeys — a trip made
            before setting off is something to come back to. The row keeps its
            wrap so a future second button drops to its own line before it can
            reach under the corner buttons on a narrow phone. The dot is a
            suggestion waiting ("these journeys look like one trip"); it goes
            when answered. */}
        {(mine > 0 || trips.length > 0) && (
          <div className="pointer-events-auto flex max-w-[calc(100vw-5.5rem)] flex-wrap gap-2 sm:max-w-none">
            <button
              type="button"
              onClick={() => { setTripTarget(null); setTripsOpen(true) }}
              aria-label={suggestion ? 'Trips — some journeys look like one trip' : 'Trips'}
              className="relative rounded-sm border border-line bg-surface px-3 py-2 text-label font-semibold tracking-label text-ink-soft uppercase hover:bg-surface-2 hover:text-accent"
            >
              Trips
              {suggestion && (
                <span aria-hidden="true" className="absolute -top-1 -right-1 size-2 rounded-full bg-accent ring-2 ring-ground" />
              )}
            </button>
          </div>
        )}

        {/* On a phone these buttons are not here — they are bottom-right, in
            the corner the map's zoom stack used to hold. Rendered from one
            `addJourney` / `findJourney` element in both places rather than
            written twice, so the labels and the handlers cannot drift apart.

            Side by side here rather than stacked: the pointer makes every
            corner equal, so the pair reads as a pair on one row, and the
            column above it stays as short as it was. */}
        <div className="pointer-events-auto hidden items-center gap-1.5 sm:flex">
          {addJourney}
          {mine > 0 && findJourney}
        </div>

      </div>

      {/* Phones only. Same elements as the stack above; see `addJourney` and
          `findJourney`. bottom-3 right-3 puts them exactly where the zoom
          stack was, so the corner keeps a purpose instead of going empty.

          Find sits directly above `+`, not below it: `+` stays in the very
          corner, which is the easiest place on the screen for a thumb, because
          logging is the primary action and finding is not.

          gap-1.5 (6px), not 8px — `findJourney`'s 44px target carries 2px of
          padding around its visible 40px square, so 6px here is the 8px the
          two squares actually show. */}
      <div className="pointer-events-auto absolute right-3 bottom-3 flex flex-col items-center gap-1.5 sm:hidden">
        {mine > 0 && findJourney}
        {addJourney}
      </div>

      {ledgerOpen && (
        <LedgerSheet
          tally={tally}
          stats={stats}
          milestones={milestones}
          data={mapData}
          journeys={journeys}
          demo={demo}
          onClose={closeLedger}
        />
      )}

      {tripTarget && (
        <TripPanel
          key={tripTarget.kind === 'trip' ? tripTarget.id : 'unsorted'}
          trip={openedTrip}
          legs={tripLegs}
          allJourneys={journeys}
          trips={trips}
          data={mapData}
          covered={entryOpen || routeTarget !== null || findOpen || tripsOpen || ledgerOpen}
          onClose={() => { setTripTarget(null) }}
          onOpenJourney={(journeyId) => {
            const opened = journeys.find((j) => j.id === journeyId)
            if (!opened) return
            setRouteTarget({ initialJourneyId: journeyId, fromCode: opened.fromCode, toCode: opened.toCode })
          }}
          onLogInto={() => {
            if (!openedTrip) return
            setPrefillFrom(null)
            setEntryTripId(openedTrip.id)
            setEntryOpen(true)
          }}
          onAdd={(ids) => {
            if (!openedTrip) return
            moveJourneys(ids, openedTrip.id,
              `Added ${ids.length === 1 ? '1 journey' : `${ids.length} journeys`} to ${openedTrip.name}.`)
            mapRef.current?.flyToJourneys([...tripLegs.map((j) => j.id), ...ids])
          }}
          onTakeOut={(journeyId) => {
            const j = journeys.find((x) => x.id === journeyId)
            if (!j || !openedTrip) return
            moveJourneys([journeyId], null,
              `Took ${j.fromCode} · ${j.toCode} out of ${openedTrip.name}. It’s still on the map.`)
          }}
          onSave={(patch) => { if (openedTrip) store.updateTrip(openedTrip.id, patch) }}
          onDelete={() => {
            if (!openedTrip) return
            store.deleteTrip(openedTrip.id)
            setTripTarget(null)
          }}
        />
      )}

      {tripsOpen && (
        <TripsSheet
          trips={trips}
          journeys={journeys}
          data={mapData}
          suggestion={suggestion}
          onClose={() => { setTripsOpen(false) }}
          onOpen={(target) => { setTripsOpen(false); openTrip(target) }}
          onCreate={(name, note) => store.createTrip(name, note)}
          onGroup={(name, ids) => {
            const trip = store.createTrip(name, null)
            store.setJourneysTrip(ids, trip.id)
            return trip
          }}
          onDismissSuggestion={(key) => { addDismissed(viewer, key); setDismissedRev((n) => n + 1) }}
        />
      )}

      {/* Rendered before JourneysSheet, and a layer below it: opening a result
          leaves this sheet mounted underneath, because closing the card has to
          return to the same results at the same scroll position — which is not
          something a sheet that unmounted can do. */}
      {findOpen && (
        <FindJourneySheet
          journeys={journeys}
          data={mapData}
          cardOpen={routeTarget !== null}
          onClose={() => { setFindOpen(false); focusFindButton() }}
          onOpenJourney={(journeyId) => {
            const opened = journeys.find((j) => j.id === journeyId)
            if (!opened) return
            // The same target a tap on the map's line produces, so the card is
            // scoped to the route rather than to the one journey — see
            // `routeTarget`.
            setRouteTarget({ initialJourneyId: journeyId, fromCode: opened.fromCode, toCode: opened.toCode })
          }}
          onLogFrom={(station) => {
            setFindOpen(false)
            setPrefillFrom(station)
            setEntryOpen(true)
          }}
          trips={trips}
          onOpenTrip={(tripId) => {
            setFindOpen(false)
            openTrip({ kind: 'trip', id: tripId })
          }}
        />
      )}

      {routeTarget && routeJourneys.length > 0 && (
        <JourneysSheet
          journeys={routeJourneys}
          initialJourneyId={routeTarget.initialJourneyId}
          data={mapData}
          onClose={() => { setRouteTarget(null) }}
          onShowOnMap={(journeyId) => {
            setRouteTarget(null)
            // Both sheets, not just this one: the point of the map is to look
            // at it, and leaving a search over the route it just flew to would
            // hide the thing the button promised.
            setFindOpen(false)
            mapRef.current?.flyToJourney(journeyId)
          }}
          onRemove={(journeyId) => { store.remove(journeyId) }}
          trips={{
            options: tripChoices,
            onSet: (journeyId, tripId) => {
              const name = tripId === null ? null : trips.find((t) => t.id === tripId)?.name ?? null
              const j = journeys.find((x) => x.id === journeyId)
              const what = j ? `${j.fromCode} · ${j.toCode}` : 'That journey'
              moveJourneys([journeyId], tripId, name ? `Moved ${what} into ${name}.` : `Took ${what} out of its trip. It’s still on the map.`)
            },
            onNew: (journeyId, name) => {
              const trip = store.createTrip(name, null)
              store.setJourneysTrip([journeyId], trip.id)
            },
            onOpen: (tripId) => {
              setRouteTarget(null)
              setFindOpen(false)
              openTrip({ kind: 'trip', id: tripId })
            },
          }}
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
              journeys={journeys}
              initialFrom={prefillFrom}
              trips={trips}
              initialTripId={entryTripId}
              byCode={mapData?.byCode}
              onAdd={(draft, newTripName) => {
                // A new trip is made first, so the journey has it to point at
                // — and, signed in, so the trip reaches the server first.
                const tripId = newTripName !== null ? store.createTrip(newTripName, null).id : draft.tripId
                store.add({ ...draft, tripId }, mapData?.graph ?? null)
                setEntryOpen(false)
                setPrefillFrom(null)
                setEntryTripId(null)
              }}
              onClose={() => { setEntryOpen(false); setPrefillFrom(null); setEntryTripId(null) }}
            />
          </div>
        </div>
      )}

      {/* Last, so it paints over every sheet — a delete fails from inside one. */}
      <Toaster />
    </main>
  )
}

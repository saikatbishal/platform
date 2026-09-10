import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MAP_WIDTH, MAP_HEIGHT } from '@/lib/projection.ts'
import { LOD_TIERS, tierFor, type LodTier } from './lod.ts'
import { usePanZoom, type View } from './usePanZoom.ts'
import type { MapData } from './useMapData.ts'
import { drawStationField, drawStationLabels } from './stationField.ts'
import { placeLabels, type LabelCandidate } from './labels.ts'
import { describeRouteFailure } from './route.ts'
import { useTrainStops } from './useTrainStops.ts'
import { useJourneyRoutes } from './useJourneyRoutes.ts'
import { RouteTooltip } from './RouteTooltip.tsx'
import type { Journey } from '@/types/index.ts'

interface Props {
  journeys: readonly Journey[]
  /** Loaded once in App.tsx and passed down — the add-journey sheet needs the
      same stations and rail graph, and calling useMapData() a second time
      would refetch every layer (8,696 stations included) from scratch. */
  data: MapData | null
  error: string | null
  /** Ask useMapData to fetch the district layer. Called when the zoom tier
      first wants it; the hook makes sure that only fetches once. */
  loadDistricts?: () => void
  /** Called whenever the derived totals change, so the page can show them. */
  onStats?: (stats: { km: number; longestKm: number; stations: number; states: number; uncounted: number }) => void
}

/**
 * The map.
 *
 * Four stacked layers, and the order matters: land is opaque, so the idle
 * rail network has to sit above it, the station field above that (so dots
 * read as the texture, not the track), and routes/endpoints/labels above the
 * dots (so a travelled line and its names stay legible over the texture).
 * Putting the canvas underneath the land — the obvious "backdrop" instinct —
 * hides the station dots everywhere except over the sea.
 */
export function IndiaMap({ journeys, data, error, loadDistricts, onStats }: Props) {
  /* Kept here rather than lifted to App like `data` was: that lift existed to
     stop a second useMapData refetching 8,696 stations, and nothing about
     shard fetches has that problem — a second consumer hits the browser cache.
     Lift it if the add-journey sheet ends up wanting stop lists too. */
  const { stops: trainStops, request: requestTrainStops } = useTrainStops()
  const stage = useRef<HTMLDivElement>(null)
  const baseG = useRef<SVGGElement>(null)
  const railG = useRef<SVGGElement>(null)
  const overG = useRef<SVGGElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  /** Station labels, on their own canvas so they can be painted last. */
  const labelCanvas = useRef<HTMLCanvasElement>(null)
  const labelRefs = useRef<Array<SVGGElement | null>>([])
  const railRefs = useRef<Array<SVGPathElement | null>>([])
  const stopRefs = useRef<Array<SVGCircleElement | null>>([])

  const [tier, setTier] = useState<LodTier>(LOD_TIERS[0]!)
  const tierRef = useRef(tier)
  tierRef.current = tier

  // WCAG 2.2.2: the wave glyphs loop indefinitely, so the ≈ button can stop
  // them. prefers-reduced-motion is handled globally in index.css.
  const [seaStill, setSeaStill] = useState(false)

  // Expand every journey into the stations its train actually calls at. A
  // two-point line does not follow the railway: on the Vijayawada–Chennai leg
  // it spends 75% of its length over the Bay of Bengal.
  // Every state outline as one path, for the coastal waterlining. Stroked
  // BELOW the opaque land, so the internal state borders never show — only
  // the half of each stroke that reaches out over the sea survives.
  const coastD = useMemo(() => (data ? data.states.map((s) => s.d).join('') : ''), [data])

  // Pull the stop list for every train a journey names. The hook fetches each
  // shard once; until one lands the journey below just routes by inference,
  // which is what every journey did before this was wired up.
  useEffect(() => {
    for (const j of journeys) if (j.trainNumber) requestTrainStops(j.trainNumber)
  }, [journeys, requestTrainStops])

  /**
   * Journeys that could not be drawn are kept, not dropped — see
   * useJourneyRoutes.ts. Every one of its three failure branches used to be a
   * bare `return []` here, so a journey the map could not route simply ceased
   * to exist: no line, no warning, no contribution to the totals — while its
   * endpoint dot still drew from `byCode`, which does not consult the graph.
   */
  const { routes, failures } = useJourneyRoutes(data, journeys, trainStops)

  const journeyById = useMemo(() => new Map(journeys.map((j) => [j.id, j])), [journeys])

  /**
   * Routes, oldest first, so the most recently travelled one draws — and
   * therefore hit-tests — last. Where two journeys share a stretch of track,
   * that is what puts the newer one on top without this file ever having to
   * ask "which of these is more recent" itself; SVG's own paint order
   * answers it. Doesn't touch `routes` itself: stats below fold routes into
   * sums and sets, which don't care about order.
   */
  const routesForDisplay = useMemo(
    () => [...routes].sort((a, b) => {
      const da = journeyById.get(a.id)?.travelledOn ?? ''
      const db = journeyById.get(b.id)?.travelledOn ?? ''
      return da < db ? -1 : da > db ? 1 : 0
    }),
    [routes, journeyById],
  )

  /** The journey whose route is under the cursor or was last tapped, and
      where to draw its tooltip. Hover live-follows the mouse; a tap (or a
      click) pins it until something else is tapped — see the stage's own
      onClick below, which clears this when the tap lands on empty map. */
  const [activeJourneyId, setActiveJourneyId] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!activeJourneyId) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveJourneyId(null) }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey) }
  }, [activeJourneyId])

  /**
   * Stations the rail graph has never heard of. Their dots still draw — the
   * journey did happen — but hollow, so a missing line reads as "we have no
   * track data for this" rather than as a rendering glitch.
   *
   * Only `unknown-station` feeds this. A `no-path` failure is about the pair,
   * not either station: both are perfectly good stations sitting in different
   * components of the network, and marking them broken would be a lie.
   */
  const unroutableCodes = useMemo(() => {
    const set = new Set<string>()
    for (const f of failures) {
      if (f.failure.kind === 'unknown-station') for (const c of f.failure.codes) set.add(c)
    }
    return set
  }, [failures])

  // The warning that was missing. Dev only — in production the hollow dot and
  // the totals note carry the same information to the person who can act on it.
  useEffect(() => {
    if (!import.meta.env.DEV || failures.length === 0) return
    for (const { journey, failure } of failures) {
      console.warn(
        `[map] ${journey.fromCode}→${journey.toCode} not drawn: ${describeRouteFailure(failure)}`,
      )
    }
  }, [failures])

  const visitedStates = useMemo(() => {
    const set = new Set<string>()
    if (!data) return set
    for (const r of routes) for (const code of r.stops) {
      const s = data.byCode.get(code)
      if (s) set.add(s.state)
    }
    return set
  }, [data, routes])

  const endpoints = useMemo(() => {
    if (!data) return []
    const seen = new Map<
      string,
      { x: number; y: number; name: string; last: boolean; unroutable: boolean }
    >()
    journeys.forEach((j, i) => {
      for (const [code, last] of [[j.fromCode, false], [j.toCode, i === journeys.length - 1]] as const) {
        const s = data.byCode.get(code)
        if (s) seen.set(code, { x: s.x, y: s.y, name: s.name, last, unroutable: unroutableCodes.has(code) })
      }
    })
    return [...seen.values()]
  }, [data, journeys, unroutableCodes])

  useEffect(() => {
    if (!data || !onStats) return
    const km = routes.reduce((sum, r) => sum + r.km, 0)
    const longestKm = routes.reduce((max, r) => Math.max(max, r.km), 0)
    const stations = new Set(routes.flatMap((r) => r.stops)).size
    onStats({ km, longestKm, stations, states: visitedStates.size, uncounted: failures.length })
  }, [data, routes, visitedStates, failures, onStats])

  // Label candidates: cities by importance first, then journey endpoints.
  // These mount as SVG <text> — a bounded few hundred, same as before.
  const labelCandidates = useMemo<LabelCandidate[]>(() => {
    if (!data) return []
    return [
      ...data.cities.map((c) => ({ name: c.name, x: c.x, y: c.y, kind: 'city' as const })),
      ...endpoints.map((e) => ({ name: e.name, x: e.x, y: e.y, kind: 'endpoint' as const })),
    ]
  }, [data, endpoints])

  // Every station, named. Computed once from `data` — NOT gated on
  // tier.stationLabels here, on purpose: onFrame reads that gate live off
  // tierRef instead, so this array's identity (and onFrame's) stays stable
  // across a tier crossing. It briefly depended on tier and that broke
  // zooming — usePanZoom's setup effect re-runs whenever onFrame's identity
  // changes, and that effect calls fitToViewport(), snapping the view back
  // to the fit scale on every tier boundary.
  //
  // Not mounted as SVG either way: unlike the bounded list above, this is
  // the same 8,696 stations as the canvas dots, so it's drawn on that same
  // canvas (see onFrame) rather than as 8,696 more DOM nodes.
  const stationLabelCandidates = useMemo<LabelCandidate[]>(() => {
    if (!data) return []
    return [...data.byCode.values()].map((s) => ({ name: s.name, x: s.x, y: s.y, kind: 'station' as const }))
  }, [data])

  // One combined list so city/endpoint labels — listed first — always win
  // the collision check over a station label at the same spot.
  const allLabelCandidates = useMemo(
    () => [...labelCandidates, ...stationLabelCandidates],
    [labelCandidates, stationLabelCandidates],
  )

  /**
   * Everything that happens per frame is written straight to the DOM. Putting
   * the view in React state would re-render the tree every 16 ms during a drag,
   * for no benefit.
   */
  const onFrame = useCallback((view: View) => {
    const el = stage.current
    if (!el || !data) return
    const transform = `translate(${view.x.toFixed(2)},${view.y.toFixed(2)}) scale(${view.k.toFixed(5)})`
    baseG.current?.setAttribute('transform', transform)
    railG.current?.setAttribute('transform', transform)
    overG.current?.setAttribute('transform', transform)

    const width = el.clientWidth, height = el.clientHeight
    const inverse = 1 / view.k

    // One collision pass for every label — cities/endpoints first, so a
    // station never displaces one of them from a shared spot.
    const candidates = tierRef.current.stationLabels ? allLabelCandidates : labelCandidates
    const placed = placeLabels(candidates, view, { width, height })

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const style = getComputedStyle(el)
    const ctxFor = (cv: HTMLCanvasElement | null) => {
      if (!cv) return null
      const w = Math.round(width * dpr), h = Math.round(height * dpr)
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h }
      return cv.getContext('2d')
    }

    const dotCtx = ctxFor(canvas.current)
    if (dotCtx) {
      const dotColour = style.getPropertyValue('--dot').trim() || '#7E93A6'
      drawStationField(dotCtx, data.stationXY, view, { width, height, dpr }, tierRef.current.stationRadius, dotColour)
    }

    /* Labels are painted onto a separate canvas that sits above the route
       layer — see the element order at the bottom of this file. They used to
       share the dot canvas, which sits below it, so a route running through a
       name struck it through: the black line drew over the glyphs and the
       halo, which is the whole reason the halo stopped working. Nothing draws
       over a label now, which is the ordinary rule for a map.

       Unlike drawStationField, drawStationLabels does not own its surface, so
       the transform and the clear belong here. */
    const labelCtx = ctxFor(labelCanvas.current)
    if (labelCtx) {
      labelCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      labelCtx.clearRect(0, 0, width, height)
      if (tierRef.current.stationLabels) {
        const textColour = style.getPropertyValue('--ink-faint').trim() || '#7791A8'
        const haloColour = style.getPropertyValue('--ground').trim() || '#0A1C33'
        const family = style.getPropertyValue('--font-body').trim() || 'system-ui, sans-serif'
        drawStationLabels(labelCtx, placed.filter((p) => p.kind === 'station'), textColour, haloColour, `10px ${family}`)
      }
    }

    const visible = new Set(placed.map((p) => p.name))
    labelRefs.current.forEach((g, i) => {
      const cand = labelCandidates[i]
      if (!g || !cand) return
      g.style.display = visible.has(cand.name) ? '' : 'none'
    })
    labelRefs.current.forEach((g) => {
      const text = g?.firstElementChild as SVGTextElement | null
      text?.setAttribute('transform', `scale(${inverse})`)
    })
    stopRefs.current.forEach((circle, i) => {
      circle?.setAttribute('r', String((endpoints[i]?.last ? 5.5 : 4) * inverse))
    })
  }, [data, allLabelCandidates, labelCandidates, endpoints])

  const onZoomSettled = useCallback((relative: number) => {
    const next = tierFor(relative)
    setTier((prev) => (prev === next ? prev : next))
  }, [])

  const { zoomBy, reset, invalidate } = usePanZoom(stage, { onFrame, onZoomSettled })

  // Paint the first real frame once the data lands. `stage` is mounted from
  // the very first render, so usePanZoom wires up and fits immediately — but
  // that first frame runs while `data` is still null, `onFrame` bails, and the
  // dirty flag clears. Nothing else marks it dirty until the user interacts,
  // so without this the map would sit untransformed with a blank station
  // canvas until first touch.
  useEffect(() => { if (data) invalidate() }, [data, invalidate])

  /**
   * Fetch district borders the first time a zoom tier asks for them.
   *
   * `loadDistricts` existed and `tier.districts` existed, but nothing ever
   * joined them, so `data.districts` stayed null for the life of the app and
   * districts.topo.json was shipped and never read. This is that join.
   * Re-running when `data` appears matters: at zoom ≥ 4 the tier may already
   * want districts before the base map resolves, and the hook ignores the
   * call until it has a projection to build them with.
   */
  useEffect(() => {
    if (tier.districts) loadDistricts?.()
  }, [tier.districts, data, loadDistricts])

  // Rail visibility and stroke width follow the tier, not every frame.
  useEffect(() => {
    if (!data) return
    railRefs.current.forEach((p, i) => {
      const rank = data.rail[i]?.rank ?? 99
      if (!p) return
      const on = rank <= tier.railMaxRank
      p.style.display = on ? '' : 'none'
      if (on) p.setAttribute('stroke-width', String(rank <= 6 ? tier.railWidth * 1.5 : tier.railWidth))
    })
  }, [data, tier])

  const cityCount = tier.cityCount

  /* `stage` must be mounted on the *first* render — error and loading
     included. usePanZoom's setup effect reads `stage.current` once and never
     re-runs (see its dependency-array comment), so a stage-less loading branch
     means pan, zoom and momentum are never wired up at all. That was the real
     state of things until 6 Sep, masked by `onFrame` sitting in that effect's
     deps and re-running it by accident when `data` resolved. */
  return (
    <div
      ref={stage}
      onClick={() => { setActiveJourneyId(null) }}
      className={`absolute inset-0 touch-none bg-sea [cursor:grab] active:[cursor:grabbing]${seaStill ? ' sea-paused' : ''}`}
    >
      {error ? (
        <div className="grid h-full place-items-center p-8 text-center">
          <div className="flex max-w-sm flex-col gap-3">
            <p className="font-semibold text-vermillion">The map couldn&rsquo;t load.</p>
            <p className="text-sm text-ink-soft">{error}</p>
            {import.meta.env.DEV ? (
              <p className="text-sm text-ink-faint">
                Run <code className="text-ink-soft">npm run assets</code> and reload.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => location.reload()}
                className="text-sm text-ink-faint underline underline-offset-2 hover:text-accent"
              >
                Check your connection and try again
              </button>
            )}
          </div>
        </div>
      ) : !data ? (
        <div className="grid h-full place-items-center">
          <p className="text-label tracking-label text-ink-faint uppercase">Loading the network…</p>
        </div>
      ) : (
      <>
      {/* sea and land — opaque land, so it must sit below the station field.
          Everything drawn on the water goes first: the land painted after it
          hides the graticule and the inner half of the waterlines inland. */}
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        <g ref={baseG}>
          <path
            d={data.sea.graticule}
            fill="none"
            strokeWidth={1}
            strokeOpacity={0.16}
            className="stroke-sea-ink [vector-effect:non-scaling-stroke]"
          />
          {/* Neighbouring countries — scenery, never states to unlock.
              Filled with --land at partial strength rather than a colour of
              their own: they have to read as land, because that is the entire
              point of drawing them. Sea-ink at 10% was the old styling, and
              it made Bangladesh look like more sea — which left the stations
              along the Gede line looking exactly as adrift as they did when
              the country was not drawn at all. Partial --land also means the
              two themes stay in step for free, with no fourth land colour to
              keep in tune. */}
          {data.neighbors.map((d, i) => (
            <path
              key={i}
              d={d}
              fillOpacity={0.45}
              strokeOpacity={0.35}
              strokeWidth={0.8}
              className="fill-land stroke-line-strong [vector-effect:non-scaling-stroke]"
            />
          ))}
          {/* coastal waterlining, the engraved-chart way: the same coast
              stroked three times, wide and faint to narrow and firm */}
          {([[11, 0.08], [6.5, 0.16], [2.8, 0.3]] as const).map(([w, o]) => (
            <path
              key={w}
              d={coastD}
              fill="none"
              strokeWidth={w}
              strokeOpacity={o}
              strokeLinejoin="round"
              className="stroke-sea-ink [vector-effect:non-scaling-stroke]"
            />
          ))}
          {tier.sea && (
            <g>
              {data.sea.waves.map((p, i) => (
                <g key={i} transform={`translate(${p.x},${p.y})`}>
                  <path
                    d="M-11,0 Q-5.5,-5 0,0 T11,0"
                    fill="none"
                    strokeWidth={1.2}
                    strokeOpacity={0.5}
                    strokeLinecap="round"
                    className="sea-wave stroke-sea-ink [vector-effect:non-scaling-stroke]"
                    style={{ animationDelay: `${-(i * 2.1) % 10}s`, animationDuration: `${9 + (i % 3) * 2}s` }}
                  />
                </g>
              ))}
              {data.sea.dots.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={1.3}
                  fillOpacity={0.35}
                  className="sea-dot fill-sea-ink"
                  style={{ animationDelay: `${-(i * 2.3) % 12}s`, animationDuration: `${10 + (i % 4) * 2}s` }}
                />
              ))}
              {data.sea.labels.map((l) => (
                <text
                  key={l.name}
                  x={l.x}
                  y={l.y}
                  textAnchor="middle"
                  fontSize={15}
                  fontStyle="italic"
                  letterSpacing="0.35em"
                  opacity={0.75}
                  className="fill-sea-ink uppercase"
                >
                  {l.name}
                </text>
              ))}
            </g>
          )}
          {data.states.map((s) => (
            <path
              key={s.name}
              d={s.d}
              /* Both widths come from the class, and the `strokeWidth`
                 attribute is deliberately gone. A CSS rule always beats an
                 SVG presentation attribute — cascade layers do not enter
                 into it, an attribute loses to every layer — so the two
                 branches were being decided by two different mechanisms
                 that happened to agree. They now do not have to happen to
                 agree. Widths are screen pixels, per non-scaling-stroke. */
              className={
                visitedStates.has(s.name)
                  ? 'fill-land-visited stroke-line-strong [stroke-width:1.6px] [vector-effect:non-scaling-stroke]'
                  : 'fill-land stroke-line [stroke-width:0.6px] [vector-effect:non-scaling-stroke]'
              }
            />
          ))}

          {/* District borders. Drawn after the states so they sit on the
              opaque land fill rather than under it, and kept fainter and
              thinner than a state border — 0.4px against 0.6px — because
              they are the subdivision, not the division. Gated on the tier as
              well as on the data so zooming back out puts them away without
              throwing the fetch away. */}
          {tier.districts && data.districts && (
            <g strokeOpacity={0.38}>
              {data.districts.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  className="stroke-line [stroke-width:0.4px] [vector-effect:non-scaling-stroke]"
                />
              ))}
            </g>
          )}
        </g>
      </svg>

      {/* the idle rail network — its own layer so it sits BELOW the station
          field: the dots are what you're meant to notice at this zoom, the
          track underneath them is context. */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <g ref={railG}>
          {data.rail.map((r, i) => (
            <path
              key={i}
              ref={(el) => { railRefs.current[i] = el }}
              d={r.d}
              fill="none"
              className="stroke-route-idle [vector-effect:non-scaling-stroke]"
              strokeWidth={r.rank <= 6 ? 0.9 : 0.6}
              strokeLinecap="round"
            />
          ))}
        </g>
      </svg>

      {/* the 8,696-station field */}
      <canvas ref={canvas} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />

      {/* routes and labels — above the dots, so a travelled line and its
          station names stay readable over the texture rather than under it */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        role="img"
        aria-label={`Map of India showing ${data.stations.length.toLocaleString()} railway stations and ${journeys.length} logged journeys.`}
      >
        <g ref={overG}>
          <g>
            {/* The halo used to be the line's own colour at low opacity — a
                soft yellow glow, since --accent is bright enough that even a
                15%-opacity wash reads against the navy. That stopped working
                the moment the line became black: black at 15% opacity on a
                near-black ground is not a soft glow, it is nothing. The halo
                is --route-halo now, not --route-taken — see tokens.css — so
                the travelled route reads as a dark line cut into a field of
                light rather than trying to be a dim version of itself. */}
            {/* The actual hit target for hover/tap: `pointer-events` is
                `none` on the whole svg (so it never steals a drag from the
                stage), re-enabled here to just the stroke, which is this
                path's only paint anyway (`fill="none"`) — a click a few
                pixels off the visible line still lands inside the 9px halo,
                which matters more on a touchscreen than a cursor.
                `routesForDisplay` (oldest first) is what makes the most
                recently travelled journey the one that responds where two
                overlap: it paints last, on top, so it is what the pointer
                hits. */}
            {routesForDisplay.map((r) => (
              <path key={`halo-${r.id}`} d={r.d} fill="none"
                className="stroke-route-halo opacity-15 [vector-effect:non-scaling-stroke] [pointer-events:stroke]"
                strokeWidth={9} strokeLinecap="round" strokeLinejoin="round"
                onPointerEnter={(e) => {
                  if (e.pointerType !== 'mouse') return
                  setActiveJourneyId(r.id)
                  setTooltipPos({ x: e.clientX, y: e.clientY })
                }}
                onPointerMove={(e) => {
                  if (e.pointerType !== 'mouse') return
                  setTooltipPos({ x: e.clientX, y: e.clientY })
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType !== 'mouse') return
                  setActiveJourneyId(null)
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveJourneyId(r.id)
                  setTooltipPos({ x: e.clientX, y: e.clientY })
                }}
              />
            ))}
            {/* Solid means the line is a record: the journey named a train and
                this is that train's own stop list. Dashed means it is the
                shortest path the graph could find between two endpoints — a
                plausible answer, not a true one. route.ts has always drawn
                that distinction and returned `exact`; nothing had ever read
                it, so a guess and a record looked identical. */}
            {routesForDisplay.map((r) => (
              <path key={`line-${r.id}`} d={r.d} fill="none"
                className={`stroke-route-taken [vector-effect:non-scaling-stroke]${
                  r.exact ? '' : ' [stroke-dasharray:9_5]'
                }`}
                strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <title>{r.exact ? 'Route as the train runs it' : 'Shortest path — no train recorded'}</title>
              </path>
            ))}
            {/* An unroutable endpoint keeps its position and its colour — the
                journey happened and this is where it ended — but goes hollow
                and dashed, and carries a <title> saying why. It is drawn in
                its own colour rather than --ground so the ring reads as a
                deliberate outline instead of a dot that failed to fill. */}
            {endpoints.map((e, i) => (
              <circle key={e.name} ref={(el) => { stopRefs.current[i] = el }}
                cx={e.x} cy={e.y} r={4}
                className={
                  e.unroutable
                    ? `fill-none [stroke-dasharray:2.2_1.8] [vector-effect:non-scaling-stroke] ${
                        e.last ? 'stroke-you-are-here' : 'stroke-station-seen'
                      }`
                    : e.last
                      ? 'fill-you-are-here stroke-ground [vector-effect:non-scaling-stroke]'
                      : 'fill-station-seen stroke-ground [vector-effect:non-scaling-stroke]'
                }
                strokeWidth={1.8}>
                {e.unroutable && <title>{e.name} — no rail-graph data, so no line is drawn</title>}
              </circle>
            ))}
          </g>

          <g>
            {labelCandidates.map((c, i) => {
              const isCity = c.kind === 'city'
              if (isCity && i >= cityCount) return null
              return (
                <g key={`${c.name}-${i}`} ref={(el) => { labelRefs.current[i] = el }}
                   transform={`translate(${c.x},${c.y})`}>
                  <text x={6} y={3}
                    className={isCity
                      ? 'fill-ink-soft [paint-order:stroke] stroke-ground [stroke-width:2.5px] [stroke-linejoin:round]'
                      : 'fill-station-seen [paint-order:stroke] stroke-ground [stroke-width:2.5px] [stroke-linejoin:round]'}
                    fontSize={isCity ? 9 : 9.5}
                    fontWeight={isCity ? 500 : 600}>
                    {c.name}
                  </text>
                </g>
              )
            })}
          </g>
        </g>
      </svg>

      {/* Last painted, so nothing covers a station name. The controls below
          are still above this — they come after it. */}
      <canvas ref={labelCanvas} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />

      <div className="pointer-events-auto absolute right-3 bottom-3 flex flex-col overflow-hidden rounded-sm border border-line bg-surface">
        <button type="button" onClick={() => zoomBy(1.6)} aria-label="Zoom in"
          className="h-10 w-10 border-b border-line text-ink-soft hover:bg-surface-2 hover:text-accent">+</button>
        <button type="button" onClick={() => zoomBy(1 / 1.6)} aria-label="Zoom out"
          className="h-10 w-10 border-b border-line text-ink-soft hover:bg-surface-2 hover:text-accent">−</button>
        <button type="button" onClick={reset} aria-label="Fit the whole country"
          className="h-10 w-10 border-b border-line text-label font-semibold tracking-label text-ink-soft uppercase hover:bg-surface-2 hover:text-accent">Fit</button>
        <button type="button" onClick={() => setSeaStill((s) => !s)} aria-pressed={seaStill}
          aria-label={seaStill ? 'Let the sea move again' : 'Hold the sea still'}
          className={`h-10 w-10 text-ink-soft hover:bg-surface-2 hover:text-accent${seaStill ? ' opacity-45' : ''}`}>≈</button>
      </div>

      {activeJourneyId && tooltipPos && (() => {
        const journey = journeyById.get(activeJourneyId)
        const route = routes.find((r) => r.id === activeJourneyId)
        if (!journey || !route) return null
        return (
          <RouteTooltip
            journey={journey}
            route={route}
            fromName={data.byCode.get(journey.fromCode)?.name ?? journey.fromCode}
            toName={data.byCode.get(journey.toCode)?.name ?? journey.toCode}
            x={tooltipPos.x}
            y={tooltipPos.y}
          />
        )
      })()}
      </>
      )}
    </div>
  )
}

export const MAP_ASPECT = MAP_WIDTH / MAP_HEIGHT

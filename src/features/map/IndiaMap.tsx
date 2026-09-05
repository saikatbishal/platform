import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MAP_WIDTH, MAP_HEIGHT } from '@/lib/projection.ts'
import { LOD_TIERS, tierFor, type LodTier } from './lod.ts'
import { usePanZoom, type View } from './usePanZoom.ts'
import { useMapData } from './useMapData.ts'
import { drawStationField } from './stationField.ts'
import { placeLabels, type LabelCandidate } from './labels.ts'
import { routeForJourney } from './route.ts'
import type { Journey } from '@/types/index.ts'

interface Props {
  journeys: readonly Journey[]
  /** Called whenever the derived totals change, so the page can show them. */
  onStats?: (stats: { km: number; stations: number; states: number }) => void
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
export function IndiaMap({ journeys, onStats }: Props) {
  const { data, error } = useMapData()
  const stage = useRef<HTMLDivElement>(null)
  const baseG = useRef<SVGGElement>(null)
  const railG = useRef<SVGGElement>(null)
  const overG = useRef<SVGGElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const labelRefs = useRef<Array<SVGGElement | null>>([])
  const railRefs = useRef<Array<SVGPathElement | null>>([])
  const stopRefs = useRef<Array<SVGCircleElement | null>>([])

  const [tier, setTier] = useState<LodTier>(LOD_TIERS[0]!)
  const tierRef = useRef(tier)
  tierRef.current = tier

  const viewRef = useRef<View>({ x: 0, y: 0, k: 1 })
  // The name badge for whichever station dot the pointer is over. Only ever
  // set once zoomed in enough to have named stops (LodTier.stationLabels) —
  // at country zoom the dots are a texture, not individually pickable.
  const [hoverStation, setHoverStation] = useState<{ name: string; sx: number; sy: number } | null>(null)
  const hoverCodeRef = useRef<string | null>(null)

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

  const routes = useMemo(() => {
    if (!data) return []
    return journeys.flatMap((j) => {
      const { result } = routeForJourney(data.graph, j.fromCode, j.toCode)
      if (!result) return []
      const pts: string[] = []
      for (const code of result.codes) {
        const s = data.byCode.get(code)
        if (s) pts.push(`${s.x.toFixed(1)},${s.y.toFixed(1)}`)
      }
      if (pts.length < 2) return []
      return [{ id: j.id, d: `M${pts.join('L')}`, km: result.km, stops: result.codes }]
    })
  }, [data, journeys])

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
    const seen = new Map<string, { x: number; y: number; name: string; last: boolean }>()
    journeys.forEach((j, i) => {
      for (const [code, last] of [[j.fromCode, false], [j.toCode, i === journeys.length - 1]] as const) {
        const s = data.byCode.get(code)
        if (s) seen.set(code, { x: s.x, y: s.y, name: s.name, last })
      }
    })
    return [...seen.values()]
  }, [data, journeys])

  useEffect(() => {
    if (!data || !onStats) return
    const km = routes.reduce((sum, r) => sum + r.km, 0)
    const stations = new Set(routes.flatMap((r) => r.stops)).size
    onStats({ km, stations, states: visitedStates.size })
  }, [data, routes, visitedStates, onStats])

  // Label candidates: cities by importance first, then journey endpoints.
  const labelCandidates = useMemo<LabelCandidate[]>(() => {
    if (!data) return []
    return [
      ...data.cities.map((c) => ({ name: c.name, x: c.x, y: c.y })),
      ...endpoints.map((e) => ({ name: e.name, x: e.x, y: e.y })),
    ]
  }, [data, endpoints])

  /**
   * Everything that happens per frame is written straight to the DOM. Putting
   * the view in React state would re-render the tree every 16 ms during a drag,
   * for no benefit.
   */
  const onFrame = useCallback((view: View) => {
    const el = stage.current
    if (!el || !data) return
    viewRef.current = view
    const transform = `translate(${view.x.toFixed(2)},${view.y.toFixed(2)}) scale(${view.k.toFixed(5)})`
    baseG.current?.setAttribute('transform', transform)
    railG.current?.setAttribute('transform', transform)
    overG.current?.setAttribute('transform', transform)

    const width = el.clientWidth, height = el.clientHeight
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const c = canvas.current
    if (c) {
      const w = Math.round(width * dpr), h = Math.round(height * dpr)
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h }
      const ctx = c.getContext('2d')
      if (ctx) {
        const colour = getComputedStyle(el).getPropertyValue('--dot').trim() || '#7E93A6'
        drawStationField(ctx, data.stationXY, view, { width, height, dpr }, tierRef.current.stationRadius, colour)
      }
    }

    const inverse = 1 / view.k
    const placed = placeLabels(labelCandidates, view, { width, height })
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
  }, [data, labelCandidates, endpoints])

  const onZoomSettled = useCallback((relative: number) => {
    const next = tierFor(relative)
    setTier((prev) => (prev === next ? prev : next))
    if (!next.stationLabels && hoverCodeRef.current !== null) {
      hoverCodeRef.current = null
      setHoverStation(null)
    }
  }, [])

  const { zoomBy, reset } = usePanZoom(stage, { onFrame, onZoomSettled })

  /**
   * Which station dot, if any, is under the pointer — so hovering one can
   * name it. Skipped below `stationLabels` zoom, where dots are a texture of
   * a few pixels each and nothing is individually pickable. Skipped while a
   * button/finger is down too: that's a pan or pinch in progress, and
   * setting state on every one of those pointermoves would re-render the
   * tree mid-drag, which is exactly what the view-in-a-ref design avoids.
   */
  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!data || !tierRef.current.stationLabels || e.buttons !== 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const { x, y, k } = viewRef.current
    const hitR = 9
    let best: { code: string; name: string; sx: number; sy: number; d2: number } | null = null
    for (const s of data.byCode.values()) {
      const sx = s.x * k + x
      const sy = s.y * k + y
      const dx = sx - mx, dy = sy - my
      if (dx < -hitR || dx > hitR || dy < -hitR || dy > hitR) continue
      const d2 = dx * dx + dy * dy
      if (d2 <= hitR * hitR && (!best || d2 < best.d2)) best = { code: s.code, name: s.name, sx, sy, d2 }
    }
    if (best) {
      hoverCodeRef.current = best.code
      setHoverStation({ name: best.name, sx: best.sx, sy: best.sy })
    } else if (hoverCodeRef.current !== null) {
      hoverCodeRef.current = null
      setHoverStation(null)
    }
  }, [data])

  const onPointerLeave = useCallback(() => {
    if (hoverCodeRef.current !== null) {
      hoverCodeRef.current = null
      setHoverStation(null)
    }
  }, [])

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

  if (error) {
    return (
      <div className="grid min-h-dvh place-items-center p-8 text-center">
        <div className="flex max-w-sm flex-col gap-3">
          <p className="font-semibold text-vermillion">The map data isn&rsquo;t there yet.</p>
          <p className="text-sm text-ink-soft">{error}</p>
          <p className="text-sm text-ink-faint">
            Run <code className="text-ink-soft">npm run assets</code> and reload.
          </p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <p className="text-sm tracking-[0.16em] text-ink-faint uppercase">Loading the network…</p>
      </div>
    )
  }

  const cityCount = tier.cityCount

  return (
    <div
      ref={stage}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`absolute inset-0 touch-none bg-sea [cursor:grab] active:[cursor:grabbing]${seaStill ? ' sea-paused' : ''}`}
    >
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
          {/* neighbouring coastlines as ghosts — scenery, not states */}
          {data.neighbors.map((d, i) => (
            <path
              key={i}
              d={d}
              fillOpacity={0.1}
              strokeOpacity={0.3}
              strokeWidth={0.8}
              className="fill-sea-ink stroke-sea-ink [vector-effect:non-scaling-stroke]"
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
              className={
                visitedStates.has(s.name)
                  ? 'fill-land-visited stroke-line [vector-effect:non-scaling-stroke]'
                  : 'fill-land stroke-line [vector-effect:non-scaling-stroke]'
              }
              strokeWidth={0.6}
            />
          ))}
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
            {routes.map((r) => (
              <path key={`halo-${r.id}`} d={r.d} fill="none"
                className="stroke-route-taken opacity-15 [vector-effect:non-scaling-stroke]"
                strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {routes.map((r) => (
              <path key={`line-${r.id}`} d={r.d} fill="none"
                className="stroke-route-taken [vector-effect:non-scaling-stroke]"
                strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {endpoints.map((e, i) => (
              <circle key={e.name} ref={(el) => { stopRefs.current[i] = el }}
                cx={e.x} cy={e.y} r={4}
                className={e.last
                  ? 'fill-you-are-here stroke-ground [vector-effect:non-scaling-stroke]'
                  : 'fill-station-seen stroke-ground [vector-effect:non-scaling-stroke]'}
                strokeWidth={1.8} />
            ))}
          </g>

          <g>
            {labelCandidates.map((c, i) => {
              const isCity = i < data.cities.length
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

      {hoverStation && (
        <div
          className="pointer-events-none absolute z-10 rounded-sm border border-line bg-surface px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-ink"
          style={{ left: hoverStation.sx, top: hoverStation.sy, transform: 'translate(-50%, -145%)' }}
        >
          {hoverStation.name}
        </div>
      )}

      <div className="pointer-events-auto absolute right-3 bottom-3 flex flex-col overflow-hidden rounded-sm border border-line bg-surface">
        <button type="button" onClick={() => zoomBy(1.6)} aria-label="Zoom in"
          className="h-10 w-10 border-b border-line text-ink-soft hover:bg-surface-2 hover:text-accent">+</button>
        <button type="button" onClick={() => zoomBy(1 / 1.6)} aria-label="Zoom out"
          className="h-10 w-10 border-b border-line text-ink-soft hover:bg-surface-2 hover:text-accent">−</button>
        <button type="button" onClick={reset} aria-label="Fit the whole country"
          className="h-10 w-10 border-b border-line text-[0.6rem] font-semibold tracking-[0.1em] text-ink-soft uppercase hover:bg-surface-2 hover:text-accent">Fit</button>
        <button type="button" onClick={() => setSeaStill((s) => !s)} aria-pressed={seaStill}
          aria-label={seaStill ? 'Let the sea move again' : 'Hold the sea still'}
          className={`h-10 w-10 text-ink-soft hover:bg-surface-2 hover:text-accent${seaStill ? ' opacity-45' : ''}`}>≈</button>
      </div>
    </div>
  )
}

export const MAP_ASPECT = MAP_WIDTH / MAP_HEIGHT

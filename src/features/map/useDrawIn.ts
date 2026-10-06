import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import {
  FADE_MS, LINE_MS, STATE_FADE_MS, STEADY_FRAMES, STEADY_GAP_MS, STEADY_WAIT_MS,
  easeArrive, easeTrain, partialPolyline, reachedCount, staggerOffsets,
} from './drawIn.ts'
import type { JourneyRoute } from './useJourneyRoutes.ts'
import type { Journey } from '@/types/index.ts'
import type { Totals } from '@/features/stats/tally.ts'

export interface DrawInTarget {
  /** Oldest first, latest last — the order the lines set off in, so the
      sequence ends on the journey that puts you where you are. */
  routes: readonly JourneyRoute[]
  /** The finished paths, exactly as IndiaMap renders them. Written back at the
      end, so what is left on screen is React's own value. */
  merged: { exact: string; inferred: string; latest: { d: string } | null }
  latestId: string | null
  journeys: readonly Journey[]
  /** Parallel to `stopRefs`, and to `labelRefs` from `labelOffset` on. */
  endpoints: ReadonlyArray<{ code: string }>
  paths: {
    exact: RefObject<SVGPathElement | null>
    inferred: RefObject<SVGPathElement | null>
    latest: RefObject<SVGPathElement | null>
  }
  stopRefs: RefObject<Array<SVGCircleElement | null>>
  labelRefs: RefObject<Array<SVGGElement | null>>
  labelOffset: number
  /** Every state's path, by name. */
  stateRefs: RefObject<Map<string, SVGPathElement>>
  /** The wash on the state the latest journey ended in. */
  destination: RefObject<SVGPathElement | null>
  /** The stat tiles' feed: the totals as drawn so far, every frame, then
      `null` when the draw-in ends. See features/stats/tally.ts. */
  onTally?: ((totals: Totals | null) => void) | undefined
}

interface Run {
  /** Delay after the clock starts, from the stagger. */
  offset: number
  /** Set once frames are steady (see STEADY_FRAMES), not when scheduled. That
      also covers a map loaded in a background tab: it gets no frames, so it
      plays when it is looked at rather than turn out to have finished unseen. */
  start: number | null
}

function clearOverride(path: SVGPathElement): void {
  path.style.removeProperty('fill')
  path.style.removeProperty('stroke')
  path.style.removeProperty('stroke-width')
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Routes draw themselves in: every journey on first load, staggered oldest to
 * newest, and afterwards any journey the map has not drawn before — which is
 * the one just logged. That second case is the reward the whole core loop
 * hangs on (docs/03-project-spec.md §3): save, and a line crosses the country.
 *
 * A journey is drawn in once per page. Its route can still change underneath
 * — the train's stop list arrives a moment after load and turns a dashed
 * guess into a solid record — and that must not replay it, so runs are keyed
 * by journey id, never by path.
 *
 * Each endpoint lights as its line reaches it: the origin as the line sets
 * off, the destination on arrival, and its name with it. A station some
 * already-drawn journey touches is lit from the start.
 *
 * A state fills as the first line enters it — not when the journey is
 * logged, and not all at once on load, where every visited state used to be
 * filled before a single line had moved, so the map gave away where you had
 * been before it showed you. The wash on the latest journey's destination
 * waits for that line to arrive.
 *
 * Like the pan/zoom transform, every frame is written straight to the DOM.
 * The three visible route paths are React's, so this writes their `d` only
 * while a run is live and hands React's own value back at the end; a render
 * in between (a stop list landing) is repainted in the layout effect before
 * the browser shows it. A state still waiting is the same arrangement: React
 * has already given it the visited class, and an inline style — which beats
 * any class — holds it at the unvisited look, then mixes towards visited, then
 * is removed, leaving the class to say exactly what it said all along.
 *
 * Reduced motion skips the whole thing: the lines are simply there.
 */
export function useDrawIn(target: DrawInTarget): void {
  const latest = useRef(target)
  latest.current = target
  const seen = useRef(new Set<string>())
  const runs = useRef(new Map<string, Run>())
  const raf = useRef(0)
  /** The frame clock while runs wait to start: when the wait began, the last
      frame, and how many steady frames in a row there have been. */
  const settle = useRef<{ since: number; last: number; steady: number } | null>(null)
  /** When each state was first entered by a line, during a draw-in. Kept
      across frames — a state is entered once — and cleared when it ends. */
  const entered = useRef(new Map<string, number>())

  /** Paints one frame. False once every line has arrived and every station
      finished lighting — at which point the finished state is already on
      screen. */
  const paint = useCallback((now: number): boolean => {
    const {
      routes, merged, latestId, journeys, endpoints, paths, stopRefs, labelRefs, labelOffset,
      stateRefs, destination, onTally,
    } = latest.current
    const live = runs.current
    const states = entered.current
    let busy = false

    const exact: string[] = [], inferred: string[] = []
    let latestD = ''
    const visited = new Set<string>()
    // The totals as drawn so far, for the stat tiles: each route's distance in
    // proportion to how much of its line is down, and the stations it has
    // reached. A finished line counts every stop, placeable or not, so the
    // last frame lands exactly on the totals IndiaMap reports.
    let km = 0, longestKm = 0
    const stations = new Set<string>()
    for (const r of routes) {
      for (const s of r.pointStates) visited.add(s)
      const run = live.get(r.id)
      let d = r.d
      let drawn = 1
      if (!run) {
        // Drawn before this draw-in began, so every state on it is filled.
        for (const s of r.pointStates) states.set(s, -Infinity)
      } else {
        const t = run.start === null ? -1 : (now - run.start) / LINE_MS
        drawn = t < 0 ? 0 : easeTrain(t)
        const reached = reachedCount(r.points, t < 0 ? -1 : drawn)
        for (let i = 0; i < reached; i++) {
          const s = r.pointStates[i]!
          if (!states.has(s)) states.set(s, now)
        }
        if (t < 1) {
          busy = true
          d = partialPolyline(r.points, drawn)
          for (let i = 0; i < reached; i++) stations.add(r.pointCodes[i]!)
        }
      }
      if (drawn >= 1) for (const c of r.stops) stations.add(c)
      km += r.km * drawn
      longestKm = Math.max(longestKm, r.km * drawn)
      if (d) (r.exact ? exact : inferred).push(d)
      if (r.id === latestId) latestD = d
    }

    // When each endpoint lights. A station with any journey that is not
    // drawing in right now is lit already; otherwise it waits for the first
    // line to reach it.
    const lightsAt = new Map<string, number>()
    const earliest = (code: string, at: number) => {
      lightsAt.set(code, Math.min(lightsAt.get(code) ?? Infinity, at))
    }
    for (const j of journeys) {
      const run = live.get(j.id)
      if (!run) { earliest(j.fromCode, -Infinity); earliest(j.toCode, -Infinity); continue }
      const start = run.start ?? Infinity
      earliest(j.fromCode, start)
      earliest(j.toCode, start + LINE_MS)
    }
    endpoints.forEach((e, i) => {
      const at = lightsAt.get(e.code) ?? -Infinity
      const o = easeArrive((now - at) / FADE_MS)
      if (o < 1) busy = true
      const opacity = o < 1 ? String(o) : ''
      const dot = stopRefs.current[i], label = labelRefs.current[labelOffset + i]
      if (dot) dot.style.opacity = opacity
      if (label) label.style.opacity = opacity
    })

    // A state waiting for its first line is held at the unvisited look and
    // mixed across to visited. Tokens only, so it is right in both themes.
    for (const name of visited) {
      const path = stateRefs.current.get(name)
      if (!path) continue
      const f = easeArrive((now - (states.get(name) ?? Infinity)) / STATE_FADE_MS)
      if (f < 1) {
        busy = true
        const pct = (f * 100).toFixed(1)
        path.style.fill = `color-mix(in oklab, var(--land-visited) ${pct}%, var(--land))`
        path.style.stroke = `color-mix(in oklab, var(--line-strong) ${pct}%, var(--line))`
        path.style.strokeWidth = `${(0.6 + f).toFixed(2)}px`
      } else {
        clearOverride(path)
      }
    }

    // The latest journey's destination, washed on arrival.
    const last = latestId ? live.get(latestId) : undefined
    if (destination.current) {
      const arrives = last ? (last.start ?? Infinity) + LINE_MS : -Infinity
      const o = easeArrive((now - arrives) / STATE_FADE_MS)
      if (o < 1) busy = true
      destination.current.style.opacity = o < 1 ? String(o) : ''
    }

    // A state counts from the moment a line enters it, as its fill begins.
    onTally?.(busy ? { km, longestKm, stations: stations.size, states: states.size } : null)

    if (!busy) {
      live.clear()
      states.clear()
      for (const path of stateRefs.current.values()) clearOverride(path)
      paths.exact.current?.setAttribute('d', merged.exact)
      paths.inferred.current?.setAttribute('d', merged.inferred)
      if (merged.latest) paths.latest.current?.setAttribute('d', merged.latest.d)
      return false
    }
    paths.exact.current?.setAttribute('d', exact.join(' '))
    paths.inferred.current?.setAttribute('d', inferred.join(' '))
    paths.latest.current?.setAttribute('d', latestD)
    return true
  }, [])

  const tick = useCallback(function step(now: number) {
    raf.current = 0
    const waiting = [...runs.current.values()].filter((r) => r.start === null)
    if (waiting.length > 0) {
      const s = settle.current ??= { since: now, last: now, steady: -1 }
      s.steady = now - s.last <= STEADY_GAP_MS ? s.steady + 1 : 0
      s.last = now
      if (s.steady >= STEADY_FRAMES || now - s.since >= STEADY_WAIT_MS) {
        for (const run of waiting) run.start = now + run.offset
        settle.current = null
      }
    }
    if (paint(now)) raf.current = requestAnimationFrame(step)
  }, [paint])

  // Layout, not passive: React has just committed the finished paths, and the
  // empty first frame has to replace them before the browser paints — or
  // every route flashes whole for a frame and then starts drawing.
  const { routes, merged, endpoints } = target
  useLayoutEffect(() => {
    const fresh = routes.filter((r) => !seen.current.has(r.id))
    for (const r of fresh) seen.current.add(r.id)
    if (fresh.length > 0 && !prefersReducedMotion()) {
      const offsets = staggerOffsets(fresh.length)
      fresh.forEach((r, i) => runs.current.set(r.id, { offset: offsets[i] ?? 0, start: null }))
    }
    if (runs.current.size === 0) return
    paint(performance.now())
    if (!raf.current) raf.current = requestAnimationFrame(tick)
  }, [routes, merged, endpoints, paint, tick])

  useEffect(() => () => {
    cancelAnimationFrame(raf.current)
    raf.current = 0
    // Released, or the tiles would wait on a draw-in that is never coming
    // back. A remount that resumes it simply emits again.
    latest.current.onTally?.(null)
  }, [])
}

/**
 * The arithmetic of a route drawing itself in. Pure — no DOM, no React — so
 * scripts/check-draw-in.ts can run it under plain node. useDrawIn.ts is the
 * part that touches the page.
 *
 * Why the line's own geometry grows rather than a stroke-dashoffset sweep,
 * the usual trick: an inferred route is already dashed, and a dash pattern
 * cannot also be the reveal mask without losing the pattern. And every route
 * is drawn with `vector-effect: non-scaling-stroke`, under which dash lengths
 * are measured in screen pixels, not in the path length a dashoffset would be
 * computed from. Cutting the polyline itself has neither problem: the dashes
 * stay where they will be when the line is whole, and the tip is a real end
 * with the line's own round cap.
 */

/** One line, departure to arrival. Long enough to read as travel. */
export const LINE_MS = 700

/** The whole first-load sequence, however many journeys there are. The spec's
    number (docs/03-project-spec.md §6): long enough to notice, short enough not
    to annoy on the fifth visit. */
export const TOTAL_MS = 1200

/** Gap between one journey setting off and the next. Three journeys read as
    three departures at this pace; twenty compress to fit TOTAL_MS. */
export const STAGGER_MAX_MS = 120

/** A station lighting up as the line reaches it. Matches --duration-fast, the
    system's one transition length. */
export const FADE_MS = 150

/** A state filling in as the first line enters it — the map's single biggest
    reward, so it gets longer than a dot (docs/08-roadmap.md, Phase 2 item 15:
    "a 400ms ease, not a pop"). */
export const STATE_FADE_MS = 400

/**
 * When a line may set off: once the browser is actually delivering frames.
 *
 * On first load the map's first frames are its most expensive — every state,
 * the coastline three times over, the station field — and the compositor can
 * stall for a third of a second rasterising them with no script running at
 * all. Measured in headless Chrome: frame gaps of 117 ms and 333 ms in the
 * first 500 ms, no long task behind either. A 700 ms line started into that
 * jumps from a stub to nearly whole in one frame, which is not drawing in.
 *
 * So the clock waits for STEADY_FRAMES consecutive frames no longer than
 * STEADY_GAP_MS (two 60 Hz frames — a 30 Hz device still qualifies) and gives
 * up waiting after STEADY_WAIT_MS: a phone that never settles should still
 * see its lines, just not perfectly.
 */
export const STEADY_FRAMES = 3
export const STEADY_GAP_MS = 34
export const STEADY_WAIT_MS = 800

/**
 * Start offsets for `n` lines, oldest first. The stagger shrinks with the
 * count so the last line always lands by TOTAL_MS — a log of forty journeys
 * should not take three seconds to finish arriving.
 */
export function staggerOffsets(n: number): number[] {
  if (n <= 0) return []
  const step = n === 1 ? 0 : Math.min(STAGGER_MAX_MS, (TOTAL_MS - LINE_MS) / (n - 1))
  return Array.from({ length: n }, (_, i) => i * step)
}

/** A train's speed curve: pulls away, runs, brakes. Nothing on this map moves
    linearly. Ease-in-out cubic, the same curve as cubic-bezier(.65,0,.35,1). */
export function easeTrain(t: number): number {
  if (t <= 0) return 0
  if (t >= 1) return 1
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

/** For things arriving rather than travelling — a station lighting, a state
    filling: quick to show, gentle to finish. Ease-out cubic. */
export function easeArrive(t: number): number {
  if (t <= 0) return 0
  if (t >= 1) return 1
  return 1 - (1 - t) ** 3
}

export type Point = readonly [number, number]

const lengths = new WeakMap<readonly Point[], Float64Array>()

/** Running distance to each vertex, cached per route — a route's points are
    built once per routing pass, and every frame of its draw-in reads them. */
function cumulative(points: readonly Point[]): Float64Array {
  let cum = lengths.get(points)
  if (cum) return cum
  cum = new Float64Array(points.length)
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!
    cum[i] = cum[i - 1]! + Math.hypot(b[0] - a[0], b[1] - a[1])
  }
  lengths.set(points, cum)
  return cum
}

/**
 * How many of a polyline's vertices the first `t` of it (by length) has
 * reached — the start vertex counts from t = 0. Negative `t` is a line that
 * has not set off, and reaches nothing.
 */
export function reachedCount(points: readonly Point[], t: number): number {
  if (t < 0 || points.length === 0) return 0
  if (t >= 1) return points.length
  const cum = cumulative(points)
  const target = t * cum[cum.length - 1]!
  let n = 1
  while (n < points.length && cum[n]! <= target) n++
  return n
}

/**
 * The first `t` of a polyline, by length, as an SVG path.
 *
 * Whole vertices are written exactly as useJourneyRoutes writes them — one
 * decimal — so a line at t = 1 is the same string as the finished route and
 * the hand-over at the end of the animation cannot shift it by a sub-pixel.
 * `t <= 0` is an empty path, not a single point: with round caps, a
 * zero-length segment paints a dot.
 */
export function partialPolyline(points: readonly Point[], t: number): string {
  const first = points[0]
  if (t <= 0 || !first) return ''
  const fmt = (p: Point) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`
  const cum = cumulative(points)
  const target = Math.min(t, 1) * cum[cum.length - 1]!

  let d = `M${fmt(first)}`
  let i = 1
  for (; i < points.length && cum[i]! <= target; i++) d += `L${fmt(points[i]!)}`
  if (i < points.length) {
    const a = points[i - 1]!, b = points[i]!
    const span = cum[i]! - cum[i - 1]!
    const f = span > 0 ? (target - cum[i - 1]!) / span : 0
    d += `L${(a[0] + (b[0] - a[0]) * f).toFixed(2)},${(a[1] + (b[1] - a[1]) * f).toFixed(2)}`
  }
  return d
}

import { geoPath, type GeoContext, type GeoPermissibleObjects, type GeoProjection } from 'd3-geo'

/**
 * State polygons come out of the simplify step in build-map.ts as sparse
 * straight-line vertices, so a coastline that should curve reads instead as a
 * handful of dead-straight segments meeting at hard angles — the opposite of
 * hand-drawn. This fits a smooth curve through the same vertices instead of
 * connecting them with straight lines, so the shape doesn't change, only how
 * the edges between its real points are drawn.
 *
 * Centripetal Catmull-Rom (alpha = 0.5), not the plain/uniform version:
 * simplified coastline vertices are unevenly spaced, and uniform Catmull-Rom
 * loops and self-intersects on uneven spacing. Centripetal doesn't.
 */
const ALPHA = 0.5

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.hypot(bx - ax, by - ay), 1e-6) // guard duplicate vertices
}

/** One smooth cubic-bezier segment from p1 to p2, shaped by its neighbours. */
function segment(
  [x0, y0]: readonly [number, number],
  [x1, y1]: readonly [number, number],
  [x2, y2]: readonly [number, number],
  [x3, y3]: readonly [number, number],
): string {
  const t01 = dist(x0, y0, x1, y1) ** ALPHA
  const t12 = dist(x1, y1, x2, y2) ** ALPHA
  const t23 = dist(x2, y2, x3, y3) ** ALPHA

  const m1x = t12 * ((x1 - x0) / t01 - (x2 - x0) / (t01 + t12) + (x2 - x1) / t12)
  const m1y = t12 * ((y1 - y0) / t01 - (y2 - y0) / (t01 + t12) + (y2 - y1) / t12)
  const m2x = t12 * ((x2 - x1) / t12 - (x3 - x1) / (t12 + t23) + (x3 - x2) / t23)
  const m2y = t12 * ((y2 - y1) / t12 - (y3 - y1) / (t12 + t23) + (y3 - y2) / t23)

  const c1x = x1 + m1x / 3, c1y = y1 + m1y / 3
  const c2x = x2 - m2x / 3, c2y = y2 - m2y / 3
  return `C${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}`
}

/** A closed ring of points, smoothed into an "M...C...Z" path fragment. */
function smoothRing(points: ReadonlyArray<readonly [number, number]>): string {
  const first = points[0], last = points[points.length - 1]
  const closed = first && last && first[0] === last[0] && first[1] === last[1]
  const pts = closed ? points.slice(0, -1) : points
  const n = pts.length
  if (n < 3) return n === 0 ? '' : `M${pts.map((p) => `${p[0]},${p[1]}`).join('L')}Z`

  const at = (i: number) => pts[((i % n) + n) % n]!
  let d = `M${pts[0]![0]},${pts[0]![1]}`
  for (let i = 0; i < n; i++) d += segment(at(i - 1), at(i), at(i + 1), at(i + 2))
  return d + 'Z'
}

/**
 * Same job as `geoPath(projection)(feature)`, but returns a smoothed path
 * instead of straight-line segments. Works by giving d3-geo a throwaway
 * context that just records the projected points of each ring, then smooths
 * each ring independently — so a MultiPolygon's separate parts, and a
 * polygon's holes, each stay their own closed curve.
 */
export function smoothGeoPath(projection: GeoProjection, feature: GeoPermissibleObjects): string {
  const rings: Array<Array<[number, number]>> = []
  let current: Array<[number, number]> = []
  const ctx: GeoContext = {
    beginPath() {},
    moveTo(x, y) { current = [[x, y]]; rings.push(current) },
    lineTo(x, y) { current.push([x, y]) },
    closePath() {},
    arc() {},
  }
  geoPath(projection, ctx)(feature)
  return rings.map(smoothRing).join('')
}

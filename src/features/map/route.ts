/**
 * Turning a journey into a line that follows the railway.
 *
 * A journey drawn as a straight line between its two endpoints does not follow
 * the track. Measured on the Vijayawada→Chennai leg, the straight line spends
 * 75% of its length over the Bay of Bengal, because the east coast is concave
 * and a chord cuts the corner. Drawn through the stations a train actually
 * stops at, the same leg is 0% offshore and its length matches the real rail
 * distance to within a percent.
 *
 * So: never draw a two-point line. Always expand a journey into its stops.
 */

/** Wire format written by scripts/build-routes.ts. */
export interface RailGraphWire {
  /** Sorted station codes; edges reference these by index. */
  s: string[]
  /** Flat triples: [aIndex, bIndex, decimetres, ...]. */
  e: number[]
}

export interface RailGraph {
  /** station code -> [[neighbour code, km], ...] */
  adjacency: Map<string, Array<[string, number]>>
  stationCount: number
  edgeCount: number
}

export function parseRailGraph(wire: RailGraphWire): RailGraph {
  const adjacency = new Map<string, Array<[string, number]>>()
  const push = (a: string, b: string, km: number) => {
    let list = adjacency.get(a)
    if (!list) { list = []; adjacency.set(a, list) }
    list.push([b, km])
  }
  for (let i = 0; i < wire.e.length; i += 3) {
    const a = wire.s[wire.e[i]!], b = wire.s[wire.e[i + 1]!]
    const km = wire.e[i + 2]! / 10
    if (a === undefined || b === undefined) continue
    push(a, b, km)
    push(b, a, km)
  }
  return { adjacency, stationCount: wire.s.length, edgeCount: wire.e.length / 3 }
}

export interface RouteResult {
  /** Ordered station codes, including both endpoints. */
  codes: string[]
  /** Along-track distance in km. Not great-circle — this is the real thing. */
  km: number
}

/**
 * Shortest path over the rail network. Plain Dijkstra with a binary heap:
 * 8,246 stations and 9,895 edges is small, and this measures at 2–19 ms for
 * cross-country routes, so there is nothing to gain from A* here.
 */
export function findRoute(graph: RailGraph, from: string, to: string): RouteResult | null {
  if (from === to) return { codes: [from], km: 0 }
  if (!graph.adjacency.has(from) || !graph.adjacency.has(to)) return null

  const dist = new Map<string, number>([[from, 0]])
  const prev = new Map<string, string>()
  const settled = new Set<string>()
  const heap: Array<[number, string]> = [[0, from]]

  const push = (d: number, k: string) => {
    heap.push([d, k])
    let i = heap.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (heap[p]![0] <= heap[i]![0]) break
      ;[heap[p], heap[i]] = [heap[i]!, heap[p]!]
      i = p
    }
  }
  const pop = (): [number, string] => {
    const top = heap[0]!
    const last = heap.pop()!
    if (heap.length) {
      heap[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1, r = l + 1
        let m = i
        if (l < heap.length && heap[l]![0] < heap[m]![0]) m = l
        if (r < heap.length && heap[r]![0] < heap[m]![0]) m = r
        if (m === i) break
        ;[heap[m], heap[i]] = [heap[i]!, heap[m]!]
        i = m
      }
    }
    return top
  }

  while (heap.length) {
    const [d, node] = pop()
    if (settled.has(node)) continue
    settled.add(node)
    if (node === to) break
    for (const [next, km] of graph.adjacency.get(node) ?? []) {
      const nd = d + km
      if (nd < (dist.get(next) ?? Infinity)) {
        dist.set(next, nd)
        prev.set(next, node)
        push(nd, next)
      }
    }
  }

  const total = dist.get(to)
  if (total === undefined) return null

  const codes: string[] = []
  let cursor: string | undefined = to
  while (cursor !== undefined) { codes.push(cursor); cursor = prev.get(cursor) }
  codes.reverse()
  return { codes, km: total }
}

/**
 * Why a journey could not be turned into a line.
 *
 * `findRoute` returns null for two quite different reasons and the caller
 * cannot tell them apart from the null alone, which is how a journey used to
 * vanish from the map without a word. Naming them here means the UI can say
 * something true about each, and means a caller cannot silently drop one by
 * checking only for the reason it happened to think of.
 */
export type RouteFailure =
  /**
   * One or both codes have no edges in the graph at all. 450 of the 8,696
   * stations in stations.json are in this position, because the graph is
   * built from timetables (see scripts/build-routes.ts) and no train in that
   * dataset calls at them. They are still real stations and still pickable,
   * so this is an expected state, not a corruption.
   */
  | { kind: 'unknown-station'; codes: string[] }
  /**
   * Both codes are in the graph, but no path joins them — they sit in
   * different connected components. The graph has two: the network, and a
   * 13-station island around Dhamtari in Chhattisgarh, which is a genuinely
   * separate narrow-gauge line rather than a data error. Dijkstra runs to
   * exhaustion here, so this is NOT caught by an `adjacency.has()` check.
   */
  | { kind: 'no-path' }
  /**
   * The route resolved, but fewer than two of its stops could be placed on
   * the map — the codes are not in `byCode`. A line needs two points.
   */
  | { kind: 'undrawable'; plotted: number; of: number }

export interface RouteOutcome {
  result: RouteResult | null
  /** True when the path came from a real timetable rather than inference. */
  exact: boolean
  /** Null exactly when `result` is non-null. */
  failure: RouteFailure | null
}

/**
 * Length of a known sequence of stops, in km along the track.
 *
 * Consecutive stops of a train are edges of the graph by construction — both
 * are built from the same timetable — so this is almost always a straight sum
 * of edge weights. Almost: build-routes.ts drops any hop over MAX_HOP_KM as
 * implausible, which leaves a pair of stops adjacent on the train but not
 * adjacent in the graph. Routing across that gap is closer to the truth than
 * ignoring it; a gap that cannot be routed at all contributes nothing, which
 * under-counts rather than inventing a number.
 */
function alongTrack(graph: RailGraph, codes: readonly string[]): number {
  let km = 0
  for (let i = 0; i < codes.length - 1; i++) {
    const a = codes[i], b = codes[i + 1]
    if (a === undefined || b === undefined) continue
    const edge = graph.adjacency.get(a)?.find(([n]) => n === b)
    if (edge) { km += edge[1]; continue }
    const bridged = findRoute(graph, a, b)
    if (bridged) km += bridged.km
  }
  return km
}

/**
 * Preferred path for a journey.
 *
 * If the user recorded a train number and we know its stop list, that IS the
 * route — no inference needed. Otherwise fall back to the shortest path, which
 * is a plausible answer rather than a true one, so label it as such in the UI.
 */
export function routeForJourney(
  graph: RailGraph,
  from: string,
  to: string,
  trainStops?: readonly string[],
): RouteOutcome {
  if (trainStops && trainStops.length > 1) {
    const i = trainStops.indexOf(from)
    const j = trainStops.indexOf(to)
    if (i !== -1 && j !== -1) {
      const slice = i < j ? trainStops.slice(i, j + 1) : trainStops.slice(j, i + 1).reverse()
      // A recorded stop list is the truth about which stations, but it carries
      // no distances, so the length still has to come from the graph. This
      // used to return `km: 0` — harmless only while nothing passed
      // `trainStops`, and a silent under-count of the totals the moment
      // anything did.
      return { result: { codes: [...slice], km: alongTrack(graph, slice) }, exact: true, failure: null }
    }
  }

  // Checked here rather than left to findRoute so the two null paths stay
  // distinguishable. `from === to` is deliberately exempt: findRoute answers
  // that before it looks at the graph, and a same-station journey is a
  // legitimate zero-length answer whether or not the code is known.
  if (from !== to) {
    const unknown = [...new Set([from, to])].filter((c) => !graph.adjacency.has(c))
    if (unknown.length > 0) {
      return { result: null, exact: false, failure: { kind: 'unknown-station', codes: unknown } }
    }
  }

  const result = findRoute(graph, from, to)
  if (!result) return { result: null, exact: false, failure: { kind: 'no-path' } }
  return { result, exact: false, failure: null }
}

/** One line of plain English, for a tooltip or a dev warning. */
export function describeRouteFailure(f: RouteFailure): string {
  switch (f.kind) {
    case 'unknown-station':
      return `no rail-graph data for ${f.codes.join(' and ')}`
    case 'no-path':
      return 'no connected path on the rail network'
    case 'undrawable':
      return `only ${f.plotted} of ${f.of} stops could be placed on the map`
  }
}

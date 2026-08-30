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
): { result: RouteResult | null; exact: boolean } {
  if (trainStops && trainStops.length > 1) {
    const i = trainStops.indexOf(from)
    const j = trainStops.indexOf(to)
    if (i !== -1 && j !== -1) {
      const slice = i < j ? trainStops.slice(i, j + 1) : trainStops.slice(j, i + 1).reverse()
      return { result: { codes: [...slice], km: 0 }, exact: true }
    }
  }
  return { result: findRoute(graph, from, to), exact: false }
}

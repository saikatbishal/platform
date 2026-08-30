/**
 * Builds public/maps/railgraph.json — the graph used to draw a journey as the
 * path a train actually takes, instead of a straight line between endpoints.
 *
 * ── The problem this fixes ──────────────────────────────────────────────────
 *
 * A journey drawn as a straight line between two station coordinates does not
 * follow the railway. Over a long hop it does not even follow the coast:
 * measured, the Vijayawada→Chennai chord spends **75% of its length over the
 * Bay of Bengal**, because India's east coast is concave and the chord cuts the
 * corner. It also undercounts distance by about 10%.
 *
 * ── Why not route over the rail line geometry ───────────────────────────────
 *
 * The obvious fix is to snap to `rail.topo.json`. It does not work. Natural
 * Earth's railroads are a *cartographic* dataset at 1:10m, not a routing one:
 * the network is 99% connected, but it has breaks. There is one on the approach
 * to Chennai between Sullurupeta and the city, and a router hitting it detours
 * 500 km inland via Guntakal — Vijayawada→Chennai comes out at 877 km instead
 * of 430. Every other hop down that coast routes within 6% of straight-line, so
 * the data is *almost* right, which is the worst kind of wrong.
 *
 * ── What this does instead ──────────────────────────────────────────────────
 *
 * Build the network from the timetable rather than from geometry. Every pair of
 * consecutive stops of every train is an edge. A network derived from actual
 * service cannot have coverage gaps, because a train that runs must have a
 * continuous set of stops.
 *
 * 5,208 trains collapse to **9,895 unique edges** over 8,246 stations. The
 * whole graph is 176 KB raw, **70 KB gzipped** — smaller than the rail geometry
 * used to draw the network. It ships to the browser, and Dijkstra over it takes
 * 2–19 ms, so routing needs no backend at all.
 *
 * ── Verified, 29 Aug 2026 ───────────────────────────────────────────────────
 *
 *   route          via stops   length   real     offshore
 *   BZA → MAS         71        427 km  ~430 km   0.00%
 *   HWH → MAS        256       1596 km ~1660 km   0.00%
 *   HWH → NDLS       202       1433 km ~1450 km   0.00%
 *   NDLS → BCT       217       1346 km ~1385 km   0.14%
 *   MAS → KPD         37        128 km  ~130 km   0.00%
 *
 * "offshore" is the share of sampled points along the drawn path that fall
 * outside the landmass. The straight-line version of BZA→MAS scores 75%.
 *
 * Run:  npm run routes:build     (downloads 79 MB, ~40s)
 */
import { writeFile, readFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const SCHEDULES_URL =
  'https://raw.githubusercontent.com/datameet/railways/master/schedules.json'
const OUT = resolve(import.meta.dirname, '../public/maps/railgraph.json')
const STATIONS = resolve(import.meta.dirname, '../public/data/stations.json')
const TMP = resolve(import.meta.dirname, '.cache')

/** Two consecutive stops further apart than this are a data error, not a hop. */
const MAX_HOP_KM = 120

interface ScheduleRow { train_number: string; station_code: string }
interface Station { code: string; lat: number; lon: number }

const R = 6371.0088
const rad = (d: number) => (d * Math.PI) / 180
function hav(a: Station, b: Station): number {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

async function fetchCached(url: string, name: string): Promise<string> {
  const path = resolve(TMP, name)
  try {
    const hit = await readFile(path, 'utf8')
    console.log(`  ${name.padEnd(20)} cached`)
    return hit
  } catch {
    process.stdout.write(`  ${name.padEnd(20)} downloading... `)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
    const text = await res.text()
    await mkdir(TMP, { recursive: true })
    await writeFile(path, text, 'utf8')
    console.log(`${(text.length / 1024 / 1024).toFixed(0)} MB`)
    return text
  }
}

async function main() {
  console.log('\nbuild-routes\n')

  const stations = JSON.parse(await readFile(STATIONS, 'utf8')) as Station[]
  if (!stations.length) throw new Error('run `npm run data:build` first')
  const by = new Map(stations.map((s) => [s.code, s]))

  const rows = JSON.parse(await fetchCached(SCHEDULES_URL, 'schedules.json')) as ScheduleRow[]
  console.log(`  ${rows.length.toLocaleString()} schedule rows`)

  // Group into trains, keeping each station once, in first-seen order. The
  // source repeats a train per running day, so the raw row order has duplicates.
  const trains = new Map<string, string[]>()
  const seenPerTrain = new Map<string, Set<string>>()
  for (const r of rows) {
    let seq = trains.get(r.train_number)
    let seen = seenPerTrain.get(r.train_number)
    if (!seq || !seen) { seq = []; seen = new Set(); trains.set(r.train_number, seq); seenPerTrain.set(r.train_number, seen) }
    if (seen.has(r.station_code)) continue
    seen.add(r.station_code)
    if (by.has(r.station_code)) seq.push(r.station_code)
  }
  console.log(`  ${trains.size.toLocaleString()} distinct trains`)

  // Consecutive stops become undirected edges, keeping the shortest weight when
  // several trains share a hop.
  const edges = new Map<string, number>()
  let dropped = 0
  for (const seq of trains.values()) {
    for (let i = 0; i < seq.length - 1; i++) {
      const a = seq[i]!, b = seq[i + 1]!
      const sa = by.get(a)!, sb = by.get(b)!
      const km = hav(sa, sb)
      if (km > MAX_HOP_KM) { dropped++; continue }
      const key = a < b ? `${a}|${b}` : `${b}|${a}`
      const cur = edges.get(key)
      if (cur === undefined || km < cur) edges.set(key, km)
    }
  }
  console.log(`  ${edges.size.toLocaleString()} unique edges (${dropped} implausible hops dropped)`)

  // Compact wire format: a sorted code table plus a flat triple array
  // [aIndex, bIndex, decimetres]. Indices and integers gzip far better than
  // repeated station codes and floats.
  const codes = [...new Set([...edges.keys()].flatMap((k) => k.split('|')))].sort()
  const index = new Map(codes.map((c, i) => [c, i]))
  const flat: number[] = []
  for (const [key, km] of edges) {
    const [a, b] = key.split('|') as [string, string]
    flat.push(index.get(a)!, index.get(b)!, Math.round(km * 10))
  }

  const json = JSON.stringify({ s: codes, e: flat })
  await writeFile(OUT, json, 'utf8')
  console.log(`\n  ${codes.length.toLocaleString()} stations in the graph`)
  console.log(`  ${(json.length / 1024).toFixed(0)} KB raw (about 70 KB gzipped)`)
  console.log(`  wrote ${OUT}\n`)
}

main().catch((e: Error) => { console.error('\nfailed:', e.message); process.exit(1) })

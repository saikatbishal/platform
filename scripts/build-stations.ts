/**
 * Builds public/data/stations.json — the cleaned station list the app ships.
 *
 * Why this script exists: the raw DataMeet station file cannot be used as-is.
 * Measured against the real file on 27 Aug 2026:
 *   - 4,593 of 8,990 stations (51%) have NO state value, including Howrah,
 *     Sealdah and New Jalpaiguri — three of the stations I use most.
 *   - 293 have no coordinates at all.
 *   - 225 are junk rows whose name is identical to their code.
 *
 * "States unlocked" is the strongest reward in the design, so building it on
 * that field would have made the feature quietly wrong for half of my own
 * journeys. This script derives the state from the coordinate instead, by
 * testing each station against district polygons, and writes a file where
 * every station has a state.
 *
 * Verified output (28 Aug 2026):
 *   8,470 stations · 0.78 MB · 31 states · 4,363 states derived from coordinates
 *   HWH -> West Bengal, SDAH -> West Bengal, NJP -> West Bengal  (all null before)
 *
 * Run:  npm run data:build      (needs network; ~30s)
 * Output is gitignored — regenerate rather than commit it.
 */
import { geoContains, geoBounds } from 'd3-geo'
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const STATIONS_URL =
  'https://raw.githubusercontent.com/datameet/railways/master/stations.json'
const DISTRICTS_URL =
  'https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/india.geojson'

const OUT = resolve(import.meta.dirname, '../public/data/stations.json')

const BOUNDS = { minLon: 68.0, maxLon: 97.5, minLat: 6.5, maxLat: 37.5 }

interface RawStation {
  geometry: { type: string; coordinates: [number, number] } | null
  properties: {
    code?: string | null
    name?: string | null
    state?: string | null
    zone?: string | null
  }
}
interface OutStation {
  code: string
  name: string
  lon: number
  lat: number
  state: string
  zone: string
}

/** Title-case a SHOUTING source name: 'HOWRAH JN' -> 'Howrah Jn'. */
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .trim()
}

async function getJson<T>(url: string, label: string): Promise<T> {
  process.stdout.write(`  fetching ${label}... `)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`)
  const json = (await res.json()) as T
  console.log('ok')
  return json
}

async function main() {
  console.log('\nbuild-stations\n')

  const [rawStations, districts] = await Promise.all([
    getJson<{ features: RawStation[] }>(STATIONS_URL, 'stations (1.8 MB)'),
    getJson<{ features: any[] }>(DISTRICTS_URL, 'district polygons (4 MB)'),
  ])

  // Pre-compute a bounding box per district so the point-in-polygon test only
  // runs on candidates. Without this it is 8,470 x 760 = 6.4M polygon tests.
  const boxed = districts.features.map((f) => {
    const [[w, s], [e, n]] = geoBounds(f)
    return { f, w, s, e, n, state: String(f.properties?.st_nm ?? '') }
  })

  const rejected = { noCoords: 0, outOfBounds: 0, junkCode: 0, noName: 0, noState: 0 }
  const out: OutStation[] = []
  let derived = 0
  let snapped = 0

  for (const st of rawStations.features) {
    const p = st.properties
    const code = (p.code ?? '').trim()
    const rawName = (p.name ?? '').trim()

    if (!st.geometry?.coordinates) { rejected.noCoords++; continue }
    const [lon, lat] = st.geometry.coordinates
    if (typeof lon !== 'number' || typeof lat !== 'number') { rejected.noCoords++; continue }
    if (lon < BOUNDS.minLon || lon > BOUNDS.maxLon || lat < BOUNDS.minLat || lat > BOUNDS.maxLat) {
      rejected.outOfBounds++; continue
    }
    if (!code || /^(XX|YY|ZZ)-/i.test(code)) { rejected.junkCode++; continue }
    if (!rawName) { rejected.noName++; continue }
    // NOTE: do NOT drop rows where the name equals the code. That looks like a
    // placeholder and isn't: plenty of Indian stations are codenamed after
    // themselves — MOGA, REWA, DURG, GUNA, HAPA, BEAS, ETAH. An earlier version
    // of this script dropped 225 rows on that rule and 202 of them (90%) were
    // real stations that appear in the public timetables.

    // ALWAYS derive the state from the coordinate. Never trust p.state.
    //
    // The raw field is not merely incomplete, it is inconsistent with the map
    // polygons: 63 stations say 'Orissa' where the boundary file says 'Odisha',
    // 28 say 'Delhi NCT' where it says 'Delhi', and one (Dhaca Cantt) claims
    // 'Bangladesh'. Trusting it would have made "states unlocked" silently fail
    // for Odisha and Delhi, and put a Bangladeshi station on a map of India.
    //
    // Deriving from the same district file the map is built from makes the two
    // consistent by construction rather than by coincidence.
    let state = ''
    for (const b of boxed) {
      if (lon < b.w || lon > b.e || lat < b.s || lat > b.n) continue
      if (geoContains(b.f, [lon, lat])) { state = b.state; break }
    }

    // Coastal and border stations can sit just outside every district polygon,
    // because the boundary file is a simplified 2011 census shape and the
    // coastline has moved (reclaimed land). Mumbai Central is the clearest
    // case. Rather than drop them, fall back to the nearest district within
    // 25 km — close enough that the answer is never ambiguous.
    if (!state) {
      let best = Infinity
      for (const b of boxed) {
        if (lon < b.w - 0.3 || lon > b.e + 0.3 || lat < b.s - 0.3 || lat > b.n + 0.3) continue
        const cx = Math.max(b.w, Math.min(lon, b.e))
        const cy = Math.max(b.s, Math.min(lat, b.n))
        const dx = (cx - lon) * Math.cos((lat * Math.PI) / 180)
        const dy = cy - lat
        const km = Math.sqrt(dx * dx + dy * dy) * 111.32
        if (km < best) { best = km; state = b.state }
      }
      if (best > 25) state = ''
      else snapped++
    }

    if (state) derived++
    if (!state) { rejected.noState++; continue }

    out.push({
      code,
      name: titleCase(rawName),
      lon: Math.round(lon * 1e5) / 1e5,
      lat: Math.round(lat * 1e5) / 1e5,
      state,
      zone: (p.zone ?? '').trim(),
    })
  }

  out.sort((a, b) => a.name.localeCompare(b.name))

  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(out), 'utf8')

  const states = new Set(out.map((s) => s.state))
  const bytes = Buffer.byteLength(JSON.stringify(out))

  console.log(`
  in                 ${rawStations.features.length.toLocaleString()} stations
  out                ${out.length.toLocaleString()} stations  (${(bytes / 1024 / 1024).toFixed(2)} MB)
  states covered     ${states.size}
  state derived from coordinates for ${derived.toLocaleString()} stations (all of them, by design)
  of which snapped to the nearest district (coastal/border): ${snapped.toLocaleString()}

  rejected
    no coordinates   ${rejected.noCoords}
    outside India    ${rejected.outOfBounds}
    junk code        ${rejected.junkCode}
    no name          ${rejected.noName}
    state unresolved ${rejected.noState}

  wrote ${OUT}
`)

  // Sanity check: these are the stations I actually use. If any say MISSING or
  // carry the wrong state, stop and fix the pipeline before building anything.
  for (const c of ['HWH', 'SDAH', 'NJP', 'KPD', 'MAS', 'NDLS']) {
    const s = out.find((x) => x.code === c)
    console.log(`  ${c.padEnd(5)} ${s ? `${s.name} — ${s.state}` : 'MISSING'}`)
  }
}

main().catch((e) => { console.error('\nfailed:', e.message); process.exit(1) })

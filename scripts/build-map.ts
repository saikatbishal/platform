/**
 * Builds public/maps/* — every geometry asset the map needs.
 *
 * Run:  npm run map:build      (needs network; ~60s, downloads ~60 MB, ships 1.1 MB)
 * Output is gitignored — regenerate rather than commit it.
 *
 * ── Why these sources, and one that was rejected ────────────────────────────
 *
 * State and district boundaries come from a Survey-of-India-derived district
 * file, NOT from Natural Earth's admin-1 layer. Natural Earth draws India's
 * northern boundary at the de-facto line of control: its India stops at
 * 35.50°N. The official Indian boundary reaches 37.08°N. Using Natural Earth
 * would (a) look visibly wrong to any Indian viewer, because the top of the
 * country is missing, and (b) publish a map of India that does not depict the
 * official boundary — which India's 2021 geospatial guidelines require.
 *
 * Dissolving the district file up to states also means the state names here are
 * character-for-character the same as the `state` field in stations.json, since
 * build-stations.ts derives that from the very same polygons. "States unlocked"
 * therefore matches by construction rather than by coincidence — which matters,
 * because the earlier version that trusted the raw station data had 63 stations
 * saying "Orissa" against a polygon named "Odisha", 28 saying "Delhi NCT"
 * against "Delhi", and one claiming to be in Bangladesh.
 *
 * Railway lines are Natural Earth's global railroads clipped to that official
 * outline. They carry `scalerank`, which is the level-of-detail ladder: low
 * numbers are trunk routes, high numbers are branch lines.
 *
 * ── Verified output, 29 Aug 2026 ────────────────────────────────────────────
 *
 *   outline.topo.json        1 KB    (gz  <1 KB)   India silhouette
 *   states.topo.json         9 KB    (gz   3 KB)   36 states and union territories
 *   districts.topo.json    162 KB    (gz  45 KB)   760 districts, lazy-loaded
 *   rail.topo.json         146 KB    (gz  39 KB)   457 lines, scalerank 4–10
 *   cities.json             18 KB    (gz   4 KB)   214 cities, scalerank 0–9
 *                                    ─────────
 *   with stations.json                 262 KB gzipped, all layers
 */
import mapshaper from 'mapshaper'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const OUT = resolve(import.meta.dirname, '../public/maps')
const TMP = resolve(import.meta.dirname, '.cache')

const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson'
const SOURCES = {
  districts: 'https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/india.geojson',
  railroads: `${NE}/ne_10m_railroads.geojson`,
  places: `${NE}/ne_10m_populated_places.geojson`,
  // 50m, not 10m: the only consumer is a ghost-opacity neighbour outline.
  countries: `${NE}/ne_50m_admin_0_countries.geojson`,
} as const

/** Cache downloads in scripts/.cache so re-runs while tuning are instant. */
async function fetchCached(url: string, name: string): Promise<string> {
  const path = resolve(TMP, name)
  try {
    const hit = await readFile(path, 'utf8')
    console.log(`  ${name.padEnd(22)} cached`)
    return hit
  } catch {
    process.stdout.write(`  ${name.padEnd(22)} downloading... `)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
    const text = await res.text()
    await mkdir(TMP, { recursive: true })
    await writeFile(path, text, 'utf8')
    console.log(`${(text.length / 1024 / 1024).toFixed(1)} MB`)
    return text
  }
}

async function run(commands: string, input: Record<string, string>): Promise<Record<string, string>> {
  return (await mapshaper.applyCommands(commands, input)) as Record<string, string>
}

/**
 * Uniform simplification wrecks the island territories: they are ~90 of the
 * source's 25,000 vertices, so at 5% the Andamans collapse to one triangle in
 * the Bay of Bengal and the Nicobars vanish. `keep-shapes` only protects one
 * ring per feature. Keep every island vertex; it costs about 1 KB.
 */
function simplify(mainlandPct: number): string {
  const islands = 'st_nm == "Andaman and Nicobar Islands" || st_nm == "Lakshadweep"'
  return `-simplify keep-shapes variable percentage='${islands} ? 1 : ${mainlandPct}'`
}

async function main() {
  console.log('\nbuild-map\n')
  await mkdir(OUT, { recursive: true })

  const districts = await fetchCached(SOURCES.districts, 'districts.geojson')
  const railroads = await fetchCached(SOURCES.railroads, 'railroads.geojson')
  const places = await fetchCached(SOURCES.places, 'places.geojson')
  const countries = await fetchCached(SOURCES.countries, 'countries.geojson')

  console.log('\n  building layers')

  // 1. States — dissolve 760 districts up to 36 states/UTs.
  const states = await run(
    `-i districts.geojson -dissolve2 st_nm -filter-fields st_nm ${simplify(0.05)} ` +
      '-o format=topojson precision=0.0001 states.topo.json',
    { 'districts.geojson': districts },
  )

  // 2. Outline — dissolve everything to one silhouette. Used as the clip mask
  //    below, and as the backdrop at the furthest zoom.
  const outlineGeo = await run(
    '-i districts.geojson -dissolve2 -o format=geojson outline.geojson',
    { 'districts.geojson': districts },
  )
  const outline = await run(
    '-i outline.geojson -simplify 4% keep-shapes -o format=topojson precision=0.0001 outline.topo.json',
    { 'outline.geojson': outlineGeo['outline.geojson']! },
  )

  // 3. Districts — for the deepest zoom. Lazy-loaded, never in the first paint.
  const districtsTopo = await run(
    `-i districts.geojson -filter-fields district,st_nm ${simplify(0.06)} ` +
      '-o format=topojson precision=0.0001 districts.topo.json',
    { 'districts.geojson': districts },
  )

  // 4. Rail — clipped to the official outline, scalerank kept for level-of-detail.
  const rail = await run(
    '-i railroads.geojson -clip outline.geojson -filter-fields scalerank,mult_track,electric ' +
      '-simplify 15% -o format=topojson precision=0.0001 rail.topo.json',
    { 'railroads.geojson': railroads, 'outline.geojson': outlineGeo['outline.geojson']! },
  )

  // 5. Cities — Natural Earth's SCALERANK is a ready-made label-priority ladder:
  //    0 is Delhi and Mumbai, 9 is a small state capital. Sort by it so the
  //    renderer can simply take the first N for a given zoom.
  interface PlaceFeature {
    geometry: { coordinates: number[] }
    properties: Record<string, unknown>
  }
  const placesJson = JSON.parse(places) as { features: PlaceFeature[] }
  const cities = placesJson.features
    .filter((f) => f.properties['ADM0_A3'] === 'IND')
    .map((f) => ({
      name: String(f.properties['NAMEASCII'] ?? f.properties['NAME'] ?? ''),
      lon: Math.round((f.geometry.coordinates[0] ?? 0) * 1e4) / 1e4,
      lat: Math.round((f.geometry.coordinates[1] ?? 0) * 1e4) / 1e4,
      pop: Number(f.properties['POP_MAX'] ?? 0),
      rank: Number(f.properties['SCALERANK'] ?? 99),
      state: String(f.properties['ADM1NAME'] ?? ''),
    }))
    .sort((a, b) => a.rank - b.rank || b.pop - a.pop)

  // 6. Neighbours — Sri Lanka, drawn at ghost opacity so the southern sea
  //    doesn't pretend the island isn't there. Sits in the sea layer, not the
  //    land layer: it is scenery, never a state to unlock.
  const neighbors = await run(
    `-i countries.geojson -filter 'ADMIN === "Sri Lanka"' -filter-fields ADMIN ` +
      '-simplify 20% keep-shapes -o format=topojson precision=0.0001 neighbors.topo.json',
    { 'countries.geojson': countries },
  )

  const files: Record<string, string> = {
    'outline.topo.json': outline['outline.topo.json']!,
    'neighbors.topo.json': neighbors['neighbors.topo.json']!,
    'states.topo.json': states['states.topo.json']!,
    'districts.topo.json': districtsTopo['districts.topo.json']!,
    'rail.topo.json': rail['rail.topo.json']!,
    'cities.json': JSON.stringify(cities),
  }

  console.log()
  for (const [name, content] of Object.entries(files)) {
    await writeFile(resolve(OUT, name), content, 'utf8')
    console.log(`  ${name.padEnd(22)} ${(Buffer.byteLength(content) / 1024).toFixed(0).padStart(4)} KB`)
  }
  console.log(`\n  ${cities.length} cities, ranks ${cities[0]?.rank}–${cities.at(-1)?.rank}`)
  console.log(`  wrote ${OUT}\n`)
}

main().catch(async (e) => {
  console.error('\nfailed:', e.message)
  await rm(TMP, { recursive: true, force: true }).catch(() => {})
  process.exit(1)
})

/**
 * Builds public/maps/stationtrains/<letter>.json — the reverse of
 * trainstops/, so the app can ask "which trains run A to B?"
 *
 * ── Why a second index over the same facts ─────────────────────────────────
 *
 * trainstops/ is keyed by train: 12860 -> [HWH, SRC, KGP, ...]. That answers
 * "where does this train go", which is what drawing a route needs. The
 * add-journey form asks the opposite question — the user picks two stations
 * and wants the trains connecting them — and no amount of reading a
 * train-keyed file answers it without reading all 5,199 of them. Same
 * 417,080 station-stop facts, keyed the other way.
 *
 * ── Why the position is stored, not just the train number ──────────────────
 *
 * Intersecting the two stations' train lists gives every train that calls at
 * both, in either direction. Offering someone the train running the wrong way
 * is worse than offering nothing. Storing each stop's index within its train
 * makes the direction check `from < to` — arithmetic on data already in hand,
 * instead of fetching a stop list per candidate just to sort them out. Those
 * lists get fetched once, for the one train the user actually picks.
 *
 * The positions are indices into the same array trainstops/ ships, so the two
 * files must be built by identical grouping. They are: the block below is a
 * copy of build-trainstops.ts's, deliberately, and if one changes both do.
 *
 * ── Shape ──────────────────────────────────────────────────────────────────
 *
 *     { "HWH": { "12345": 0, "12346": 302, ... }, ... }
 *
 * Sharded on the station code's first character, so a lookup costs the two
 * shards covering the two stations — about 16 KB gzipped each — and every
 * later lookup starting with those letters is free.
 *
 * Run:  npm run stations:build
 */
import { writeFile, readFile, mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const SCHEDULES_URL =
  'https://raw.githubusercontent.com/datameet/railways/master/schedules.json'
const OUT_DIR = resolve(import.meta.dirname, '../public/maps/stationtrains')
const RANK_OUT = resolve(import.meta.dirname, '../public/maps/stationrank.json')
const STATIONS = resolve(import.meta.dirname, '../public/data/stations.json')
const TMP = resolve(import.meta.dirname, '.cache')

interface ScheduleRow { train_number: string; station_code: string }
interface Station { code: string }

/** Codes are A-Z, but a handful start with a digit. Keep filenames sane. */
const shardKey = (code: string) => {
  const c = code.charAt(0).toUpperCase()
  return c >= 'A' && c <= 'Z' ? c : '_'
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
  console.log('\nbuild-station-trains\n')

  const stations = JSON.parse(await readFile(STATIONS, 'utf8')) as Station[]
  if (!stations.length) throw new Error('run `npm run data:build` first')
  const known = new Set(stations.map((s) => s.code))

  const rows = JSON.parse(await fetchCached(SCHEDULES_URL, 'schedules.json')) as ScheduleRow[]
  console.log(`  ${rows.length.toLocaleString()} schedule rows`)

  // Identical to build-trainstops.ts — see the header.
  const trains = new Map<string, string[]>()
  const seenPerTrain = new Map<string, Set<string>>()
  for (const r of rows) {
    let seq = trains.get(r.train_number)
    let seen = seenPerTrain.get(r.train_number)
    if (!seq || !seen) {
      seq = []; seen = new Set()
      trains.set(r.train_number, seq); seenPerTrain.set(r.train_number, seen)
    }
    if (seen.has(r.station_code)) continue
    seen.add(r.station_code)
    if (known.has(r.station_code)) seq.push(r.station_code)
  }

  const index = new Map<string, Record<string, number>>()
  let pairs = 0
  for (const [number, seq] of trains) {
    // Matches the same guard in build-trainstops: a one-stop train ships no
    // stop list, so indexing it here would point at a file that isn't there.
    if (seq.length < 2) continue
    for (let i = 0; i < seq.length; i++) {
      const code = seq[i]
      if (code === undefined) continue
      let entry = index.get(code)
      if (!entry) { entry = {}; index.set(code, entry) }
      entry[number] = i
      pairs++
    }
  }
  console.log(`  ${index.size.toLocaleString()} stations, ${pairs.toLocaleString()} station-train pairs`)

  const shards = new Map<string, Record<string, Record<string, number>>>()
  for (const [code, entry] of index) {
    const key = shardKey(code)
    let shard = shards.get(key)
    if (!shard) { shard = {}; shards.set(key, shard) }
    shard[code] = entry
  }

  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(OUT_DIR, { recursive: true })
  let bytes = 0
  for (const [key, shard] of shards) {
    const json = JSON.stringify(shard)
    bytes += json.length
    await writeFile(resolve(OUT_DIR, `${key}.json`), json, 'utf8')
  }
  console.log(`  ${shards.size} shards, ${(bytes / 1024).toFixed(0)} KB raw`)

  /*
   * How many trains call at each station — written here because this pass has
   * already counted them, and thrown away otherwise.
   *
   * It exists for search ranking. stations.json carries no notion of
   * importance, so a search for "del" has no reason to prefer Delhi over
   * Deulti Halt, and 8,696 stations sorted arbitrarily is not a search box,
   * it is a lottery. Train count is the only importance signal in the data
   * and it is a good one: Kanpur Central 298, Howrah 283, against 2 for a
   * suburban halt.
   *
   * Kept out of stations.json deliberately. That file is fetched on first
   * paint; this is only needed once someone opens the entry form, so it can
   * arrive then instead of taxing the map's first load.
   */
  const rank: Record<string, number> = {}
  for (const [code, entry] of index) rank[code] = Object.keys(entry).length
  const rankJson = JSON.stringify(rank)
  await writeFile(RANK_OUT, rankJson, 'utf8')
  console.log(`  station rank: ${(rankJson.length / 1024).toFixed(0)} KB raw`)
  console.log(`\n  wrote public/maps/stationtrains/ and stationrank.json\n`)
}

main().catch((e: unknown) => { console.error(e); process.exitCode = 1 })

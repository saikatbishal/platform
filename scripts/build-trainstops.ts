/**
 * Builds public/maps/trainstops/<prefix>.json — the stop list of every train,
 * so a journey with a recorded train number can be drawn along the route that
 * train actually takes instead of along an inferred shortest path.
 *
 * ── Why this exists ────────────────────────────────────────────────────────
 *
 * `routeForJourney` has always taken a `trainStops` argument and always
 * documented it as the preferred answer: if the user wrote down the train,
 * that IS the route, and Dijkstra is only the fallback for when they did not.
 * Nothing ever passed it, so every journey was drawn by inference — including
 * the ones that carry a train number. This is the missing half.
 *
 * ── Why it is sharded ──────────────────────────────────────────────────────
 *
 * All 5,208 stop lists are 2.6 MB raw, 385 KB gzipped — five times the whole
 * rail graph, to answer questions about the handful of trains one person has
 * ridden. Splitting on the first three characters of the train number gives
 * 251 files averaging 2 KB gzipped, worst case 20 KB, and the client fetches
 * only the ones it needs. Two characters was the first instinct and it does
 * not work: the 12xxx superfast series alone is 898 trains and 132 KB.
 *
 * ── Consistency with the graph ─────────────────────────────────────────────
 *
 * The grouping here is deliberately identical to build-routes.ts: dedupe per
 * train by first appearance, and keep only codes present in stations.json.
 * That last part matters twice over. It is what makes the graph bridge over
 * the 293 stations the timetable knows but stations.json cannot place — and
 * it is what keeps every code in these lists drawable, since the map plots a
 * route by looking each stop up in `byCode`.
 *
 * Run:  npm run trains:build     (reuses the 79 MB schedules.json cached by
 *                                 routes:build, so usually no download)
 */
import { writeFile, readFile, mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const SCHEDULES_URL =
  'https://raw.githubusercontent.com/datameet/railways/master/schedules.json'
const OUT_DIR = resolve(import.meta.dirname, '../public/maps/trainstops')
const NAMES_OUT = resolve(import.meta.dirname, '../public/maps/trainnames.json')
const STATIONS = resolve(import.meta.dirname, '../public/data/stations.json')
const TMP = resolve(import.meta.dirname, '.cache')

/** Train numbers are 5 digits, except ~69 slip coaches like "18623-Slip". */
const PREFIX = 3

interface ScheduleRow { train_number: string; station_code: string; train_name?: string }
interface Station { code: string }

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
  console.log('\nbuild-trainstops\n')

  const stations = JSON.parse(await readFile(STATIONS, 'utf8')) as Station[]
  if (!stations.length) throw new Error('run `npm run data:build` first')
  const known = new Set(stations.map((s) => s.code))

  const rows = JSON.parse(await fetchCached(SCHEDULES_URL, 'schedules.json')) as ScheduleRow[]
  console.log(`  ${rows.length.toLocaleString()} schedule rows`)

  // Same grouping as build-routes.ts — see the header.
  const trains = new Map<string, string[]>()
  const seenPerTrain = new Map<string, Set<string>>()
  /** First name seen per train. The rows repeat it on every stop. */
  const names = new Map<string, string>()
  for (const r of rows) {
    if (r.train_name && !names.has(r.train_number)) names.set(r.train_number, r.train_name)
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
  console.log(`  ${trains.size.toLocaleString()} distinct trains`)

  // A one-stop list cannot describe a journey between two places, and
  // routeForJourney ignores anything shorter than two anyway.
  const shards = new Map<string, Record<string, string[]>>()
  let kept = 0
  for (const [number, seq] of trains) {
    if (seq.length < 2) continue
    const key = number.slice(0, PREFIX)
    let shard = shards.get(key)
    if (!shard) { shard = {}; shards.set(key, shard) }
    shard[number] = seq
    kept++
  }

  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(OUT_DIR, { recursive: true })
  let bytes = 0
  for (const [key, shard] of shards) {
    const json = JSON.stringify(shard)
    bytes += json.length
    await writeFile(resolve(OUT_DIR, `${key}.json`), json, 'utf8')
  }
  console.log(`  ${kept.toLocaleString()} trains in ${shards.size} shards, ${(bytes / 1024).toFixed(0)} KB raw`)

  /*
   * Train names, keyed by number.
   *
   * The picker cannot be tested — or used — against bare five-digit numbers:
   * "12951" and "12952" are the same train in opposite directions and nobody
   * remembers which. One flat file rather than a field inside each shard,
   * because the picker needs names for every candidate at once (a route can
   * offer forty trains spanning a dozen shards) and it is small enough that
   * splitting it would cost more requests than it saves bytes.
   */
  const nameOut: Record<string, string> = {}
  for (const shard of shards.values()) {
    for (const number of Object.keys(shard)) {
      const name = names.get(number)
      if (name) nameOut[number] = name
    }
  }
  const namesJson = JSON.stringify(nameOut)
  await writeFile(NAMES_OUT, namesJson, 'utf8')
  console.log(`  ${Object.keys(nameOut).length.toLocaleString()} train names, ${(namesJson.length / 1024).toFixed(0)} KB raw`)
  console.log(`\n  wrote public/maps/trainstops/ and trainnames.json\n`)
}

main().catch((e: unknown) => { console.error(e); process.exitCode = 1 })

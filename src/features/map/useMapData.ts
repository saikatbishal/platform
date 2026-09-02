import { useEffect, useState } from 'react'
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { FeatureCollection, Geometry } from 'geojson'
import { geoPath, geoGraticule } from 'd3-geo'
import { createIndiaProjection, MAP_WIDTH, MAP_HEIGHT } from '@/lib/projection.ts'
import { parseRailGraph, type RailGraph, type RailGraphWire } from './route.ts'
import type { Station } from '@/types/index.ts'

/** A city label from public/maps/cities.json, pre-sorted by importance. */
interface City { name: string; lon: number; lat: number; pop: number; rank: number; state: string }

/**
 * The sea. Hand-placed positions over open water — far enough from the coast
 * to clear it, far enough from Sri Lanka and the Andamans not to sit on land
 * the map doesn't draw. Checked against the coastline, not guessed.
 */
const SEA_NAMES = [
  { name: 'Arabian Sea', lon: 64.5, lat: 15 },
  { name: 'Bay of Bengal', lon: 88, lat: 13.5 },
  { name: 'Indian Ocean', lon: 77.5, lat: 3 },
] as const

const WAVE_POINTS: ReadonlyArray<readonly [number, number]> = [
  [62, 20], [64, 16.5], [66.5, 12], [62.5, 9], [68, 7.5], [64, 5],
  [85.5, 17], [88.5, 14.5], [91.5, 11.5], [86, 10], [89, 7],
  [72, 2.5], [78, 1.5], [84, 3],
]

/** Everything the map draws, already projected into map space. */
export interface MapData {
  /** One path per state, keyed by the same name as Station.state. */
  states: Array<{ name: string; d: string }>
  /** District borders. Fetched lazily, so absent until zoom asks for them. */
  districts: string[] | null
  /** Rail lines with their scalerank, for level-of-detail filtering. */
  rail: Array<{ rank: number; d: string }>
  cities: Array<{ name: string; rank: number; x: number; y: number }>
  /** Flat [x0,y0,x1,y1,...] for the canvas station field. Avoids 8,696 objects. */
  stationXY: Float32Array
  /** Full records, and a code index, for routing and hit-testing. */
  stations: Station[]
  byCode: Map<string, Station & { x: number; y: number }>
  graph: RailGraph
  /** Everything drawn on the water, so the country doesn't float in a void. */
  sea: {
    /** One path: 5° lat/lon lines. The opaque land hides it inland. */
    graticule: string
    labels: Array<{ name: string; x: number; y: number }>
    waves: Array<{ x: number; y: number }>
    /** Drifting specks scattered around the wave glyphs. */
    dots: Array<{ x: number; y: number }>
  }
  /** Neighbouring coastlines drawn as ghosts — scenery, never states to
      unlock. Empty until `npm run map:build` has produced neighbors.topo.json. */
  neighbors: string[]
}

interface RailProps { scalerank?: number }
interface StateProps { st_nm?: string }

/**
 * BASE_URL is "/platform/" in production (this app is served at
 * saikatbishal.com/platform), so a hardcoded "/maps/..." fetch would miss
 * the prefix and hit the portfolio site's own routes instead.
 */
async function getJson<T>(path: string): Promise<T> {
  const url = `${import.meta.env.BASE_URL}${path}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} — ${res.status}. Run \`npm run assets\`.`)
  return (await res.json()) as T
}

function firstObject<T extends Topology>(topo: T) {
  const key = Object.keys(topo.objects)[0]
  if (key === undefined) throw new Error('empty topology')
  return topo.objects[key] as GeometryCollection
}

/**
 * Loads and projects every map layer once.
 *
 * Projection happens here, not per frame: pan and zoom are a 2-D transform on
 * top of these fixed map-space coordinates, so nothing is re-projected while
 * the user drags. That is the whole reason this map needs no tiles.
 */
export function useMapData(): { data: MapData | null; error: string | null } {
  const [data, setData] = useState<MapData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [statesTopo, railTopo, cities, stations, wire, neighborsTopo] = await Promise.all([
        getJson<Topology>('maps/states.topo.json'),
        getJson<Topology>('maps/rail.topo.json'),
        getJson<City[]>('maps/cities.json'),
        getJson<Station[]>('data/stations.json'),
        getJson<RailGraphWire>('maps/railgraph.json'),
        // Optional: an assets build from before this layer existed simply has
        // no ghost neighbours, rather than no map at all.
        getJson<Topology>('maps/neighbors.topo.json').catch(() => null),
      ])
      if (cancelled) return

      const statesFc = feature(statesTopo, firstObject(statesTopo)) as FeatureCollection<Geometry, StateProps>
      const projection = createIndiaProjection(MAP_WIDTH, MAP_HEIGHT, statesFc)
      const path = geoPath(projection)
      const round = (d: string | null) =>
        d ? d.replace(/-?\d+\.\d+/g, (m) => Number(m).toFixed(1)) : ''

      const railFc = feature(railTopo, firstObject(railTopo)) as FeatureCollection<Geometry, RailProps>

      const statePaths: MapData['states'] = []
      for (const f of statesFc.features) {
        const d = round(path(f))
        if (d) statePaths.push({ name: f.properties?.st_nm ?? '', d })
      }

      const railPaths: MapData['rail'] = []
      for (const f of railFc.features) {
        const d = round(path(f))
        if (d) railPaths.push({ rank: f.properties?.scalerank ?? 99, d })
      }

      const cityPts: MapData['cities'] = []
      for (const c of cities) {
        const p = projection([c.lon, c.lat])
        if (p) cityPts.push({ name: c.name, rank: c.rank, x: p[0], y: p[1] })
      }

      const xy = new Float32Array(stations.length * 2)
      const byCode = new Map<string, Station & { x: number; y: number }>()
      let n = 0
      for (const s of stations) {
        const p = projection([s.lon, s.lat])
        if (!p) continue
        xy[n * 2] = p[0]
        xy[n * 2 + 1] = p[1]
        n++
        byCode.set(s.code, { ...s, x: p[0], y: p[1] })
      }

      const graticule = round(
        path(geoGraticule().step([5, 5]).extent([[55, -10], [110, 45]])()),
      )
      const seaLabels: MapData['sea']['labels'] = []
      for (const l of SEA_NAMES) {
        const p = projection([l.lon, l.lat])
        if (p) seaLabels.push({ name: l.name, x: p[0], y: p[1] })
      }
      const waves: MapData['sea']['waves'] = []
      for (const [lon, lat] of WAVE_POINTS) {
        const p = projection([lon, lat])
        if (p) waves.push({ x: p[0], y: p[1] })
      }
      // Three specks near each wave glyph, jittered deterministically — random
      // would reshuffle the sea on every reload.
      const dots: MapData['sea']['dots'] = []
      waves.forEach((w, i) => {
        ([[19, -11], [-15, 16], [7, 27]] as const).forEach(([dx, dy], j) => {
          dots.push({
            x: w.x + dx + ((i * 7 + j * 13) % 11) - 5,
            y: w.y + dy + ((i * 5 + j * 3) % 9) - 4,
          })
        })
      })

      const neighbors: string[] = []
      if (neighborsTopo) {
        const fc = feature(neighborsTopo, firstObject(neighborsTopo)) as FeatureCollection<Geometry>
        for (const f of fc.features) {
          const d = round(path(f))
          if (d) neighbors.push(d)
        }
      }

      setData({
        states: statePaths,
        districts: null,
        rail: railPaths,
        cities: cityPts,
        stationXY: xy.subarray(0, n * 2),
        stations,
        byCode,
        graph: parseRailGraph(wire),
        sea: { graticule, labels: seaLabels, waves, dots },
        neighbors,
      })
    }

    load().catch((e: unknown) => {
      if (!cancelled) setError(e instanceof Error ? e.message : String(e))
    })
    return () => { cancelled = true }
  }, [])

  return { data, error }
}

/**
 * District borders are 162 KB and only wanted from zoom 4 upward, so they are
 * fetched the first time a level-of-detail tier asks for them rather than on
 * first paint.
 */
export async function loadDistricts(
  projectionSource: FeatureCollection<Geometry, StateProps>,
): Promise<string[]> {
  const topo = await getJson<Topology>('maps/districts.topo.json')
  const fc = feature(topo, firstObject(topo)) as FeatureCollection<Geometry>
  const path = geoPath(createIndiaProjection(MAP_WIDTH, MAP_HEIGHT, projectionSource))
  const out: string[] = []
  for (const f of fc.features) {
    const d = path(f)
    if (d) out.push(d.replace(/-?\d+\.\d+/g, (m) => Number(m).toFixed(0)))
  }
  return out
}

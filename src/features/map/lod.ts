/**
 * Level of detail.
 *
 * The map is one country with a fixed maximum zoom, so it does not need tiles.
 * What it needs is a rule for what is drawn at each scale — otherwise you
 * either render 8,696 stations at country zoom (slow, and an unreadable grey
 * smear) or render forty of them at street zoom (an empty screen).
 *
 * Zoom here is a plain multiplier: 1 = the whole country fits the viewport.
 */
export interface LodTier {
  /** Lower bound of this tier, inclusive. */
  minZoom: number
  /** Human label, for debugging. */
  name: string
  /** Draw rail with scalerank <= this. Lower rank = more important line. */
  railMaxRank: number
  /**
   * Base rail stroke width in map units. It has to grow with the tier: with
   * non-scaling-stroke the authored width is the screen width, so a hairline
   * that reads well at country zoom disappears at street zoom.
   */
  railWidth: number
  /** Draw the first N cities (cities.json is pre-sorted by importance). */
  cityCount: number
  /** Districts are 162 KB, so this also gates their lazy fetch. */
  districts: boolean
  /** Station dot radius in screen pixels — constant across zoom. */
  stationRadius: number
  /** Label individual stations? Only once few enough are on screen. */
  stationLabels: boolean
  /** Sea names and wave glyphs scale with the map, so past region zoom they
      turn into billboards. The graticule and waterlining stay at every zoom. */
  sea: boolean
}

/** Tuned by hand in docs/spike/map-spike.html, not guessed. */
export const LOD_TIERS: readonly LodTier[] = [
  { minZoom: 1,   name: 'country',  railMaxRank: 6,  railWidth: 0.6, cityCount: 12,  districts: false, stationRadius: 1.0, stationLabels: false, sea: true  },
  { minZoom: 2.2, name: 'region',   railMaxRank: 7,  railWidth: 0.8, cityCount: 40,  districts: false, stationRadius: 1.3, stationLabels: false, sea: true  },
  { minZoom: 4,   name: 'state',    railMaxRank: 8,  railWidth: 1.1, cityCount: 90,  districts: true,  stationRadius: 1.8, stationLabels: true,  sea: false },
  { minZoom: 7.5, name: 'district', railMaxRank: 9,  railWidth: 1.5, cityCount: 160, districts: true,  stationRadius: 2.5, stationLabels: true,  sea: false },
  { minZoom: 12,  name: 'local',    railMaxRank: 99, railWidth: 2.0, cityCount: 214, districts: true,  stationRadius: 3.4, stationLabels: true,  sea: false },
] as const

export function tierFor(zoom: number): LodTier {
  let tier = LOD_TIERS[0]!
  for (const t of LOD_TIERS) if (zoom >= t.minZoom) tier = t
  return tier
}

export const ZOOM_MIN = 0.85
/**
 * Past about 17x the data has nothing more to give and the screen is empty
 * colour. Measured in the spike — clamp rather than let the user find the void.
 */
export const ZOOM_MAX = 17

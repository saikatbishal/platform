/** A station as it exists in the generated public/data/stations.json. */
export interface Station {
  /** Railway code, e.g. 'HWH'. Unique. */
  code: string
  /** Display name, e.g. 'Howrah Jn'. */
  name: string
  /** Longitude, latitude — GeoJSON order, not lat/lng. Easy to get wrong. */
  lon: number
  lat: number
  /**
   * State name. Present for every station in the generated file because the
   * pipeline derives it by point-in-polygon; the raw source has it missing
   * for 51% of rows. See docs/05-data-pipeline.md.
   */
  state: string
  /** Railway zone code, e.g. 'ER'. May be empty — the source is incomplete. */
  zone: string
}

/** A journey as stored in Supabase. */
export interface Journey {
  id: string
  fromCode: string
  toCode: string
  /** ISO date, no time. A journey is a day, not a timestamp. */
  travelledOn: string
  /** Free text on purpose: the schedule data is dated, so a strict list would reject real trains. */
  trainNumber: string | null
  note: string | null
  /** Great-circle km, computed on write. Undercounts, because track curves. */
  distanceKm: number
}

/** What the add-journey form collects. */
export type JourneyDraft = Omit<Journey, 'id' | 'distanceKm'>

export interface Stats {
  journeyCount: number
  totalKm: number
  longestKm: number
  stationsSeen: number
  statesUnlocked: number
}

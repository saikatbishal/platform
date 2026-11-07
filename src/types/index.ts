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
  /**
   * Rail km along the routed path, computed when the journey is logged. Null
   * when it could not be — the rail graph had not loaded yet, or has no route
   * between the two — because 0 is a distance and this is not one.
   *
   * Nothing on screen reads this: every figure is routed afresh from the
   * graph (IndiaMap's totals, the card, quick find), and an unroutable
   * journey is counted under "Not drawn". It is the copy the account keeps.
   */
  distanceKm: number | null
  /**
   * "HH:MM", both optional and independent of each other. Not derived from
   * the timetable: a real train's actual arrival is what the "over 24h"
   * milestone means, and the schedule data can't tell you that a train ran
   * six hours late — only the person who was on it can.
   */
  departureTime: string | null
  arrivalTime: string | null
  /** 0 = arrived the same day as `travelledOn`, 1 = the next day, and so on
      for a journey that runs more than one night. Meaningless on its own —
      only read together with `arrivalTime`. */
  arrivalDayOffset: number
  /**
   * The trip this journey is part of, or null. One journey, at most one trip
   * (docs/features/trips/prd.md). A trip id that no longer resolves to a trip
   * reads as null, not as an error — the same "stored data is not trusted
   * input" rule `isJourney` follows.
   */
  tripId: string | null
}

/** What the add-journey form collects. */
export type JourneyDraft = Omit<Journey, 'id' | 'distanceKm'>

/**
 * A named group of journeys — "Himachal trip" holds the four trains that got
 * you there and back.
 *
 * Only what the person typed is stored. Dates, kilometres, states and the
 * journey count are all derived from the journeys that point at it, for the
 * same reason stats are never stored: a stored copy of a derived number is a
 * number that will one day disagree with what it summarises.
 *
 * A trip can have no journeys. It is made before the travel as often as
 * after it — "Himachal trip" exists on the day it is planned, and the legs
 * join it as they are logged — so empty is a real state, not a leftover.
 */
export interface Trip {
  /** uuid, minted on the device like journey ids. */
  id: string
  /** The person's words. Never checked against the states its journeys
      cross: a Himachal trip by rail may not touch Himachal at all. */
  name: string
  note: string | null
  /** ISO timestamp. The only date a trip with no journeys has, and what the
      add form's "made recently" preselect reads. */
  createdAt: string
}

export interface Stats {
  journeyCount: number
  totalKm: number
  longestKm: number
  stationsSeen: number
  statesUnlocked: number
}

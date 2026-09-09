import type { Journey } from '@/types/index.ts'

/**
 * Seed data, until Supabase is wired up in week 3.
 *
 * These are real journeys with real station codes, deliberately — a map full of
 * plausible-looking fake data hides exactly the problems you want to find early.
 * The Howrah–Katpadi run is the trip to Vellore that started this project.
 */
/** None of these carry real departure/arrival times: they're illustrative
    station codes, not a claim about exactly when a specific service ran. */
const NO_TIMES = { departureTime: null, arrivalTime: null, arrivalDayOffset: 0 } as const

export const SAMPLE_JOURNEYS: Journey[] = [
  { id: 's1', fromCode: 'HWH', toCode: 'TATA', travelledOn: '2025-11-14', trainNumber: '12860', note: null, distanceKm: 0, ...NO_TIMES },
  { id: 's2', fromCode: 'TATA', toCode: 'BSP', travelledOn: '2025-11-15', trainNumber: '12860', note: null, distanceKm: 0, ...NO_TIMES },
  { id: 's3', fromCode: 'BSP', toCode: 'NGP', travelledOn: '2025-11-15', trainNumber: '12860', note: null, distanceKm: 0, ...NO_TIMES },
  { id: 's4', fromCode: 'NGP', toCode: 'BZA', travelledOn: '2026-02-02', trainNumber: null, note: 'Overnight, top bunk.', distanceKm: 0, ...NO_TIMES },
  { id: 's5', fromCode: 'BZA', toCode: 'MAS', travelledOn: '2026-02-03', trainNumber: '12839', note: null, distanceKm: 0, ...NO_TIMES },
  { id: 's6', fromCode: 'MAS', toCode: 'KPD', travelledOn: '2026-02-03', trainNumber: '12007', note: 'Checkup. Ma met me at the station.', distanceKm: 0, ...NO_TIMES },
  { id: 's7', fromCode: 'HWH', toCode: 'NJP', travelledOn: '2026-04-11', trainNumber: '12343', note: null, distanceKm: 0, ...NO_TIMES },
]

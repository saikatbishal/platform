export type Theme = 'light' | 'dark'

/**
 * The theme is the time of day, and nothing else.
 *
 * Not the OS setting, and not a switch: the app is a record of train journeys
 * in India, the palette was sampled from a station in daylight and a coach
 * after dark, and the honest version of that is a page that is light while the
 * sun is up and dark once it isn't.
 *
 * The boundaries are 06:00 and 18:00 on the device's own clock. Real sunrise
 * across India moves by roughly an hour end to end and about half an hour
 * across the year — enough to notice, not enough to justify asking a browser
 * for the user's coordinates, which is a permission prompt on first open in
 * exchange for shifting a colour by twenty minutes.
 */
export const DAY_BEGINS = 6
export const DAY_ENDS = 18

export function themeAt(when: Date): Theme {
  const hour = when.getHours()
  return hour >= DAY_BEGINS && hour < DAY_ENDS ? 'light' : 'dark'
}

/**
 * Milliseconds until the theme is next due to change, so a tab left open
 * across sunset changes with it rather than at the next reload.
 */
export function msUntilNextChange(when: Date): number {
  const next = new Date(when)
  next.setMinutes(0, 0, 0)
  const hour = when.getHours()
  if (hour < DAY_BEGINS) {
    next.setHours(DAY_BEGINS)
  } else if (hour < DAY_ENDS) {
    next.setHours(DAY_ENDS)
  } else {
    next.setDate(next.getDate() + 1)
    next.setHours(DAY_BEGINS)
  }
  return Math.max(1000, next.getTime() - when.getTime())
}

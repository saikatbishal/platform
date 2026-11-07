/**
 * Whether this device has already been shown the first-visit tour.
 *
 * Per device, not per account, and that is deliberate: the tour explains the
 * screen, not the data, and a person who has seen it on this phone does not
 * need it again after signing in. The version is in the key so a tour that
 * changes shape later can be shown once more by bumping it — not by asking
 * anyone to clear their storage.
 *
 * Every access is guarded. Private windows and blocked site data make
 * `localStorage` throw rather than return null, and a tour that crashes the
 * app on the way in is worse than one that shows twice.
 */
const KEY = 'platform.tour.v1'

export function hasSeenTour(): boolean {
  try {
    return localStorage.getItem(KEY) !== null
  } catch {
    // Unreadable storage: assume seen. Showing the tour on every load because
    // the flag can never be written would turn a welcome into a nag.
    return true
  }
}

export function markTourSeen(): void {
  try {
    localStorage.setItem(KEY, new Date().toISOString())
  } catch {
    /* Nothing to do: the session still remembers it in App's state. */
  }
}

/**
 * `?tour` in the address forces the tour regardless of the flag — for
 * checking the copy and the placements without clearing site data. Read once
 * at load; it does not reopen the tour on every render.
 */
export function tourForced(): boolean {
  try {
    return new URLSearchParams(window.location.search).has('tour')
  } catch {
    return false
  }
}

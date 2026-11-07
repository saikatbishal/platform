/**
 * Call `retry` once, the next time the browser reports a connection.
 *
 * For a fetch that failed because there was no network. That is a fact about
 * the moment, not about the file — unlike a 404 — so it must not be
 * remembered as permanent: a shard that failed in a tunnel would otherwise
 * stay missing until a full reload, and every journey on that train would be
 * drawn by the inferred route instead of its own stops.
 */
export function retryWhenOnline(retry: () => void): void {
  window.addEventListener('online', () => { retry() }, { once: true })
}

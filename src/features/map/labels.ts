/**
 * Label placement.
 *
 * Without collision handling the very first thing anyone sees is "Delhi" and
 * "New Delhi" printed on top of each other. Walk the candidates in priority
 * order — cities.json is pre-sorted by importance — keep the screen rectangles
 * already taken, and drop anything that overlaps one.
 */
export interface LabelCandidate {
  name: string
  /** Map-space position. */
  x: number
  y: number
}

export interface PlacedLabel extends LabelCandidate {
  /** Screen-space position, for the caller to counter-scale against. */
  sx: number
  sy: number
}

/** Rough width of a label in screen pixels. Cheaper than measuring text. */
const CHAR_WIDTH = 5.1
const PADDING = 12

export function placeLabels(
  candidates: readonly LabelCandidate[],
  view: { x: number; y: number; k: number },
  viewport: { width: number; height: number },
): PlacedLabel[] {
  const taken: Array<[number, number, number, number]> = []
  const placed: PlacedLabel[] = []

  for (const c of candidates) {
    const sx = c.x * view.k + view.x
    const sy = c.y * view.k + view.y
    if (sx < -60 || sy < -20 || sx > viewport.width + 60 || sy > viewport.height + 20) continue

    const width = c.name.length * CHAR_WIDTH + PADDING
    const box: [number, number, number, number] = [sx, sy - 7, sx + width, sy + 5]

    let hit = false
    for (const t of taken) {
      if (box[0] < t[2] && box[2] > t[0] && box[1] < t[3] && box[3] > t[1]) { hit = true; break }
    }
    if (hit) continue

    taken.push(box)
    placed.push({ ...c, sx, sy })
  }
  return placed
}

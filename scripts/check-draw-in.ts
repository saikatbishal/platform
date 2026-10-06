/**
 * Checks the draw-in arithmetic (src/features/map/drawIn.ts).
 *
 * No test framework, as with check-merge.ts and check-search.ts: the module is
 * pure, so it runs under plain node.
 *
 *   node --experimental-strip-types scripts/check-draw-in.ts
 */

import {
  LINE_MS, STAGGER_MAX_MS, TOTAL_MS,
  easeArrive, easeTrain, partialPolyline, reachedCount, staggerOffsets, type Point,
} from '../src/features/map/drawIn.ts'

let failed = 0
const check = (name: string, ok: boolean, detail = '') => {
  if (!ok) failed++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : ` — ${detail}`}`)
}

// An L: 30 across, then 40 down. Total length 70.
const L: Point[] = [[0, 0], [30, 0], [30, 40]]
const full = `M${L.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L')}`

check('t = 0 is an empty path, not a dot', partialPolyline(L, 0) === '')
check('t = 1 is the finished route, character for character', partialPolyline(L, 1) === full, partialPolyline(L, 1))
check('t > 1 clamps to the finished route', partialPolyline(L, 1.4) === full)
check('a cut mid-segment ends on that segment',
  partialPolyline(L, 15 / 70) === 'M0.0,0.0L15.00,0.00', partialPolyline(L, 15 / 70))
check('a cut past a vertex keeps the vertex whole',
  partialPolyline(L, 50 / 70) === 'M0.0,0.0L30.0,0.0L30.00,20.00', partialPolyline(L, 50 / 70))
check('duplicate vertices do not divide by zero',
  !partialPolyline([[0, 0], [0, 0], [10, 0]], 0.5).includes('NaN'))
check('a single point draws nothing it cannot measure', !partialPolyline([[5, 5]], 0.5).includes('NaN'))

check('a line that has not set off reaches nothing', reachedCount(L, -1) === 0)
check('a line setting off has reached its origin', reachedCount(L, 0) === 1)
check('short of the corner, only the origin', reachedCount(L, 29 / 70) === 1)
check('exactly at the corner, the corner too', reachedCount(L, 30 / 70) === 2)
check('a whole line reaches every vertex', reachedCount(L, 1) === 3)

check('easing starts at rest', easeTrain(0) === 0)
check('arriving starts at nothing and ends whole', easeArrive(0) === 0 && easeArrive(1) === 1)
check('arriving front-loads: past halfway by a third of the time', easeArrive(1 / 3) > 0.5)
check('easing arrives', easeTrain(1) === 1)
check('easing is symmetric about the middle', Math.abs(easeTrain(0.5) - 0.5) < 1e-12)
let monotonic = true
for (let i = 1; i <= 100; i++) if (easeTrain(i / 100) < easeTrain((i - 1) / 100)) monotonic = false
check('easing never runs backwards', monotonic)

check('one journey sets off immediately', staggerOffsets(1).join() === '0')
check('a few journeys use the full stagger', staggerOffsets(3).join() === `0,${STAGGER_MAX_MS},${2 * STAGGER_MAX_MS}`)
for (const n of [2, 5, 20, 200]) {
  const last = staggerOffsets(n).at(-1)! + LINE_MS
  check(`${n} journeys finish by ${TOTAL_MS} ms`, last <= TOTAL_MS + 1e-9, `${last} ms`)
}

if (failed) {
  console.error(`\n${failed} failed`)
  process.exit(1)
}
console.log('\nall passed')

import { useEffect, useRef, useState } from 'react'
import type { MapData } from '@/features/map/useMapData.ts'
import { RailPass } from '@/features/railpass/RailPass.tsx'
import type { Journey } from '@/types/index.ts'
import { Milestones } from './Milestones.tsx'
import type { MilestoneStatus } from './milestones.ts'
import { StatNumber } from './StatNumber.tsx'
import type { Tally, Totals } from './tally.ts'
import { TILES } from './tiles.ts'

interface Props {
  tally: Tally
  stats: Totals & { uncounted: number }
  milestones: readonly MilestoneStatus[]
  /** Null until the map's data has loaded; the rail pass draws from it. */
  data: MapData | null
  journeys: readonly Journey[]
  demo: boolean
  onClose: () => void
}

const label = 'text-label font-semibold tracking-label text-ink-faint uppercase'

/**
 * The ledger — docs/features/ledger/prd.md.
 *
 * What used to be three controls on the map (the Stats toggle, Milestones and
 * Rail pass) is one topic: the totals, the thresholds those same totals are
 * measured against, and a picture of them to share. So it is one sheet, read
 * top to bottom in that order, with the rail pass as the footer's one action.
 *
 * The pass swaps into the same sheet rather than opening a second one over
 * it, and its canvas is only drawn when asked for — not on every look at the
 * totals. Escape steps back one view at a time, the way TripsSheet does, and
 * the scrim closes it.
 */
export function LedgerSheet({ tally, stats, milestones, data, journeys, demo, onClose }: Props) {
  const [view, setView] = useState<'ledger' | 'pass'>('ledger')
  const dialog = useRef<HTMLDivElement>(null)
  const passButton = useRef<HTMLButtonElement>(null)
  /** Set when the pass was opened from the footer, so coming back lands focus
      on the button that left, not at the top of the sheet. */
  const returning = useRef(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (view === 'pass') setView('ledger')
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey) }
  }, [view, onClose])

  // Focus follows the view. Without this, swapping the pass in would leave
  // focus on a footer button that no longer exists, which drops it to <body>.
  useEffect(() => {
    if (view === 'ledger' && returning.current) passButton.current?.focus()
    else dialog.current?.focus()
  }, [view])

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-20 flex items-end justify-center bg-ground/60 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={view === 'pass' ? 'Rail pass' : 'Ledger'}
        tabIndex={-1}
        className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-lg border border-b-0 border-line bg-surface outline-none sm:max-w-xl sm:rounded-lg sm:border-b sm:shadow-2xl"
      >
        {view === 'pass' && data ? (
          <div className="min-h-0 overflow-y-auto p-5">
            <RailPass
              data={data}
              journeys={journeys}
              stats={stats}
              onBack={() => { setView('ledger') }}
              onClose={onClose}
            />
          </div>
        ) : (
          <>
            <header className="flex shrink-0 items-center justify-between border-b border-line py-3 pr-2 pl-5">
              <h2 className="flex items-baseline gap-2.5 text-lg font-extrabold text-ink">
                Ledger
                {demo && <span className={label}>Demo</span>}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close the ledger and look at the map"
                className="grid size-11 place-items-center text-ink-faint transition-colors duration-150 hover:text-ink"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M1 1 L11 11 M11 1 L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-5">
              {/* Hairline grid: the gap shows the --line behind the tiles,
                  so every cell is separated by exactly 1px with no doubled
                  borders where two meet. 24px figures, so --cream is legal
                  here (trap 3), where the 13px row on the map is not. */}
              <dl className="m-0 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-4">
                {TILES.map(([name, field, format]) => (
                  <div key={name} className="flex flex-col-reverse gap-1.5 bg-surface px-3 py-3">
                    <dt className={label}>{name}</dt>
                    <dd className="m-0">
                      <StatNumber
                        tally={tally}
                        field={field}
                        value={stats[field]}
                        format={format}
                        className="tabular text-xl leading-none text-cream"
                      />
                    </dd>
                  </div>
                ))}
              </dl>

              {/* Said in full, in text. On the map this lived in a `title`,
                  which a phone never shows. */}
              {stats.uncounted > 0 && (
                <p className="mt-3 mb-0 text-sm leading-relaxed text-ink-soft">
                  <span className="tabular text-oxide">{stats.uncounted}</span>{' '}
                  {stats.uncounted === 1 ? 'journey isn’t' : 'journeys aren’t'} in these totals. The rail
                  graph has no route for {stats.uncounted === 1 ? 'it' : 'them'}, so the distance and stops
                  are unknown rather than zero. The end stations are drawn hollow on the map.
                </p>
              )}

              <h3 className={`${label} mt-6 mb-2`}>Milestones</h3>
              <Milestones milestones={milestones} />
            </div>

            <footer className="shrink-0 border-t border-line px-5 py-4">
              <button
                ref={passButton}
                type="button"
                onClick={() => { returning.current = true; setView('pass') }}
                disabled={!data}
                className="min-h-11 w-full rounded-sm bg-accent px-4 text-label font-semibold tracking-label text-ground uppercase disabled:opacity-40"
              >
                Make a rail pass
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}

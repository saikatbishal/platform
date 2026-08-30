import { useCallback, useState } from 'react'
import { IndiaMap } from '@/features/map/IndiaMap.tsx'
import { SAMPLE_JOURNEYS } from '@/features/journeys/sampleJourneys.ts'
import { formatKm } from '@/lib/distance.ts'

interface Stats { km: number; stations: number; states: number }

export default function App() {
  const [stats, setStats] = useState<Stats>({ km: 0, stations: 0, states: 0 })
  const onStats = useCallback((s: Stats) => { setStats(s) }, [])

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-ground">
      <IndiaMap journeys={SAMPLE_JOURNEYS} onStats={onStats} />

      <header className="pointer-events-none absolute top-3 left-3 flex w-fit overflow-hidden rounded-sm border-2 border-line-strong">
        <span className="bg-accent px-3 py-1.5 text-xs font-semibold tracking-[0.14em] text-ground uppercase">
          Platform
        </span>
        <span className="bg-surface px-3 py-1.5 text-xs font-semibold tracking-[0.14em] text-ink-soft uppercase">
          v0.1
        </span>
      </header>

      <section
        aria-label="Your totals"
        className="pointer-events-none absolute bottom-3 left-3 flex overflow-hidden rounded-sm border border-line bg-surface"
      >
        {([
          ['Kilometres', formatKm(stats.km).replace(' km', '')],
          ['Stations', stats.stations.toLocaleString('en-IN')],
          ['States', String(stats.states)],
        ] as const).map(([label, value]) => (
          <div key={label} className="border-r border-line px-4 py-3 last:border-r-0">
            <span className="tabular block text-2xl leading-none text-cream">{value}</span>
            <span className="mt-1.5 block text-[0.6rem] font-semibold tracking-[0.15em] text-ink-faint uppercase">
              {label}
            </span>
          </div>
        ))}
      </section>
    </main>
  )
}

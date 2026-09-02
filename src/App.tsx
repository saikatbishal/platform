import { useCallback, useState } from 'react'
import { IndiaMap } from '@/features/map/IndiaMap.tsx'
import { SAMPLE_JOURNEYS } from '@/features/journeys/sampleJourneys.ts'
import { useAuth } from '@/features/auth/AuthProvider.tsx'
import { SignInButton } from '@/features/auth/SignInButton.tsx'
import { UserMenu } from '@/features/auth/UserMenu.tsx'
import { formatKm } from '@/lib/distance.ts'

interface Stats { km: number; stations: number; states: number }

export default function App() {
  const [stats, setStats] = useState<Stats>({ km: 0, stations: 0, states: 0 })
  const onStats = useCallback((s: Stats) => { setStats(s) }, [])
  const auth = useAuth()

  const signedIn = auth.status === 'signed-in'
  const demo = auth.mode === 'demo'
  // Signed out, the app demos itself with sample journeys rather than showing
  // a wall. Once real data exists this becomes: signedIn ? journeys : SAMPLE.
  const journeys = SAMPLE_JOURNEYS

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-ground">
      <IndiaMap journeys={journeys} onStats={onStats} />

      <header className="pointer-events-none absolute top-3 left-3 flex w-fit overflow-hidden rounded-sm border-2 border-line-strong">
        <span className="bg-accent px-3 py-1.5 text-xs font-semibold tracking-[0.14em] text-ground uppercase">
          Platform
        </span>
        <span className="bg-surface px-3 py-1.5 text-xs font-semibold tracking-[0.14em] text-ink-soft uppercase">
          v0.1
        </span>
      </header>

      {signedIn && auth.user && (
        <div className="pointer-events-auto absolute top-3 right-3">
          <UserMenu user={auth.user} onSignOut={auth.signOut} />
        </div>
      )}

      {!signedIn && auth.status !== 'loading' && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-24 flex justify-center px-4 sm:inset-x-auto sm:right-4 sm:top-16 sm:bottom-auto sm:px-0">
          <section
            aria-label="Sign in"
            className="w-full max-w-sm rounded-md border border-line bg-surface/95 p-5 shadow-xl backdrop-blur-sm"
          >
            <h1 className="m-0 text-lg leading-snug font-extrabold tracking-tight">
              Your rail life, on one map.
            </h1>
            <p className="mt-1.5 mb-4 text-sm leading-relaxed text-ink-soft">
              Log a journey in fifteen seconds and watch India fill in.
              The map behind this card is a preview with sample journeys.
            </p>
            <SignInButton
              mode={auth.mode}
              onSignIn={auth.signIn}
              redirecting={auth.status === 'redirecting'}
            />
            {auth.error && (
              <p className="mt-2.5 mb-0 text-xs leading-relaxed text-vermillion">{auth.error}</p>
            )}
          </section>
        </div>
      )}

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
        {(demo || !signedIn) && (
          <div className="grid place-items-center border-l border-line bg-surface-2 px-3">
            <span className="text-[0.6rem] font-semibold tracking-[0.13em] text-ink-faint uppercase">
              {signedIn ? 'Demo' : 'Sample'}
            </span>
          </div>
        )}
      </section>
    </main>
  )
}

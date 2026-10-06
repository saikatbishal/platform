import { useCallback, useEffect, useState } from 'react'
import { routeForJourney, type RailGraph } from '@/features/map/route.ts'
import { isSupabaseConfigured } from '@/lib/supabase.ts'
import {
  addPending, dropAnon, dropPending, keyFor, newJourneyId, pendingKeyFor, read, takeAnon, write,
} from './journeyStorage.ts'
import { mergeJourneys, planSync } from './mergeJourneys.ts'
import { addToSupabase, readFromSupabase, removeFromSupabase } from './journeyStorageSupabase.ts'
import type { Journey, JourneyDraft } from '@/types/index.ts'

/**
 * The journeys the map draws. Storage depends on auth state:
 * - Signed in + Supabase configured: Supabase
 * - Otherwise (demo mode, offline, unsigned): localStorage
 *
 * Everything that moves is in this file. The shape exposed — a list, add, remove —
 * is what a TanStack query against `journeys` table will expose, so nothing
 * above this changes.
 */

export interface JourneyStore {
  journeys: Journey[]
  /** True once this user's stored journeys have been read — even if empty. */
  loaded: boolean
  add: (draft: JourneyDraft, graph: RailGraph | null, trainStops?: readonly string[]) => Journey
  remove: (id: string) => void
  /**
   * What has not reached the account yet, and why. Always "all clear" in
   * demo mode and when signed out — there is no account to be behind.
   */
  sync: SyncState
}

export interface SyncState {
  /** Journeys on the map that the server has not confirmed. */
  pending: number
  /** The account could not be read, so the map shows only this device's
      journeys. Nothing was changed on either side. */
  readFailed: boolean
  /** A sync is in flight — to disable the retry control, not to spin. */
  busy: boolean
  retry: () => void
}

export function useJourneys(userId: string | null): JourneyStore {
  const useSupabase = isSupabaseConfigured && userId !== null
  const lsKey = keyFor(userId)

  const [store, setStore] = useState<StoreState>(() => fresh(userId, useSupabase))
  /** Bumped by `retry()` and by the browser coming back online; the sync
      effect below re-runs on it. */
  const [attempt, setAttempt] = useState(0)

  /*
   * userId changed — immediately clear to [] to stop the previous user's
   * journeys showing for one frame after sign-in/out. The fetch below will fill
   * it back in once it completes. Render-time adjustment matches React's
   * documented pattern for "this state is derived from a prop that changed".
   */
  if (store.userId !== userId) {
    /*
     * Supabase path: empty, and the fetch below fills it. Local path: read the
     * new user's bucket right here, because nothing else will — this used to
     * set [] unconditionally, which meant that signing in while Supabase was
     * unconfigured (demo mode) blanked the map and left the journeys sitting
     * unread in storage under the user's key.
     */
    setStore(fresh(userId, useSupabase))
  }

  /*
   * The account sync: read the server, then send it everything this device
   * holds that it does not — journeys added while signed in that never got
   * confirmed (the pending log), and journeys logged signed out (the
   * anonymous bucket, first sign-in only). Re-runs on sign-in, on `retry()`,
   * and when the browser comes back online.
   *
   * The rule every branch below keeps: a journey leaves this device only
   * after the server has confirmed that exact row. Nothing here is cleared on
   * the strength of a request having been *sent*.
   */
  useEffect(() => {
    if (!useSupabase || !userId) return

    let stale = false
    setStore((prev) => (prev.userId === userId ? { ...prev, busy: true } : prev))

    void (async () => {
      const res = await readFromSupabase(userId)
      if (stale) return

      const pending = read(pendingKeyFor(userId))

      if (!res.ok) {
        /*
         * Could not ask is not the same as has nothing. Show what this device
         * holds — the unsent log, plus any signed-out journeys — so the map is
         * not blank, touch neither bucket, and say so. The next retry starts
         * from exactly this state.
         */
        const anon = read(keyFor(null))
        const local = uniqueById([...pending, ...anon])
        setStore((prev) =>
          prev.userId === userId
            ? { ...prev, journeys: local, loaded: true, readFailed: true, busy: false,
                pendingIds: new Set(local.map((j) => j.id)) }
            : prev,
        )
        if (import.meta.env.DEV) console.warn('[journeys] account read failed:', res.error)
        return
      }

      const server = res.value
      const { journeys: anon, commit } = takeAnon()
      const { pendingLanded, toSend, fromAnon, anonAlreadyThere } = planSync(server, pending, anon)
      // Pending journeys the server already has landed on an attempt whose
      // reply was lost. They are safe — stop tracking them.
      dropPending(userId, pendingLanded)

      setStore((prev) =>
        prev.userId === userId
          ? { ...prev, journeys: [...server, ...toSend], loaded: true, readFailed: false,
              busy: toSend.length > 0, pendingIds: new Set(toSend.map((j) => j.id)) }
          : prev,
      )

      /*
       * Sequential, and each confirmation recorded as it arrives: a partial
       * failure must leave an exact answer to "what landed", and a sign-out
       * halfway through must stop sending into an account nobody is in.
       */
      const confirmedAnon: string[] = [...anonAlreadyThere]
      for (const j of toSend) {
        if (stale) break
        const sent = await addToSupabase(userId, j)
        if (!sent.ok) {
          if (import.meta.env.DEV) console.warn(`[journeys] ${j.fromCode}–${j.toCode} not sent:`, sent.error)
          continue
        }
        if (fromAnon.has(j.id)) confirmedAnon.push(j.id)
        else dropPending(userId, [j.id])
        setStore((prev) => (prev.userId === userId ? { ...prev, pendingIds: without(prev.pendingIds, j.id) } : prev))
      }
      // Only what the server confirmed leaves the signed-out bucket; the rest
      // stays on this device for the next attempt.
      commit(confirmedAnon)
      if (!stale) setStore((prev) => (prev.userId === userId ? { ...prev, busy: false } : prev))
    })()

    return () => {
      stale = true
    }
  }, [userId, useSupabase, attempt])

  // Coming back online is the most common reason a retry would now work — a
  // journey logged in a tunnel should go up when the train leaves it, without
  // anyone having to notice a button.
  useEffect(() => {
    if (!useSupabase || !userId) return
    const onOnline = () => { setAttempt((n) => n + 1) }
    window.addEventListener('online', onOnline)
    return () => { window.removeEventListener('online', onOnline) }
  }, [userId, useSupabase])

  const retry = useCallback(() => { setAttempt((n) => n + 1) }, [])

  /*
   * The same handover for the local path — demo mode, or Supabase not
   * configured yet. Runs once per sign-in: takeAnon empties the bucket, so a
   * re-render cannot replay it.
   */
  useEffect(() => {
    if (useSupabase) return
    if (!userId) return

    const { journeys: anon, commit } = takeAnon()
    if (anon.length === 0) return

    const key = keyFor(userId)
    const { merged, added } = mergeJourneys(read(key), anon)
    // `write` reports a full or refused storage instead of throwing. If the
    // user's bucket could not take the rows, the signed-out bucket keeps them
    // — clearing it on a failed write is the same loss the Supabase path had.
    if (added.length > 0 && !write(key, merged)) {
      setStore((prev) => (prev.userId === userId ? { ...prev, journeys: merged, loaded: true } : prev))
      return
    }
    commit(anon.map((j) => j.id))
    setStore((prev) => (prev.userId === userId ? { ...prev, journeys: merged, loaded: true } : prev))
  }, [userId, useSupabase])

  const add = useCallback(
    (draft: JourneyDraft, graph: RailGraph | null, trainStops?: readonly string[]) => {
      let distanceKm = 0
      if (graph) {
        const { result } = routeForJourney(graph, draft.fromCode, draft.toCode, trainStops)
        if (result) distanceKm = Math.round(result.km * 10) / 10
      }
      const journey: Journey = { ...draft, id: newJourneyId(), distanceKm }

      if (useSupabase && userId) {
        // Written to the pending log BEFORE the request, so there is no
        // instant at which this journey exists only in memory.
        addPending(userId, journey)
        setStore((prev) =>
          prev.userId === userId
            ? { ...prev, journeys: [...prev.journeys, journey], pendingIds: new Set(prev.pendingIds).add(journey.id) }
            : prev,
        )
        void addToSupabase(userId, journey).then((res) => {
          if (!res.ok) {
            // Not rolled back. The old rollback removed a journey the person
            // had just watched appear; keeping it, marked unsent, and
            // re-sending it is the version that loses nothing.
            if (import.meta.env.DEV) console.warn('[journeys] save failed, kept as pending:', res.error)
            return
          }
          dropPending(userId, [journey.id])
          setStore((prev) => (prev.userId === userId ? { ...prev, pendingIds: without(prev.pendingIds, journey.id) } : prev))
        })
        return journey
      }

      setStore((prev) => {
        const next = [...prev.journeys, journey]
        write(prev.userId ? keyFor(prev.userId) : lsKey, next)
        return { ...prev, journeys: next }
      })
      return journey
    },
    [userId, useSupabase, lsKey],
  )

  const remove = useCallback(
    (id: string) => {
      if (useSupabase && userId) {
        const removed = store.journeys.find((j) => j.id === id)
        if (!removed) return
        const wasPending = store.pendingIds.has(id)
        // Out of the pending log first, so an unsent journey that is deleted
        // is not re-sent by the next sync.
        if (wasPending) {
          dropPending(userId, [id])
          dropAnon([id])
        }
        setStore((prev) =>
          prev.userId === userId
            ? { ...prev, journeys: prev.journeys.filter((j) => j.id !== id), pendingIds: without(prev.pendingIds, id) }
            : prev,
        )
        // Sent even when pending: its save may have landed without the reply
        // arriving, and deleting a row that is not there succeeds.
        void removeFromSupabase(userId, id).then((res) => {
          if (res.ok) return
          // Put it back exactly as it was — including back in the pending log
          // if it was unsent — so a failed delete never costs the journey.
          if (wasPending) addPending(userId, removed)
          setStore((prev) =>
            prev.userId === userId
              ? { ...prev, journeys: [...prev.journeys, removed],
                  pendingIds: wasPending ? new Set(prev.pendingIds).add(id) : prev.pendingIds }
              : prev,
          )
          console.warn('[journeys] could not remove that journey; it is back on the map. Try again.')
        })
        return
      }

      setStore((prev) => {
        const next = prev.journeys.filter((j) => j.id !== id)
        write(prev.userId ? keyFor(prev.userId) : lsKey, next)
        return { ...prev, journeys: next }
      })
    },
    [userId, useSupabase, lsKey, store.journeys, store.pendingIds],
  )

  return {
    journeys: store.journeys,
    loaded: store.loaded,
    add,
    remove,
    sync: { pending: store.pendingIds.size, readFailed: store.readFailed, busy: store.busy, retry },
  }
}

interface StoreState {
  userId: string | null
  journeys: Journey[]
  loaded: boolean
  /** Ids on the map that the server has not confirmed. */
  pendingIds: ReadonlySet<string>
  readFailed: boolean
  busy: boolean
}

/** The state for a user id just arrived: Supabase starts empty and the sync
    fills it; the local path reads its bucket right here, because nothing
    else will. */
function fresh(userId: string | null, useSupabase: boolean): StoreState {
  return {
    userId,
    journeys: useSupabase ? [] : read(keyFor(userId)),
    loaded: !useSupabase,
    pendingIds: new Set(),
    readFailed: false,
    busy: false,
  }
}

function without(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
  if (!set.has(id)) return set
  const next = new Set(set)
  next.delete(id)
  return next
}

function uniqueById(rows: readonly Journey[]): Journey[] {
  const seen = new Set<string>()
  return rows.filter((j) => (seen.has(j.id) ? false : (seen.add(j.id), true)))
}

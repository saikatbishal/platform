import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { routeForJourney, type RailGraph } from '@/features/map/route.ts'
import { isSupabaseConfigured } from '@/lib/supabase.ts'
import {
  addPending, dropAnon, dropPending, keyFor, newJourneyId, pendingKeyFor, read, setPendingTrip, takeAnon, write,
} from './journeyStorage.ts'
import { mergeJourneys, planSync } from './mergeJourneys.ts'
import { addToSupabase, readFromSupabase, removeFromSupabase, setTripOnSupabase } from './journeyStorageSupabase.ts'
import {
  ANON_TRIPS_KEY, addIds, dropAssignments, dropIds, dropPendingTrip, forgetPendingTrip,
  pendingAssignmentsKeyFor, pendingTripDeletesKeyFor, pendingTripsKeyFor, putAssignments, putPendingTrip,
  readAssignments, readIds, readTrips, takeAnonTrips, tripsKeyFor, writeTrips,
} from '@/features/trips/tripStorage.ts'
import {
  deleteTripFromSupabase, readTripsFromSupabase, upsertTripToSupabase,
} from '@/features/trips/tripStorageSupabase.ts'
import { dismissToast, showToast } from '@/components/toast.ts'
import type { Journey, JourneyDraft, Trip } from '@/types/index.ts'

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
   * Trips — docs/features/trips/prd.md. In this store rather than a hook of
   * their own because the two are written to one server and the order of
   * those writes is the correctness of both: a journey saved into a trip the
   * server has not got yet is refused by the foreign key.
   */
  trips: Trip[]
  /** Makes a trip with no journeys — a real state; journeys join it later. */
  createTrip: (name: string, note: string | null) => Trip
  updateTrip: (id: string, patch: { name: string; note: string | null }) => void
  /** The trip goes; its journeys stay on the map, in no trip. Raises the
      message with its Undo. */
  deleteTrip: (id: string) => void
  /** Put journeys into a trip, or take them out of one (`null`). */
  setJourneysTrip: (ids: readonly string[], tripId: string | null) => void
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
  /** Trip edits — new trips, renames, deletes, journeys moved between
      trips — the server has not confirmed. Kept on the device and re-sent,
      like unsent journeys. */
  tripChanges: number
}

export function useJourneys(userId: string | null): JourneyStore {
  const useSupabase = isSupabaseConfigured && userId !== null
  const lsKey = keyFor(userId)

  const [store, setStore] = useState<StoreState>(() => fresh(userId, useSupabase))
  /** Bumped by `retry()` and by the browser coming back online; the sync
      effect below re-runs on it. */
  const [attempt, setAttempt] = useState(0)
  /** `${userId}:${count}` of the unreadable-rows message last shown, so a
      reconnect that reads the same account again does not raise it again. */
  const toldUnreadable = useRef<string | null>(null)
  /** The last server write queued for each journey id — see `inOrder`. */
  const writes = useRef(new Map<string, Promise<unknown>>())
  /** Ids whose delete was undone while the delete was still in flight, so
      its failure handler knows the journey is already back. */
  const undone = useRef(new Set<string>())
  /** Whether "couldn't read your trips" has been said for this user. */
  const toldTrips = useRef<string | null>(null)
  /** The trips as of this render, for an Undo pressed long after it. */
  const tripsNow = useRef(store.trips)
  tripsNow.current = store.trips

  /** A trip write landed: stop counting it as unsent, once no log still
      holds a newer intent for it. */
  const settleTrip = useCallback((uid: string, id: string) => {
    const still = readTrips(pendingTripsKeyFor(uid)).some((t) => t.id === id) ||
      readIds(pendingTripDeletesKeyFor(uid)).includes(id)
    if (still) return
    setStore((prev) => (prev.userId === uid ? { ...prev, pendingTripIds: without(prev.pendingTripIds, id) } : prev))
  }, [])

  /**
   * Send saved journeys' trip changes the server has not confirmed — all of
   * them, or (`only`) the ones just made. One request per destination trip,
   * since that is what one update can say. Each is dropped from the log only
   * if it still asks for what was confirmed: a newer change made while this
   * was in flight stays queued.
   *
   * Called without awaiting anything first, so the first request joins the
   * queue in the same tick as the change that caused it — behind any insert
   * of the same journey still going up, which is what makes "update after
   * insert" hold.
   */
  const sendAssignments = useCallback(async (uid: string, only: ReadonlySet<string> | null): Promise<number> => {
    const key = pendingAssignmentsKeyFor(uid)
    let failed = 0
    const groups = new Map<string | null, string[]>()
    for (const [id, tripId] of Object.entries(readAssignments(key))) {
      if (only && !only.has(id)) continue
      const group = groups.get(tripId)
      if (group) group.push(id)
      else groups.set(tripId, [id])
    }
    for (const [tripId, ids] of groups) {
      const res = await inOrder(writes.current, QUEUE, () => setTripOnSupabase(uid, ids, tripId))
      if (res.ok) {
        dropAssignments(key, ids, tripId)
        continue
      }
      failed += ids.length
      if (import.meta.env.DEV) console.warn('[trips] trip change not sent:', res.error)
    }
    const left = new Set(Object.keys(readAssignments(key)))
    setStore((prev) => (prev.userId === uid ? { ...prev, pendingAssignIds: left } : prev))
    /** How many journeys' trip changes did not reach the server. */
    return failed
  }, [])

  /*
   * Which sync attempt the person asked for — "Send now", "Try again" — as
   * opposed to the ones that run on their own (sign-in, coming back online).
   * Only an attempt someone asked for reports a failure with a message: they
   * pressed a button and are waiting to hear. One that runs by itself stays
   * quiet and leaves the banner to say what is still unsent, or every
   * reconnect in a tunnel would raise another message.
   *
   * Kept as the attempt's number rather than a "was asked" flag the effect
   * clears, so React running the effect twice in development reads the same
   * answer both times.
   */
  const attemptSeq = useRef(0)
  const askedAttempt = useRef(-1)
  const bump = useCallback((asked: boolean) => {
    attemptSeq.current += 1
    if (asked) askedAttempt.current = attemptSeq.current
    setAttempt(attemptSeq.current)
  }, [])
  const retry = useCallback(() => { bump(true) }, [bump])

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
    const asked = attempt === askedAttempt.current
    setStore((prev) => (prev.userId === userId ? { ...prev, busy: true } : prev))

    void (async () => {
      // Both tables at once. Trips can fail on their own — before the trips
      // migration is run, the table does not exist — and that must cost the
      // trips, not the journeys.
      const [res, tripsRes] = await Promise.all([readFromSupabase(userId), readTripsFromSupabase(userId)])
      if (stale) return

      const pending = read(pendingKeyFor(userId))
      const pendingTrips = readTrips(pendingTripsKeyFor(userId))
      const deletes = new Set(readIds(pendingTripDeletesKeyFor(userId)))

      if (!res.ok) {
        /*
         * Could not ask is not the same as has nothing. Show what this device
         * holds — the unsent log, plus any signed-out journeys — so the map is
         * not blank, touch neither bucket, and say so. The next retry starts
         * from exactly this state.
         */
        const anon = read(keyFor(null))
        const local = uniqueById([...pending, ...anon])
        const localTrips = uniqueById([...pendingTrips, ...readTrips(ANON_TRIPS_KEY)]).filter((t) => !deletes.has(t.id))
        setStore((prev) =>
          prev.userId === userId
            ? { ...prev, journeys: local, trips: localTrips, loaded: true, readFailed: true, busy: false,
                pendingIds: new Set(local.map((j) => j.id)) }
            : prev,
        )
        if (import.meta.env.DEV) console.warn('[journeys] account read failed:', res.error)
        if (asked) {
          showToast({
            id: UNSENT_TOAST,
            message: 'Couldn’t reach your account, so nothing was sent. Everything is still on this device.',
            action: { label: 'Try again', run: retry },
          })
        }
        return
      }

      const server = res.value.journeys
      const { unreadable } = res.value
      const told = `${userId}:${unreadable}`
      if (unreadable === 0) toldUnreadable.current = null
      else if (toldUnreadable.current !== told) {
        toldUnreadable.current = told
        showToast({
          id: 'journeys-unreadable',
          message: unreadable === 1
            ? 'One journey in your account couldn’t be read by this version of the app, so it isn’t on the map. It’s still in your account — nothing was deleted.'
            : `${unreadable} journeys in your account couldn’t be read by this version of the app, so they aren’t on the map. They’re still in your account — nothing was deleted.`,
        })
      }
      const { journeys: anon, commit } = takeAnon()
      const { trips: anonTrips, commit: commitTrips } = takeAnonTrips()
      const { pendingLanded, toSend: planned, fromAnon, anonAlreadyThere, adopted } = planSync(server, pending, anon)
      // Pending journeys the server already has landed on an attempt whose
      // reply was lost. They are safe — stop tracking them.
      dropPending(userId, pendingLanded)

      /*
       * Trips: what the account holds, with this device's unconfirmed intent
       * laid over it — new trips and edits win, deletes take effect. Signed-
       * out trips all move over, and are never merged by name: "Himachal" on
       * this phone and "Himachal" on the account may be two years apart.
       */
      const serverTrips = tripsRes.ok ? tripsRes.value.trips : []
      const onServerTrip = new Set(serverTrips.map((t) => t.id))
      const anonTripsFresh = anonTrips.filter((t) => !onServerTrip.has(t.id) && !deletes.has(t.id))
      const fromAnonTrip = new Set(anonTripsFresh.map((t) => t.id))
      const tripsToSend = uniqueById([...pendingTrips, ...anonTripsFresh]).filter((t) => !deletes.has(t.id))
      const trips = overlayTrips(serverTrips, tripsToSend, deletes)
      if (tripsRes.ok) toldTrips.current = null
      else {
        if (import.meta.env.DEV) console.warn('[trips] account read failed:', tripsRes.error)
        if (toldTrips.current !== userId) {
          toldTrips.current = userId
          showToast({
            id: 'trips-unreadable',
            message: 'Couldn’t read your trips from your account, so every journey shows as in no trip for now. Nothing in your account has changed.',
          })
        }
      }

      /*
       * A journey can only go up into a trip that exists or is about to. One
       * pointing anywhere else — its trip deleted on another device while this
       * one was offline — would be refused by the foreign key on every retry,
       * for ever, so it goes up in no trip instead. Decided only when the
       * account's trips could be read; otherwise nothing is known.
       */
      const knownTrips = new Set(trips.map((t) => t.id))
      const orphaned = tripsRes.ok ? planned.filter((j) => j.tripId !== null && !knownTrips.has(j.tripId)) : []
      setPendingTrip(userId, orphaned.map((j) => j.id), null)
      const orphanIds = new Set(orphaned.map((j) => j.id))
      const toSend = orphanIds.size === 0 ? planned : planned.map((j) => (orphanIds.has(j.id) ? { ...j, tripId: null } : j))

      /*
       * The account's copy of a signed-out journey that was in a trip adopts
       * it (mergeJourneys). Recorded before anything is sent, so a failure
       * part-way leaves it queued rather than forgotten.
       */
      const unsentIds = new Set(pending.map((j) => j.id))
      for (const a of adopted) {
        if (unsentIds.has(a.id)) setPendingTrip(userId, [a.id], a.tripId)
        else putAssignments(pendingAssignmentsKeyFor(userId), [a.id], a.tripId)
      }
      const assignments = readAssignments(pendingAssignmentsKeyFor(userId))
      // The same rule for a move into a trip that is no longer anywhere — an
      // Undo pressed after the trip went, say. It becomes "in no trip".
      if (tripsRes.ok) {
        const strays = Object.entries(assignments)
          .filter(([, t]) => t !== null && !knownTrips.has(t))
          .map(([id]) => id)
        if (strays.length > 0) {
          putAssignments(pendingAssignmentsKeyFor(userId), strays, null)
          for (const id of strays) assignments[id] = null
        }
      }
      const shown = [...server, ...toSend].map((j) => {
        const assigned = assignments[j.id]
        let tripId = assigned === undefined ? j.tripId : assigned
        if (tripId !== null && deletes.has(tripId)) tripId = null
        return tripId === j.tripId ? j : { ...j, tripId }
      })
      const assignedIds = Object.keys(assignments)

      setStore((prev) =>
        prev.userId === userId
          ? { ...prev, journeys: shown, trips, loaded: true, readFailed: false,
              busy: toSend.length > 0 || tripsToSend.length > 0 || deletes.size > 0 || assignedIds.length > 0,
              pendingIds: new Set(toSend.map((j) => j.id)),
              pendingTripIds: new Set([...tripsToSend.map((t) => t.id), ...deletes]),
              pendingAssignIds: new Set(assignedIds) }
          : prev,
      )

      /*
       * Trips go first. A journey sent into a trip the server has not got yet
       * is refused by the foreign key; sent after, it lands. Everything below
       * shares one queue with the writes the person makes while this runs, so
       * that order holds for those too.
       */
      /** What this run could not send, for the message an asked-for run owes. */
      const unsent = { journeys: 0, trips: 0, deletes: 0, moves: 0 }
      const confirmedTrips = anonTrips.filter((t) => onServerTrip.has(t.id)).map((t) => t.id)
      for (const t of tripsToSend) {
        if (stale) break
        const sent = await inOrder(writes.current, QUEUE, () => upsertTripToSupabase(userId, t))
        if (!sent.ok) {
          unsent.trips++
          if (import.meta.env.DEV) console.warn(`[trips] ${t.name} not sent:`, sent.error)
          continue
        }
        if (fromAnonTrip.has(t.id)) confirmedTrips.push(t.id)
        dropPendingTrip(userId, t)
        settleTrip(userId, t.id)
      }
      commitTrips(confirmedTrips)

      /*
       * Sequential, and each confirmation recorded as it arrives: a partial
       * failure must leave an exact answer to "what landed", and a sign-out
       * halfway through must stop sending into an account nobody is in.
       */
      const confirmedAnon: string[] = [...anonAlreadyThere]
      for (const j of toSend) {
        if (stale) break
        const sent = await inOrder(writes.current, QUEUE, () => addToSupabase(userId, j))
        if (!sent.ok) {
          unsent.journeys++
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

      // Then journeys already saved that changed trip, then trip deletes —
      // after the journeys, so a delete never races a journey still going up
      // into the trip it removes.
      if (!stale) unsent.moves = await sendAssignments(userId, null)
      for (const id of deletes) {
        if (stale) break
        const gone = await inOrder(writes.current, QUEUE, () => deleteTripFromSupabase(userId, id))
        if (!gone.ok) {
          unsent.deletes++
          if (import.meta.env.DEV) console.warn('[trips] delete not sent:', gone.error)
          continue
        }
        dropIds(pendingTripDeletesKeyFor(userId), [id])
        settleTrip(userId, id)
      }
      if (stale) return
      setStore((prev) => (prev.userId === userId ? { ...prev, busy: false } : prev))

      const left = unsent.journeys + unsent.trips + unsent.deletes + unsent.moves
      if (left > 0 && asked) {
        showToast({
          id: UNSENT_TOAST,
          message: `Couldn’t send ${unsentList(unsent)} to your account. Everything is still on this device — nothing is lost.`,
          action: { label: 'Try again', run: retry },
        })
      } else if (left === 0 && nothingUnsent(userId)) {
        // A failure message still up is now untrue. Take it down.
        dismissToast(UNSENT_TOAST)
      }
    })()

    return () => {
      stale = true
    }
  }, [userId, useSupabase, attempt, settleTrip, sendAssignments, retry])

  // Coming back online is the most common reason a retry would now work — a
  // journey logged in a tunnel should go up when the train leaves it, without
  // anyone having to notice a button.
  useEffect(() => {
    if (!useSupabase || !userId) return
    const onOnline = () => { bump(false) }
    window.addEventListener('online', onOnline)
    return () => { window.removeEventListener('online', onOnline) }
  }, [userId, useSupabase, bump])

  /*
   * The same handover for the local path — demo mode, or Supabase not
   * configured yet. Runs once per sign-in: takeAnon empties the bucket, so a
   * re-render cannot replay it.
   */
  useEffect(() => {
    if (useSupabase) return
    if (!userId) return

    /*
     * Trips first, so the journeys arriving below have their trips to point
     * at. All of them move over, kept by id and never matched by name — two
     * trips called "Himachal" may be two different years. An empty one moves
     * too: it was made for a trip not taken yet.
     */
    const { trips: anonTrips, commit: commitTrips } = takeAnonTrips()
    if (anonTrips.length > 0) {
      const tKey = tripsKeyFor(userId)
      const mine = readTrips(tKey)
      const mergedTrips = [...mine, ...anonTrips.filter((t) => !mine.some((m) => m.id === t.id))]
      if (writeTrips(tKey, mergedTrips)) {
        commitTrips(anonTrips.map((t) => t.id))
        setStore((prev) => (prev.userId === userId ? { ...prev, trips: mergedTrips } : prev))
      }
    }

    const { journeys: anon, commit } = takeAnon()
    if (anon.length === 0) return

    const key = keyFor(userId)
    const { merged, added, adopted } = mergeJourneys(read(key), anon)
    // `write` reports a full or refused storage instead of throwing. If the
    // user's bucket could not take the rows, the signed-out bucket keeps them
    // — clearing it on a failed write is the same loss the Supabase path had.
    if ((added.length > 0 || adopted.length > 0) && !write(key, merged)) {
      setStore((prev) => (prev.userId === userId ? { ...prev, journeys: merged, loaded: true } : prev))
      return
    }
    commit(anon.map((j) => j.id))
    setStore((prev) => (prev.userId === userId ? { ...prev, journeys: merged, loaded: true } : prev))
  }, [userId, useSupabase])

  /**
   * Put one journey on the map and into storage — a new one, or one coming
   * back from an undone delete with its id intact. Does nothing if it is
   * already there.
   */
  const put = useCallback(
    (journey: Journey) => {
      if (useSupabase && userId) {
        // Written to the pending log BEFORE the request, so there is no
        // instant at which this journey exists only in memory.
        addPending(userId, journey)
        setStore((prev) =>
          prev.userId === userId && !prev.journeys.some((j) => j.id === journey.id)
            ? { ...prev, journeys: [...prev.journeys, journey], pendingIds: new Set(prev.pendingIds).add(journey.id) }
            : prev,
        )
        void inOrder(writes.current, QUEUE, () => addToSupabase(userId, journey)).then((res) => {
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
        return
      }

      setStore((prev) => {
        if (prev.journeys.some((j) => j.id === journey.id)) return prev
        const next = [...prev.journeys, journey]
        write(prev.userId ? keyFor(prev.userId) : lsKey, next)
        return { ...prev, journeys: next }
      })
    },
    [userId, useSupabase, lsKey],
  )

  /**
   * Take one journey off the map and out of storage. `announce` raises the
   * "Deleted" message with its Undo; an Undo of an add passes false, because
   * the line leaving the map already says it happened. A failure is reported
   * either way.
   */
  const drop = useCallback(
    (id: string, announce: boolean) => {
      const removed = store.journeys.find((j) => j.id === id)
      if (!removed) return
      if (announce) {
        showToast({
          id: `journey-${id}`,
          message: `Deleted ${describe(removed)}.`,
          action: { label: 'Undo', run: () => { latest.current.restore(removed) } },
        })
      }

      undone.current.delete(id)
      if (useSupabase && userId) {
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
        // arriving, and deleting a row that is not there succeeds. Queued
        // behind any save of the same journey, so it cannot overtake it.
        void inOrder(writes.current, QUEUE, () => removeFromSupabase(userId, id)).then((res) => {
          if (res.ok) return
          if (import.meta.env.DEV) console.warn('[journeys] remove failed:', res.error)
          // Undone before the failure arrived: the journey is already back,
          // with its save queued behind this delete. Nothing to report.
          if (undone.current.delete(id)) return
          // Put it back exactly as it was — including back in the pending log
          // if it was unsent — so a failed delete never costs the journey.
          if (wasPending) addPending(userId, removed)
          setStore((prev) =>
            prev.userId === userId && !prev.journeys.some((j) => j.id === id)
              ? { ...prev, journeys: [...prev.journeys, removed],
                  pendingIds: wasPending ? new Set(prev.pendingIds).add(id) : prev.pendingIds }
              : prev,
          )
          // Same id as the "Deleted" message, so this replaces it rather than
          // contradicting it from the next row.
          showToast({
            id: `journey-${id}`,
            message: `Couldn’t delete ${describe(removed)} from your account, so it’s back on the map. Nothing changed.`,
            action: { label: 'Try again', run: () => { latest.current.drop(id, true) } },
          })
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

  /**
   * What a message's button calls. It is pressed seconds after the render
   * that raised it, against a journey list that has moved on since — so it
   * reaches the current `drop` and `put` rather than the ones in its closure.
   */
  const restore = useCallback((journey: Journey) => {
    undone.current.add(journey.id)
    // Its trip may have been deleted while the message was up. Back in no
    // trip rather than pointing at nothing — which the server would refuse,
    // on every retry, for ever.
    const tripId = journey.tripId
    put(tripId !== null && !tripsNow.current.some((t) => t.id === tripId) ? { ...journey, tripId: null } : journey)
  }, [put])
  const latest = useRef({ drop, restore })
  useEffect(() => { latest.current = { drop, restore } }, [drop, restore])

  /*
   * Undo is the confirmation for both add and delete, as the roadmap has it
   * (docs/08-roadmap.md, "optimistic add with undo"; "delete gets undo"): a
   * quiet line naming the journey, with the way back on it. One toast id per
   * journey, so whatever is said last about it is the only thing said.
   */
  const add = useCallback(
    (draft: JourneyDraft, graph: RailGraph | null, trainStops?: readonly string[]) => {
      // Null, not 0, when it cannot be worked out here — see Journey.distanceKm.
      let distanceKm: number | null = null
      if (graph) {
        const { result } = routeForJourney(graph, draft.fromCode, draft.toCode, trainStops)
        if (result) distanceKm = Math.round(result.km * 10) / 10
      }
      const journey: Journey = { ...draft, id: newJourneyId(), distanceKm }
      put(journey)
      showToast({
        id: `journey-${journey.id}`,
        message: `Added ${describe(journey)}.`,
        action: { label: 'Undo', run: () => { latest.current.drop(journey.id, false) } },
      })
      return journey
    },
    [put],
  )

  const remove = useCallback((id: string) => { drop(id, true) }, [drop])

  /* ── Trips ─────────────────────────────────────────────────────────────
   *
   * Every write below follows the journeys' rule: recorded on the device
   * first, sent second, cleared only on the server's word. And every one
   * joins the same queue as the journey writes, which is what keeps the
   * foreign key happy — a trip made and a journey logged into it a moment
   * later reach the server in that order, online or replayed from the logs.
   */

  /** One trip into state and storage: new, renamed, or back from an Undo. */
  const putTrip = useCallback(
    (trip: Trip) => {
      if (useSupabase && userId) {
        putPendingTrip(userId, trip)
        dropIds(pendingTripDeletesKeyFor(userId), [trip.id])
        setStore((prev) =>
          prev.userId === userId
            ? { ...prev, trips: upsertById(prev.trips, trip), pendingTripIds: new Set(prev.pendingTripIds).add(trip.id) }
            : prev,
        )
        void inOrder(writes.current, QUEUE, () => upsertTripToSupabase(userId, trip)).then((res) => {
          // Not rolled back on failure: it stays in the log, on screen, and
          // goes up with the next sync — the journeys' arrangement exactly.
          if (!res.ok) {
            if (import.meta.env.DEV) console.warn('[trips] save failed, kept as pending:', res.error)
            showToast({
              id: UNSENT_TOAST,
              message: `Couldn’t save ${trip.name} to your account. It’s kept on this device and will be sent again.`,
              action: { label: 'Try again', run: retry },
            })
            return
          }
          dropPendingTrip(userId, trip)
          settleTrip(userId, trip.id)
        })
        return
      }
      setStore((prev) => {
        const next = upsertById(prev.trips, trip)
        writeTrips(tripsKeyFor(prev.userId), next)
        return { ...prev, trips: next }
      })
    },
    [userId, useSupabase, settleTrip, retry],
  )

  const createTrip = useCallback(
    (name: string, note: string | null): Trip => {
      const trip: Trip = {
        id: newJourneyId(),
        name: name.trim(),
        note: note?.trim() || null,
        createdAt: new Date().toISOString(),
      }
      putTrip(trip)
      return trip
    },
    [putTrip],
  )

  const updateTrip = useCallback(
    (id: string, patch: { name: string; note: string | null }) => {
      const trip = store.trips.find((t) => t.id === id)
      const name = patch.name.trim()
      if (!trip || name === '') return
      const note = patch.note?.trim() || null
      if (name === trip.name && note === trip.note) return
      putTrip({ ...trip, name, note })
    },
    [store.trips, putTrip],
  )

  const setJourneysTrip = useCallback(
    (ids: readonly string[], tripId: string | null) => {
      if (ids.length === 0) return
      const these = new Set(ids)
      if (useSupabase && userId) {
        /*
         * Both logs, every time. An unsent journey carries its trip in the
         * insert still waiting to go, so its logged copy is rewritten; a saved
         * one needs an update. And an insert can be in flight right now with
         * the old trip on it — the update, queued behind it, puts that right.
         * An update for a row the server does not have yet matches nothing
         * and succeeds, and the insert carries the new trip when it goes.
         */
        setPendingTrip(userId, ids, tripId)
        putAssignments(pendingAssignmentsKeyFor(userId), ids, tripId)
        setStore((prev) =>
          prev.userId === userId
            ? { ...prev, journeys: prev.journeys.map((j) => (these.has(j.id) ? { ...j, tripId } : j)),
                pendingAssignIds: new Set([...prev.pendingAssignIds, ...ids]) }
            : prev,
        )
        void sendAssignments(userId, these).then((failed) => {
          if (failed === 0) return
          showToast({
            id: UNSENT_TOAST,
            message: `Couldn’t save the trip change for ${failed === 1 ? '1 journey' : `${failed} journeys`} to your account. It’s kept on this device and will be sent again.`,
            action: { label: 'Try again', run: retry },
          })
        })
        return
      }
      setStore((prev) => {
        const next = prev.journeys.map((j) => (these.has(j.id) ? { ...j, tripId } : j))
        write(keyFor(prev.userId), next)
        return { ...prev, journeys: next }
      })
    },
    [userId, useSupabase, sendAssignments, retry],
  )

  /** Undo of a trip delete: the trip back with its id, and its journeys back in it. */
  const restoreTrip = useCallback(
    (trip: Trip, members: readonly string[]) => {
      putTrip(trip)
      setJourneysTrip(members, trip.id)
    },
    [putTrip, setJourneysTrip],
  )
  const latestTrips = useRef({ restoreTrip })
  useEffect(() => { latestTrips.current = { restoreTrip } }, [restoreTrip])

  /**
   * Delete a trip. Never its journeys: they stay on the map, in no trip, and
   * the message says so in as many words — with the Undo, which puts the trip
   * back under the same id with the same journeys in it.
   */
  const deleteTrip = useCallback(
    (id: string) => {
      const trip = store.trips.find((t) => t.id === id)
      if (!trip) return
      const members = store.journeys.filter((j) => j.tripId === id).map((j) => j.id)
      showToast({
        id: `trip-${id}`,
        message: members.length === 0
          ? `Deleted ${trip.name}.`
          : `Deleted ${trip.name}. ${members.length === 1 ? 'Its journey is' : `All ${members.length} of its journeys are`} still on the map, in no trip.`,
        action: { label: 'Undo', run: () => { latestTrips.current.restoreTrip(trip, members) } },
      })

      if (useSupabase && userId) {
        forgetPendingTrip(userId, id)
        addIds(pendingTripDeletesKeyFor(userId), [id])
        /*
         * The schema's `on delete set null (trip_id)` takes saved journeys out
         * of the trip on its own. These are said anyway, queued ahead of the
         * delete: journeys still going up must not arrive pointing at a trip
         * that has gone, and moves into this trip not yet sent must not land
         * after it.
         */
        setPendingTrip(userId, members, null)
        putAssignments(pendingAssignmentsKeyFor(userId), members, null)
        setStore((prev) =>
          prev.userId === userId
            ? { ...prev,
                trips: prev.trips.filter((t) => t.id !== id),
                journeys: prev.journeys.map((j) => (j.tripId === id ? { ...j, tripId: null } : j)),
                pendingTripIds: new Set(prev.pendingTripIds).add(id) }
            : prev,
        )
        if (members.length > 0) void sendAssignments(userId, new Set(members))
        void inOrder(writes.current, QUEUE, () => deleteTripFromSupabase(userId, id)).then((res) => {
          if (!res.ok) {
            if (import.meta.env.DEV) console.warn('[trips] delete failed, kept as pending:', res.error)
            // Its own id, not the "Deleted … Undo" message's: that one has to
            // stay, because Undo still works whether or not this reached the
            // server.
            showToast({
              id: UNSENT_TOAST,
              message: `Couldn’t delete ${trip.name} from your account. It stays deleted here, and the delete will be sent again.`,
              action: { label: 'Try again', run: retry },
            })
            return
          }
          dropIds(pendingTripDeletesKeyFor(userId), [id])
          settleTrip(userId, id)
        })
        return
      }

      setStore((prev) => {
        const trips = prev.trips.filter((t) => t.id !== id)
        const journeys = prev.journeys.map((j) => (j.tripId === id ? { ...j, tripId: null } : j))
        writeTrips(tripsKeyFor(prev.userId), trips)
        write(keyFor(prev.userId), journeys)
        return { ...prev, trips, journeys }
      })
    },
    [userId, useSupabase, store.trips, store.journeys, sendAssignments, settleTrip, retry],
  )

  /*
   * A trip id that resolves to no trip reads as no trip — deleted on another
   * device, or the account's trips could not be read this time. Display
   * only: nothing is written on the strength of it.
   */
  const journeys = useMemo(() => {
    const known = new Set(store.trips.map((t) => t.id))
    const stray = (j: Journey) => j.tripId !== null && !known.has(j.tripId)
    return store.journeys.some(stray)
      ? store.journeys.map((j) => (stray(j) ? { ...j, tripId: null } : j))
      : store.journeys
  }, [store.journeys, store.trips])

  return {
    journeys,
    loaded: store.loaded,
    add,
    remove,
    trips: store.trips,
    createTrip,
    updateTrip,
    deleteTrip,
    setJourneysTrip,
    sync: {
      pending: store.pendingIds.size,
      readFailed: store.readFailed,
      busy: store.busy,
      retry,
      tripChanges: store.pendingTripIds.size + store.pendingAssignIds.size,
    },
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
  trips: Trip[]
  /** Trips created, edited or deleted here and not yet confirmed. */
  pendingTripIds: ReadonlySet<string>
  /** Saved journeys whose trip changed here and not yet confirmed. */
  pendingAssignIds: ReadonlySet<string>
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
    trips: useSupabase ? [] : readTrips(tripsKeyFor(userId)),
    pendingTripIds: new Set(),
    pendingAssignIds: new Set(),
  }
}

/** Trips as the account has them, with this device's unconfirmed intent on top. */
function overlayTrips(server: readonly Trip[], local: readonly Trip[], deletes: ReadonlySet<string>): Trip[] {
  let out = [...server]
  for (const t of local) out = upsertById(out, t)
  return out.filter((t) => !deletes.has(t.id))
}

function upsertById<T extends { id: string }>(rows: readonly T[], row: T): T[] {
  return rows.some((r) => r.id === row.id) ? rows.map((r) => (r.id === row.id ? row : r)) : [...rows, row]
}

function without(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
  if (!set.has(id)) return set
  const next = new Set(set)
  next.delete(id)
  return next
}

/**
 * Every server write goes through one queue, in the order it was asked for.
 *
 * It used to be one queue per journey: an Undo pressed while a save was in
 * flight sent a delete that could reach the server before the insert it was
 * undoing, and the row came back (docs/12-journey-sync.md). Trips made that
 * ordering a cross-row matter — a journey logged into a trip made a moment
 * earlier must not reach the server before the trip, or the foreign key
 * refuses it — so the queue is now one for everything. One person's writes
 * arrive a handful at a time; nothing here is waiting on throughput. Each
 * write waits for the one before it to settle, success or failure.
 */
const QUEUE = 'server'

/**
 * The one id every "couldn't send" message shares, so a run of failures —
 * a trip, then its journeys, then the retry — is one message, replaced,
 * rather than a column of them.
 */
const UNSENT_TOAST = 'sync-unsent'

/** "1 trip, 2 journeys and the trip changes for 4 journeys" — what was left behind. */
function unsentList(n: { journeys: number; trips: number; deletes: number; moves: number }): string {
  const parts: string[] = []
  if (n.journeys > 0) parts.push(n.journeys === 1 ? '1 journey' : `${n.journeys} journeys`)
  if (n.trips > 0) parts.push(n.trips === 1 ? '1 trip' : `${n.trips} trips`)
  if (n.deletes > 0) parts.push(n.deletes === 1 ? '1 trip deletion' : `${n.deletes} trip deletions`)
  if (n.moves > 0) parts.push(`the trip changes for ${n.moves === 1 ? '1 journey' : `${n.moves} journeys`}`)
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

/** True when no log holds anything for this user — every write is confirmed. */
function nothingUnsent(userId: string): boolean {
  return read(pendingKeyFor(userId)).length === 0 &&
    readTrips(pendingTripsKeyFor(userId)).length === 0 &&
    readIds(pendingTripDeletesKeyFor(userId)).length === 0 &&
    Object.keys(readAssignments(pendingAssignmentsKeyFor(userId))).length === 0
}

function inOrder<T>(queue: Map<string, Promise<unknown>>, id: string, op: () => Promise<T>): Promise<T> {
  const next = (queue.get(id) ?? Promise.resolve()).then(op, op)
  queue.set(id, next)
  // `then(f, f)`, not `finally`: `finally` hands back a promise that rejects
  // when `next` does, and nothing would be there to catch it.
  const settle = () => { if (queue.get(id) === next) queue.delete(id) }
  next.then(settle, settle)
  return next
}

/** "HWH · PURI, 12 Sep 2026" — the codes and date the journey card prints. */
function describe(j: Journey): string {
  const date = new Date(`${j.travelledOn}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  return `${j.fromCode} · ${j.toCode}, ${date}`
}

function uniqueById<T extends { id: string }>(rows: readonly T[]): T[] {
  const seen = new Set<string>()
  return rows.filter((j) => (seen.has(j.id) ? false : (seen.add(j.id), true)))
}

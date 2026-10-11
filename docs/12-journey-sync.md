# Journey sync — signed out, signed in, and back

Written 19 Sep 2026. Status: **stage 1 built** on `fix/journey-sync-loss`; stages 2–5 planned.

## The bug report

A user logs journeys signed out, signs in, signs out — and sees an empty map.

## What was actually happening

1. **Moved, not shown.** Sign-in handed the signed-out journeys to the account and
   emptied the device bucket; the signed-out view reads that bucket.
2. **Real loss, silently.** The Supabase helpers logged errors and returned
   `[]`/`null`/`false`, which read as success:
   - a failed sign-in upload still ran `commit()` — journeys gone from both places;
   - a failed signed-in save stayed on the map until reload, then vanished (its
     rollback hung off a promise that never rejected);
   - a failed account read looked like an empty account;
   - the non-secure-context id fallback wasn't a uuid, so Postgres rejected it.

## Decisions (author, 19 Sep)

| Question | Decision |
| --- | --- |
| Signed-out map after sign-out | **Full account copy** — mirror the account on the device and show it |
| When may a synced device copy be removed | **Only when asked** — never automatically |
| Device journeys claimed by account A, then B signs in | **Stay with A** |

Consequences: account journeys are **read-only while signed out** ("Sign in to
remove"); signed out shows the account that signed out **last**.

## Stages

1. **Stop the silent loss** — built.
   - `journeyStorageSupabase.ts` returns `SyncResult<T>`; failure is a value.
   - Saves are upserts on the journey's own id with `ignoreDuplicates`, so every retry is safe.
   - `takeAnon().commit(ids)` clears only server-confirmed rows.
   - Signed-in adds go to a per-user **pending log** (`platform.journeys.v1.pending.<uid>`)
     *before* the request; they leave it only on confirmation. Failed saves stay on
     the map as pending instead of being rolled back.
   - A failed account read shows the device's journeys, touches nothing, and says so.
   - Retry on a button, and automatically on the browser's `online` event.
   - `newJourneyId()` — a real v4 uuid via `getRandomValues` where `randomUUID` is missing.
   - `planSync()` in `mergeJourneys.ts` is the pure decision; covered in `scripts/check-merge.ts`.
2. **Claims ledger** — `platform.journeys.v1.anon.claims` (`id → { userId, syncedAt }`);
   keep signed-out rows after upload; claimed rows never re-uploaded (no resurrection
   of deletes) and never offered to another account.
3. **Account mirror** — cache each account's journeys on the device after every
   confirmed read/save/delete; signed-out view = last account's mirror ∪ unclaimed
   device journeys; mirror rows read-only while signed out.
4. **"Remove from this device"** — explicit, says how many are safe in the account
   first; unclaimed journeys only behind a second warning.
5. **Checks** — failed read, partial upload, delete-not-resurrected, A-then-B,
   double handover.

## Known edges left for stage 2+

- ~~A delete issued while that journey's first save is still in flight can reach the
  server before the insert, and the row reappears.~~ Closed within one tab
  (2026-10-11): Undo on the "Added" toast made it a one-tap path, so server writes
  for a journey now run in order — `inOrder` in `useJourneys.ts`. Two tabs or two
  devices can still race; the claims ledger + a per-id tombstone closes that.
- If `localStorage` itself is full, `addPending` cannot record the write-ahead entry;
  the journey then lives in memory until the save confirms.

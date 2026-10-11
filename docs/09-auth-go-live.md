# Auth — from demo to live

The frontend for Google sign-in is finished. Until `.env` holds real values the
app runs in **demo mode**: sign-in opens a session that lives in this browser
only, so every signed-in screen is buildable and reviewable before a backend
exists. This document turns that into real Google sign-in against a real
database.

**Time: about 45 minutes**, most of it clicking through two consoles.

*Verified against the Supabase and Google consoles as of September 2026. Both
consoles get reorganised roughly annually — if a menu name below is missing,
trust the console and update this file.*

---

## What is already in place

| Piece | File | State |
| --- | --- | --- |
| Supabase client, placeholder guard, both key names | `src/lib/supabase.ts` | done |
| Auth state, live + demo, redirect-error handling | `src/features/auth/useAuth.ts` | done |
| One auth subscription for the tree | `src/features/auth/AuthProvider.tsx` | done |
| Demo session (browser-local, fixed uuid) | `src/features/auth/demoSession.ts` | done |
| Sign-in button, both modes | `src/features/auth/SignInButton.tsx` | done |
| Signed-in avatar menu | `src/features/auth/UserMenu.tsx` | done |
| Journeys table + RLS + stats view | `supabase/schema.sql` | written, not yet run |
| Profiles table + first-sign-in trigger + RLS | `supabase/auth.sql` | written, not yet run |
| Local CLI auth config | `supabase/config.toml` | written |

*The flow in one paragraph:* clicking the button sends the browser to Google;
Google confirms who you are and redirects to **Supabase's** callback, not
yours; Supabase creates or finds the user and redirects back to the app with a
session in the URL; the client library stores it. No password ever exists and
the app never sees a credential — it only asks "who is this session for?".
Sign-**up** and sign-**in** are the same action; the first-ever visit also
fires the trigger in `auth.sql` that creates the profile row.

---

## 1 · Create the Supabase project — 5 min

- [ ] supabase.com → **New project**. Region **`ap-south-1` (Mumbai)** — the
      audience is in India and auth round-trips are latency you can feel.
- [ ] Set a database password and put it in your password manager now. You will
      not be shown it again, and you need it for the CLI later.
- [ ] **Settings → API Keys**. Copy two values:
      - the **Project URL** (`https://<ref>.supabase.co`)
      - the **publishable key** (`sb_publishable_…`)

      Ignore anything labelled *secret* or *service_role* — those bypass
      row-level security and must never reach a browser. If the dashboard still
      offers a JWT-shaped `anon` key, that also works; it is deprecated at the
      end of 2026, so prefer the publishable one.
- [ ] Note the **project ref** — the `<ref>` in that URL. Google needs a
      callback built from it in step 3.

## 2 · Run the SQL — 3 min

- [ ] **SQL Editor** → paste the whole of `supabase/schema.sql` → Run.
- [ ] New query → paste the whole of `supabase/auth.sql` → Run.

Order matters: `auth.sql` installs a trigger that writes a profile row at first
sign-in, and the tables must exist before anyone signs in or that trigger
fails the insert into `auth.users` — which looks like "sign-in is broken",
not "a trigger failed".

- [ ] Confirm in **Table Editor**: `journeys` and `profiles` both exist, both
      show the green *RLS enabled* marker.

## 3 · Google Cloud — the long step — 20 min

Google moved OAuth setup under **Google Auth Platform**
(`console.cloud.google.com/auth`). The old single "OAuth consent screen" page
is now four sections in the left nav.

- [ ] console.cloud.google.com → new project (`platform-auth` is fine).
- [ ] **Branding**: app name `Platform`, your support email, your email as
      developer contact.
- [ ] **Audience**: **External**. While it is in *Testing*, add your own Google
      account under **Test users** — without that you get an "unverified app"
      interstitial. Testing caps you at 100 users; *Publish app* removes the
      warning later and needs no review for these scopes.
- [ ] **Data Access**: `openid`, `.../auth/userinfo.email`,
      `.../auth/userinfo.profile` — those three only. Anything more triggers
      Google's verification review.
- [ ] **Clients → Create client → Web application**:
      - *Authorised JavaScript origins*: `http://localhost:5173`
        (add your production origin later)
      - *Authorised redirect URI* — **exactly one, and it is Supabase's**:

        ```
        https://<your-project-ref>.supabase.co/auth/v1/callback
        ```

        Not your app's URL. This is the single most common failure in this
        whole document.
- [ ] Copy the **Client ID** and **Client secret**.

## 4 · Connect the two — 5 min

- [ ] Supabase → **Authentication → Sign In / Providers → Google**: enable,
      paste the client ID and secret, Save. The page also shows you the
      callback URL — check it character-for-character against what you pasted
      into Google.
- [ ] Supabase → **Authentication → URL Configuration**:
      - *Site URL*: `http://localhost:5173`
      - *Redirect URLs*: add `http://localhost:5173/**`, and later the
        production domain and `https://*-<your-vercel-team>.vercel.app/**`
        for preview deploys.

      A redirect target not on this list is silently refused. This is the
      "it worked locally" failure.
- [ ] Fill `.env`:

      ```
      VITE_SUPABASE_URL="https://<ref>.supabase.co"
      VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_…"
      ```

- [ ] **Restart `npm run dev`.** Vite reads env at startup, not live. Skipping
      this makes step 5 look like a failure when it is a stale process.

## 5 · Prove it — 10 min

- [ ] The button now reads **Continue with Google** with the Google mark, and
      the demo note under it is gone. If it still says "Look around with sample
      journeys", `.env` did not take — check for a stray `YOUR_` and that you
      restarted.
- [ ] Sign in. Google's consent screen appears once.
- [ ] Supabase → **Table Editor → profiles**: one row, your name and avatar URL.
      That row is the proof the trigger fired — no app code writes it.
- [ ] Avatar chip renders top-right; the menu opens; **Sign out** returns you to
      the card.
- [ ] Sign in again in a fresh incognito window: no consent screen this time,
      and `prompt: select_account` still lets you choose the account.
- [ ] Cancel deliberately: start sign-in, then close Google's account chooser
      with the back button. The app should come back with a sentence explaining
      it, not a silent signed-out screen. (`readRedirectError` in `useAuth.ts`.)
- [ ] Phone on the same network (`npm run dev -- --host`): the button meets its
      44 px target and the card sits clear of the stat bar.

## 6 · When deploying — 5 min, folds into the Vercel task

- [ ] Vercel → Environment Variables: the same two `VITE_` values, for
      Production **and** Preview.
- [ ] Add the production domain to *both* allowlists — Google's JavaScript
      origins and Supabase's redirect URLs.
- [ ] Test one preview-deploy sign-in. Previews have a different origin, which
      is exactly what the wildcard redirect entry is for.

---

## Failure modes, pre-diagnosed

| Symptom | Cause |
| --- | --- |
| Google says `redirect_uri_mismatch` | The URI in Google Cloud is not exactly `https://<ref>.supabase.co/auth/v1/callback` — usually your app's URL was pasted instead |
| Returns to the app, still signed out, no message | Your app's URL is missing from Supabase's Redirect URLs (step 4) |
| Returns with a sentence about no session | Working as intended — read the sentence; it carries Google's own reason |
| `provider is not enabled` | Google toggle off in Supabase, or saved without the secret |
| "This app isn't verified" | Audience is in Testing and that account is not a test user |
| Sign-in succeeds but `profiles` is empty | `auth.sql` was never run, or run before `schema.sql` |
| Avatar broken, name fine | Googleusercontent blocks hotlinked images without `referrerPolicy="no-referrer"` — already set in `UserMenu.tsx` |
| Button still offers the demo | Dev server not restarted, or a `YOUR_` left in `.env` |
| Works in dev, dead on Vercel | Env vars unset in Vercel, or the prod origin missing from step 6 |

## Two notes for later

- **Bundle**: `@supabase/supabase-js` moved the build from 81 → 137 kB gzipped.
  Acceptable; if it ever matters, lazy-load the client behind the first auth
  interaction.
- **The next step after this** is the journeys data layer — `useJourneys()` and
  `useAddJourney()` behind one repository interface, with the demo mode above
  backed by localStorage and live mode by Supabase. Roadmap Phase 4, item 4.
  Auth was the gate; that is the door.

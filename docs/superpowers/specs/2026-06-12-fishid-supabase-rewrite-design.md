# FishID Rewrite: Single Next.js App on Supabase

**Date:** 2026-06-12
**Status:** Approved design, pending implementation plan

## 1. Overview

FishID is a fish-species identification webapp (photo upload → Fishial AI → species result + AI-generated facts). Today it is a Flask API on Render + a Next.js frontend on Vercel, with three SQLite databases on Render's ephemeral disk. This rewrite collapses it into **one Next.js app on Vercel backed by one Supabase project**, fixes the broken/fake features, and hardens security. The goal is a clean, reliably working portfolio piece.

### Decisions already made

- **Architecture option A**: kill the Flask/Render backend entirely. All Python is deleted.
- **Supabase project**: repurpose the existing inactive "FreemanAI" project (ref `kxfqueaufrqitztwneks`, us-east-2) — restore and rename to `fishid`.
- **v1 features beyond the migration**: top-3 candidate species with confidence bars, Google sign-in, mobile camera capture (`<input capture="environment">`), streaming AI descriptions.
- **Keep Fishial** as the identification engine and **keep Groq** (free tier) for generated content, with the fixes in §6–7.
- **Stay on Next.js 14.2.16** for this rewrite; a framework upgrade is a separate later task.

### Why now (what is currently broken)

- Render's ephemeral disk wipes `users.db`/`species.db`/`fish_cache_final.db` on every deploy — registered users are silently deleted.
- The Groq model (`llama3-70b-8192`) is decommissioned; generation silently returns `""`.
- The FishBase API (`fishbase.ropensci.org`) is shut down; that enrichment source returns nothing.
- The fish log — the headline persistent feature — is mock data (`/api/fish/history`) and a no-op (`/api/fish/save`).
- `users.db` (test account only), `species.db`, the 1.3 MB cache db, `.pyc` files, and 123 files of `fishid-landing/.next/` build output are committed to git.

## 2. Target architecture

```
Browser ──> Next.js app (Vercel, repo root)
              ├─ supabase-js (client): auth, fish log CRUD, species reads — under RLS
              ├─ POST /api/identify ──> Fishial API (server-side keys)
              └─ GET  /api/enrich/[species] ──> Groq (streamed) + Wikipedia
                                            └─ enrichment_cache (Postgres)
            Supabase (project "fishid")
              ├─ Auth: email/password + Google OAuth, cookie sessions via @supabase/ssr
              ├─ Postgres: profiles, species, identifications, enrichment_cache
              └─ Storage: private "fish-photos" bucket
```

- The Next.js app is **promoted to the repo root** (`fishid-landing/` goes away; Vercel root-directory setting updated to match).
- Only two server endpoints remain; everything else is direct client ↔ Supabase under RLS.
- Image resize + EXIF stripping happens **client-side** (canvas re-encode to JPEG ≤1024px before upload). This shrinks payloads, removes the Pillow dependency, and guarantees GPS metadata never leaves the device.
- Rate limiting is Postgres-based: the identify handler records each call in a server-only `identify_events` table and counts the user's events in the last minute (limit ~10/min). No Redis.

## 3. Data model

```sql
-- profiles: created by trigger on auth.users insert
profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  fish_icon text not null default '/images/fish-icons/001-gold-fish.png',
  created_at timestamptz not null default now()
)
-- RLS: owner select/update; trigger handles insert.

-- species: migrated from species.db (same columns)
species (
  id text primary key,
  scientific_name text not null,
  common_name text not null,
  image_url text, habitat text, location text, size text,
  iucn_status text, description text,
  created_at timestamptz not null default now()
)
-- RLS: public (anon) select only. Managed via Supabase dashboard
-- (replaces species_editor.py).

-- identifications: the real fish log
identifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scientific_name text not null,
  common_name text,
  confidence numeric,                  -- top candidate's score, 0–100
  candidates jsonb not null,           -- ranked top-3: [{name, common_name, accuracy}]
  photo_path text,                     -- Storage object path
  notes text,
  created_at timestamptz not null default now()
)
-- RLS: auth.uid() = user_id for select/insert/update/delete.

-- identify_events: rate limiting (rows are written on every identify
-- call, whether or not the user saves the result to their log)
identify_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
)
-- No client access (RLS enabled, no policies); the identify handler
-- inserts and counts via the service-role key.

-- enrichment_cache: replaces fish_cache_final.db (shelve)
enrichment_cache (
  scientific_name text primary key,
  data jsonb not null,                 -- {description, visual_cues, fun_fact, wiki, image_url}
  updated_at timestamptz not null default now()
)
-- No client access (RLS enabled, no policies). Server uses service-role key.
-- No TTL: species facts don't go stale; bust manually by deleting rows.
```

**Storage**: private bucket `fish-photos`, object paths `{user_id}/{identification_id}.jpg`. Policies: owner-only read/write keyed on the path's first segment. Display via supabase-js (RLS-scoped) — no public URLs.

## 4. Auth

- `@supabase/ssr` with httpOnly cookie sessions; Next.js middleware refreshes sessions.
- Email/password + Google OAuth. Supabase provides email verification, password reset, lockout, and session revocation — replacing `auth_system.py` (~375 lines) and the fake logout.
- The existing auth modal is rewritten to call supabase-js; the auth context drops its 5-minute keep-alive polling (that existed to keep Render warm) and localStorage token handling.
- Route handlers authenticate with `supabase.auth.getUser()` (server-validated), never by trusting decoded claims.
- `fish_icon` selection moves to a `profiles` update via supabase-js (replaces `/api/auth/update-icon`).

## 5. Identification flow

1. Client: file picked via upload zone or camera (`<input accept="image/*" capture="environment">`); canvas re-encode to JPEG ≤1024px (strips EXIF, including GPS).
2. `POST /api/identify` (multipart). Handler: verify session → rate-limit check → server-side validation (type, ≤10 MB) → Fishial.
3. **Fishial client (TypeScript port of `fishid_client.py`)**: token from `api-users.fishial.ai/v1/auth/token`, cached in module scope with expiry, refresh on 401; then the upload + recognition flow.
4. **Use the full response**: Fishial returns every detected fish with a ranked candidate list. The handler returns the top-3 candidates (name, common name, accuracy) for the most confident fish, plus a count of other detected fish ("2 other fish detected" — tap-to-select is deferred).
5. Results page renders top-3 with confidence bars immediately; enrichment streams in separately (§6).
6. "Save to log": upload the (already-stripped) photo to Storage, insert an `identifications` row with the candidates jsonb — both direct from the client under RLS.
7. Honest failures: "no fish detected" is a distinct, friendly response, not a 500.

## 6. Enrichment (Groq + Wikipedia)

- `GET /api/enrich/[species]`: cache hit in `enrichment_cache` → return JSON immediately. Miss → fetch Wikipedia summary, then **one** Groq completion (model `llama-3.3-70b-versatile`) producing description + 3 visual cues + fun fact in a single structured output, **streamed** to the client via the Vercel AI SDK; on completion, write the parsed result to `enrichment_cache`.
- This replaces three sequential Groq calls per species, the dead model, the `_clean_visual_cues` regex-repair hack, and the 24 h shelve TTL.
- Dead FishBase integration is dropped. `fish_fallback_data.py` is dropped: on Groq failure, log server-side and show the Wikipedia summary plus an explicit "AI facts unavailable" state — never silently pass off canned text as generated.

## 7. Security requirements

1. **Sessions**: httpOnly cookies only; nothing auth-related in localStorage.
2. **RLS on every table and the Storage bucket** (as in §3). Service-role key only as a server env var, never `NEXT_PUBLIC_*`.
3. **Secrets fail loudly**: required env vars (`FISHIAL_CLIENT_ID`, `FISHIAL_SECRET`, `GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are validated at startup; no default fallbacks anywhere. (The old `.env` was never committed, so key rotation is optional.)
4. **Input validation**: zod on request bodies; server-side upload cap ~10 MB + content-type check (fixes the unbounded-body hole).
5. **Error hygiene**: generic client-facing messages; details only in server logs. No `details: str(e)` equivalents.
6. **Rate limiting** on identify (~10/min/user, Postgres-counted) and enrichment.
7. **Security headers** via `next.config`: CSP, `X-Frame-Options: DENY`, `Referrer-Policy`, `X-Content-Type-Options`.
8. **Supabase hardening**: enable leaked-password protection and auth rate limits; run Supabase security advisors (`get_advisors`) post-migration and fix all findings.
9. **Git history rewrite** (`git filter-repo`) to purge committed databases, `.next/`, and `.pyc` files; force-push to GitHub.
10. **CI + Dependabot** (§10) keep typecheck/lint/build green and dependencies monitored.
11. **EXIF GPS stripping** client-side before any upload (§2).

Eliminated by construction (no per-item fix needed): CORS entirely (single origin), JWT-in-localStorage, user enumeration on register, account-lockout DoS, fake logout, secrets-with-fallbacks, the contradictory `after_request` CORS hook.

## 8. Migration phases

Each phase lands as its own commit(s) on a working app.

**Phase 1 — Repo hygiene.**
Delete `fishid-landing-species-list/`, all Python (`app.py`, `auth_system.py`, `fishid_client.py`, `fishid_logic.py`, `fish_meta/`, `fish_fallback_data.py`, `create_species_db.py`, `create_better_species_db.py`, `species_editor.py`, `get_iucn*.py`), one-off data files (`gobii_data.*`, `fish_with_status.xlsx`), `requirements.txt`, `Procfile`, the SQLite dbs (after exporting `species.db` rows to a seed file for Phase 2), and the empty `lib 2/`. Fix `.gitignore` (unanchored `.next/`, db patterns). Promote the Next.js app to repo root. `git filter-repo` to purge dbs/`.next/`/`.pyc` from history; force-push. Update the Vercel root-directory setting.
*Done when:* repo contains only the Next.js app + docs; clone + `pnpm install && pnpm build` works; history contains no db/build blobs.

**Phase 2 — Supabase foundation.**
Restore and rename the FreemanAI project. Migrations for the §3 schema, RLS policies, profile-creation trigger, `fish-photos` bucket + policies. Seed `species` from the exported `species.db` data. Configure auth (email/password, Google OAuth, leaked-password protection, rate limits).
*Done when:* schema + policies live; species data queryable; a test signup creates a profile row.

**Phase 3 — Auth swap.**
`@supabase/ssr` client/server/middleware setup; rewrite auth modal, auth context, and fish-icon selector against Supabase; remove localStorage token code, keep-alive polling, `backend-status.tsx`, and all `/api/auth/*` usage from `lib/api.ts`.
*Done when:* register/login/logout/Google/icon-change all work against Supabase; no references to the Flask auth endpoints remain.

**Phase 4 — Backend collapse.**
Implement `/api/identify` (TypeScript Fishial client, §5) and `/api/enrich/[species]` (§6). Client-side resize/EXIF strip. Results page: top-3 confidence bars + streamed enrichment. Delete remaining Flask-API usage; point the species-list page at supabase-js. Decommission the Render service.
*Done when:* full identify flow works end-to-end on Vercel with Render switched off.

**Phase 5 — Real fish log.**
Save-to-log (Storage upload + `identifications` insert); fish-log page lists the user's identifications with photos, candidates, dates; delete-from-log. Remove the "coming soon" placeholder and the mock-history code path.
*Done when:* a saved identification survives a redeploy and renders with its photo.

**Phase 6 — Polish + audit.**
Re-enable TypeScript/ESLint in builds and fix what surfaces; strip/gate console.logs; extract shared header/footer into the layout; dedupe status-color helpers; prune unused shadcn components (~43); fix species pagination (hardcoded 5 pages) and the fish-log email typo; remove `v0.dev` metadata; security headers; CI (GitHub Actions: typecheck, lint, build, tests) + Dependabot; run Supabase security advisors and fix findings; rewrite README (current architecture + diagram).
*Done when:* CI green with strict builds; advisors clean; README matches reality.

## 9. Deletions summary

All Python and the Render deployment; `fishid-landing-species-list/`; three SQLite dbs (data migrated where it matters: species rows → Postgres); `fish_fallback_data.py` canned text; FishBase integration; CORS configuration; custom JWT system; keep-alive/backend-status machinery; `healthApi.testAllEndpoints()` (creates real test users); ~43 unused shadcn components.

## 10. Testing & CI

- **CI (GitHub Actions)**: typecheck, lint, build on every push/PR — with `ignoreBuildErrors`/`ignoreDuringBuilds` removed.
- **Unit tests** for the two route handlers with Fishial/Groq mocked: auth required, rate limit enforced, size/type validation, top-3 extraction from a recorded Fishial response, cache hit/miss behavior, no-fish-detected path.
- **Smoke test** (Playwright): sign in → upload fixture image (mocked identify response) → results render → save to log → appears in fish log.
- **Manual verification per phase** per the *Done when* criteria, plus Supabase advisors in Phase 6.

## 11. Out of scope (deferred)

PWA/offline upload queue; multi-fish tap-to-select bounding boxes; dive/session grouping with map view; IUCN badge port from the dive-log project; self-hosted model inference; Next.js 15+ upgrade; Sentry. Each is a candidate follow-up once v1 ships.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

FishID — AI fish species identification. A single Next.js 14 (App Router) app deployed on Vercel, backed by Supabase project `fishid` (ref `kxfqueaufrqitztwneks`): Auth (email + Google, cookie sessions via `@supabase/ssr`), Postgres, and Storage. The 2026-06 rewrite spec lives at `docs/superpowers/specs/2026-06-12-fishid-supabase-rewrite-design.md`.

## Commands

```bash
pnpm dev          # localhost:3000
pnpm typecheck    # tsc --noEmit (enforced in builds)
pnpm lint         # next/core-web-vitals (enforced in builds)
pnpm test         # vitest unit tests in tests/
pnpm build
```

Required env in `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `FISHIAL_CLIENT_ID`, `FISHIAL_SECRET`, `GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Server modules validate env at import and throw if missing.

## Architecture

- **Server routes (the only two):** `app/api/identify/route.ts` (auth via `supabase.auth.getUser()`, 10/min rate limit counted in `identify_events` via the service-role client, Fishial proxy in `lib/server/fishial.ts` returning top-3 candidates per fish) and `app/api/enrich/[species]/` (`route.ts` = cache-or-Wikipedia JSON; `stream/route.ts` = one Groq `llama-3.3-70b-versatile` completion streamed via the AI SDK, cached into `enrichment_cache` on finish).
- **Everything else is client ↔ Supabase under RLS:** `lib/species.ts` (catalog with the `location→distribution/region`, `size→max_length_cm` column mapping), `lib/fish-log.ts` (save/fetch/delete; photos at `{user_id}/{id}.jpg` in the private `fish-photos` bucket, displayed via signed URLs), `lib/auth-context.tsx` (keeps user-object identity stable across Supabase's focus-triggered auth events — don't "simplify" that; consumers key effects on `[user]`).
- **Images:** `lib/image-prep.ts` canvas re-encode (≤1024px JPEG) strips EXIF/GPS client-side before upload; the prepared image is also what's stored in localStorage for the results page and saved to Storage.
- Shared chrome lives in `components/site-header.tsx` / `site-footer.tsx`; pages own their `AuthModal` state and pass `onLoginClick` down.
- Schema + RLS in `supabase/migrations/` (mirrors of what was applied via MCP); never hand-edit the database without adding a migration mirror. `identify_events` and `enrichment_cache` are intentionally RLS-on/no-policy (server-only via service role) — the security advisor INFOs about them are expected.

## Gotchas

- Never run `pnpm build` while `pnpm dev` is running — the build clobbers `.next` under the dev server.
- `next.config.mjs` sets `watchOptions.ignored` — if you edit it, keep `**/.next/**` in the list or the dev watcher loops forever.
- Supabase rejects `@example.com` signups; for test users use the admin REST API with `email_confirm: true` (the public mailer rate-limits at a few emails/hour).
- The identify/enrich routes are login-gated; curl them without cookies and you get 401 by design.

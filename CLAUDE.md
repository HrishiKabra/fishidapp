# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

FishID — AI fish species identification. A single Next.js 14 app (repo root) deployed on Vercel, backed by Supabase (auth, Postgres, Storage). **Mid-migration**: the old Flask/Render backend has been deleted; the frontend is being rewired per the approved design spec at `docs/superpowers/specs/2026-06-12-fishid-supabase-rewrite-design.md` — read that spec before making architectural changes. Current progress lives in `docs/superpowers/plans/`.

## Commands

```bash
pnpm install
pnpm dev          # localhost:3000
pnpm build
pnpm lint
```

`.env.local` (gitignored): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; server-only secrets (`FISHIAL_CLIENT_ID`, `FISHIAL_SECRET`, `GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are added as the route handlers land.

## Architecture

- Supabase project: `fishid` (ref `kxfqueaufrqitztwneks`). Schema + RLS in `supabase/migrations/`; species seed in `supabase/seed/`.
- Client talks to Supabase directly (supabase-js under RLS) for auth, fish log, species. Only two server endpoints exist/are planned: `POST /api/identify` (Fishial proxy) and `GET /api/enrich/[species]` (streamed Groq + cache).
- UI is shadcn/ui (`components/ui/`); all legacy backend calls are concentrated in `lib/api.ts` and are being replaced phase by phase.

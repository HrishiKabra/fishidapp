# FishID Phases 1–2: Repo Hygiene + Supabase Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip the repo to a clean root-level Next.js app with purged git history, and stand up the Supabase project (schema, RLS, storage, seed data) ready for the auth swap.

**Architecture:** Phase 1 deletes all Python/dead files, promotes `fishid-landing/` to the repo root, and rewrites git history to purge committed databases and build output. Phase 2 restores the inactive "FreemanAI" Supabase project (ref `kxfqueaufrqitztwneks`) and applies the schema from the design spec (`docs/superpowers/specs/2026-06-12-fishid-supabase-rewrite-design.md` §3) via the Supabase MCP tools, with migrations mirrored into the repo.

**Tech Stack:** git filter-repo, sqlite3 CLI, pnpm, Supabase MCP (`apply_migration`, `execute_sql`, `restore_project`, `get_project_url`, `get_publishable_keys`, `get_advisors`).

**Context for workers:**
- Working directory / repo root: `/Users/hrishikabra/Desktop/Tulane/Projects/fishidapp`
- Git remote: `https://github.com/hrishikabra/fishidapp.git` (filter-repo removes remotes; it must be re-added)
- Supabase is connected via MCP; tool names are `mcp__claude_ai_Supabase__*`. Load schemas with ToolSearch first.
- The working tree is dirty at start (modified `fish_cache_final.db`, untracked one-off scripts). All of it is deleted or committed by Task 3 — do not try to preserve it.
- This is infra/migration work with no app code, so verification steps (build passes, SQL row counts, curl responses) stand in for TDD.

---

## Phase 1 — Repo hygiene

### Task 1: Export species seed data (BEFORE anything is deleted)

**Files:**
- Create: `supabase/seed/species_rows.sql`

- [ ] **Step 1: Export the 21 species rows as INSERT statements**

```bash
mkdir -p supabase/seed
sqlite3 species.db -cmd ".mode insert species" \
  "select id, scientific_name, common_name, image_url, habitat, location, size, iucn_status, description, created_at from species;" \
  > supabase/seed/species_rows.sql
```

The explicit column list matches the Postgres table's column order defined in Task 11, so the positional `INSERT INTO species VALUES(...)` statements apply cleanly.

- [ ] **Step 2: Verify 21 INSERT statements**

Run: `grep -c "INSERT INTO species" supabase/seed/species_rows.sql`
Expected: `21`

- [ ] **Step 3: Commit**

```bash
git add supabase/seed/species_rows.sql
git commit -m "Export species rows from SQLite for Supabase seed"
```

### Task 2: Untrack build output and fix .gitignore

**Files:**
- Modify: `.gitignore` (full replacement)

- [ ] **Step 1: Remove tracked `.next/` build output from the index (keep on disk is irrelevant — it's regenerated)**

```bash
git rm -r --cached -q fishid-landing/.next
git rm -r --cached -q fish_meta/__pycache__
```

- [ ] **Step 2: Replace `.gitignore` with the Next.js-app version** (unanchored patterns so they apply at any depth; Python section dies with the Python):

```gitignore
# dependencies
node_modules/

# next.js
.next/
out/
build/

# env files
.env*
!.env.example

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# databases & caches (never commit again)
*.db
*.sqlite

# misc
.DS_Store
*.pem
npm-debug.log*
*.log
```

- [ ] **Step 3: Verify nothing under `.next/` or `__pycache__` is tracked**

Run: `git ls-files | grep -cE "\.next/|__pycache__|\.pyc" || echo CLEAN`
Expected: `CLEAN`

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "Untrack build output and bytecode; replace .gitignore"
```

(The `git rm --cached` calls in Step 1 already staged the deletions; do NOT `git add` the now-ignored paths — git refuses to add ignored files.)

### Task 3: Delete dead code and data files

**Files:**
- Delete: all Python, the duplicate frontend, SQLite dbs, one-off data files
- Create: `docs/fish-icons-license.html` (moved — the icon pack's attribution requirement survives)

- [ ] **Step 1: Preserve the icon-pack license, then delete tracked dead files**

```bash
git mv fish_icons/license/license.html docs/fish-icons-license.html
git rm -r -q fishid-landing-species-list fish_meta fish_icons
git rm -q app.py auth_system.py fishid_client.py fishid_logic.py \
  fish_fallback_data.py create_species_db.py create_better_species_db.py \
  species_editor.py requirements.txt Procfile
git rm -q -f users.db species.db fish_cache_final.db
```

(`-f` on the dbs because `fish_cache_final.db` has unstaged modifications.)

- [ ] **Step 2: Delete untracked clutter**

```bash
rm -f get_iucn.py get_iucn_gobii.py gobii_data.json gobii_data.xlsx \
  fish_with_status.xlsx .DS_Store
rm -rf __pycache__ "fishid-landing/lib 2"
```

- [ ] **Step 3: Verify no Python or db files remain**

Run: `ls *.py *.db 2>/dev/null || echo CLEAN`
Expected: `CLEAN`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Delete Flask backend, duplicate frontend, SQLite dbs, and one-off scripts"
```

### Task 4: Promote the Next.js app to the repo root

**Files:**
- Move: everything in `fishid-landing/` → repo root

- [ ] **Step 1: Move tracked app files to root**

```bash
for f in app components components.json hooks lib next.config.mjs \
  package.json pnpm-lock.yaml postcss.config.mjs public styles \
  tailwind.config.ts tsconfig.json; do
  git mv "fishid-landing/$f" "$f"
done
```

- [ ] **Step 2: Move/remove the untracked leftovers and the now-empty dir**

```bash
mv fishid-landing/node_modules node_modules 2>/dev/null || true
rm -rf fishid-landing/.next fishid-landing/next-env.d.ts fishid-landing/.DS_Store
rmdir fishid-landing
```

- [ ] **Step 3: Verify the move**

Run: `test -f package.json && test -d app && ! test -d fishid-landing && echo OK`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Promote Next.js app from fishid-landing/ to repo root"
```

### Task 5: Verify the app builds from the root

- [ ] **Step 1: Install and build**

Run: `pnpm install && pnpm build`
Expected: build completes (warnings fine; TS/ESLint are still set to ignore errors — that's removed in Phase 6). If `pnpm` is missing: `corepack enable pnpm`.

- [ ] **Step 2: Smoke-run dev server**

Run: `pnpm dev` in background, then `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`
Expected: `200`. Kill the dev server afterwards. (The UI will still point at the dead Render API — that's expected until Phases 3–4; we're only verifying the app serves.)

### Task 6: Replace CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` (full replacement — the current one describes the deleted Flask architecture)

- [ ] **Step 1: Write the new CLAUDE.md**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "Update CLAUDE.md for post-Flask architecture"
```

### Task 7: Purge history with git filter-repo and force-push

⚠️ Destructive (rewrites all commit hashes; force-push). Already approved in the design spec. Any other clones of this repo become stale.

- [ ] **Step 1: Install filter-repo and take a backup**

```bash
brew install git-filter-repo
git clone --mirror . ../fishidapp-backup.git
```

- [ ] **Step 2: Verify the working tree is clean**

Run: `git status --porcelain | grep -v '^??' || echo CLEAN`
Expected: `CLEAN` (untracked-only is fine)

- [ ] **Step 3: Rewrite history** (purges the dbs, all `.next/` blobs, bytecode, the duplicate frontend, and one-off data files from every commit):

```bash
git filter-repo --force --invert-paths \
  --path users.db --path species.db --path fish_cache_final.db \
  --path fishid-landing/.next \
  --path fishid-landing-species-list \
  --path fish_meta/__pycache__ \
  --path-glob '*.pyc' \
  --path-glob '*.xlsx' \
  --path gobii_data.json
```

- [ ] **Step 4: Verify shrink and intact HEAD**

Run: `git count-objects -vH | grep size-pack && git log --oneline -3 && pnpm build`
Expected: size-pack far below the prior 77.87 MiB (likely <10 MiB); recent commits present; build still passes.

- [ ] **Step 5: Re-add origin and force-push**

```bash
git remote add origin https://github.com/hrishikabra/fishidapp.git
git push --force origin main
```

Expected: push succeeds. GitHub's language stats stop showing "RouterOS Script" once it reindexes.

### Task 8: USER ACTIONS (manual, dashboard-only — cannot be done by an agent)

- [ ] In **Vercel project settings → Build & Development → Root Directory**: change `fishid-landing` → empty (repo root). Until this is done the next Vercel deploy fails — do it right after Task 7's push.
- [ ] (Cosmetic, anytime) In **Supabase dashboard → project settings**: rename "FreemanAI" → "fishid".

---

## Phase 2 — Supabase foundation

### Task 9: Restore the Supabase project

- [ ] **Step 1: Restore** — call MCP `mcp__claude_ai_Supabase__restore_project` with `{"project_id": "kxfqueaufrqitztwneks"}` (load the tool schema via ToolSearch first; if the tool requires a cost confirmation, call `confirm_cost` as instructed by its error message — restoring a free-tier project is $0).

- [ ] **Step 2: Poll until healthy** — call `mcp__claude_ai_Supabase__get_project` with the same id every ~30s until `status` is `ACTIVE_HEALTHY`.

### Task 10: Clear leftover schema from the project's previous life

- [ ] **Step 1: Inspect** — call `mcp__claude_ai_Supabase__list_tables` with `{"project_id": "kxfqueaufrqitztwneks", "schemas": ["public"]}`.

- [ ] **Step 2: Drop whatever it returns.** For each table found, run via `mcp__claude_ai_Supabase__execute_sql`:

```sql
drop table if exists public.<table_name> cascade;
```

If Step 1 returned no tables, skip. Do NOT touch the `auth` or `storage` schemas.

- [ ] **Step 3: Verify** — `list_tables` again. Expected: empty for `public`.

### Task 11: Apply the init-schema migration

- [ ] **Step 1: Apply via MCP** — call `mcp__claude_ai_Supabase__apply_migration` with `project_id: "kxfqueaufrqitztwneks"`, `name: "init_schema"`, and this exact SQL:

```sql
-- profiles: one row per auth user, created by trigger
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  fish_icon text not null default '/images/fish-icons/001-gold-fish.png',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, fish_icon)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'fish_icon', '/images/fish-icons/001-gold-fish.png')
  );
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- species: public catalog (column order must match supabase/seed/species_rows.sql)
create table public.species (
  id text primary key,
  scientific_name text not null,
  common_name text not null,
  image_url text,
  habitat text,
  location text,
  size text,
  iucn_status text,
  description text,
  created_at timestamptz not null default now()
);
alter table public.species enable row level security;
create policy "species_public_read" on public.species
  for select to anon, authenticated using (true);

-- identifications: the fish log
create table public.identifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scientific_name text not null,
  common_name text,
  confidence numeric,
  candidates jsonb not null,
  photo_path text,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.identifications enable row level security;
create policy "identifications_own" on public.identifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index identifications_user_created_idx
  on public.identifications (user_id, created_at desc);

-- identify_events: server-only rate limiting (RLS on, no policies)
create table public.identify_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.identify_events enable row level security;
create index identify_events_user_created_idx
  on public.identify_events (user_id, created_at desc);

-- enrichment_cache: server-only (RLS on, no policies)
create table public.enrichment_cache (
  scientific_name text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.enrichment_cache enable row level security;
```

- [ ] **Step 2: Verify** — `list_tables` for `public`. Expected: `profiles`, `species`, `identifications`, `identify_events`, `enrichment_cache`, all with `rls_enabled: true`.

### Task 12: Apply the storage migration

- [ ] **Step 1: Apply via MCP** — `apply_migration` with `name: "fish_photos_bucket"` and this exact SQL:

```sql
insert into storage.buckets (id, name, public)
values ('fish-photos', 'fish-photos', false);

create policy "fish_photos_select_own" on storage.objects
  for select using (
    bucket_id = 'fish-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "fish_photos_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'fish-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "fish_photos_delete_own" on storage.objects
  for delete using (
    bucket_id = 'fish-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

- [ ] **Step 2: Verify** — `execute_sql`: `select id, public from storage.buckets;`
Expected: one row, `fish-photos`, `public = false`.

### Task 13: Mirror migrations into the repo

**Files:**
- Create: `supabase/migrations/20260612000001_init_schema.sql` (exact SQL from Task 11)
- Create: `supabase/migrations/20260612000002_fish_photos_bucket.sql` (exact SQL from Task 12)

- [ ] **Step 1: Write both files** with the exact SQL applied in Tasks 11–12.

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations
git commit -m "Mirror Supabase schema and storage migrations into repo"
git push origin main
```

### Task 14: Seed species data

- [ ] **Step 1: Apply** — read `supabase/seed/species_rows.sql` and run its contents via `execute_sql` (single call; it's 21 INSERT statements).

- [ ] **Step 2: Verify** — `execute_sql`: `select count(*) from public.species;`
Expected: `21`

### Task 15: Verify signup → profile trigger end-to-end

- [ ] **Step 1: Get connection details** — MCP `get_project_url` and `get_publishable_keys` for the project. Export as `$SUPABASE_URL` and `$ANON_KEY` for the next step.

- [ ] **Step 2: Sign up a throwaway user via the auth REST API**

```bash
curl -s -X POST "$SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"plan-verify@example.com","password":"Str0ng-Passw0rd-42!"}'
```

Expected: JSON containing a `user` object with an `id` (a session may be absent if email confirmation is on — that's fine; the user row is still created and the trigger still fires).

- [ ] **Step 3: Verify the trigger created a profile** — `execute_sql`:

```sql
select p.username, p.fish_icon from public.profiles p
join auth.users u on u.id = p.id
where u.email = 'plan-verify@example.com';
```

Expected: one row, `username = 'plan-verify'`, default fish icon.

- [ ] **Step 4: Clean up** — `execute_sql`:

```sql
delete from auth.users where email = 'plan-verify@example.com';
```

Then re-run Step 3's query. Expected: zero rows (cascade removed the profile).

### Task 16: Write .env.local

**Files:**
- Create: `.env.local` (gitignored — verify with `git check-ignore .env.local` before writing)

- [ ] **Step 1: Write the file** using the values from Task 15 Step 1:

```bash
NEXT_PUBLIC_SUPABASE_URL=<project url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable/anon key>
```

(Fishial/Groq/service-role keys are added when the route handlers land in Phase 4.)

- [ ] **Step 2: Verify it is NOT staged**

Run: `git status --porcelain | grep .env.local || echo IGNORED`
Expected: `IGNORED`

### Task 17: Baseline security advisors + auth-config notes

- [ ] **Step 1: Run advisors** — MCP `get_advisors` with `{"project_id": "kxfqueaufrqitztwneks", "type": "security"}`. Record findings in the final report. Fix now only findings about the objects created in Tasks 11–12 (e.g., a missing RLS policy); everything else waits for the Phase 6 audit.

- [ ] **Step 2: USER ACTIONS (dashboard, manual)** — note for the user:
  - Supabase dashboard → Auth → Providers: confirm Email is enabled (default on).
  - Auth → Rate limits: review defaults (defaults are acceptable; this is a confirmation, not a change).
  - Auth → Passwords: enable leaked-password protection **if available on the current plan** (it is Pro-tier; if unavailable, skip — noted as accepted risk in the spec's §7.8).
  - Auth → Providers → Google: create an OAuth client in Google Cloud Console (consent screen + OAuth client ID of type "Web application"), set the authorized redirect URI to `<project url>/auth/v1/callback`, then paste the client ID/secret into the Google provider config and enable it. The frontend wiring for the Google button is Phase 3; the provider must exist first. (Spec §8 Phase 2.)

---

## Done criteria (maps to spec §8 Phases 1–2)

- Repo: only the Next.js app + `docs/` + `supabase/` at root; fresh clone + `pnpm install && pnpm build` works; `git count-objects` shows the pack far under 78 MiB; GitHub history contains no `.db`/`.next`/`.pyc` blobs.
- Supabase: 5 tables with RLS + storage bucket live; 21 species rows; signup creates a profile via trigger (verified and cleaned up).
- Vercel root-directory updated (user action) so the site deploys from root.

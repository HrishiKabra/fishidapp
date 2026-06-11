# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

FishID — AI fish species identification. Flask API backend (repo root) + Next.js 14 frontend (`fishid-landing/`). Deployed as Vercel (frontend) + Render (backend, via `Procfile` gunicorn). Live at fishid.vercel.app.

## Commands

Backend (repo root):
```bash
pip install -r requirements.txt
python app.py            # runs on port 5001 (or $PORT)
```

Frontend (uses pnpm — there is a `pnpm-lock.yaml`, no npm/yarn lockfile):
```bash
cd fishid-landing
pnpm install
pnpm dev                 # localhost:3000
pnpm build
pnpm lint
```

There is no test suite.

Required env vars (backend `.env`): `FISHIAL_CLIENT_ID`, `FISHIAL_SECRET` (the app fails at import in `fishid_client.py` without these), `GROQ_API_KEY`, `SECRET_KEY`, `JWT_SECRET_KEY`. Frontend `.env.local`: `NEXT_PUBLIC_FLASK_API_URL` (defaults to `http://localhost:5001` in `fishid-landing/lib/api.ts`).

## Architecture

**Identification flow** (the core path): frontend `lib/api.ts` → `POST /api/fish/identify` in `app.py` → `fishid_client.predict()` (Fishial API: handles OAuth token refresh, image resize to ≤1024px JPEG, upload, recognition) → `fish_meta.get(species)` enrichment (FishBase API + Wikipedia summary + Groq llama3 for visual cues/fun facts, results cached via `shelve` in `fish_cache_final.db`) → `fish_fallback_data.py` provides hardcoded fallbacks when APIs fail.

**Three separate SQLite databases**, all in repo root:
- `users.db` — auth, owned by `auth_system.py` (`AuthSystem` class: bcrypt, 7-day JWTs, login-attempt lockout). All `/api/auth/*` routes delegate to it.
- `species.db` — powers the species-list pages via `/api/species`, `/api/species/<id>`, `/api/species/filters`. `app.py` opens it directly with `sqlite3.connect`. Rebuilt by `create_better_species_db.py` (**drops and recreates the table**); edited interactively with `python species_editor.py`.
- `fish_cache_final.db` — shelve cache of API enrichment results, gitignored by pattern but currently tracked.

**Frontend**: all backend calls go through `fishid-landing/lib/api.ts`. UI is shadcn/ui (Radix + Tailwind) — components live in `components/ui/`. Pages: `app/page.tsx` (upload/identify), `app/results/`, `app/fish-log/`, `app/species-list/`, `app/fish-icon-selector/`.

**Two frontend directories exist**: `fishid-landing/` is the active app (the one in the README and deployed). `fishid-landing-species-list/` is a near-duplicate snapshot from species-list development — don't make changes there.

**Legacy/one-off files**: `fishid_logic.py` (old LandingAI-based detection) is not imported by `app.py`. `get_iucn.py`, `get_iucn_gobii.py`, `gobii_data.*`, `fish_with_status.xlsx` are one-off data-gathering scripts/outputs.

## Gotchas

- CORS in `app.py` is configured twice: the `flask_cors.CORS(...)` call with an origin allowlist, plus a permissive `after_request` hook that adds `Access-Control-Allow-Origin: *`. Be careful editing one without the other.
- API responses follow a `{success: bool, error?: str, ...}` envelope; the frontend's `apiCall` in `lib/api.ts` depends on this shape.
- Registration/login responses include both `username` and `name` keys for frontend compatibility — keep both.

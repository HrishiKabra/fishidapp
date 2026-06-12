# FishID Phase 4: Backend Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dead Flask backend entirely: identification via a Next.js route handler with a TypeScript Fishial client (top-3 candidates), streamed Groq enrichment with a Postgres cache, client-side image resize/EXIF-strip, and the species list reading Supabase directly.

**Architecture:** Two server surfaces remain — `POST /api/identify` (auth + Postgres rate limit + Fishial proxy) and `GET /api/enrich/[species]` (+`/stream`) which serves the cache or streams a single Groq completion and caches it on finish. Everything else (species list) talks to Supabase from the client under RLS. `lib/api.ts` and the old `.env` are deleted at the end.

**Tech Stack:** Vercel AI SDK (`ai` + `@ai-sdk/groq`, model `llama-3.3-70b-versatile`), Fishial REST API, Supabase service-role client (server-only), canvas `createImageBitmap` for client-side image prep.

**Context for workers:**
- Repo root `/Users/hrishikabra/Desktop/Tulane/Projects/fishidapp`. Supabase project ref `kxfqueaufrqitztwneks`; tables from Phase 2 (`identify_events`, `enrichment_cache` are RLS-on/no-policy, server-only via service role).
- The old gitignored `.env` at repo root still holds working `FISHIAL_CLIENT_ID`, `FISHIAL_SECRET`, `GROQ_API_KEY` — copy them into `.env.local`, then delete `.env`.
- The Fishial flow (ported from `git show a02aa555~1:fishid_client.py`): POST `https://api-users.fishial.ai/v1/auth/token` `{client_id, client_secret}` → `access_token` (~10 min); POST `https://api.fishial.ai/v1/recognition/upload` with `{blob: {filename, content_type, byte_size, checksum: <base64 md5>}}` → `signed-id` + `direct-upload.{url, headers.Content-Disposition}`; PUT image bytes to that URL with headers `Content-Disposition`, `Content-Md5`, `Content-Type: ""` (must be empty); GET `https://api.fishial.ai/v1/recognition/image?q=<signed-id>` → `{results: [{species: [{name, accuracy}, ...]}, ...]}` — one result per detected fish, candidates ranked.
- The old Flask species endpoint mapped DB columns → UI fields: `location`→`distribution` and `region`, `size`→`max_length_cm`, `iucn_status`→`conservation_status`. The Supabase swap must keep that mapping (the page's `Species` interface stays unchanged).
- Identify now **requires login** (spec §7.6) — the landing page opens the auth modal for signed-out users instead of calling the API.
- Save-to-log becomes real in Phase 5; this phase stubs the button with a "coming in the next update" message and keeps `candidates` in the stored payload so Phase 5 can insert it.
- Spec §7.4 calls for zod on request bodies; after this phase the only inputs are `FormData` and URL params, validated inline — there are no JSON bodies left to schema-validate. No zod dependency is added (YAGNI).
- No JS test infra yet (arrives Phase 6) — verification is build + curl + scripted browser/SQL, as in Phases 1–3.

---

### Task 1: Environment setup (starts with a USER ACTION)

**Files:**
- Modify: `.env.local`
- Delete: `.env` (after copying)

- [ ] **Step 1: USER ACTION — service-role key.** In Supabase dashboard → Project Settings → API keys, reveal the `service_role` key (or create a new `sb_secret_...` secret key) and paste it to the executor. Everything server-side in this phase needs it.

- [ ] **Step 2: Append the four server vars to `.env.local`** (copy `FISHIAL_CLIENT_ID`, `FISHIAL_SECRET`, `GROQ_API_KEY` values from the old `.env`):

```bash
FISHIAL_CLIENT_ID=<from .env>
FISHIAL_SECRET=<from .env>
GROQ_API_KEY=<from .env>
SUPABASE_SERVICE_ROLE_KEY=<from Step 1>
```

- [ ] **Step 3: Validate the credentials still work** (fail fast — these keys are from July 2025):

```bash
set -a; source .env.local; set +a
curl -s -o /dev/null -w "groq: %{http_code}\n" https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"
curl -s -o /dev/null -w "fishial: %{http_code}\n" -X POST https://api-users.fishial.ai/v1/auth/token -H "Content-Type: application/json" -d "{\"client_id\":\"$FISHIAL_CLIENT_ID\",\"client_secret\":\"$FISHIAL_SECRET\"}"
```

Expected: `groq: 200` and `fishial: 200`. **If either fails, STOP** — the user must mint fresh keys (Groq console / Fishial portal) before continuing.

- [ ] **Step 4: Delete the old `.env`** (its other keys — Flask `SECRET_KEY`, `JWT_SECRET_KEY`, `IUCN_KEY` — are dead):

```bash
rm .env
git check-ignore .env.local && echo IGNORED
```

Expected: `IGNORED`. Nothing to commit (both files are gitignored).

### Task 2: Install the AI SDK

- [ ] **Step 1:** `pnpm add ai @ai-sdk/groq`

- [ ] **Step 2:** Run: `grep -E '"ai"|@ai-sdk' package.json` — both present.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "Add Vercel AI SDK with Groq provider"
```

### Task 3: Server-side Supabase admin client

**Files:**
- Create: `lib/server/supabase-admin.ts`

- [ ] **Step 1: Write the file** (validates env at import — spec §7.3 "fail loudly"):

```ts
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
}

// Server-only client that bypasses RLS. Never import from client components.
export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
```

- [ ] **Step 2: Commit**

```bash
git add lib/server/supabase-admin.ts
git commit -m "Add server-only Supabase admin client"
```

### Task 4: TypeScript Fishial client

**Files:**
- Create: `lib/server/fishial.ts`

- [ ] **Step 1: Write the file:**

```ts
import { createHash } from "crypto"

const AUTH_URL = "https://api-users.fishial.ai/v1/auth/token"
const API_BASE = "https://api.fishial.ai/v1"

const clientId = process.env.FISHIAL_CLIENT_ID
const clientSecret = process.env.FISHIAL_SECRET

if (!clientId || !clientSecret) {
  throw new Error("Missing FISHIAL_CLIENT_ID or FISHIAL_SECRET")
}

export interface FishialCandidate {
  name: string // scientific name
  accuracy: number // 0..1
}

export interface DetectedFish {
  candidates: FishialCandidate[] // ranked, top 3
}

// Token is valid ~10 min; cache per warm serverless instance, refresh 60s early.
let tokenCache = { token: "", expiresAt: 0 }

async function getToken(force = false): Promise<string> {
  if (!force && Date.now() < tokenCache.expiresAt - 60_000) return tokenCache.token
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  })
  if (!res.ok) throw new Error(`Fishial auth failed: ${res.status}`)
  const { access_token } = await res.json()
  tokenCache = { token: access_token, expiresAt: Date.now() + 9 * 60_000 }
  return access_token
}

async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  let token = await getToken()
  let res = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } })
  if (res.status === 401) {
    token = await getToken(true)
    res = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } })
  }
  return res
}

export async function recognizeFish(image: ArrayBuffer): Promise<DetectedFish[]> {
  const bytes = Buffer.from(image)
  const checksum = createHash("md5").update(bytes).digest("base64")

  // a) request a signed upload slot
  const slotRes = await authedFetch(`${API_BASE}/recognition/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      blob: {
        filename: "upload.jpg",
        content_type: "image/jpeg",
        byte_size: bytes.byteLength,
        checksum,
      },
    }),
  })
  if (!slotRes.ok) throw new Error(`Fishial upload-slot failed: ${slotRes.status}`)
  const slot = await slotRes.json()
  const signedId: string = slot["signed-id"]
  const uploadUrl: string = slot["direct-upload"]["url"]
  const contentDisposition: string = slot["direct-upload"]["headers"]["Content-Disposition"]

  // b) PUT the bytes to storage — Content-Type must be the empty string per Fishial docs
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    body: bytes,
    headers: {
      "Content-Disposition": contentDisposition,
      "Content-Md5": checksum,
      "Content-Type": "",
    },
  })
  if (!putRes.ok) throw new Error(`Fishial image upload failed: ${putRes.status}`)

  // c) recognition
  const recRes = await authedFetch(`${API_BASE}/recognition/image?q=${encodeURIComponent(signedId)}`)
  if (!recRes.ok) throw new Error(`Fishial recognition failed: ${recRes.status}`)
  const { results } = await recRes.json()

  return (results ?? [])
    .map((fish: any) => ({
      candidates: (fish.species ?? [])
        .slice(0, 3)
        .map((s: any) => ({ name: s.name as string, accuracy: Number(s.accuracy) })),
    }))
    .filter((f: DetectedFish) => f.candidates.length > 0)
}
```

- [ ] **Step 2: Live smoke test the port before wiring it into a route** (uses a real fish photo and the real API — catches header/format issues now, not in the browser):

```bash
curl -s -o /tmp/test-fish.jpg "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Clown_anemonefish_%28Amphiprion_percula%29.jpg/640px-Clown_anemonefish_%28Amphiprion_percula%29.jpg"
set -a; source .env.local; set +a
npx tsx -e "
import { readFileSync } from 'fs'
import { recognizeFish } from './lib/server/fishial'
const buf = readFileSync('/tmp/test-fish.jpg')
recognizeFish(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)).then(r => console.log(JSON.stringify(r, null, 2)))
"
```

Expected: JSON with at least one fish whose top candidate is an *Amphiprion* species with accuracy > 0.5. If the PUT step returns 403, retry once with the `Content-Type` header line removed from the PUT — some fetch implementations drop empty headers; whichever variant succeeds is the one to keep.

- [ ] **Step 3: Commit**

```bash
git add lib/server/fishial.ts
git commit -m "Port Fishial client to TypeScript with top-3 candidates"
```

### Task 5: POST /api/identify

**Files:**
- Create: `app/api/identify/route.ts`

- [ ] **Step 1: Write the route:**

```ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/server/supabase-admin"
import { recognizeFish } from "@/lib/server/fishial"

const MAX_BYTES = 10 * 1024 * 1024
const RATE_LIMIT_PER_MINUTE = 10

export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { success: false, error: "auth_required", message: "Please sign in to identify fish." },
      { status: 401 },
    )
  }

  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString()
  const { count } = await supabaseAdmin
    .from("identify_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", oneMinuteAgo)
  if ((count ?? 0) >= RATE_LIMIT_PER_MINUTE) {
    return NextResponse.json(
      { success: false, error: "rate_limited", message: "Too many identifications — try again in a minute." },
      { status: 429 },
    )
  }

  const form = await request.formData().catch(() => null)
  const image = form?.get("image")
  if (!(image instanceof File)) {
    return NextResponse.json(
      { success: false, error: "bad_request", message: "No image provided." },
      { status: 400 },
    )
  }
  if (image.size > MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: "bad_request", message: "Image too large (max 10 MB)." },
      { status: 400 },
    )
  }
  if (!image.type.startsWith("image/")) {
    return NextResponse.json(
      { success: false, error: "bad_request", message: "Unsupported file type." },
      { status: 400 },
    )
  }

  await supabaseAdmin.from("identify_events").insert({ user_id: user.id })

  let fish
  try {
    fish = await recognizeFish(await image.arrayBuffer())
  } catch (err) {
    console.error("Fishial error:", err)
    return NextResponse.json(
      { success: false, error: "upstream", message: "The identification service is unavailable. Please try again." },
      { status: 502 },
    )
  }

  if (fish.length === 0) {
    return NextResponse.json(
      { success: false, error: "no_fish", message: "No fish detected in this photo — try a clearer shot." },
      { status: 422 },
    )
  }

  const best = fish.reduce((a, b) => (b.candidates[0].accuracy > a.candidates[0].accuracy ? b : a))
  return NextResponse.json({
    success: true,
    result: { candidates: best.candidates, otherFishCount: fish.length - 1 },
  })
}
```

- [ ] **Step 2: Verify auth gate** — `pnpm dev` in background, then:

Run: `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/identify`
Expected: `401`

- [ ] **Step 3: Build + commit**

```bash
pnpm build
git add app/api/identify/route.ts
git commit -m "Add authenticated, rate-limited /api/identify route"
```

### Task 6: Client image prep + landing-page rewire

**Files:**
- Create: `lib/image-prep.ts`
- Modify: `app/page.tsx` (imports + `handleIdentifyClick`)

- [ ] **Step 1: Write `lib/image-prep.ts`** (resize ≤1024px, JPEG re-encode — strips ALL EXIF including GPS; `imageOrientation: "from-image"` bakes rotation in first so photos don't end up sideways):

```ts
const MAX_DIM = 1024
const JPEG_QUALITY = 0.85

export async function prepareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Could not process image")
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not process image"))),
      "image/jpeg",
      JPEG_QUALITY,
    ),
  )
}
```

- [ ] **Step 2: In `app/page.tsx`, replace the import** `import { fishApi, ApiError } from "@/lib/api"` with:

```ts
import { prepareImage } from "@/lib/image-prep"
```

- [ ] **Step 3: Replace the whole `handleIdentifyClick` function with:**

```ts
  const handleIdentifyClick = async () => {
    if (!uploadResult?.success || !uploadResult?.file) {
      setShowWarning(true)
      setTimeout(() => setShowWarning(false), 3000)
      return
    }

    if (!user) {
      setShowAuthModal(true)
      return
    }

    setIsIdentifying(true)
    setShowWarning(false)
    setDebugInfo("")

    try {
      const prepared = await prepareImage(uploadResult.file)
      const formData = new FormData()
      formData.append("image", prepared, "upload.jpg")

      const response = await fetch("/api/identify", { method: "POST", body: formData })
      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Identification failed. Please try again.")
      }

      const identificationData = {
        uploadedImage: uploadResult.processedImage?.url,
        originalFileName: uploadResult.file.name,
        timestamp: new Date().toISOString(),
        candidates: payload.result.candidates,
        otherFishCount: payload.result.otherFishCount,
      }
      localStorage.setItem("fishIdentificationData", JSON.stringify(identificationData))
      router.push("/results")
    } catch (error: any) {
      setDebugInfo(`Error: ${error.message || "Failed to identify fish. Please try again."}`)
      setShowWarning(true)
      setTimeout(() => setShowWarning(false), 5000)
    } finally {
      setIsIdentifying(false)
    }
  }
```

- [ ] **Step 4: Remove the dev-only "Flask Backend Status" block** in the same file (the `{process.env.NODE_ENV === "development" && (... 🔗 Flask Backend ...)}` JSX block near the bottom of the hero section) — it references the deleted backend.

- [ ] **Step 5: Build + commit**

```bash
pnpm build
git add lib/image-prep.ts app/page.tsx
git commit -m "Client-side image prep (resize + EXIF strip) and identify rewire"
```

### Task 7: Enrichment — wiki helper, shared parsing, and both routes

**Files:**
- Create: `lib/server/wiki.ts`
- Create: `lib/enrichment.ts` (shared client/server: types + section parsing + client fetch helper)
- Create: `app/api/enrich/[species]/route.ts` (JSON: cache hit or wiki-only)
- Create: `app/api/enrich/[species]/stream/route.ts` (Groq text stream, caches on finish)

- [ ] **Step 1: Write `lib/server/wiki.ts`:**

```ts
export interface WikiSummary {
  intro: string | null
  image_url: string | null
  common_name: string | null
  url: string | null
}

export async function fetchWikiSummary(scientificName: string): Promise<WikiSummary | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(scientificName.replace(/ /g, "_"))}`,
      { headers: { accept: "application/json" }, next: { revalidate: 86400 } },
    )
    if (!res.ok) return null
    const j = await res.json()
    return {
      intro: j.extract ?? null,
      image_url: j.thumbnail?.source ?? null,
      common_name: j.title && j.title !== scientificName ? j.title : null,
      url: j.content_urls?.desktop?.page ?? null,
    }
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Write `lib/enrichment.ts`** (no server-only imports — used by both the stream route's `onFinish` and the results page):

```ts
import type { WikiSummary } from "./server/wiki"

export interface EnrichmentSections {
  description: string
  visual_cues: string
  fun_fact: string
}

export interface EnrichmentData extends EnrichmentSections {
  wiki: WikiSummary | null
}

export function enrichmentPrompt(scientificName: string): string {
  return `You are writing for a fish identification app aimed at divers and hobbyists. For the fish species "${scientificName}", produce EXACTLY this markdown structure and nothing else:

## About
Two to three friendly sentences describing this fish for non-scientists. No jargon.

## Visual Cues
• **<Feature name>**: <brief description>
• **<Feature name>**: <brief description>
• **<Feature name>**: <brief description>

## Fun Fact
One surprising trivia fact about this species, maximum 25 words.`
}

// Works on partial (streaming) text: sections fill in as their headers arrive.
export function parseEnrichment(text: string): EnrichmentSections {
  const grab = (header: string) => {
    const match = text.match(new RegExp(`## ${header}\\s*([\\s\\S]*?)(?=\\n## |$)`))
    return match ? match[1].trim() : ""
  }
  return {
    description: grab("About"),
    visual_cues: grab("Visual Cues"),
    fun_fact: grab("Fun Fact"),
  }
}

export interface EnrichmentCallbacks {
  onWiki: (wiki: WikiSummary | null) => void
  onSections: (sections: EnrichmentSections) => void
  onDone: (data: { sections: EnrichmentSections; aiFailed: boolean }) => void
}

export async function loadEnrichment(scientificName: string, cb: EnrichmentCallbacks): Promise<void> {
  const encoded = encodeURIComponent(scientificName)
  const res = await fetch(`/api/enrich/${encoded}`)
  if (!res.ok) {
    cb.onWiki(null)
    cb.onDone({ sections: { description: "", visual_cues: "", fun_fact: "" }, aiFailed: true })
    return
  }
  const payload = await res.json()

  if (payload.cached) {
    const { wiki, ...sections } = payload.data as EnrichmentData
    cb.onWiki(wiki)
    cb.onSections(sections)
    cb.onDone({ sections, aiFailed: false })
    return
  }

  cb.onWiki(payload.wiki ?? null)

  const streamRes = await fetch(`/api/enrich/${encoded}/stream`)
  if (!streamRes.ok || !streamRes.body) {
    cb.onDone({ sections: { description: "", visual_cues: "", fun_fact: "" }, aiFailed: true })
    return
  }

  const reader = streamRes.body.getReader()
  const decoder = new TextDecoder()
  let acc = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    acc += decoder.decode(value, { stream: true })
    cb.onSections(parseEnrichment(acc))
  }
  const sections = parseEnrichment(acc)
  cb.onSections(sections)
  cb.onDone({ sections, aiFailed: sections.description === "" })
}
```

- [ ] **Step 3: Write `app/api/enrich/[species]/route.ts`:**

```ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/server/supabase-admin"
import { fetchWikiSummary } from "@/lib/server/wiki"

export async function GET(_request: Request, { params }: { params: { species: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 })
  }

  const name = decodeURIComponent(params.species)
  const { data: row } = await supabaseAdmin
    .from("enrichment_cache")
    .select("data")
    .eq("scientific_name", name)
    .maybeSingle()

  if (row) {
    return NextResponse.json({ cached: true, data: row.data })
  }

  const wiki = await fetchWikiSummary(name)
  return NextResponse.json({ cached: false, wiki })
}
```

- [ ] **Step 4: Write `app/api/enrich/[species]/stream/route.ts`** (one Groq call replaces the old three; caching happens in `onFinish`; misses are implicitly rate-bounded because you can only enrich what you just identified, and identify is rate-limited):

```ts
import { NextResponse } from "next/server"
import { streamText } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/server/supabase-admin"
import { fetchWikiSummary } from "@/lib/server/wiki"
import { enrichmentPrompt, parseEnrichment } from "@/lib/enrichment"

const groqKey = process.env.GROQ_API_KEY
if (!groqKey) throw new Error("Missing GROQ_API_KEY")

const groq = createGroq({ apiKey: groqKey })
const MODEL = "llama-3.3-70b-versatile"

export async function GET(_request: Request, { params }: { params: { species: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 })
  }

  const name = decodeURIComponent(params.species)

  try {
    const result = streamText({
      model: groq(MODEL),
      prompt: enrichmentPrompt(name),
      onFinish: async ({ text }) => {
        const sections = parseEnrichment(text)
        if (!sections.description) return // malformed output — don't cache garbage
        const wiki = await fetchWikiSummary(name)
        const { error } = await supabaseAdmin.from("enrichment_cache").upsert({
          scientific_name: name,
          data: { ...sections, wiki },
          updated_at: new Date().toISOString(),
        })
        if (error) console.error("enrichment_cache upsert failed:", error)
      },
    })
    return result.toTextStreamResponse()
  } catch (err) {
    console.error("Groq stream error:", err)
    return NextResponse.json({ error: "ai_unavailable" }, { status: 502 })
  }
}
```

- [ ] **Step 5: Verify auth gates + build** (dev server running):

```bash
curl -s -o /dev/null -w "json: %{http_code}\n" "http://localhost:3000/api/enrich/Amphiprion%20percula"
curl -s -o /dev/null -w "stream: %{http_code}\n" "http://localhost:3000/api/enrich/Amphiprion%20percula/stream"
pnpm build
```

Expected: `json: 401`, `stream: 401`, build passes.

- [ ] **Step 6: Commit**

```bash
git add lib/server/wiki.ts lib/enrichment.ts app/api/enrich
git commit -m "Add streamed Groq enrichment with Postgres cache and Wikipedia summary"
```

### Task 8: Results page rewrite

**Files:**
- Modify: `app/results/page.tsx` (full replacement)

Shows the top-3 candidates with confidence bars (best one featured), streams the AI sections in as they generate, uses the Wikipedia summary as fallback/reference, and stubs Save-to-log until Phase 5. Keeps the existing header/lightbox/auth-modal structure and styling.

- [ ] **Step 1: Replace the entire file with:**

```tsx
"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Lightbulb, ExternalLink, Camera, Heart, Eye, Fish, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { HamburgerMenu } from "@/components/hamburger-menu"
import { AuthModal } from "@/components/auth-modal"
import { loadEnrichment, type EnrichmentSections } from "@/lib/enrichment"
import type { WikiSummary } from "@/lib/server/wiki"
import Link from "next/link"

interface Candidate {
  name: string
  accuracy: number
}

interface StoredIdentification {
  uploadedImage?: string
  originalFileName?: string
  timestamp?: string
  candidates: Candidate[]
  otherFishCount: number
}

function confidenceLabel(pct: number): string {
  if (pct >= 90) return "Very High"
  if (pct >= 75) return "High"
  if (pct >= 60) return "Moderate"
  return "Low"
}

function BoldBullets({ text }: { text: string }) {
  return (
    <div className="text-gray-700">
      {text.split("\n").map((line, i) => {
        const parts = line.split("**")
        return (
          <div key={i} className="mb-1">
            {parts.map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>))}
          </div>
        )
      })}
    </div>
  )
}

export default function ResultsPage() {
  const [showLightbox, setShowLightbox] = useState(false)
  const [data, setData] = useState<StoredIdentification | null>(null)
  const [noData, setNoData] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [wiki, setWiki] = useState<WikiSummary | null>(null)
  const [sections, setSections] = useState<EnrichmentSections>({ description: "", visual_cues: "", fun_fact: "" })
  const [enriching, setEnriching] = useState(true)
  const [aiFailed, setAiFailed] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    const stored = localStorage.getItem("fishIdentificationData")
    if (!stored) {
      setNoData(true)
      return
    }
    try {
      const parsed = JSON.parse(stored)
      if (!parsed.candidates?.length) {
        setNoData(true)
        return
      }
      setData(parsed)
    } catch {
      setNoData(true)
    }
  }, [])

  useEffect(() => {
    if (!data) return
    loadEnrichment(data.candidates[0].name, {
      onWiki: setWiki,
      onSections: setSections,
      onDone: ({ aiFailed }) => {
        setEnriching(false)
        setAiFailed(aiFailed)
      },
    })
  }, [data])

  const handleSaveToLog = () => {
    if (!user) {
      setShowAuthModal(true)
      return
    }
    setSaveMessage("Saving to your fish log arrives in the next update!")
    setTimeout(() => setSaveMessage(""), 3000)
  }

  const scrollToAbout = () => {
    window.location.href = "/#about-section"
  }

  if (noData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No identification data found</p>
          <Link href="/">
            <Button className="bg-[#2e9eb3] hover:bg-[#138094] text-white">Go Back Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!data) return null

  const top = data.candidates[0]
  const topPct = Math.round(top.accuracy * 100)
  const displayName = wiki?.common_name || top.name
  const uploadedImageUrl = data.uploadedImage || "/placeholder.svg?height=400&width=600"

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#0e496c] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/">
              <Image
                src="/images/logo.png"
                alt="FishID Logo"
                width={120}
                height={40}
                className="h-10 w-auto cursor-pointer"
              />
            </Link>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-white hover:text-[#2e9eb3] transition-colors">
              New Search
            </Link>
            <button onClick={scrollToAbout} className="text-white hover:text-[#2e9eb3] transition-colors">
              About Us
            </button>
            <Link href="/fish-log" className="text-white hover:text-[#2e9eb3] transition-colors">
              Fish Log
            </Link>
            <Link href="/species-list" className="text-white hover:text-[#2e9eb3] transition-colors">
              Species List
            </Link>
          </nav>
          <HamburgerMenu onAboutClick={scrollToAbout} onLoginClick={() => setShowAuthModal(true)} />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Uploaded photo hero */}
        <div className="mb-8">
          <div
            className="relative h-[400px] rounded-2xl overflow-hidden cursor-pointer group"
            onClick={() => setShowLightbox(true)}
          >
            <Image
              src={uploadedImageUrl}
              alt="Your uploaded fish photo"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
            <div className="absolute top-4 right-4">
              <Badge className="bg-white/90 text-gray-800">
                <Camera className="w-3 h-3 mr-1" />
                Your Photo
              </Badge>
            </div>
            {data.originalFileName && (
              <div className="absolute bottom-4 left-4">
                <Badge className="bg-black/60 text-white">{data.originalFileName}</Badge>
              </div>
            )}
          </div>
        </div>

        {/* Best match */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-[#0d2a50] mb-2">{displayName}</h1>
          <p className="text-xl text-[#138094] italic mb-2">{top.name}</p>
          {data.otherFishCount > 0 && (
            <Badge variant="outline" className="mb-4">
              <Fish className="w-3 h-3 mr-1" />
              {data.otherFishCount} other fish detected in this photo
            </Badge>
          )}
          <div className="max-w-md mx-auto mt-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Confidence</span>
              <span className="text-sm font-bold text-[#0d2a50]">{topPct}%</span>
            </div>
            <Progress value={topPct} className="h-3" />
            <p className="text-xs text-gray-500 mt-1">{confidenceLabel(topPct)} confidence match</p>
          </div>
        </div>

        {/* Other candidates */}
        {data.candidates.length > 1 && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-[#0d2a50] mb-4">Other Possible Matches</h2>
              <div className="space-y-4">
                {data.candidates.slice(1).map((c) => {
                  const pct = Math.round(c.accuracy * 100)
                  return (
                    <div key={c.name}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm italic text-gray-700">{c.name}</span>
                        <span className="text-sm font-medium text-gray-600">{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Fish identification is genuinely ambiguous — similar species can be hard to tell apart from a photo.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About: streamed AI description, wiki fallback */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-[#0d2a50] mb-3">
                  About This Species
                  {enriching && <Loader2 className="w-4 h-4 ml-2 inline animate-spin text-[#2e9eb3]" />}
                </h2>
                {sections.description ? (
                  <p className="text-gray-700 leading-relaxed">{sections.description}</p>
                ) : aiFailed && wiki?.intro ? (
                  <p className="text-gray-700 leading-relaxed">{wiki.intro}</p>
                ) : aiFailed ? (
                  <p className="text-gray-500 text-sm">AI facts are unavailable right now.</p>
                ) : (
                  <p className="text-gray-400 text-sm">Generating…</p>
                )}
              </CardContent>
            </Card>

            {/* Visual cues */}
            {(sections.visual_cues || enriching) && (
              <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-500">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <Eye className="w-6 h-6 text-purple-500 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-[#0d2a50] mb-2">Visual Identification Cues</h2>
                      {sections.visual_cues ? (
                        <BoldBullets text={sections.visual_cues} />
                      ) : (
                        <p className="text-gray-400 text-sm">Generating…</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fun fact */}
            {(sections.fun_fact || enriching) && (
              <Card className="bg-gradient-to-r from-blue-50 to-teal-50 border-l-4 border-[#2e9eb3]">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <Lightbulb className="w-6 h-6 text-[#2e9eb3] flex-shrink-0 mt-1" />
                    <div>
                      <h2 className="text-xl font-semibold text-[#0d2a50] mb-2">Did You Know?</h2>
                      {sections.fun_fact ? (
                        <p className="text-gray-700">{sections.fun_fact}</p>
                      ) : (
                        <p className="text-gray-400 text-sm">Generating…</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {wiki?.image_url && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-[#0d2a50] mb-3">Reference Image</h3>
                  <div className="relative h-48 rounded-lg overflow-hidden mb-3">
                    <Image src={wiki.image_url} alt={`Reference image of ${displayName}`} fill className="object-cover" />
                  </div>
                  {wiki.url && (
                    <a href={wiki.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="w-full bg-transparent">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View on Wikipedia
                      </Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {wiki?.intro && sections.description && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-[#0d2a50] mb-3">From Wikipedia</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {wiki.intro.length > 280 ? `${wiki.intro.substring(0, 280)}…` : wiki.intro}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link href="/">
            <Button className="bg-[#2e9eb3] hover:bg-[#138094] text-white px-8 py-3">Identify Another Fish</Button>
          </Link>
          <Button variant="outline" className="px-8 py-3 bg-transparent" onClick={handleSaveToLog}>
            <Heart className="w-4 h-4 mr-2" />
            Save to Fish Log
          </Button>
        </div>

        {saveMessage && (
          <div className="text-center mt-4">
            <p className="text-sm text-[#138094]">{saveMessage}</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {showLightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <Image
              src={uploadedImageUrl}
              alt="Your uploaded fish photo - full size"
              width={800}
              height={600}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setShowLightbox(false)}
            >
              ×
            </Button>
          </div>
        </div>
      )}

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  )
}
```

(`import type { WikiSummary } from "@/lib/server/wiki"` is a type-only import — nothing server-side lands in the client bundle.)

- [ ] **Step 2: Build + commit**

```bash
pnpm build
git add app/results/page.tsx
git commit -m "Rewrite results page: top-3 candidates, streamed enrichment, wiki reference"
```

### Task 9: Species list on Supabase + delete lib/api.ts

**Files:**
- Create: `lib/species.ts`
- Modify: `app/species-list/page.tsx` (imports + `loadSpecies`)
- Delete: `lib/api.ts`

- [ ] **Step 1: Write `lib/species.ts`** (keeps the old Flask field mapping so the page's `Species` interface is untouched):

```ts
import { supabase } from "./supabase/client"

export interface Species {
  id: string
  common_name: string
  scientific_name: string
  image_url?: string
  habitat?: string
  distribution?: string
  max_length_cm?: string
  conservation_status?: string
  description?: string
  region?: string
}

export interface SpeciesQuery {
  search?: string
  region?: string
  habitat?: string
  status?: string
  page: number
  limit: number
}

export async function fetchSpecies(q: SpeciesQuery): Promise<{
  species: Species[]
  total: number
  totalPages: number
}> {
  let query = supabase.from("species").select("*", { count: "exact" })

  if (q.search) {
    const safe = q.search.replace(/[,()]/g, " ").trim()
    if (safe) query = query.or(`common_name.ilike.%${safe}%,scientific_name.ilike.%${safe}%`)
  }
  if (q.region && q.region !== "all") query = query.ilike("location", `%${q.region}%`)
  if (q.habitat && q.habitat !== "all") query = query.ilike("habitat", `%${q.habitat}%`)
  if (q.status && q.status !== "all") query = query.eq("iucn_status", q.status)

  const from = (q.page - 1) * q.limit
  const { data, count, error } = await query.order("common_name").range(from, from + q.limit - 1)
  if (error) throw new Error("Failed to load species. Please try again.")

  const total = count ?? 0
  return {
    species: (data ?? []).map((row: any) => ({
      id: row.id,
      scientific_name: row.scientific_name,
      common_name: row.common_name,
      image_url: row.image_url ?? undefined,
      habitat: row.habitat ?? undefined,
      distribution: row.location ?? undefined,
      max_length_cm: row.size ?? undefined,
      conservation_status: row.iucn_status ?? undefined,
      description: row.description ?? undefined,
      region: row.location ?? undefined,
    })),
    total,
    totalPages: Math.max(1, Math.ceil(total / q.limit)),
  }
}
```

- [ ] **Step 2: In `app/species-list/page.tsx`:**
  - Replace the import `import { speciesApi, ApiError } from "@/lib/api"` with `import { fetchSpecies } from "@/lib/species"`.
  - Delete the local `interface Species { ... }` block and add `import type { Species } from "@/lib/species"` (the shapes are identical except `max_length_cm` is now `string` — the DB stores text like `"11 cm"`; the page only renders it).
  - Replace the body of `loadSpecies` with:

```ts
  const loadSpecies = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await fetchSpecies({
        page: currentPage,
        limit: 20,
        search: searchTerm || undefined,
        region: selectedRegion,
        habitat: selectedHabitat,
        status: selectedStatus,
      })
      setSpecies(result.species)
      setFilteredSpecies(result.species)
      setTotalPages(result.totalPages)
      setTotalSpecies(result.total)
    } catch (error: any) {
      setError(error.message || "Failed to load species. Please try again.")
    } finally {
      setLoading(false)
    }
  }
```

- [ ] **Step 3: Delete the API client and verify nothing imports it:**

```bash
git rm lib/api.ts
grep -rn "from \"@/lib/api\"\|FLASK_API_URL\|ApiError" app components lib --include="*.ts" --include="*.tsx" || echo CLEAN
```

Expected: `CLEAN`

- [ ] **Step 4: Check `max_length_cm` rendering** — the species card previously rendered `{species.max_length_cm} cm` (the DB value already contains units like `"11 cm"`). Find the render site:

Run: `grep -n "max_length_cm" app/species-list/page.tsx`
If it renders with a trailing ` cm` suffix, remove the suffix so values don't read "11 cm cm".

- [ ] **Step 5: Build + commit**

```bash
pnpm build
git add -A
git commit -m "Species list reads Supabase directly; delete Flask API client"
```

### Task 10: End-to-end verification (browser + SQL)

Uses the Playwright MCP browser, the dev server, the real Fishial/Groq APIs, and the `/tmp/test-fish.jpg` clownfish photo from Task 4. Create a confirmed test user first.

- [ ] **Step 1: Create + confirm a test user** via auth REST + SQL (same approach as Phase 3):

```bash
curl -s -X POST "https://kxfqueaufrqitztwneks.supabase.co/auth/v1/signup" \
  -H "apikey: sb_publishable_HmktsELUV8UYNuqF5eXc8g_RFaxSg9w" -H "Content-Type: application/json" \
  -d '{"email":"kabrahrishi+phase4test@gmail.com","password":"Str0ng-Passw0rd-42!","data":{"username":"Phase Four"}}'
```

Then via Supabase MCP `execute_sql`: `update auth.users set email_confirmed_at = now() where email = 'kabrahrishi+phase4test@gmail.com';`

- [ ] **Step 2:** `pnpm dev` (background). Browse to `http://localhost:3000`, sign in as the test user.

- [ ] **Step 3: Identify flow** — on the landing page, upload `/tmp/test-fish.jpg` via the file input (Playwright `browser_file_upload`), click "Identify Now!".
Expected: navigates to `/results`; the page shows an *Amphiprion* species as best match with a confidence bar, "Other Possible Matches" with 2 more candidates, and the About/Visual Cues/Fun Fact sections fill in (streamed on first run).

- [ ] **Step 4: Verify server state** via `execute_sql`:

```sql
select count(*) as events from public.identify_events;
select scientific_name, data->>'description' is not null as has_desc, data->'wiki'->>'common_name' as wiki_name
from public.enrichment_cache;
```

Expected: `events` ≥ 1; one cache row for the identified species with `has_desc = true`.

- [ ] **Step 5: Cache-hit path** — reload the `/results` page.
Expected: sections appear instantly (no "Generating…" flicker beyond initial render). The cache row count stays at 1.

- [ ] **Step 6: Signed-out gate** — log out, return to `/`, upload the photo again, click "Identify Now!".
Expected: the auth modal opens instead of any API call.

- [ ] **Step 7: Species list** — sign back in, open `/species-list`.
Expected: 21 species render from Supabase; search "clown" filters to Clownfish; the Status filter `VU` shows Seahorse/Manta/Great White/Blue Marlin.

- [ ] **Step 8: Clean up** via `execute_sql`:

```sql
delete from auth.users where email = 'kabrahrishi+phase4test@gmail.com';
delete from public.identify_events;
```

(Keep the `enrichment_cache` row — it's real, useful cache.)

- [ ] **Step 9: Stop dev server; push**

```bash
git push origin main
```

### Task 11: USER ACTIONS — production cutover

- [ ] In **Vercel → Settings → Environment Variables**, add for Production (+Preview): `FISHIAL_CLIENT_ID`, `FISHIAL_SECRET`, `GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only — do NOT prefix with `NEXT_PUBLIC_`). Remove the now-dead `NEXT_PUBLIC_FLASK_API_URL` if present. Redeploy.
- [ ] Production smoke test: sign in on `https://fishid.vercel.app`, identify a fish photo end-to-end.
- [ ] **Decommission Render**: delete (or suspend) the old Flask service in the Render dashboard. Nothing references it anymore.

---

## Done criteria (spec §8 Phase 4)

- Full identify flow works end-to-end on the Next.js app with Render switched off: login-gated, rate-limited, top-3 candidates rendered, enrichment streamed then cached, EXIF stripped client-side.
- `lib/api.ts`, the Flask URL env var, and the old `.env` no longer exist; grep for `FLASK_API_URL` is clean.
- Species list reads Supabase directly with search/filters/pagination behavior preserved.

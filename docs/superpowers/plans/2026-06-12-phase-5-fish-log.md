# FishID Phase 5: Real Fish Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fake fish log with the real thing: saving an identification uploads the photo to Supabase Storage and inserts an `identifications` row, and the fish-log page lists, renders, and deletes the user's entries.

**Architecture:** Everything is client ↔ Supabase under RLS — no new API routes. A small `lib/fish-log.ts` module owns save/fetch/delete; the results page calls `saveIdentification`; the fish-log page replaces its "Coming Soon" placeholder with a card grid fed by `fetchLog` (signed URLs for the private bucket). The landing page starts storing the *prepared* (EXIF-stripped, ≤1024px) image so the uploaded photo never contains GPS data.

**Tech Stack:** supabase-js (`identifications` table + `fish-photos` private bucket from Phase 2, both owner-scoped by RLS), signed URLs for display.

**Context for workers:**
- Repo root `/Users/hrishikabra/Desktop/Tulane/Projects/fishidapp`; Supabase project ref `kxfqueaufrqitztwneks`.
- Storage layout (Phase 2 policies): bucket `fish-photos` (private), object paths `{user_id}/{identification_id}.jpg`, owner-only select/insert/delete keyed on the path's first segment.
- `identifications` columns: `id` (uuid default), `user_id`, `scientific_name`, `common_name`, `confidence` (numeric 0–100), `candidates` (jsonb), `photo_path`, `notes`, `created_at`. RLS: `auth.uid() = user_id` for everything. (`notes` stays unused in this phase — no UI for it; YAGNI.)
- The results page (`app/results/page.tsx`) currently has a stub `handleSaveToLog` showing "arrives in the next update".
- localStorage payload shape (set by `app/page.tsx`): `{ uploadedImage (dataURL), originalFileName, timestamp, candidates: [{name, accuracy}], otherFishCount }`.
- E2E gotchas from Phase 4: never run `pnpm build` while the dev server is running; create confirmed test users via the admin REST API (the public signup mailer rate-limits); use `kabrahrishi+<tag>@gmail.com` emails (Supabase rejects `@example.com`).

---

### Task 1: Store the prepared (EXIF-stripped) image for results/saving

**Files:**
- Modify: `app/page.tsx` (inside `handleIdentifyClick`)

The prepared blob already goes to `/api/identify`; this stores the same stripped bytes for the results page and the eventual Storage upload, instead of the original (which still has EXIF GPS).

- [ ] **Step 1: In `app/page.tsx`, replace** this part of `handleIdentifyClick`:

```ts
      const identificationData = {
        uploadedImage: uploadResult.processedImage?.url,
```

with:

```ts
      const preparedDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error("Could not read image"))
        reader.readAsDataURL(prepared)
      })

      const identificationData = {
        uploadedImage: preparedDataUrl,
```

- [ ] **Step 2: Build + commit**

```bash
pnpm build
git add app/page.tsx
git commit -m "Store EXIF-stripped prepared image for results and saving"
```

### Task 2: Fish-log data module

**Files:**
- Create: `lib/fish-log.ts`

- [ ] **Step 1: Write the file:**

```ts
import { supabase } from "./supabase/client"

export interface LogCandidate {
  name: string
  accuracy: number
}

export interface LogEntry {
  id: string
  scientific_name: string
  common_name: string | null
  confidence: number | null
  candidates: LogCandidate[]
  photo_path: string | null
  created_at: string
  photoUrl: string | null // signed URL, resolved by fetchLog
}

export async function saveIdentification(input: {
  candidates: LogCandidate[]
  commonName?: string | null
  photoDataUrl?: string
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Please sign in to save to your fish log.")

  const top = input.candidates[0]
  const { data: row, error } = await supabase
    .from("identifications")
    .insert({
      user_id: user.id,
      scientific_name: top.name,
      common_name: input.commonName ?? null,
      confidence: Math.round(top.accuracy * 100),
      candidates: input.candidates,
    })
    .select("id")
    .single()
  if (error || !row) throw new Error("Could not save to your fish log. Please try again.")

  if (input.photoDataUrl) {
    // The data URL holds the prepared (EXIF-stripped, resized) JPEG from lib/image-prep.
    const blob = await (await fetch(input.photoDataUrl)).blob()
    const path = `${user.id}/${row.id}.jpg`
    const { error: uploadError } = await supabase.storage
      .from("fish-photos")
      .upload(path, blob, { contentType: "image/jpeg" })
    if (uploadError) {
      console.error("Photo upload failed:", uploadError)
      return // entry stays saved, just without a photo
    }
    await supabase.from("identifications").update({ photo_path: path }).eq("id", row.id)
  }
}

export async function fetchLog(): Promise<LogEntry[]> {
  const { data, error } = await supabase
    .from("identifications")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw new Error("Could not load your fish log. Please try again.")

  const entries = data ?? []
  const paths = entries.filter((e) => e.photo_path).map((e) => e.photo_path as string)
  const urlByPath = new Map<string, string>()
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage.from("fish-photos").createSignedUrls(paths, 3600)
    signed?.forEach((s) => {
      if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl)
    })
  }

  return entries.map((e) => ({
    id: e.id,
    scientific_name: e.scientific_name,
    common_name: e.common_name,
    confidence: e.confidence === null ? null : Number(e.confidence),
    candidates: (e.candidates ?? []) as LogCandidate[],
    photo_path: e.photo_path,
    created_at: e.created_at,
    photoUrl: e.photo_path ? (urlByPath.get(e.photo_path) ?? null) : null,
  }))
}

export async function deleteIdentification(entry: { id: string; photo_path: string | null }): Promise<void> {
  if (entry.photo_path) {
    await supabase.storage.from("fish-photos").remove([entry.photo_path])
  }
  const { error } = await supabase.from("identifications").delete().eq("id", entry.id)
  if (error) throw new Error("Could not delete this entry. Please try again.")
}
```

- [ ] **Step 2: Build + commit**

```bash
pnpm build
git add lib/fish-log.ts
git commit -m "Add fish-log data module: save, fetch with signed URLs, delete"
```

### Task 3: Real save on the results page

**Files:**
- Modify: `app/results/page.tsx`

- [ ] **Step 1: Add the import** next to the other lib imports:

```ts
import { saveIdentification } from "@/lib/fish-log"
```

- [ ] **Step 2: Add two state hooks** after the existing `const [saveMessage, setSaveMessage] = useState("")`:

```ts
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
```

- [ ] **Step 3: Replace the stub `handleSaveToLog` function** (the one setting "arrives in the next update!") **with:**

```ts
  const handleSaveToLog = async () => {
    if (!user) {
      setShowAuthModal(true)
      return
    }
    if (!data || saved || isSaving) return
    setIsSaving(true)
    try {
      await saveIdentification({
        candidates: data.candidates,
        commonName: wiki?.common_name ?? null,
        photoDataUrl: data.uploadedImage,
      })
      setSaved(true)
      setSaveMessage("✓ Saved to your fish log!")
    } catch (err: any) {
      setSaveMessage(err.message || "Failed to save to fish log")
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(""), 4000)
    }
  }
```

- [ ] **Step 4: Replace the Save button JSX** (currently `<Button variant="outline" className="px-8 py-3 bg-transparent" onClick={handleSaveToLog}>` with the Heart icon) **with:**

```tsx
          <Button
            variant="outline"
            className="px-8 py-3 bg-transparent"
            onClick={handleSaveToLog}
            disabled={isSaving || saved}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <Heart className="w-4 h-4 mr-2 fill-current" />
                Saved
              </>
            ) : (
              <>
                <Heart className="w-4 h-4 mr-2" />
                Save to Fish Log
              </>
            )}
          </Button>
```

(`Loader2` and `Heart` are already imported in this file.)

- [ ] **Step 5: Build + commit**

```bash
pnpm build
git add app/results/page.tsx
git commit -m "Wire real save-to-log on results page"
```

### Task 4: Fish-log page rewrite

**Files:**
- Modify: `app/fish-log/page.tsx` (full replacement — also fixes the `kalebrahn@gmail.com` footer typo and dead social icons by reusing the standard footer links)

- [ ] **Step 1: Replace the entire file with:**

```tsx
"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Instagram, Github, Linkedin, Fish, Loader2, Trash2, Camera, AlertCircle } from "lucide-react"
import { AuthModal } from "@/components/auth-modal"
import { UserDropdown } from "@/components/user-dropdown"
import { HamburgerMenu } from "@/components/hamburger-menu"
import { useAuth } from "@/lib/auth-context"
import { fetchLog, deleteIdentification, type LogEntry } from "@/lib/fish-log"
import { useState, useEffect } from "react"
import Link from "next/link"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

export default function FishLogPage() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { user, isInitialized } = useAuth()

  useEffect(() => {
    if (!isInitialized) return
    if (!user) {
      setLoading(false)
      setEntries([])
      return
    }
    setLoading(true)
    fetchLog()
      .then(setEntries)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user, isInitialized])

  const handleDelete = async (entry: LogEntry) => {
    if (confirmingId !== entry.id) {
      setConfirmingId(entry.id)
      setTimeout(() => setConfirmingId((c) => (c === entry.id ? null : c)), 3000)
      return
    }
    setConfirmingId(null)
    setDeletingId(entry.id)
    try {
      await deleteIdentification(entry)
      setEntries((prev) => prev.filter((e) => e.id !== entry.id))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const scrollToAbout = () => {
    window.location.href = "/#about-section"
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-[#0e496c] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
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
            <button onClick={scrollToAbout} className="text-white hover:text-[#2e9eb3] transition-colors">
              About Us
            </button>
            <Link href="/fish-log" className="text-[#2e9eb3] font-medium">
              Fish Log
            </Link>
            <Link href="/species-list" className="text-white hover:text-[#2e9eb3] transition-colors">
              Species List
            </Link>
            {user ? (
              <UserDropdown />
            ) : (
              <Button
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-[#0e496c] transition-colors bg-transparent"
                onClick={() => setShowAuthModal(true)}
              >
                Log In
              </Button>
            )}
          </nav>
          <HamburgerMenu onAboutClick={scrollToAbout} onLoginClick={() => setShowAuthModal(true)} />
        </div>
      </header>

      {/* Content */}
      <section className="flex-1 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <Fish className="w-16 h-16 text-[#2e9eb3] mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-[#0d2a50] mb-2">Fish Log</h1>
            <p className="text-lg text-[#138094]">Your personal collection of identified fish species</p>
          </div>

          {!isInitialized || loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#2e9eb3] mx-auto mb-4" />
                <p className="text-gray-600">Loading your fish log...</p>
              </div>
            </div>
          ) : !user ? (
            <div className="bg-white rounded-3xl p-12 shadow-lg border border-gray-100 max-w-xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-[#0d2a50] mb-4">Sign in to see your log</h2>
              <p className="text-gray-600 mb-8">
                Your identified fish are saved to your account so they're here whenever you come back.
              </p>
              <Button
                className="bg-[#2e9eb3] hover:bg-[#138094] text-white px-8 py-3 rounded-full"
                onClick={() => setShowAuthModal(true)}
              >
                Log In
              </Button>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center max-w-md">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-700">{error}</p>
              </div>
            </div>
          ) : entries.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 shadow-lg border border-gray-100 max-w-xl mx-auto text-center">
              <Camera className="w-16 h-16 text-[#2e9eb3] mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-[#0d2a50] mb-4">No fish logged yet</h2>
              <p className="text-gray-600 mb-8">
                Identify a fish and hit "Save to Fish Log" — it'll show up here with your photo.
              </p>
              <Link href="/">
                <Button className="bg-[#2e9eb3] hover:bg-[#138094] text-white px-8 py-3 rounded-full">
                  Start Identifying Fish
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-6">
                {entries.length} {entries.length === 1 ? "fish" : "fish"} logged
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {entries.map((entry) => (
                  <Card key={entry.id} className="overflow-hidden flex flex-col">
                    <div className="relative h-48 bg-gradient-to-br from-blue-50 to-teal-50">
                      {entry.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={entry.photoUrl}
                          alt={entry.common_name || entry.scientific_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Fish className="w-12 h-12 text-[#2e9eb3]/40" />
                        </div>
                      )}
                      {entry.confidence !== null && (
                        <Badge className="absolute top-3 right-3 bg-white/90 text-gray-800">
                          {entry.confidence}%
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-4 flex-1 flex flex-col">
                      <h3 className="font-semibold text-[#0d2a50]">
                        {entry.common_name || entry.scientific_name}
                      </h3>
                      <p className="text-sm italic text-[#138094] mb-2">{entry.scientific_name}</p>
                      {entry.candidates.length > 1 && (
                        <p className="text-xs text-gray-500 mb-2">
                          Also possible:{" "}
                          {entry.candidates
                            .slice(1)
                            .map((c) => c.name)
                            .join(", ")}
                        </p>
                      )}
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <span className="text-xs text-gray-500">{formatDate(entry.created_at)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={
                            confirmingId === entry.id
                              ? "text-white bg-red-500 hover:bg-red-600 hover:text-white"
                              : "text-gray-400 hover:text-red-500"
                          }
                          onClick={() => handleDelete(entry)}
                          disabled={deletingId === entry.id}
                        >
                          {deletingId === entry.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : confirmingId === entry.id ? (
                            "Confirm?"
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0e496c] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-4">Reach Out!</h3>
              <p className="text-sm mb-2">Feel free to reach out to me on Instagram, LinkedIn or via email.</p>
              <p className="text-sm mb-6">kabrahrishi@gmail.com</p>

              <div className="flex space-x-4 mb-6">
                <a href="https://instagram.com/hrishikabra" target="_blank" rel="noopener noreferrer">
                  <Instagram className="w-6 h-6 hover:text-[#2e9eb3] cursor-pointer transition-colors" />
                </a>
                <a href="https://github.com/HrishiKabra" target="_blank" rel="noopener noreferrer">
                  <Github className="w-6 h-6 hover:text-[#2e9eb3] cursor-pointer transition-colors" />
                </a>
                <a href="https://linkedin.com/in/HrishiKabra" target="_blank" rel="noopener noreferrer">
                  <Linkedin className="w-6 h-6 hover:text-[#2e9eb3] cursor-pointer transition-colors" />
                </a>
              </div>

              <p className="text-xs text-gray-300">© 2024 All Rights Reserved</p>
            </div>

            <div className="flex justify-end">
              <Image src="/images/logo.png" alt="FishID Logo" width={200} height={80} className="h-16 w-auto" />
            </div>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  )
}
```

- [ ] **Step 2: Build + commit**

```bash
pnpm build
git add app/fish-log/page.tsx
git commit -m "Replace fish-log placeholder with real log: grid, signed photos, delete"
```

### Task 5: End-to-end verification (browser + SQL)

Reuses the Phase 4 playbook: admin-created confirmed test user, Playwright browser, `/tmp/test-fish.jpg` (re-download via the Wikipedia API if missing), Supabase MCP for SQL.

- [ ] **Step 1: Create a confirmed test user** via the admin REST API (`kabrahrishi+phase5test@gmail.com`, username "Phase Five"), start `pnpm dev` (background — and do NOT run `pnpm build` while it's up).

- [ ] **Step 2: Save flow** — sign in, upload the clownfish photo, identify, land on `/results`, click **Save to Fish Log**.
Expected: button → "Saving..." → "Saved" (disabled), "✓ Saved to your fish log!" message.

- [ ] **Step 3: Verify the row and the photo object** via `execute_sql`:

```sql
select i.scientific_name, i.common_name, i.confidence,
       jsonb_array_length(i.candidates) as n_candidates,
       i.photo_path is not null as has_photo
from public.identifications i;

select count(*) as objects from storage.objects where bucket_id = 'fish-photos';
```

Expected: one row — `Amphiprion percula`, common name `Orange clownfish` (from wiki), confidence ~88, `n_candidates` 2, `has_photo` true; one storage object.

- [ ] **Step 4: Fish-log page** — navigate to `/fish-log`.
Expected: one card with the actual uploaded photo rendering (signed URL), "Orange clownfish", *Amphiprion percula*, 88% badge, today's date, "Also possible: Amphiprion ocellaris".

- [ ] **Step 5: Persistence** — reload `/fish-log`.
Expected: entry still renders (data comes from Postgres, not localStorage).

- [ ] **Step 6: Signed-out state** — log out, visit `/fish-log`.
Expected: "Sign in to see your log" card, no entries leak.

- [ ] **Step 7: Delete flow** — sign back in, on `/fish-log` click the trash icon (turns into red "Confirm?"), click again.
Expected: card disappears. Verify via `execute_sql`:

```sql
select (select count(*) from public.identifications) as rows,
       (select count(*) from storage.objects where bucket_id = 'fish-photos') as objects;
```

Expected: both `0` (row and storage object both removed).

- [ ] **Step 8: Clean up + push**

Via `execute_sql`: `delete from auth.users where email = 'kabrahrishi+phase5test@gmail.com'; delete from public.identify_events;`
Then stop the dev server and:

```bash
git push origin main
```

(Vercel auto-deploys; production gets the fish log with env vars already in place.)

---

## Done criteria (spec §8 Phase 5)

- A saved identification survives a redeploy/reload and renders with its photo (Steps 4–5: served from Postgres + Storage, not browser state).
- "Coming soon" placeholder and the mock-history code path no longer exist (the placeholder file is fully replaced; the mock `/api/fish/history` died with Flask in Phase 1).
- Delete-from-log removes both the row and the storage object.

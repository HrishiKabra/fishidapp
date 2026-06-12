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

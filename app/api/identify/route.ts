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

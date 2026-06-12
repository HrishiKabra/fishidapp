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

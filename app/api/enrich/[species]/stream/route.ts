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

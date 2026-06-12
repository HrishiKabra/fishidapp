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

import { describe, it, expect } from "vitest"
import { parseEnrichment, enrichmentPrompt } from "@/lib/enrichment"

describe("parseEnrichment", () => {
  const full = `## About
A friendly fish.

## Visual Cues
• **Stripes**: white bars.
• **Color**: orange.
• **Fins**: rounded.

## Fun Fact
They are all born male.`

  it("parses all three sections from complete text", () => {
    const s = parseEnrichment(full)
    expect(s.description).toBe("A friendly fish.")
    expect(s.visual_cues).toContain("**Stripes**")
    expect(s.fun_fact).toBe("They are all born male.")
  })

  it("fills sections progressively from partial (streaming) text", () => {
    const partial = full.substring(0, full.indexOf("## Fun Fact"))
    const s = parseEnrichment(partial)
    expect(s.description).toBe("A friendly fish.")
    expect(s.visual_cues).toContain("**Fins**")
    expect(s.fun_fact).toBe("")
  })

  it("returns empty sections for garbage", () => {
    const s = parseEnrichment("I cannot help with that.")
    expect(s.description).toBe("")
    expect(s.visual_cues).toBe("")
    expect(s.fun_fact).toBe("")
  })

  it("prompt pins the exact section structure", () => {
    const p = enrichmentPrompt("Amphiprion percula")
    expect(p).toContain("## About")
    expect(p).toContain("## Visual Cues")
    expect(p).toContain("## Fun Fact")
    expect(p).toContain("Amphiprion percula")
  })
})

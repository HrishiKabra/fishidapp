import { describe, it, expect, beforeEach, vi } from "vitest"

const state = vi.hoisted(() => ({
  user: { id: "user-1" } as { id: string } | null,
  cacheRow: null as { data: unknown } | null,
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
  }),
}))

vi.mock("@/lib/server/supabase-admin", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.cacheRow }) }) }),
    }),
  },
}))

vi.mock("@/lib/server/wiki", () => ({
  fetchWikiSummary: async () => ({ intro: "wiki intro", image_url: null, common_name: "Testfish", url: null }),
}))

import { GET } from "@/app/api/enrich/[species]/route"

const params = { params: { species: "Testus%20fishus" } }

beforeEach(() => {
  state.user = { id: "user-1" }
  state.cacheRow = null
})

describe("GET /api/enrich/[species]", () => {
  it("401s without a session", async () => {
    state.user = null
    const res = await GET(new Request("http://test/api/enrich/x"), params)
    expect(res.status).toBe(401)
  })

  it("returns the cached record on a hit", async () => {
    state.cacheRow = { data: { description: "cached desc", visual_cues: "", fun_fact: "", wiki: null } }
    const res = await GET(new Request("http://test/api/enrich/x"), params)
    const body = await res.json()
    expect(body.cached).toBe(true)
    expect(body.data.description).toBe("cached desc")
  })

  it("returns wiki-only with cached:false on a miss", async () => {
    const res = await GET(new Request("http://test/api/enrich/x"), params)
    const body = await res.json()
    expect(body.cached).toBe(false)
    expect(body.wiki.common_name).toBe("Testfish")
  })
})

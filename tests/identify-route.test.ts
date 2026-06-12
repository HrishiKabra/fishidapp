import { describe, it, expect, beforeEach, vi } from "vitest"

const state = vi.hoisted(() => ({
  user: { id: "user-1" } as { id: string } | null,
  count: 0,
  fish: [] as { candidates: { name: string; accuracy: number }[] }[],
  inserted: [] as unknown[],
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
  }),
}))

vi.mock("@/lib/server/supabase-admin", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ gte: async () => ({ count: state.count }) }) }),
      insert: async (row: unknown) => {
        state.inserted.push(row)
        return {}
      },
    }),
  },
}))

vi.mock("@/lib/server/fishial", () => ({
  recognizeFish: async () => state.fish,
}))

import { POST } from "@/app/api/identify/route"

function makeRequest(withImage = true, bytes = 16) {
  const form = new FormData()
  if (withImage) {
    form.append("image", new File([new Uint8Array(bytes)], "f.jpg", { type: "image/jpeg" }))
  }
  return new Request("http://test/api/identify", { method: "POST", body: form })
}

beforeEach(() => {
  state.user = { id: "user-1" }
  state.count = 0
  state.fish = [{ candidates: [{ name: "A", accuracy: 0.9 }] }]
  state.inserted = []
})

describe("POST /api/identify", () => {
  it("401s without a session", async () => {
    state.user = null
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
  })

  it("429s past the rate limit", async () => {
    state.count = 10
    const res = await POST(makeRequest())
    expect(res.status).toBe(429)
  })

  it("400s without an image", async () => {
    const res = await POST(makeRequest(false))
    expect(res.status).toBe(400)
  })

  it("422s when no fish detected", async () => {
    state.fish = []
    const res = await POST(makeRequest())
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toBe("no_fish")
  })

  it("returns the most confident fish's candidates and counts the others", async () => {
    state.fish = [
      { candidates: [{ name: "B", accuracy: 0.4 }] },
      {
        candidates: [
          { name: "A", accuracy: 0.9 },
          { name: "C", accuracy: 0.2 },
        ],
      },
    ]
    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.result.candidates[0].name).toBe("A")
    expect(body.result.otherFishCount).toBe(1)
    expect(state.inserted).toHaveLength(1) // rate-limit event recorded
  })
})

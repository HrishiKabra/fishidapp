import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest"

// Env must exist before the module loads (it validates at import).
let recognizeFish: typeof import("@/lib/server/fishial").recognizeFish

beforeAll(async () => {
  process.env.FISHIAL_CLIENT_ID = "test-id"
  process.env.FISHIAL_SECRET = "test-secret"
  ;({ recognizeFish } = await import("@/lib/server/fishial"))
})

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

const recognitionPayload = {
  results: [
    {
      species: [
        { name: "Amphiprion percula", accuracy: 0.9 },
        { name: "Amphiprion ocellaris", accuracy: 0.5 },
        { name: "Amphiprion clarkii", accuracy: 0.3 },
        { name: "Amphiprion frenatus", accuracy: 0.1 },
      ],
    },
    { species: [] },
  ],
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe("recognizeFish", () => {
  it("uploads and maps the top-3 candidates, dropping fish with no candidates", async () => {
    const fetchMock = vi.fn(async (url: any, init?: any) => {
      const u = String(url)
      if (u.includes("auth/token")) return jsonRes({ access_token: "tok" })
      if (u.includes("recognition/upload"))
        return jsonRes({
          "signed-id": "sid-1",
          "direct-upload": { url: "https://storage.test/put", headers: { "Content-Disposition": "cd" } },
        })
      if (u === "https://storage.test/put") return new Response(null, { status: 200 })
      if (u.includes("recognition/image")) return jsonRes(recognitionPayload)
      throw new Error(`unexpected fetch: ${u}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    const fish = await recognizeFish(new Uint8Array([1, 2, 3]).buffer)

    expect(fish).toHaveLength(1) // empty-species fish filtered out
    expect(fish[0].candidates).toHaveLength(3) // sliced to top-3
    expect(fish[0].candidates[0]).toEqual({ name: "Amphiprion percula", accuracy: 0.9 })
    const putCall = fetchMock.mock.calls.find((c) => String(c[0]) === "https://storage.test/put")
    expect(putCall?.[1]?.method).toBe("PUT")
  })

  it("throws on upstream failure instead of returning garbage", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: any) => {
        if (String(url).includes("auth/token")) return jsonRes({ access_token: "tok" })
        return new Response("boom", { status: 500 })
      }),
    )
    await expect(recognizeFish(new Uint8Array([1]).buffer)).rejects.toThrow(/Fishial/)
  })
})

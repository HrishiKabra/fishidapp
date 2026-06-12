import { createHash } from "crypto"

const AUTH_URL = "https://api-users.fishial.ai/v1/auth/token"
const API_BASE = "https://api.fishial.ai/v1"

const clientId = process.env.FISHIAL_CLIENT_ID
const clientSecret = process.env.FISHIAL_SECRET

if (!clientId || !clientSecret) {
  throw new Error("Missing FISHIAL_CLIENT_ID or FISHIAL_SECRET")
}

export interface FishialCandidate {
  name: string // scientific name
  accuracy: number // 0..1
}

export interface DetectedFish {
  candidates: FishialCandidate[] // ranked, top 3
}

// Token is valid ~10 min; cache per warm serverless instance, refresh 60s early.
let tokenCache = { token: "", expiresAt: 0 }

async function getToken(force = false): Promise<string> {
  if (!force && Date.now() < tokenCache.expiresAt - 60_000) return tokenCache.token
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  })
  if (!res.ok) throw new Error(`Fishial auth failed: ${res.status}`)
  const { access_token } = await res.json()
  tokenCache = { token: access_token, expiresAt: Date.now() + 9 * 60_000 }
  return access_token
}

async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  let token = await getToken()
  let res = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } })
  if (res.status === 401) {
    token = await getToken(true)
    res = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } })
  }
  return res
}

export async function recognizeFish(image: ArrayBuffer): Promise<DetectedFish[]> {
  const bytes = Buffer.from(image)
  const checksum = createHash("md5").update(bytes).digest("base64")

  // a) request a signed upload slot
  const slotRes = await authedFetch(`${API_BASE}/recognition/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      blob: {
        filename: "upload.jpg",
        content_type: "image/jpeg",
        byte_size: bytes.byteLength,
        checksum,
      },
    }),
  })
  if (!slotRes.ok) throw new Error(`Fishial upload-slot failed: ${slotRes.status}`)
  const slot = await slotRes.json()
  const signedId: string = slot["signed-id"]
  const uploadUrl: string = slot["direct-upload"]["url"]
  const contentDisposition: string = slot["direct-upload"]["headers"]["Content-Disposition"]

  // b) PUT the bytes to storage — Content-Type must be the empty string per Fishial docs
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    body: bytes,
    headers: {
      "Content-Disposition": contentDisposition,
      "Content-Md5": checksum,
      "Content-Type": "",
    },
  })
  if (!putRes.ok) throw new Error(`Fishial image upload failed: ${putRes.status}`)

  // c) recognition
  const recRes = await authedFetch(`${API_BASE}/recognition/image?q=${encodeURIComponent(signedId)}`)
  if (!recRes.ok) throw new Error(`Fishial recognition failed: ${recRes.status}`)
  const { results } = await recRes.json()

  return (results ?? [])
    .map((fish: any) => ({
      candidates: (fish.species ?? [])
        .slice(0, 3)
        .map((s: any) => ({ name: s.name as string, accuracy: Number(s.accuracy) })),
    }))
    .filter((f: DetectedFish) => f.candidates.length > 0)
}

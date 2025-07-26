import { type NextRequest, NextResponse } from "next/server"
import { withRateLimit, strictLimiter } from "@/lib/rate-limit-middleware"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production"

// Mock fish identification results
const mockResults = [
  {
    scientific: "Dasyatis pastinaca",
    common_name: "Common Stingray",
    confidence: 92,
    intro:
      "The common stingray is a species of stingray in the family Dasyatidae, found in the northeastern Atlantic Ocean and the Mediterranean and Black Sea.",
  },
  {
    scientific: "Paracanthurus hepatus",
    common_name: "Blue Tang",
    confidence: 88,
    intro: "The blue tang is a species of Indo-Pacific surgeonfish living in coral reefs.",
  },
  {
    scientific: "Amphiprion ocellaris",
    common_name: "Clownfish",
    confidence: 95,
    intro:
      "The clownfish is a marine fish living in warm waters, known for its symbiotic relationship with sea anemones.",
  },
]

async function identifyHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const { imageData, userId } = await request.json()

    // Validate required fields
    if (!imageData) {
      return NextResponse.json({ error: "Image data is required" }, { status: 400 })
    }

    // Optional: Verify user token if provided
    let user = null
    if (userId) {
      const authHeader = request.headers.get("authorization")
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7)
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string }
          if (decoded.userId === userId) {
            user = decoded
          }
        } catch (error) {
          // Invalid token, but we'll still process the request for anonymous users
          console.warn("Invalid token provided:", error)
        }
      }
    }

    // Simulate AI processing time
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Return a random mock result
    const result = mockResults[Math.floor(Math.random() * mockResults.length)]

    // Add some randomness to confidence
    const confidence = Math.max(75, Math.min(98, result.confidence + (Math.random() - 0.5) * 10))

    const response = {
      success: true,
      result: {
        ...result,
        confidence: Math.round(confidence),
        processed_at: new Date().toISOString(),
        user_id: user?.userId || null,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Fish identification error:", error)
    return NextResponse.json({ error: "Failed to identify fish. Please try again." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return withRateLimit(strictLimiter, "fish/identify")(request, identifyHandler)
}

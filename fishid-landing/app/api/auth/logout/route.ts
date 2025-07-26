import { type NextRequest, NextResponse } from "next/server"
import { withRateLimit, generalLimiter } from "@/lib/rate-limit-middleware"

async function logoutHandler(request: NextRequest): Promise<NextResponse> {
  try {
    // In a real app with server-side sessions, you'd invalidate the session here
    // For JWT tokens, logout is typically handled client-side by removing the token
    // But we can still provide an endpoint for consistency and potential future use

    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    })
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return withRateLimit(generalLimiter, "auth/logout")(request, logoutHandler)
}

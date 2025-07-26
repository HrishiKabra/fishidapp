import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { withRateLimit, generalLimiter } from "@/lib/rate-limit-middleware"

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production"

// In a real app, you'd use a proper database
const users: Array<{
  id: string
  email: string
  name: string
  password: string
  createdAt: string
}> = []

async function verifyHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    // Verify JWT token
    let decoded: { userId: string; email: string }
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string }
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        return NextResponse.json({ error: "Token has expired" }, { status: 401 })
      }
      if (jwtError instanceof jwt.JsonWebTokenError) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 })
      }
      throw jwtError
    }

    // Find user
    const user = users.find((u) => u.id === decoded.userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Return user data (without password)
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
      createdAt: user.createdAt,
    }

    return NextResponse.json({
      success: true,
      user: userData,
    })
  } catch (error) {
    console.error("Token verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return withRateLimit(generalLimiter, "auth/verify")(request, verifyHandler)
}

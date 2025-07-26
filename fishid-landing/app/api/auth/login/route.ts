import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { withRateLimit, authLimiter } from "@/lib/rate-limit-middleware"

// In a real app, you'd use a proper database
const users: Array<{
  id: string
  email: string
  name: string
  password: string
  createdAt: string
  loginAttempts?: number
  lockoutUntil?: number
}> = []

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production"
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_TIME = 30 * 60 * 1000 // 30 minutes

async function loginHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const { email, password } = await request.json()

    // Validation
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Find user
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Check if account is locked
    if (user.lockoutUntil && Date.now() < user.lockoutUntil) {
      const remainingTime = Math.ceil((user.lockoutUntil - Date.now()) / 1000 / 60)
      return NextResponse.json(
        {
          error: `Account temporarily locked due to too many failed attempts. Try again in ${remainingTime} minutes.`,
          lockoutUntil: new Date(user.lockoutUntil).toISOString(),
        },
        { status: 423 }, // 423 Locked
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      // Increment login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1

      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockoutUntil = Date.now() + LOCKOUT_TIME
        return NextResponse.json(
          {
            error: "Too many failed login attempts. Account locked for 30 minutes.",
            lockoutUntil: new Date(user.lockoutUntil).toISOString(),
          },
          { status: 423 },
        )
      }

      const attemptsRemaining = MAX_LOGIN_ATTEMPTS - user.loginAttempts
      return NextResponse.json(
        {
          error: `Invalid email or password. ${attemptsRemaining} attempts remaining.`,
          attemptsRemaining,
        },
        { status: 401 },
      )
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0
    user.lockoutUntil = undefined

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    )

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
      message: "Login successful",
      user: userData,
      token,
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return withRateLimit(authLimiter, "auth/login")(request, loginHandler)
}

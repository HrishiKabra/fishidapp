"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Mail, Lock, User, Loader2, AlertCircle, CheckCircle, Clock, Settings } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { ApiError } from "@/lib/api"
import { BackendStatus } from "./backend-status"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [resetTime, setResetTime] = useState<string | null>(null)
  const [showBackendStatus, setShowBackendStatus] = useState(false)
  const { login, signup, loading } = useAuth()

  const resetForm = () => {
    setEmail("")
    setPassword("")
    setName("")
    setError("")
    setSuccess("")
    setIsRateLimited(false)
    setResetTime(null)
  }

  const formatResetTime = (resetTimeStr: string): string => {
    const resetDate = new Date(resetTimeStr)
    const now = new Date()
    const diffMs = resetDate.getTime() - now.getTime()
    const diffMinutes = Math.ceil(diffMs / (1000 * 60))

    if (diffMinutes <= 1) {
      return "less than a minute"
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minutes`
    } else {
      const hours = Math.floor(diffMinutes / 60)
      const minutes = diffMinutes % 60
      return `${hours} hour${hours > 1 ? "s" : ""}${minutes > 0 ? ` and ${minutes} minutes` : ""}`
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsRateLimited(false)
    setResetTime(null)

    // Basic validation
    if (!email || !password || (!isLogin && !name)) {
      setError("Please fill in all required fields")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    try {
      if (isLogin) {
        await login(email, password)
        setSuccess("Login successful!")
      } else {
        await signup(email, password, name)
        setSuccess("Account created successfully!")
      }

      // Close modal after short delay to show success message
      setTimeout(() => {
        onClose()
        resetForm()
      }, 1500)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.rateLimitExceeded) {
          setIsRateLimited(true)
          setResetTime(err.resetTime || null)
          setError(err.message)
        } else if (err.status === 0) {
          // Connection error - show backend status option
          setError(`${err.message} Click "Check Backend" to diagnose the issue.`)
        } else {
          setError(err.message)
        }
      } else {
        setError(err instanceof Error ? err.message : "Authentication failed")
      }
    }
  }

  const switchMode = () => {
    setIsLogin(!isLogin)
    setError("")
    setSuccess("")
    setIsRateLimited(false)
    setResetTime(null)
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={() => {
                onClose()
                resetForm()
              }}
              disabled={loading}
            >
              <X className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-12 top-2"
              onClick={() => setShowBackendStatus(true)}
              title="Check Backend Status"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <CardTitle className="text-2xl text-center text-[#0d2a50]">
              {isLogin ? "Welcome Back" : "Join FishID"}
            </CardTitle>
            <p className="text-center text-gray-600">
              {isLogin ? "Sign in to your account" : "Create your account to start logging fish"}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      required={!isLogin}
                      disabled={loading || isRateLimited}
                      minLength={2}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading || isRateLimited}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading || isRateLimited}
                    minLength={6}
                  />
                </div>
                {!isLogin && <p className="text-xs text-gray-500">Password must be at least 6 characters long</p>}
              </div>

              {/* Rate limit message */}
              {isRateLimited && resetTime && (
                <div className="flex items-start space-x-2 text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-200">
                  <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Rate limit exceeded</p>
                    <p>Please try again in {formatResetTime(resetTime)}</p>
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && !isRateLimited && (
                <div className="space-y-2">
                  <div className="flex items-start space-x-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{error}</span>
                  </div>
                  {error.includes("Unable to connect") && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBackendStatus(true)}
                      className="w-full"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Check Backend Status
                    </Button>
                  )}
                </div>
              )}

              {/* Success message */}
              {success && (
                <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{success}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-[#2e9eb3] hover:bg-[#138094] text-white"
                disabled={loading || isRateLimited}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isLogin ? "Signing In..." : "Creating Account..."}
                  </>
                ) : isRateLimited ? (
                  "Rate Limited"
                ) : isLogin ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button
                  type="button"
                  onClick={switchMode}
                  className="ml-1 text-[#2e9eb3] hover:text-[#138094] font-medium"
                  disabled={loading || isRateLimited}
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <BackendStatus isOpen={showBackendStatus} onClose={() => setShowBackendStatus(false)} />
    </>
  )
}

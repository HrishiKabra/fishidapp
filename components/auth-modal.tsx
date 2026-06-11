"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Mail, Lock, User, Loader2, AlertCircle, CheckCircle, Clock, Settings, Fish } from "lucide-react"
import { authApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { BackendStatus } from "./backend-status"
import { FishIconSelector } from "./fish-icon-selector"
import Image from "next/image"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [resetTime, setResetTime] = useState("")
  const [showBackendStatus, setShowBackendStatus] = useState(false)
  const [selectedIcon, setSelectedIcon] = useState("/images/fish-icons/001-gold-fish.png")
  const [showIconSelector, setShowIconSelector] = useState(false)
  const { login, signup } = useAuth()

  const resetForm = () => {
    setName("")
    setEmail("")
    setPassword("")
    setError("")
    setSuccess("")
    setSelectedIcon("/images/fish-icons/001-gold-fish.png")
  }

  const formatResetTime = (resetTimeStr: string): string => {
    const resetDate = new Date(resetTimeStr)
    const now = new Date()
    const diffMs = resetDate.getTime() - now.getTime()
    const diffMins = Math.ceil(diffMs / (1000 * 60))
    return `${diffMins} minute${diffMins !== 1 ? "s" : ""}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      if (isLogin) {
        await login(email, password)
        setSuccess("Login successful!")
        setTimeout(() => {
          onClose()
          resetForm()
        }, 1000)
      } else {
        await signup(email, password, name, selectedIcon)
        setSuccess("Account created successfully!")
        setTimeout(() => {
          onClose()
          resetForm()
        }, 1000)
      }
    } catch (error: any) {
      if (error.message?.includes("rate limit")) {
        setIsRateLimited(true)
        setResetTime(error.resetTime || "")
      } else {
        setError(error.message || "An error occurred")
      }
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setIsLogin(!isLogin)
    setError("")
    setSuccess("")
    if (!isLogin) {
      resetForm()
    }
  }

  useEffect(() => {
    if (isOpen) {
      resetForm()
    }
  }, [isOpen])

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
                <>
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

                  {/* Fish Icon Selection */}
                  <div className="space-y-2">
                    <Label>Choose Your Fish Icon</Label>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                        <Image
                          src={selectedIcon}
                          alt="Selected fish icon"
                          width={48}
                          height={48}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowIconSelector(true)}
                        disabled={loading || isRateLimited}
                        className="flex items-center space-x-2"
                      >
                        <Fish className="w-4 h-4" />
                        <span>Change Icon</span>
                      </Button>
                    </div>
                  </div>
                </>
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
                <div className="flex items-start space-x-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
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
                ) : (
                  isLogin ? "Sign In" : "Create Account"
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-[#2e9eb3] hover:text-[#138094] text-sm"
                  disabled={loading}
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <BackendStatus isOpen={showBackendStatus} onClose={() => setShowBackendStatus(false)} />
      <FishIconSelector
        isOpen={showIconSelector}
        onClose={() => setShowIconSelector(false)}
        onSelect={setSelectedIcon}
        currentIcon={selectedIcon}
        title="Choose Your Fish Icon"
      />
    </>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Mail, Lock, User, Loader2, AlertCircle, CheckCircle, Fish, MailCheck } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { FishIconSelector } from "./fish-icon-selector"
import Image from "next/image"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [checkEmail, setCheckEmail] = useState(false)
  const [selectedIcon, setSelectedIcon] = useState("/images/fish-icons/001-gold-fish.png")
  const [showIconSelector, setShowIconSelector] = useState(false)
  const { login, signup, signInWithGoogle } = useAuth()

  const resetForm = () => {
    setName("")
    setEmail("")
    setPassword("")
    setError("")
    setSuccess("")
    setCheckEmail(false)
    setSelectedIcon("/images/fish-icons/001-gold-fish.png")
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
        const { needsEmailConfirmation } = await signup(email, password, name, selectedIcon)
        if (needsEmailConfirmation) {
          setCheckEmail(true)
        } else {
          setSuccess("Account created successfully!")
          setTimeout(() => {
            onClose()
            resetForm()
          }, 1000)
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError("")
    try {
      await signInWithGoogle()
      // Full-page redirect to Google follows; no further state changes needed.
    } catch (err: any) {
      setError(err.message || "Google sign-in failed")
    }
  }

  const switchMode = () => {
    setIsLogin(!isLogin)
    setError("")
    setSuccess("")
    setCheckEmail(false)
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
            <CardTitle className="text-2xl text-center text-[#0d2a50]">
              {isLogin ? "Welcome Back" : "Join FishID"}
            </CardTitle>
            <p className="text-center text-gray-600">
              {isLogin ? "Sign in to your account" : "Create your account to start logging fish"}
            </p>
          </CardHeader>
          <CardContent>
            {checkEmail ? (
              <div className="space-y-4 text-center py-4">
                <MailCheck className="w-12 h-12 mx-auto text-[#2e9eb3]" />
                <div>
                  <p className="font-medium text-gray-900">Check your email</p>
                  <p className="text-sm text-gray-600 mt-1">
                    We sent a confirmation link to <span className="font-medium">{email}</span>.
                    Click it to activate your account, then sign in.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setIsLogin(true)
                    setCheckEmail(false)
                    setPassword("")
                  }}
                >
                  Back to sign in
                </Button>
              </div>
            ) : (
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
                          disabled={loading}
                          minLength={2}
                        />
                      </div>
                    </div>

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
                          disabled={loading}
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
                      disabled={loading}
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
                      disabled={loading}
                      minLength={8}
                    />
                  </div>
                  {!isLogin && (
                    <p className="text-xs text-gray-500">Password must be at least 8 characters long</p>
                  )}
                </div>

                {error && (
                  <div className="flex items-start space-x-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {success && (
                  <div className="flex items-start space-x-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{success}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-[#2e9eb3] hover:bg-[#138094] text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isLogin ? "Signing In..." : "Creating Account..."}
                    </>
                  ) : isLogin ? (
                    "Sign In"
                  ) : (
                    "Create Account"
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">or</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogle}
                  disabled={loading}
                >
                  <GoogleIcon />
                  <span className="ml-2">Continue with Google</span>
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
            )}
          </CardContent>
        </Card>
      </div>

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

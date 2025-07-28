"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { authApi, ApiError } from "./api"

interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  checkAuthStatus: () => Promise<boolean>
  loading: boolean
  isInitialized: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = "fishid_auth_token"
const USER_KEY = "fishid_user"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize auth state on app start
  useEffect(() => {
    initializeAuth()
  }, [])

  // Add a retry mechanism for auth initialization
  useEffect(() => {
    if (isInitialized && !user) {
      // If auth is initialized but no user, try one more time after a delay
      const retryTimer = setTimeout(() => {
        console.log("🔄 Retrying auth initialization...")
        initializeAuth()
      }, 2000)
      
      return () => clearTimeout(retryTimer)
    }
  }, [isInitialized, user])

  // Set up periodic auth check to keep user logged in
  useEffect(() => {
    if (user) {
      // Check auth status every 5 minutes
      const interval = setInterval(async () => {
        console.log("🔄 Periodic auth check...")
        const isValid = await checkAuthStatus()
        if (!isValid) {
          console.log("❌ Periodic check failed, user logged out")
        }
      }, 5 * 60 * 1000) // 5 minutes

      return () => clearInterval(interval)
    }
  }, [user])

  const initializeAuth = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      const storedUser = localStorage.getItem(USER_KEY)

      console.log("🔐 Initializing auth...", { 
        hasToken: !!token, 
        hasStoredUser: !!storedUser,
        tokenLength: token?.length,
        tokenPreview: token ? `${token.substring(0, 20)}...` : null
      })

      if (token && storedUser) {
        try {
          console.log("🔐 Verifying stored token...")
          const response = await authApi.verifyToken(token)

          console.log("🔍 Token verification response:", response)

          if (response.success && response.user) {
            console.log("✅ Token valid, user logged in:", response.user)
            setUser(response.user)
          } else {
            console.log("❌ Token invalid, clearing storage")
            clearAuthData()
          }
        } catch (error) {
          console.log("❌ Token verification failed:", error)
          
          // Try to use stored user data as fallback
          try {
            const parsedUser = JSON.parse(storedUser)
            console.log("🔄 Attempting fallback with stored user data:", parsedUser)
            
            // Set user from stored data temporarily
            setUser(parsedUser)
            
            // Try to refresh the token in background
            setTimeout(async () => {
              try {
                console.log("🔄 Attempting token refresh...")
                const refreshResponse = await authApi.verifyToken(token)
                if (refreshResponse.success && refreshResponse.user) {
                  console.log("✅ Token refresh successful")
                  setUser(refreshResponse.user)
                  localStorage.setItem(USER_KEY, JSON.stringify(refreshResponse.user))
                } else {
                  console.log("❌ Token refresh failed, logging out")
                  clearAuthData()
                }
              } catch (refreshError) {
                console.log("❌ Token refresh error:", refreshError)
                clearAuthData()
              }
            }, 1000)
          } catch (parseError) {
            console.log("❌ Failed to parse stored user data:", parseError)
            clearAuthData()
          }
        }
      } else {
        console.log("📝 No stored auth data found")
        console.log("🔍 localStorage contents:", {
          token: localStorage.getItem(TOKEN_KEY),
          user: localStorage.getItem(USER_KEY)
        })
      }
    } catch (error) {
      console.error("Auth initialization error:", error)
      clearAuthData()
    } finally {
      setIsInitialized(true)
      console.log("✅ Auth initialization complete, user state:", !!user)
    }
  }

  const clearAuthData = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      console.log("🔐 Attempting login for:", email)
      const response = await authApi.login(email, password)

      if (response.success && response.user && response.token) {
        console.log("✅ Login successful:", response.user)

        // Create user object with avatar
        const userData = {
          ...response.user,
          avatar: response.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${response.user.email}`,
        }

        setUser(userData)
        localStorage.setItem(TOKEN_KEY, response.token)
        localStorage.setItem(USER_KEY, JSON.stringify(userData))
      } else {
        throw new Error("Login failed - invalid response")
      }
    } catch (error) {
      console.error("❌ Login error:", error)
      if (error instanceof ApiError) {
        throw new Error(error.message)
      }
      throw new Error("Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const signup = async (email: string, password: string, name: string) => {
    setLoading(true)
    try {
      console.log("📝 Attempting signup for:", email)
      const response = await authApi.signup(email, password, name)

      if (response.success && response.user && response.token) {
        console.log("✅ Signup successful:", response.user)

        // Create user object with avatar
        const userData = {
          ...response.user,
          avatar: response.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${response.user.email}`,
        }

        setUser(userData)
        localStorage.setItem(TOKEN_KEY, response.token)
        localStorage.setItem(USER_KEY, JSON.stringify(userData))
      } else {
        throw new Error("Signup failed - invalid response")
      }
    } catch (error) {
      console.error("❌ Signup error:", error)
      if (error instanceof ApiError) {
        throw new Error(error.message)
      }
      throw new Error("Signup failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoading(true)
    try {
      console.log("🚪 Logging out...")
      await authApi.logout()
    } catch (error) {
      console.error("Logout API error:", error)
    } finally {
      clearAuthData()
      setLoading(false)
      console.log("✅ Logout complete")
    }
  }

  const checkAuthStatus = async (): Promise<boolean> => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      return false
    }

    try {
      const response = await authApi.verifyToken(token)
      if (response.success && response.user) {
        setUser(response.user)
        return true
      } else {
        clearAuthData()
        return false
      }
    } catch (error) {
      console.log("❌ Auth check failed:", error)
      clearAuthData()
      return false
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        checkAuthStatus,
        loading,
        isInitialized,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

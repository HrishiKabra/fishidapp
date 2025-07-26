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

  const initializeAuth = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      const storedUser = localStorage.getItem(USER_KEY)

      if (token && storedUser) {
        // Verify token is still valid
        try {
          const response = await authApi.verifyToken(token)
          if (response.success && response.user) {
            setUser(response.user)
          } else {
            // Token invalid, clear storage
            clearAuthData()
          }
        } catch (error) {
          // Token verification failed, clear storage
          clearAuthData()
        }
      }
    } catch (error) {
      console.error("Auth initialization error:", error)
      clearAuthData()
    } finally {
      setIsInitialized(true)
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
      const response = await authApi.login(email, password)

      if (response.success && response.user && response.token) {
        setUser(response.user)
        localStorage.setItem(TOKEN_KEY, response.token)
        localStorage.setItem(USER_KEY, JSON.stringify(response.user))
      } else {
        throw new Error("Login failed")
      }
    } catch (error) {
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
      const response = await authApi.signup(email, password, name)

      if (response.success && response.user && response.token) {
        setUser(response.user)
        localStorage.setItem(TOKEN_KEY, response.token)
        localStorage.setItem(USER_KEY, JSON.stringify(response.user))
      } else {
        throw new Error("Signup failed")
      }
    } catch (error) {
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
      // Call logout endpoint (optional for JWT)
      await authApi.logout()
    } catch (error) {
      // Even if logout API fails, we still clear local data
      console.error("Logout API error:", error)
    } finally {
      clearAuthData()
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
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

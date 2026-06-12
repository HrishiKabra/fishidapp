"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "./supabase/client"

const DEFAULT_FISH_ICON = "/images/fish-icons/001-gold-fish.png"

interface User {
  id: string
  email: string
  name: string
  fish_icon?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  signup: (
    email: string,
    password: string,
    name: string,
    fishIcon?: string,
  ) => Promise<{ needsEmailConfirmation: boolean }>
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  updateFishIcon: (fishIcon: string) => Promise<void>
  loading: boolean
  isInitialized: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function buildUser(session: Session): Promise<User> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, fish_icon")
    .eq("id", session.user.id)
    .single()

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: profile?.username ?? session.user.email?.split("@")[0] ?? "User",
    fish_icon: profile?.fish_icon ?? DEFAULT_FISH_ICON,
  }
}

function friendlyAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "Incorrect email or password."
  }
  if (message.includes("Email not confirmed")) {
    return "Please confirm your email before signing in — check your inbox."
  }
  return message
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Supabase fires auth events on every window focus/token refresh. Keep the
  // previous object when nothing changed so consumers' effects don't re-fire.
  const applyUser = (next: User) =>
    setUser((prev) =>
      prev &&
      prev.id === next.id &&
      prev.email === next.email &&
      prev.name === next.name &&
      prev.fish_icon === next.fish_icon
        ? prev
        : next,
    )

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) applyUser(await buildUser(session))
      setIsInitialized(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null)
        return
      }
      // Deferred: awaiting supabase calls directly inside onAuthStateChange deadlocks.
      setTimeout(async () => applyUser(await buildUser(session)), 0)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(friendlyAuthError(error.message))
    } finally {
      setLoading(false)
    }
  }

  const signup = async (email: string, password: string, name: string, fishIcon?: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: name, fish_icon: fishIcon || DEFAULT_FISH_ICON },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw new Error(friendlyAuthError(error.message))
      return { needsEmailConfirmation: !data.session }
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) throw new Error(friendlyAuthError(error.message))
  }

  const logout = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
    } finally {
      setLoading(false)
    }
  }

  const updateFishIcon = async (fishIcon: string) => {
    if (!user) throw new Error("Not signed in")
    const { error } = await supabase
      .from("profiles")
      .update({ fish_icon: fishIcon })
      .eq("id", user.id)
    if (error) throw new Error("Failed to update fish icon. Please try again.")
    setUser({ ...user, fish_icon: fishIcon })
  }

  return (
    <AuthContext.Provider
      value={{ user, login, signup, signInWithGoogle, logout, updateFishIcon, loading, isInitialized }}
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

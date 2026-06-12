# FishID Phase 3: Auth Swap to Supabase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dead Flask JWT auth with Supabase Auth (cookie sessions via `@supabase/ssr`), including email/password with confirmation, Google sign-in, and profile-backed fish icons.

**Architecture:** A browser Supabase client feeds a rewritten `AuthProvider` (same context interface the rest of the app already consumes, so pages/dropdowns need no changes); root middleware refreshes session cookies; an `/auth/callback` route handler exchanges PKCE codes from both email-confirmation links and Google OAuth. All Flask auth machinery (`authApi`, `healthApi`, backend-status, localStorage tokens, keep-alive polling) is deleted.

**Tech Stack:** `@supabase/ssr`, `@supabase/supabase-js`, Next.js 14 App Router middleware + route handler.

**Context for workers:**
- Repo root: `/Users/hrishikabra/Desktop/Tulane/Projects/fishidapp` (the Next.js app)
- Supabase project ref `kxfqueaufrqitztwneks` ("fishid"); `.env.local` already has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Email confirmation is ON; Google provider is enabled and verified.
- The `profiles` table (`username`, `fish_icon`) is auto-populated by the `on_auth_user_created` trigger, which reads `raw_user_meta_data->>'username'` and `->>'fish_icon'` — so signup passes those via `options.data`.
- The context interface consumers: `components/user-dropdown.tsx` and `components/hamburger-menu.tsx` use `{ user, logout, updateFishIcon }` and `user.name/.email/.fish_icon`; `app/fish-icon-selector/page.tsx` uses `{ user, updateFishIcon }`; the four pages use `{ user }` / `{ user, isInitialized }`. Keep those names identical.
- `fishApi`/`speciesApi` still point at the dead Flask URL — that is expected until Phase 4. Phase 3 must not break the build around them, nothing more.
- There is no JS test infrastructure yet (it arrives in Phase 6); verification here = build + grep + scripted browser/SQL checks as specified.

---

### Task 1: Install Supabase packages

**Files:**
- Modify: `package.json` (via pnpm)

- [ ] **Step 1: Install**

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Verify**

Run: `grep '@supabase' package.json`
Expected: both `@supabase/ssr` and `@supabase/supabase-js` listed in dependencies.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "Add Supabase client packages"
```

### Task 2: Supabase client factories

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: Write `lib/supabase/client.ts`** (browser singleton — safe because `createBrowserClient` deduplicates per JS realm):

```ts
import { createBrowserClient } from "@supabase/ssr"

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)
```

- [ ] **Step 2: Write `lib/supabase/server.ts`** (for route handlers; Next 14's `cookies()` is synchronous):

```ts
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component without a writable cookie store —
            // safe to ignore when middleware is refreshing sessions.
          }
        },
      },
    },
  )
}
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm build 2>&1 | tail -3`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase
git commit -m "Add Supabase browser and server client factories"
```

### Task 3: Session-refresh middleware

**Files:**
- Create: `middleware.ts` (repo root, next to `package.json`)

- [ ] **Step 1: Write `middleware.ts`**

```ts
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refreshes the session cookie if expired; required for SSR auth to stay alive.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
```

- [ ] **Step 2: Verify**

Run: `pnpm build 2>&1 | tail -5`
Expected: build succeeds and the output lists `ƒ Middleware` (with a size) at the bottom of the route table.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "Add Supabase session-refresh middleware"
```

### Task 4: OAuth/email-confirmation callback route

**Files:**
- Create: `app/auth/callback/route.ts`

- [ ] **Step 1: Write the route handler** (both Google OAuth and email-confirmation links land here with a `?code=` to exchange):

```ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=callback_failed`)
}
```

- [ ] **Step 2: Verify**

Run: `pnpm build 2>&1 | tail -8`
Expected: build succeeds; route table now includes `ƒ /auth/callback`.

- [ ] **Step 3: Commit**

```bash
git add app/auth/callback/route.ts
git commit -m "Add auth callback route for OAuth and email confirmation"
```

### Task 5: Rewrite the auth context on Supabase

**Files:**
- Modify: `lib/auth-context.tsx` (full replacement)

Interface deltas vs. the old context (everything else keeps its exact name): `signup` now returns `{ needsEmailConfirmation: boolean }` (email confirmation is ON, so there is no session until the user clicks the link); `signInWithGoogle` is added; `checkAuthStatus` is removed (only the old context used it internally — verified by grep).

- [ ] **Step 1: Replace the entire file with:**

```tsx
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

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) setUser(await buildUser(session))
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
      setTimeout(async () => setUser(await buildUser(session)), 0)
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
```

- [ ] **Step 2: Verify no consumer breaks** (the only removed member is `checkAuthStatus`):

Run: `grep -rn "checkAuthStatus" app components lib --include="*.tsx" --include="*.ts" || echo CLEAN`
Expected: `CLEAN`

- [ ] **Step 3: Commit**

```bash
git add lib/auth-context.tsx
git commit -m "Rewrite auth context on Supabase Auth"
```

### Task 6: Rewrite the auth modal

**Files:**
- Modify: `components/auth-modal.tsx` (full replacement)

Changes: Google sign-in button; "check your email" success state after signup; removes `BackendStatus`, the Flask rate-limit machinery, and the `authApi` import. Keeps the existing visual style (`#0d2a50` heading, `#2e9eb3` buttons, same Card layout) and the fish-icon picker on signup.

- [ ] **Step 1: Replace the entire file with:**

```tsx
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
```

(Password minimum is 8 to match Supabase's default policy and the spec; the old UI said 6.)

- [ ] **Step 2: Commit**

```bash
git add components/auth-modal.tsx
git commit -m "Rewrite auth modal with Supabase login, signup confirmation state, and Google sign-in"
```

### Task 7: Delete Flask auth machinery

**Files:**
- Delete: `components/backend-status.tsx`
- Modify: `lib/api.ts` (remove `authApi` at lines 105–177 and `healthApi` at lines 259–473; keep `ApiError`, `apiCall`, `fishApi`, `speciesApi`)
- Modify: `app/page.tsx:32` and `app/results/page.tsx:99` (drop localStorage token reads)

- [ ] **Step 1: Delete the backend-status component**

```bash
git rm components/backend-status.tsx
```

- [ ] **Step 2: In `lib/api.ts`, delete the entire `export const authApi = { ... }` block and the entire `export const healthApi = { ... }` block.** Find their exact extents with:

Run: `grep -n "^export const" lib/api.ts`
Each block runs from its `export const` line to the line before the next top-level declaration. Delete both blocks including their trailing blank line.

- [ ] **Step 3: In `lib/api.ts`, make `saveToLog`'s token optional** (its callers no longer have a Flask token; the endpoint is dead until Phase 4 replaces it):

Change the signature line:

```ts
  async saveToLog(identificationId: string, token: string, notes?: string) {
```

to:

```ts
  async saveToLog(identificationId: string, token?: string, notes?: string) {
```

- [ ] **Step 4: In `app/page.tsx`, remove the token read.** Replace:

```ts
        const token = localStorage.getItem("fishid_auth_token")

        // Add debug logging
        console.log("🐟 Starting fish identification...")
        console.log("📁 File details:", {
          name: uploadResult.file.name,
          size: uploadResult.file.size,
          type: uploadResult.file.type,
        })
        console.log("👤 User ID:", user?.id)
        console.log("🔑 Token exists:", !!token)

        const response = await fishApi.identify(uploadResult.file, user?.id, token || undefined)
```

with:

```ts
        const response = await fishApi.identify(uploadResult.file, user?.id)
```

- [ ] **Step 5: In `app/results/page.tsx`, replace the token-gated save.** Replace:

```ts
      const token = localStorage.getItem("fishid_auth_token")
      if (!token) {
        throw new Error("Authentication required")
      }

      await fishApi.saveToLog(uploadedImageData.identification.id, token)
```

with:

```ts
      if (!user) {
        throw new Error("Authentication required")
      }

      await fishApi.saveToLog(uploadedImageData.identification.id)
```

- [ ] **Step 6: Verify nothing references the deleted machinery**

Run: `grep -rn "authApi\|healthApi\|backend-status\|BackendStatus\|fishid_auth_token\|fishid_user" app components lib --include="*.ts" --include="*.tsx" || echo CLEAN`
Expected: `CLEAN`

- [ ] **Step 7: Build**

Run: `pnpm build 2>&1 | tail -5`
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Delete Flask auth machinery: authApi, healthApi, backend-status, localStorage tokens"
```

### Task 8: End-to-end browser verification

No JS test infra exists yet (Phase 6); this is a scripted manual pass using the Playwright MCP browser plus SQL checks. Use a throwaway email `phase3-test@example.com`.

- [ ] **Step 1: Start the dev server** (background): `pnpm dev`

- [ ] **Step 2: Signup flow** — browse to `http://localhost:3000`, open the auth modal (Login button), switch to signup, fill name `Phase Three`, email `phase3-test@example.com`, password `Str0ng-Passw0rd-42!`, submit.
Expected: the modal shows the **"Check your email"** state (email confirmation is on).

- [ ] **Step 3: Confirm the email via SQL** (substitutes for clicking the emailed link):

Via Supabase MCP `execute_sql` on project `kxfqueaufrqitztwneks`:

```sql
update auth.users set email_confirmed_at = now() where email = 'phase3-test@example.com';
select username, fish_icon from public.profiles p join auth.users u on u.id = p.id
where u.email = 'phase3-test@example.com';
```

Expected: one profile row with `username = 'Phase Three'` (proves signup metadata flowed through the trigger).

- [ ] **Step 4: Login flow** — in the browser, sign in with the same credentials.
Expected: modal closes; the header shows the user dropdown with the name "Phase Three" and fish icon.

- [ ] **Step 5: Icon change** — navigate to `/fish-icon-selector`, pick a different icon, save. Then via `execute_sql`:

```sql
select fish_icon from public.profiles p join auth.users u on u.id = p.id
where u.email = 'phase3-test@example.com';
```

Expected: the new icon path (not `001-gold-fish.png`).

- [ ] **Step 6: Session survives reload** — reload the page.
Expected: still signed in (cookie session, no localStorage).

- [ ] **Step 7: Google redirect** — sign out, open the auth modal, click "Continue with Google".
Expected: full-page redirect to `accounts.google.com` with the consent screen. Do not complete the Google login (it's a real account flow); navigate back.

- [ ] **Step 8: Logout** — sign back in with the test account, then log out via the dropdown.
Expected: header returns to the signed-out state; reload stays signed out.

- [ ] **Step 9: Clean up the test user** via `execute_sql`:

```sql
delete from auth.users where email = 'phase3-test@example.com';
```

- [ ] **Step 10: Stop the dev server and push**

```bash
git push origin main
```

### Task 9: USER ACTION — Vercel env vars

- [ ] In **Vercel → fishid project → Settings → Environment Variables**, add for Production (and Preview):
  - `NEXT_PUBLIC_SUPABASE_URL` = `https://kxfqueaufrqitztwneks.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the `sb_publishable_...` key (same value as `.env.local`)
- [ ] Redeploy (the push from Task 8 will have queued a deploy that needs these vars; trigger a redeploy after adding them).
- [ ] Sanity-check production: open `https://fishid.vercel.app`, sign up with a real email you control, confirm via the actual email link, sign in. (This also exercises the production redirect URLs configured earlier.)

---

## Done criteria (spec §8 Phase 3)

- Register / login / logout / Google redirect / icon-change all work against Supabase (Task 8 evidence).
- No references remain to Flask auth endpoints, `authApi`, `healthApi`, `backend-status`, or localStorage tokens (Task 7 grep).
- Session is cookie-based and survives reload; the 5-minute keep-alive polling and retry machinery are gone (the rewritten context simply has none of it).

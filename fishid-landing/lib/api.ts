interface ApiResponse<T = any> {
  success: boolean
  message?: string
  error?: string
  user?: T
  token?: string
  access_token?: string
  rateLimitExceeded?: boolean
  resetTime?: string
}

class ApiError extends Error {
  status: number
  rateLimitExceeded?: boolean
  resetTime?: string

  constructor(message: string, status: number, rateLimitExceeded?: boolean, resetTime?: string) {
    super(message)
    this.status = status
    this.name = "ApiError"
    this.rateLimitExceeded = rateLimitExceeded
    this.resetTime = resetTime
  }
}

// Get the Flask backend URL from environment variables
const FLASK_API_URL = process.env.NEXT_PUBLIC_FLASK_API_URL || "http://localhost:5001"

// Debug logging
console.log("🔗 Flask API URL:", FLASK_API_URL)

async function apiCall<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${FLASK_API_URL}${endpoint}`

  console.log("📡 Making API call to:", url)
  console.log("📋 Request details:", {
    method: options.method || "GET",
    hasBody: !!options.body,
    bodyType: options.body instanceof FormData ? "FormData" : typeof options.body,
  })

  const config: RequestInit = {
    signal: AbortSignal.timeout(30000), // 30 second timeout for Render
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  }

  // Remove Content-Type for FormData requests
  if (options.body instanceof FormData) {
    delete config.headers!["Content-Type"]
    console.log("📎 Sending FormData request")
  }

  try {
    const response = await fetch(url, config)

    console.log("📊 Response status:", response.status)
    console.log("📋 Response headers:", Object.fromEntries(response.headers.entries()))

    // Handle non-JSON responses
    const contentType = response.headers.get("content-type")
    let data: any

    if (contentType && contentType.includes("application/json")) {
      data = await response.json()
      console.log("✅ JSON Response received:", data)
    } else {
      const text = await response.text()
      console.log("❌ Non-JSON response:", text.substring(0, 500))

      if (text.includes("Not Found")) {
        throw new ApiError(`API endpoint ${endpoint} not found on backend`, 404)
      }

      throw new ApiError("Invalid response from server", response.status)
    }

    if (!response.ok) {
      throw new ApiError(data.error || data.message || "Request failed", response.status)
    }

    return data
  } catch (error) {
    console.error("❌ API call error:", error)

    if (error instanceof ApiError) {
      throw error
    }

    if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new ApiError("Request timed out. Backend might be starting up.", 0)
    }

    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new ApiError(`Unable to connect to backend at ${FLASK_API_URL}`, 0)
    }

    throw new ApiError("Network error occurred", 0)
  }
}

export const authApi = {
  async login(email: string, password: string) {
    const response = await apiCall("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })

    return {
      success: true,
      user: response.user,
      token: response.access_token || response.token,
      message: response.message,
    }
  },

  async signup(email: string, password: string, name: string) {
    const response = await apiCall("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, username: name }),
    })

    return {
      success: true,
      user: response.user,
      token: response.access_token || response.token,
      message: response.message,
    }
  },

  async verifyToken(token: string) {
    const response = await apiCall("/api/auth/verify", {
      method: "POST",
      body: JSON.stringify({ token }),
    })

    return {
      success: true,
      user: response.user,
    }
  },

  async logout() {
    try {
      await apiCall("/api/auth/logout", {
        method: "POST",
      })
    } catch (error) {
      // Even if logout fails, we'll clear local data
      console.warn("Logout API failed:", error)
    }

    return { success: true }
  },
}

export const fishApi = {
  async identify(imageFile: File, userId?: string, token?: string) {
    console.log("🐟 Starting fish identification...")
    console.log("📁 File details:", {
      name: imageFile.name,
      size: imageFile.size,
      type: imageFile.type,
    })

    const formData = new FormData()
    formData.append("image", imageFile)

    if (userId) {
      formData.append("user_id", userId)
    }

    const headers: Record<string, string> = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    // Call your Flask backend
    const response = await apiCall("/api/fish/identify", {
      method: "POST",
      headers,
      body: formData,
    })

    console.log("🎯 Raw Flask response:", response)

    // Your Flask backend returns the response in the exact format you specified
    // Transform it to match what the frontend expects
    if (response && response.success && response.result) {
      return {
        success: true,
        result: {
          id: response.result.id || `identification_${Date.now()}`,
          common_name: response.result.common_name || "Unknown Fish",
          scientific_name: response.result.scientific_name || "Unknown Species",
          confidence: response.result.confidence || 0,
          description: response.result.description || "No description available",
          habitat: response.result.habitat || null,
          distribution: response.result.distribution || null,
          max_length_cm: response.result.max_length_cm || null,
          conservation_status: response.result.conservation_status || null,
          fun_facts: response.result.fun_facts || null,
          reference_image: response.result.reference_image || null,
          visual_cues: response.result.visual_cues || null,
          uploaded_image: response.result.uploaded_image || null,
        },
      }
    }

    // If the response doesn't match expected format, throw error
    throw new Error("Invalid response format from backend")
  },

  async getHistory(token: string, page = 1, limit = 10) {
    return apiCall(`/api/fish/history?page=${page}&limit=${limit}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  },

  async saveToLog(identificationId: string, token: string, notes?: string) {
    return apiCall("/api/fish/save", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        identification_id: identificationId,
        notes,
      }),
    })
  },
}

// Health check for backend connectivity
export const healthApi = {
  async checkBackend() {
    try {
      const response = await fetch(`${FLASK_API_URL}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(15000),
      })

      if (response.ok) {
        const contentType = response.headers.get("content-type")
        let data: any

        if (contentType && contentType.includes("application/json")) {
          data = await response.json()
        } else {
          data = { message: "Backend is responding" }
        }

        return { connected: true, data }
      } else {
        const text = await response.text()
        return { connected: false, error: `HTTP ${response.status}: ${text.substring(0, 100)}` }
      }
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : "Connection failed",
      }
    }
  },

  async testAllEndpoints() {
    const results: any = {}
    const timestamp = Date.now()
    const testEmail = `test${timestamp}@example.com`
    const testPassword = 'SecurePass123!'
    const testUsername = `testuser${timestamp}`
    
    try {
      // Test 1: Register a new user
      console.log('Testing registration...')
      const registerResponse = await fetch(`${FLASK_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          username: testUsername
        }),
        signal: AbortSignal.timeout(10000),
      })
      
      results.register = {
        status: registerResponse.status,
        ok: registerResponse.ok,
        data: await registerResponse.json()
      }
      
      // Test 2: Login with the same credentials
      console.log('Testing login...')
      const loginResponse = await fetch(`${FLASK_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        }),
        signal: AbortSignal.timeout(10000),
      })
      
      const loginData = await loginResponse.json()
      results.login = {
        status: loginResponse.status,
        ok: loginResponse.ok,
        data: loginData
      }
      
      // Test 3: Verify token (if login was successful)
      if (loginData.success && loginData.token) {
        console.log('Testing token verification...')
        const verifyResponse = await fetch(`${FLASK_API_URL}/api/auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: loginData.token
          }),
          signal: AbortSignal.timeout(10000),
        })
        
        results.verify = {
          status: verifyResponse.status,
          ok: verifyResponse.ok,
          data: await verifyResponse.json()
        }
      } else {
        results.verify = {
          status: 401,
          ok: false,
          data: { error: 'No valid token to test' }
        }
      }
      
      // Test 4: Health check
      console.log('Testing health check...')
      const healthResponse = await fetch(`${FLASK_API_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      })
      
      results.health = {
        status: healthResponse.status,
        ok: healthResponse.ok,
        data: await healthResponse.json()
      }
      
      return results
      
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Test failed",
        results
      }
    }
  },

  async testEndpoint(endpoint: string) {
    try {
      // Skip fish identify endpoint test since it requires a real fish image
      if (endpoint.includes('/fish/identify')) {
        return {
          status: 200,
          ok: true,
          data: { message: 'Fish identify endpoint requires real fish image - test skipped' },
          contentType: 'application/json',
          method: 'POST',
          skipped: true
        }
      }
      
      // Determine the HTTP method based on the endpoint
      const method = endpoint.includes('/auth/') || endpoint.includes('/fish/save') ? 'POST' : 'GET'
      
      let body: any = undefined
      let headers: any = {}
      
      if (method === 'POST') {
        // For POST endpoints, send JSON with unique test data
        const timestamp = Date.now()
        const testEmail = `test${timestamp}@example.com`
        const testPassword = 'SecurePass123!'
        const testUsername = `testuser${timestamp}`
        
        // For auth endpoints, use consistent credentials
        if (endpoint.includes('/auth/register')) {
          body = JSON.stringify({
            email: testEmail,
            password: testPassword,
            username: testUsername
          })
        } else if (endpoint.includes('/auth/login')) {
          body = JSON.stringify({
            email: testEmail,
            password: testPassword
          })
        } else if (endpoint.includes('/auth/verify')) {
          // For token verification, we need to get a real token first
          // This will be handled by the test flow
          body = JSON.stringify({
            token: 'test_token'
          })
        } else if (endpoint.includes('/fish/save')) {
          body = JSON.stringify({
            identification_id: 'test_id',
            notes: 'test'
          })
        }
        
        headers['Content-Type'] = 'application/json'
      }

      const response = await fetch(`${FLASK_API_URL}${endpoint}`, {
        method,
        headers,
        body,
        signal: AbortSignal.timeout(10000),
      })

      const contentType = response.headers.get("content-type")
      let data: any

      if (contentType && contentType.includes("application/json")) {
        data = await response.json()
      } else {
        data = await response.text()
      }

      return {
        status: response.status,
        ok: response.ok,
        data,
        contentType,
        method,
      }
    } catch (error) {
      return {
        status: 0,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
        method: 'GET',
      }
    }
  },
}

export { ApiError }

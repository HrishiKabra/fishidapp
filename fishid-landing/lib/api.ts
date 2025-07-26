interface ApiResponse<T = any> {
  success: boolean
  message?: string
  error?: string
  user?: T
  token?: string
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
const FLASK_API_URL = process.env.NEXT_PUBLIC_FLASK_API_URL || "http://localhost:5000"

// Debug logging (only in development)
if (process.env.NODE_ENV === "development") {
  console.log("🔗 Flask API URL:", FLASK_API_URL)
}

async function apiCall<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${FLASK_API_URL}${endpoint}`

  // Debug logging (only in development)
  if (process.env.NODE_ENV === "development") {
    console.log("📡 Making API call to:", url)
    console.log("📋 Request options:", {
      method: options.method,
      headers: options.headers,
      bodyType: options.body instanceof FormData ? "FormData" : typeof options.body,
    })
  }

  const config: RequestInit = {
    // Add timeout for Render cold starts
    signal: AbortSignal.timeout(30000), // 30 second timeout
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  }

  // Remove Content-Type for FormData requests
  if (options.body instanceof FormData) {
    delete config.headers!["Content-Type"]
    if (process.env.NODE_ENV === "development") {
      console.log("📎 Sending FormData request (Content-Type removed)")
    }
  }

  try {
    const response = await fetch(url, config)

    // Debug logging (only in development)
    if (process.env.NODE_ENV === "development") {
      console.log("📊 Response status:", response.status)
      console.log("📋 Response headers:", Object.fromEntries(response.headers.entries()))
    }

    // Handle non-JSON responses (like HTML error pages)
    const contentType = response.headers.get("content-type")
    let data: any

    if (contentType && contentType.includes("application/json")) {
      data = await response.json()
      if (process.env.NODE_ENV === "development") {
        console.log("✅ JSON Response received:", data)
      }
    } else {
      // If it's not JSON, it might be an HTML error page
      const text = await response.text()
      if (process.env.NODE_ENV === "development") {
        console.log("❌ Non-JSON response:", text.substring(0, 500))
      }

      // Check for specific Flask 404 error
      if (text.includes("Not Found") && text.includes("The requested URL was not found")) {
        throw new ApiError(
          `API endpoint ${endpoint} not found on backend. Please add this route to your Flask app.`,
          404,
        )
      }

      // Try to extract meaningful error from HTML
      if (text.includes("Application Error") || text.includes("Service Unavailable")) {
        throw new ApiError("Backend service is temporarily unavailable. Please try again in a moment.", response.status)
      }

      data = { error: "Invalid response from server", details: text.substring(0, 200) }
    }

    if (!response.ok) {
      // Handle rate limiting specifically
      if (response.status === 429) {
        throw new ApiError(
          data.error || data.message || "Too many requests. Please try again later.",
          response.status,
          true,
          data.resetTime || data.reset_time,
        )
      }

      // Handle 404 specifically
      if (response.status === 404) {
        throw new ApiError(
          `API endpoint ${endpoint} not found. Please add this route to your Flask backend.`,
          response.status,
        )
      }

      // Handle specific Render errors
      if (response.status === 503) {
        throw new ApiError("Backend service is starting up. Please wait a moment and try again.", response.status)
      }

      if (response.status === 502 || response.status === 504) {
        throw new ApiError("Backend service is temporarily unavailable. Please try again.", response.status)
      }

      throw new ApiError(data.error || data.message || "Something went wrong", response.status)
    }

    return data
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("❌ API call error:", error)
    }

    if (error instanceof ApiError) {
      throw error
    }

    // Handle timeout errors
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ApiError("Request timed out. The backend service might be starting up. Please try again.", 0)
    }

    // Handle AbortError (also timeout related)
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request was cancelled. The backend service might be starting up. Please try again.", 0)
    }

    // Network or other errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new ApiError(
        `Unable to connect to backend at ${FLASK_API_URL}. Please check if the service is running and routes are configured.`,
        0,
      )
    }

    throw new ApiError("Network error. Please check your connection.", 0)
  }
}

export const authApi = {
  async login(email: string, password: string) {
    return apiCall("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
  },

  async signup(email: string, password: string, name: string) {
    return apiCall("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    })
  },

  async verifyToken(token: string) {
    return apiCall("/api/auth/verify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  },

  async logout(token: string) {
    return apiCall("/api/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  },
}

export const fishApi = {
  async identify(imageFile: File, userId?: string, token?: string) {
    if (process.env.NODE_ENV === "development") {
      console.log("🐟 Starting fish identification...")
      console.log("📁 File details:", {
        name: imageFile.name,
        size: imageFile.size,
        type: imageFile.type,
      })
    }

    const formData = new FormData()
    formData.append("image", imageFile)

    if (userId) {
      formData.append("user_id", userId)
    }

    const headers: Record<string, string> = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    // Call the API and handle the response format from your Flask backend
    const response = await apiCall("/api/fish/identify", {
      method: "POST",
      headers,
      body: formData,
    })

    // Your Flask backend returns the data directly, not wrapped in a "result" object
    // So we need to transform it to match what the frontend expects
    if (response && typeof response === "object") {
      return {
        success: true,
        result: {
          id: `identification_${Date.now()}`,
          common_name: response.meta?.common_name || "Unknown Fish",
          scientific_name: response.scientific || "Unknown Species",
          confidence: Math.round((response.confidence || 0) * 100), // Convert 0.9711 to 97
          description: response.meta?.intro || "No description available",
          habitat: response.meta?.habitat || null,
          distribution: response.meta?.distribution || null,
          max_length_cm: response.meta?.max_length_cm || null,
          conservation_status: response.meta?.iucn_status || null,
          fun_facts: response.meta?.fun_facts || null,
          reference_image: response.meta?.picture || null,
          visual_cues: response.meta?.visual_cues || null,
          uploaded_image: response.uploaded_image || null,
        },
      }
    }

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

// Health check function to test backend connectivity
export const healthApi = {
  async checkBackend() {
    try {
      // First try the health endpoint
      const response = await fetch(`${FLASK_API_URL}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15000), // 15 second timeout for health check
      })

      if (response.ok) {
        const contentType = response.headers.get("content-type")
        let data: any

        if (contentType && contentType.includes("application/json")) {
          data = await response.json()
        } else {
          data = { message: "Backend is responding but not returning JSON" }
        }

        return { connected: true, data }
      } else if (response.status === 404) {
        // If /health doesn't exist, try the root endpoint
        const rootResponse = await fetch(`${FLASK_API_URL}/`, {
          method: "GET",
          signal: AbortSignal.timeout(10000),
        })

        if (rootResponse.status === 404) {
          return {
            connected: false,
            error: "Backend is running but missing API routes. Please check your Flask route configuration.",
          }
        } else {
          return {
            connected: true,
            data: { message: "Backend is running but /health endpoint is missing" },
          }
        }
      } else {
        const text = await response.text()
        return { connected: false, error: `HTTP ${response.status}: ${text.substring(0, 100)}` }
      }
    } catch (error) {
      let errorMessage = "Unknown error"

      if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
        errorMessage = "Connection timeout - backend might be starting up"
      } else if (error instanceof TypeError) {
        errorMessage = "Network error - cannot reach backend"
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      return { connected: false, error: errorMessage }
    }
  },

  // Test specific endpoints
  async testEndpoint(endpoint: string) {
    try {
      const response = await fetch(`${FLASK_API_URL}${endpoint}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
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
      }
    } catch (error) {
      return {
        status: 0,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  },
}

export { ApiError }

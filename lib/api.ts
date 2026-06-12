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

  async saveToLog(identificationId: string, token?: string, notes?: string) {
    return apiCall("/api/fish/save", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: JSON.stringify({
        identification_id: identificationId,
        notes,
      }),
    })
  },
}

// Species API functions
export const speciesApi = {
  async getSpecies(params: {
    search?: string
    region?: string
    habitat?: string
    status?: string
    page?: number
    limit?: number
  } = {}) {
    const searchParams = new URLSearchParams()
    
    if (params.search) searchParams.append('search', params.search)
    if (params.region) searchParams.append('region', params.region)
    if (params.habitat) searchParams.append('habitat', params.habitat)
    if (params.status) searchParams.append('status', params.status)
    if (params.page) searchParams.append('page', params.page.toString())
    if (params.limit) searchParams.append('limit', params.limit.toString())
    
    const response = await fetch(`${FLASK_API_URL}/api/species?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        errorData.error || `HTTP error! status: ${response.status}`,
        response.status,
        errorData.details
      )
    }

    return await response.json()
  },

  async getSpeciesDetail(speciesId: string) {
    const response = await fetch(`${FLASK_API_URL}/api/species/${speciesId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        errorData.error || `HTTP error! status: ${response.status}`,
        response.status,
        errorData.details
      )
    }

    return await response.json()
  },

  async getSpeciesFilters() {
    const response = await fetch(`${FLASK_API_URL}/api/species/filters`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        errorData.error || `HTTP error! status: ${response.status}`,
        response.status,
        errorData.details
      )
    }

    return await response.json()
  },
}

export { ApiError }

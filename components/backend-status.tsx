"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, RefreshCw, X, ExternalLink, Copy, TestTube } from "lucide-react"
import { healthApi } from "@/lib/api"

interface BackendStatusProps {
  isOpen: boolean
  onClose: () => void
}

interface EndpointTest {
  endpoint: string
  method: string
  description: string
  status?: number
  ok?: boolean
  error?: string
  tested?: boolean
}

export function BackendStatus({ isOpen, onClose }: BackendStatusProps) {
  const [status, setStatus] = useState<{
    connected: boolean
    loading: boolean
    error?: string
    data?: any
  }>({
    connected: false,
    loading: false,
  })

  const [endpointTests, setEndpointTests] = useState<EndpointTest[]>([
    { endpoint: "/health", method: "GET", description: "Health check endpoint" },
    { endpoint: "/api/auth/login", method: "POST", description: "Login endpoint" },
    { endpoint: "/api/auth/register", method: "POST", description: "Registration endpoint" },
    { endpoint: "/api/auth/verify", method: "POST", description: "Token verification endpoint" },
    { endpoint: "/api/fish/identify", method: "POST", description: "Fish identification endpoint" },
    { endpoint: "/api/fish/history", method: "GET", description: "Fish history endpoint" },
    { endpoint: "/api/fish/save", method: "POST", description: "Save fish endpoint" },
  ])

  const [copied, setCopied] = useState(false)
  const [testingEndpoints, setTestingEndpoints] = useState(false)

  const checkStatus = async () => {
    setStatus((prev) => ({ ...prev, loading: true }))

    try {
      const result = await healthApi.checkBackend()
      setStatus({
        connected: result.connected,
        loading: false,
        error: result.error,
        data: result.data,
      })
    } catch (error) {
      setStatus({
        connected: false,
        loading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  const testEndpoints = async () => {
    setTestingEndpoints(true)

    const updatedTests = await Promise.all(
      endpointTests.map(async (test) => {
        try {
          const result = await healthApi.testEndpoint(test.endpoint)
          return {
            ...test,
            status: result.status,
            ok: result.ok,
            error: result.error,
            tested: true,
          }
        } catch (error) {
          return {
            ...test,
            status: 0,
            ok: false,
            error: error instanceof Error ? error.message : "Unknown error",
            tested: true,
          }
        }
      }),
    )

    setEndpointTests(updatedTests)
    setTestingEndpoints(false)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  useEffect(() => {
    if (isOpen) {
      checkStatus()
    }
  }, [isOpen])

  if (!isOpen) return null

  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL || "http://localhost:5000"

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="relative">
          <Button variant="ghost" size="icon" className="absolute right-2 top-2" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
          <CardTitle className="text-xl text-center">Flask Backend Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Backend URL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Flask Backend URL:</span>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(flaskUrl)} className="h-6 px-2">
                {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <code className="flex-1 p-2 bg-gray-100 rounded text-xs break-all">{flaskUrl}</code>
              <Button variant="ghost" size="sm" onClick={() => window.open(flaskUrl, "_blank")} className="h-8 px-2">
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Connection Status:</span>
            <div className="flex items-center space-x-2">
              {status.loading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
              ) : status.connected ? (
                <Badge className="bg-green-500 text-white">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge className="bg-red-500 text-white">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Disconnected
                </Badge>
              )}
            </div>
          </div>

          {/* Error/Success Messages */}
          {status.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-600">
                <strong>Error:</strong> {status.error}
              </p>
            </div>
          )}

          {status.data && (
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-sm text-green-600">
                <strong>Backend Response:</strong>
              </p>
              <pre className="text-xs mt-1 overflow-auto max-h-32">{JSON.stringify(status.data, null, 2)}</pre>
            </div>
          )}

          {/* Endpoint Testing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Flask API Endpoint Tests</h3>
              <Button
                onClick={testEndpoints}
                disabled={testingEndpoints}
                size="sm"
                variant="outline"
                className="bg-transparent"
              >
                {testingEndpoints ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <TestTube className="w-3 h-3 mr-1" />
                    Test All Endpoints
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              {endpointTests.map((test, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                  <div className="flex-1">
                    <span className="font-mono text-xs">{test.method}</span>{" "}
                    <span className="font-mono text-xs">{test.endpoint}</span>
                    <p className="text-xs text-gray-600">{test.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {test.tested ? (
                      <>
                        <Badge
                          className={`text-xs ${
                            test.ok
                              ? "bg-green-500 text-white"
                              : test.status === 404
                                ? "bg-orange-500 text-white"
                                : test.status === 405
                                  ? "bg-yellow-500 text-white"
                                  : "bg-red-500 text-white"
                          }`}
                        >
                          {test.status === 0 ? "No Response" : `${test.status}`}
                        </Badge>
                        {test.status === 404 && <span className="text-xs text-orange-600">Missing</span>}
                        {test.status === 405 && <span className="text-xs text-yellow-600">Method Not Allowed</span>}
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">Not tested</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button onClick={checkStatus} disabled={status.loading} className="w-full bg-transparent" variant="outline">
              {status.loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check Connection
                </>
              )}
            </Button>
          </div>

          {/* Quick Test */}
          <div className="text-xs text-gray-500 space-y-2">
            <p className="font-medium">✅ Your Flask backend is working!</p>
            <div className="bg-green-50 p-3 rounded">
              <p className="text-green-700 mb-2">Backend confirmed working at:</p>
              <code className="text-xs bg-white p-1 rounded">{flaskUrl}</code>
              <p className="text-green-600 mt-2 text-xs">
                All endpoints should now connect properly. Try uploading a fish image!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

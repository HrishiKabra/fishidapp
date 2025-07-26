"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, MapPin, Ruler, Waves, Lightbulb, ExternalLink, Camera, Heart, Bug, Eye } from "lucide-react"
import { fishApi, ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"

const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case "LC":
    case "LEAST_CONCERN":
      return "bg-green-500"
    case "NT":
    case "NEAR_THREATENED":
      return "bg-yellow-500"
    case "VU":
    case "VULNERABLE":
      return "bg-orange-500"
    case "EN":
    case "ENDANGERED":
      return "bg-red-500"
    case "CR":
    case "CRITICALLY_ENDANGERED":
      return "bg-red-700"
    default:
      return "bg-gray-500"
  }
}

const getStatusText = (status: string) => {
  switch (status?.toUpperCase()) {
    case "LC":
    case "LEAST_CONCERN":
      return "Least Concern"
    case "NT":
    case "NEAR_THREATENED":
      return "Near Threatened"
    case "VU":
    case "VULNERABLE":
      return "Vulnerable"
    case "EN":
    case "ENDANGERED":
      return "Endangered"
    case "CR":
    case "CRITICALLY_ENDANGERED":
      return "Critically Endangered"
    default:
      return status || "Unknown"
  }
}

export default function ResultsPage() {
  const [showLightbox, setShowLightbox] = useState(false)
  const [uploadedImageData, setUploadedImageData] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  const [showDebug, setShowDebug] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    // Get the uploaded image data from localStorage
    const storedData = localStorage.getItem("fishIdentificationData")
    if (storedData) {
      const parsedData = JSON.parse(storedData)
      setUploadedImageData(parsedData)

      // Debug logging
      console.log("🔍 Results page loaded with data:", parsedData)
      console.log("📊 API Response:", parsedData.apiResponse)
      console.log("🐟 Identification:", parsedData.identification)
    }
  }, [])

  const handleSaveToLog = async () => {
    if (!user) {
      setSaveMessage("Please log in to save to your fish log")
      setTimeout(() => setSaveMessage(""), 3000)
      return
    }

    if (!uploadedImageData?.identification?.id) {
      setSaveMessage("No identification data to save")
      setTimeout(() => setSaveMessage(""), 3000)
      return
    }

    setIsSaving(true)
    try {
      const token = localStorage.getItem("fishid_auth_token")
      if (!token) {
        throw new Error("Authentication required")
      }

      await fishApi.saveToLog(uploadedImageData.identification.id, token)
      setSaveMessage("✓ Saved to your fish log!")
      setTimeout(() => setSaveMessage(""), 3000)
    } catch (error) {
      if (error instanceof ApiError) {
        setSaveMessage(`Error: ${error.message}`)
      } else {
        setSaveMessage("Failed to save to fish log")
      }
      setTimeout(() => setSaveMessage(""), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  // Use the actual uploaded image or fallback to placeholder
  const uploadedImageUrl = uploadedImageData?.uploadedImage || "/placeholder.svg?height=400&width=600"
  const identification = uploadedImageData?.identification

  if (!identification) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No identification data found</p>
          <Link href="/">
            <Button className="bg-[#2e9eb3] hover:bg-[#138094] text-white">Go Back Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  const scrollToAbout = () => {
    // Navigate to home page and scroll to about section
    window.location.href = "/#about-section"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#0e496c] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/">
              <Image
                src="/images/logo.png"
                alt="FishID Logo"
                width={120}
                height={40}
                className="h-10 w-auto cursor-pointer"
              />
            </Link>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-white hover:text-[#2e9eb3] transition-colors">
              New Search
            </Link>
            <button onClick={scrollToAbout} className="text-white hover:text-[#2e9eb3] transition-colors">
              About Us
            </button>
            <Link href="/fish-log" className="text-white hover:text-[#2e9eb3] transition-colors">
              Fish Log
            </Link>
            <Link href="/species-list" className="text-white hover:text-[#2e9eb3] transition-colors">
              Species List
            </Link>
            {/* Debug toggle for development */}
            {process.env.NODE_ENV === "development" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDebug(!showDebug)}
                className="text-white hover:bg-white/20"
              >
                <Bug className="w-4 h-4 mr-1" />
                Debug
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Debug Panel */}
      {showDebug && process.env.NODE_ENV === "development" && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-4">
          <div className="max-w-6xl mx-auto">
            <h3 className="font-bold text-yellow-800 mb-2">🐛 Debug Information</h3>
            <details className="text-sm">
              <summary className="cursor-pointer text-yellow-700 font-medium">Raw API Response</summary>
              <pre className="mt-2 p-3 bg-yellow-100 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(uploadedImageData?.apiResponse, null, 2)}
              </pre>
            </details>
            <details className="text-sm mt-2">
              <summary className="cursor-pointer text-yellow-700 font-medium">Processed Identification Data</summary>
              <pre className="mt-2 p-3 bg-yellow-100 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(identification, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Hero Section with Uploaded Image */}
        <div className="mb-8">
          <div
            className="relative h-[400px] rounded-2xl overflow-hidden cursor-pointer group"
            onClick={() => setShowLightbox(true)}
          >
            <Image
              src={uploadedImageUrl || "/placeholder.svg"}
              alt="Your uploaded fish photo"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
            <div className="absolute top-4 right-4">
              <Badge className="bg-white/90 text-gray-800">
                <Camera className="w-3 h-3 mr-1" />
                Your Photo
              </Badge>
            </div>
            {uploadedImageData && (
              <div className="absolute bottom-4 left-4">
                <Badge className="bg-black/60 text-white">{uploadedImageData.originalFileName}</Badge>
              </div>
            )}
          </div>
        </div>

        {/* Main Identification */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-[#0d2a50] mb-2">{identification.common_name}</h1>
          <p className="text-xl text-[#138094] italic mb-4">{identification.scientific_name}</p>

          {/* Confidence Score */}
          <div className="max-w-md mx-auto">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Confidence</span>
              <span className="text-sm font-bold text-[#0d2a50]">{identification.confidence}%</span>
            </div>
            <Progress value={identification.confidence} className="h-3" />
            <p className="text-xs text-gray-500 mt-1">
              {identification.confidence >= 90
                ? "Very High"
                : identification.confidence >= 75
                  ? "High"
                  : identification.confidence >= 60
                    ? "Moderate"
                    : "Low"}{" "}
              confidence match
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Introduction */}
            {identification.description && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-[#0d2a50] mb-3">About This Species</h2>
                  <p className="text-gray-700 leading-relaxed">{identification.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Visual Identification Cues */}
            {identification.visual_cues && (
              <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-500">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <Eye className="w-6 h-6 text-purple-500 flex-shrink-0 mt-1" />
                    <div>
                      <h2 className="text-xl font-semibold text-[#0d2a50] mb-2">Visual Identification Cues</h2>
                      <div className="text-gray-700 whitespace-pre-line">{identification.visual_cues}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fun Facts */}
            {identification.fun_facts && (
              <Card className="bg-gradient-to-r from-blue-50 to-teal-50 border-l-4 border-[#2e9eb3]">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <Lightbulb className="w-6 h-6 text-[#2e9eb3] flex-shrink-0 mt-1" />
                    <div>
                      <h2 className="text-xl font-semibold text-[#0d2a50] mb-2">Did You Know?</h2>
                      <p className="text-gray-700">{identification.fun_facts}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Facts */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-[#0d2a50] mb-4">Quick Facts</h3>
                <div className="space-y-4">
                  {/* Habitat */}
                  {identification.habitat && (
                    <div className="flex items-start space-x-3">
                      <Waves className="w-5 h-5 text-[#2e9eb3] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-800">Habitat</p>
                        <p className="text-sm text-gray-600">{identification.habitat}</p>
                      </div>
                    </div>
                  )}

                  {/* Distribution */}
                  {identification.distribution && (
                    <div className="flex items-start space-x-3">
                      <MapPin className="w-5 h-5 text-[#2e9eb3] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-800">Distribution</p>
                        <p className="text-sm text-gray-600">{identification.distribution}</p>
                      </div>
                    </div>
                  )}

                  {/* Max Length */}
                  {identification.max_length_cm && (
                    <div className="flex items-start space-x-3">
                      <Ruler className="w-5 h-5 text-[#2e9eb3] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-800">Max Length</p>
                        <p className="text-sm text-gray-600">{identification.max_length_cm} cm</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Conservation Status */}
            {identification.conservation_status && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-[#0d2a50] mb-3">Conservation Status</h3>
                  <Badge className={`${getStatusColor(identification.conservation_status)} text-white px-3 py-1`}>
                    {getStatusText(identification.conservation_status)}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-2">IUCN Red List Status</p>
                </CardContent>
              </Card>
            )}

            {/* Reference Image */}
            {identification.reference_image && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-[#0d2a50] mb-3">Reference Image</h3>
                  <div className="relative h-48 rounded-lg overflow-hidden mb-3">
                    <Image
                      src={identification.reference_image || "/placeholder.svg"}
                      alt="Reference image"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Source
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link href="/">
            <Button className="bg-[#2e9eb3] hover:bg-[#138094] text-white px-8 py-3">Identify Another Fish</Button>
          </Link>

          <Button variant="outline" className="px-8 py-3 bg-transparent" onClick={handleSaveToLog} disabled={isSaving}>
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Heart className="w-4 h-4 mr-2" />
                Save to Fish Log
              </>
            )}
          </Button>

          <Button variant="outline" className="px-8 py-3 bg-transparent">
            Share Result
          </Button>
        </div>

        {/* Save message */}
        {saveMessage && (
          <div className="text-center mt-4">
            <p className={`text-sm ${saveMessage.includes("✓") ? "text-green-600" : "text-red-600"}`}>{saveMessage}</p>
          </div>
        )}
      </div>

      {/* Lightbox for uploaded image */}
      {showLightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <Image
              src={uploadedImageUrl || "/placeholder.svg"}
              alt="Your uploaded fish photo - full size"
              width={800}
              height={600}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setShowLightbox(false)}
            >
              ×
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

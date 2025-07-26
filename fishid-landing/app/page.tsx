"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Instagram, Github, Linkedin, AlertTriangle } from "lucide-react"
import { FileUpload } from "@/components/file-upload"
import { AuthModal } from "@/components/auth-modal"
import { UserDropdown } from "@/components/user-dropdown"
import { useAuth } from "@/lib/auth-context"
import { fishApi, ApiError } from "@/lib/api"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function FishIDLanding() {
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [isIdentifying, setIsIdentifying] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const { user, isInitialized } = useAuth()
  const router = useRouter()

  const handleIdentifyClick = async () => {
    if (uploadResult?.success && uploadResult?.file) {
      setIsIdentifying(true)
      setShowWarning(false)
      setDebugInfo("")

      try {
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

        // Add detailed response logging
        console.log("🎯 API Response:", response)
        console.log("✅ Response success:", response.success)
        console.log("📊 Response result:", response.result)

        if (response.success && response.result) {
          // Store the identification data for the results page
          const identificationData = {
            uploadedImage: uploadResult.processedImage?.url,
            originalFileName: uploadResult.file.name,
            imageSize: uploadResult.processedImage?.size,
            imageDimensions: {
              width: uploadResult.processedImage?.width,
              height: uploadResult.processedImage?.height,
            },
            timestamp: new Date().toISOString(),
            userId: user?.id,
            apiResponse: response, // Store the full API response for debugging
            identification: {
              id: response.result.id || `temp_${Date.now()}`,
              scientific_name: response.result.scientific_name || response.result.scientific,
              common_name: response.result.common_name || response.result.name,
              confidence: response.result.confidence || 0,
              description: response.result.description || response.result.intro,
              habitat: response.result.habitat,
              distribution: response.result.distribution,
              max_length_cm: response.result.max_length_cm,
              conservation_status: response.result.conservation_status || response.result.iucn_status,
              fun_facts: response.result.fun_facts,
              reference_image: response.result.reference_image,
            },
          }

          console.log("💾 Storing identification data:", identificationData)
          localStorage.setItem("fishIdentificationData", JSON.stringify(identificationData))

          // Navigate to results page
          router.push("/results")
        } else {
          throw new Error(response.message || "Identification failed")
        }
      } catch (error) {
        console.error("❌ Identification error:", error)

        let errorMessage = "Failed to identify fish. Please try again."

        if (error instanceof ApiError) {
          if (error.rateLimitExceeded) {
            errorMessage = error.message
          } else if (error.status === 0) {
            errorMessage = "Unable to connect to identification service. Please check your connection."
          } else {
            errorMessage = error.message
          }
        }

        // Show error message
        setDebugInfo(`Error: ${errorMessage}`)
        setShowWarning(true)
        setTimeout(() => setShowWarning(false), 5000)
      } finally {
        setIsIdentifying(false)
      }
    } else {
      // Show warning message
      setShowWarning(true)
      // Hide warning after 3 seconds
      setTimeout(() => setShowWarning(false), 3000)
    }
  }

  const handleUploadComplete = (result: any) => {
    setUploadResult(result)
    setShowWarning(false) // Hide warning when image is uploaded
    setDebugInfo("")
  }

  const scrollToAbout = () => {
    const aboutSection = document.getElementById("about-section")
    if (aboutSection) {
      aboutSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  // Show loading state while auth initializes
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#2e9eb3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-[#0e496c] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
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
            <button onClick={scrollToAbout} className="text-white hover:text-[#2e9eb3] transition-colors">
              About Us
            </button>
            <Link href="/fish-log" className="text-white hover:text-[#2e9eb3] transition-colors">
              Fish Log
            </Link>
            <Link href="/species-list" className="text-white hover:text-[#2e9eb3] transition-colors">
              Species List
            </Link>
            {user ? (
              <UserDropdown />
            ) : (
              <Button
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-[#0e496c] transition-colors bg-transparent"
                onClick={() => setShowAuthModal(true)}
              >
                Log In
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section with Background Image */}
      <section className="relative min-h-[100vh] flex items-center justify-center py-8">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/images/background.png"
            alt="Underwater coral reef background"
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/30"></div>

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-white text-4xl md:text-5xl font-bold mb-8 tracking-wide">UPLOAD YOUR IMAGE</h1>

          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 mb-6 border border-white/20">
            <FileUpload onUploadComplete={handleUploadComplete} />
          </div>

          {/* Warning message */}
          {showWarning && (
            <div className="mb-4 mx-auto max-w-md">
              <div className="flex items-center justify-center space-x-2 bg-yellow-500/20 border border-yellow-500/50 text-yellow-200 px-4 py-2 rounded-lg backdrop-blur-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm font-medium">Please upload an image first!</p>
              </div>
            </div>
          )}

          {/* Debug info */}
          {debugInfo && (
            <div className="mb-4 mx-auto max-w-md">
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg backdrop-blur-sm text-xs">
                {debugInfo}
              </div>
            </div>
          )}

          <Button
            className="bg-[#2e9eb3] hover:bg-[#138094] text-white px-10 py-3 text-lg rounded-full transition-colors shadow-lg disabled:opacity-50"
            onClick={handleIdentifyClick}
            disabled={isIdentifying}
          >
            {isIdentifying ? "Identifying..." : "Identify Now!"}
          </Button>

          {/* Debug section for development */}
          {process.env.NODE_ENV === "development" && uploadResult && (
            <div className="mt-4 mx-auto max-w-md">
              <details className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-left">
                <summary className="text-white text-sm cursor-pointer">Debug Info</summary>
                <pre className="text-xs text-white/80 mt-2 overflow-auto">{JSON.stringify(uploadResult, null, 2)}</pre>
              </details>
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <section id="about-section" className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-[#0d2a50] text-4xl font-bold mb-12">About FishID</h2>

          <div className="space-y-8 text-[#138094] text-lg leading-relaxed">
            <p>
              FishID was created out of a deep love for the ocean and a passion for technology. As a PADI Rescue Diver
              and Master Scuba Diver who has explored marine life across the globe, I've always been fascinated by the
              incredible diversity beneath the surface.
            </p>

            <p>
              Now studying Computer Science at Tulane University, I wanted to combine that curiosity with my technical
              skills to build something meaningful. FishID uses cutting-edge AI to identify fish species from photos,
              offering instant recognition, scientific facts, and personalized logs for divers, snorkelers, and nature
              lovers alike.
            </p>

            <p>It's my way of bringing tech and marine conservation together—one fish at a time.</p>
          </div>

          <div className="mt-16">
            <div className="relative w-full max-w-2xl mx-auto">
              <Image
                src="/images/diver.png"
                alt="Scuba diver underwater"
                width={600}
                height={300}
                className="w-full h-auto rounded-[3rem]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0e496c] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-4">Reach Out!</h3>
              <p className="text-sm mb-2">Feel free to reach out to me on Instagram, LinkedIn or via email.</p>
              <p className="text-sm mb-6">kalebrahn@gmail.com</p>

              <div className="flex space-x-4 mb-6">
                <Instagram className="w-6 h-6 hover:text-[#2e9eb3] cursor-pointer transition-colors" />
                <Github className="w-6 h-6 hover:text-[#2e9eb3] cursor-pointer transition-colors" />
                <Linkedin className="w-6 h-6 hover:text-[#2e9eb3] cursor-pointer transition-colors" />
              </div>

              <p className="text-xs text-gray-300">© 2024 All Rights Reserved</p>
            </div>

            <div className="flex justify-end">
              <Image src="/images/logo.png" alt="FishID Logo" width={200} height={80} className="h-16 w-auto" />
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  )
}

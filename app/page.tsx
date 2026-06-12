"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import { FileUpload } from "@/components/file-upload"
import { AuthModal } from "@/components/auth-modal"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { useAuth } from "@/lib/auth-context"
import { prepareImage } from "@/lib/image-prep"
import { useRouter } from "next/navigation"

export default function FishIDLanding() {
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [isIdentifying, setIsIdentifying] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const { user, isInitialized } = useAuth()
  const router = useRouter()

  const handleIdentifyClick = async () => {
    if (!uploadResult?.success || !uploadResult?.file) {
      setShowWarning(true)
      setTimeout(() => setShowWarning(false), 3000)
      return
    }

    if (!user) {
      setShowAuthModal(true)
      return
    }

    setIsIdentifying(true)
    setShowWarning(false)
    setDebugInfo("")

    try {
      const prepared = await prepareImage(uploadResult.file)
      const formData = new FormData()
      formData.append("image", prepared, "upload.jpg")

      const response = await fetch("/api/identify", { method: "POST", body: formData })
      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Identification failed. Please try again.")
      }

      const preparedDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error("Could not read image"))
        reader.readAsDataURL(prepared)
      })

      const identificationData = {
        uploadedImage: preparedDataUrl,
        originalFileName: uploadResult.file.name,
        timestamp: new Date().toISOString(),
        candidates: payload.result.candidates,
        otherFishCount: payload.result.otherFishCount,
      }
      localStorage.setItem("fishIdentificationData", JSON.stringify(identificationData))
      router.push("/results")
    } catch (error: any) {
      setDebugInfo(`Error: ${error.message || "Failed to identify fish. Please try again."}`)
      setShowWarning(true)
      setTimeout(() => setShowWarning(false), 5000)
    } finally {
      setIsIdentifying(false)
    }
  }

  const handleUploadComplete = (result: any) => {
    setUploadResult(result)
    setShowWarning(false) // Hide warning when image is uploaded
    setDebugInfo("")
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
      <SiteHeader onLoginClick={() => setShowAuthModal(true)} />

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
          <h2 className="text-[#0e496c] text-4xl font-bold mb-12">About FishID</h2>

          <div className="space-y-8 text-[#138094] text-lg leading-relaxed">
            <p>
              FishID was created out of a deep love for the ocean and a passion for technology. As a PADI Rescue Diver
              and Master Scuba Diver who has explored marine life across the globe, I&apos;ve always been fascinated by the
              incredible diversity beneath the surface.
            </p>

            <p>
              Now studying Computer Science at Tulane University, I wanted to combine that curiosity with my technical
              skills to build something meaningful. FishID uses cutting-edge AI to identify fish species from photos,
              offering instant recognition, scientific facts, and personalized logs for divers, snorkelers, and nature
              lovers alike.
            </p>

            <p>It&apos;s my way of bringing tech and marine conservation together—one fish at a time.</p>
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

      <SiteFooter />

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Lightbulb, ExternalLink, Camera, Heart, Eye, Fish, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { HamburgerMenu } from "@/components/hamburger-menu"
import { AuthModal } from "@/components/auth-modal"
import { loadEnrichment, type EnrichmentSections } from "@/lib/enrichment"
import { saveIdentification } from "@/lib/fish-log"
import type { WikiSummary } from "@/lib/server/wiki"
import Link from "next/link"

interface Candidate {
  name: string
  accuracy: number
}

interface StoredIdentification {
  uploadedImage?: string
  originalFileName?: string
  timestamp?: string
  candidates: Candidate[]
  otherFishCount: number
}

function confidenceLabel(pct: number): string {
  if (pct >= 90) return "Very High"
  if (pct >= 75) return "High"
  if (pct >= 60) return "Moderate"
  return "Low"
}

function BoldBullets({ text }: { text: string }) {
  return (
    <div className="text-gray-700">
      {text.split("\n").map((line, i) => {
        const parts = line.split("**")
        return (
          <div key={i} className="mb-1">
            {parts.map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>))}
          </div>
        )
      })}
    </div>
  )
}

export default function ResultsPage() {
  const [showLightbox, setShowLightbox] = useState(false)
  const [data, setData] = useState<StoredIdentification | null>(null)
  const [noData, setNoData] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [wiki, setWiki] = useState<WikiSummary | null>(null)
  const [sections, setSections] = useState<EnrichmentSections>({ description: "", visual_cues: "", fun_fact: "" })
  const [enriching, setEnriching] = useState(true)
  const [aiFailed, setAiFailed] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    const stored = localStorage.getItem("fishIdentificationData")
    if (!stored) {
      setNoData(true)
      return
    }
    try {
      const parsed = JSON.parse(stored)
      if (!parsed.candidates?.length) {
        setNoData(true)
        return
      }
      setData(parsed)
    } catch {
      setNoData(true)
    }
  }, [])

  useEffect(() => {
    if (!data) return
    loadEnrichment(data.candidates[0].name, {
      onWiki: setWiki,
      onSections: setSections,
      onDone: ({ aiFailed }) => {
        setEnriching(false)
        setAiFailed(aiFailed)
      },
    })
  }, [data])

  const handleSaveToLog = async () => {
    if (!user) {
      setShowAuthModal(true)
      return
    }
    if (!data || saved || isSaving) return
    setIsSaving(true)
    try {
      await saveIdentification({
        candidates: data.candidates,
        commonName: wiki?.common_name ?? null,
        photoDataUrl: data.uploadedImage,
      })
      setSaved(true)
      setSaveMessage("✓ Saved to your fish log!")
    } catch (err: any) {
      setSaveMessage(err.message || "Failed to save to fish log")
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(""), 4000)
    }
  }

  const scrollToAbout = () => {
    window.location.href = "/#about-section"
  }

  if (noData) {
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

  if (!data) return null

  const top = data.candidates[0]
  const topPct = Math.round(top.accuracy * 100)
  const displayName = wiki?.common_name || top.name
  const uploadedImageUrl = data.uploadedImage || "/placeholder.svg?height=400&width=600"

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
          </nav>
          <HamburgerMenu onAboutClick={scrollToAbout} onLoginClick={() => setShowAuthModal(true)} />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Uploaded photo hero */}
        <div className="mb-8">
          <div
            className="relative h-[400px] rounded-2xl overflow-hidden cursor-pointer group"
            onClick={() => setShowLightbox(true)}
          >
            <Image
              src={uploadedImageUrl}
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
            {data.originalFileName && (
              <div className="absolute bottom-4 left-4">
                <Badge className="bg-black/60 text-white">{data.originalFileName}</Badge>
              </div>
            )}
          </div>
        </div>

        {/* Best match */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-[#0d2a50] mb-2">{displayName}</h1>
          <p className="text-xl text-[#138094] italic mb-2">{top.name}</p>
          {data.otherFishCount > 0 && (
            <Badge variant="outline" className="mb-4">
              <Fish className="w-3 h-3 mr-1" />
              {data.otherFishCount} other fish detected in this photo
            </Badge>
          )}
          <div className="max-w-md mx-auto mt-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Confidence</span>
              <span className="text-sm font-bold text-[#0d2a50]">{topPct}%</span>
            </div>
            <Progress value={topPct} className="h-3" />
            <p className="text-xs text-gray-500 mt-1">{confidenceLabel(topPct)} confidence match</p>
          </div>
        </div>

        {/* Other candidates */}
        {data.candidates.length > 1 && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-[#0d2a50] mb-4">Other Possible Matches</h2>
              <div className="space-y-4">
                {data.candidates.slice(1).map((c) => {
                  const pct = Math.round(c.accuracy * 100)
                  return (
                    <div key={c.name}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm italic text-gray-700">{c.name}</span>
                        <span className="text-sm font-medium text-gray-600">{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Fish identification is genuinely ambiguous — similar species can be hard to tell apart from a photo.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About: streamed AI description, wiki fallback */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-[#0d2a50] mb-3">
                  About This Species
                  {enriching && <Loader2 className="w-4 h-4 ml-2 inline animate-spin text-[#2e9eb3]" />}
                </h2>
                {sections.description ? (
                  <p className="text-gray-700 leading-relaxed">{sections.description}</p>
                ) : aiFailed && wiki?.intro ? (
                  <p className="text-gray-700 leading-relaxed">{wiki.intro}</p>
                ) : aiFailed ? (
                  <p className="text-gray-500 text-sm">AI facts are unavailable right now.</p>
                ) : (
                  <p className="text-gray-400 text-sm">Generating…</p>
                )}
              </CardContent>
            </Card>

            {/* Visual cues */}
            {(sections.visual_cues || enriching) && (
              <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-500">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <Eye className="w-6 h-6 text-purple-500 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-[#0d2a50] mb-2">Visual Identification Cues</h2>
                      {sections.visual_cues ? (
                        <BoldBullets text={sections.visual_cues} />
                      ) : (
                        <p className="text-gray-400 text-sm">Generating…</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fun fact */}
            {(sections.fun_fact || enriching) && (
              <Card className="bg-gradient-to-r from-blue-50 to-teal-50 border-l-4 border-[#2e9eb3]">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <Lightbulb className="w-6 h-6 text-[#2e9eb3] flex-shrink-0 mt-1" />
                    <div>
                      <h2 className="text-xl font-semibold text-[#0d2a50] mb-2">Did You Know?</h2>
                      {sections.fun_fact ? (
                        <p className="text-gray-700">{sections.fun_fact}</p>
                      ) : (
                        <p className="text-gray-400 text-sm">Generating…</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {wiki?.image_url && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-[#0d2a50] mb-3">Reference Image</h3>
                  <div className="relative h-48 rounded-lg overflow-hidden mb-3">
                    <Image src={wiki.image_url} alt={`Reference image of ${displayName}`} fill className="object-cover" />
                  </div>
                  {wiki.url && (
                    <a href={wiki.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="w-full bg-transparent">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View on Wikipedia
                      </Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {wiki?.intro && sections.description && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-[#0d2a50] mb-3">From Wikipedia</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {wiki.intro.length > 280 ? `${wiki.intro.substring(0, 280)}…` : wiki.intro}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link href="/">
            <Button className="bg-[#2e9eb3] hover:bg-[#138094] text-white px-8 py-3">Identify Another Fish</Button>
          </Link>
          <Button
            variant="outline"
            className="px-8 py-3 bg-transparent"
            onClick={handleSaveToLog}
            disabled={isSaving || saved}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <Heart className="w-4 h-4 mr-2 fill-current" />
                Saved
              </>
            ) : (
              <>
                <Heart className="w-4 h-4 mr-2" />
                Save to Fish Log
              </>
            )}
          </Button>
        </div>

        {saveMessage && (
          <div className="text-center mt-4">
            <p className="text-sm text-[#138094]">{saveMessage}</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {showLightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <Image
              src={uploadedImageUrl}
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

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  )
}

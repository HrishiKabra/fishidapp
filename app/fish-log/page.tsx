"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Fish, Loader2, Trash2, Camera, AlertCircle } from "lucide-react"
import { AuthModal } from "@/components/auth-modal"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { useAuth } from "@/lib/auth-context"
import { fetchLog, deleteIdentification, type LogEntry } from "@/lib/fish-log"
import { useState, useEffect } from "react"
import Link from "next/link"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

export default function FishLogPage() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { user, isInitialized } = useAuth()

  useEffect(() => {
    if (!isInitialized) return
    if (!user) {
      setLoading(false)
      setEntries([])
      return
    }
    setLoading(true)
    fetchLog()
      .then(setEntries)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user, isInitialized])

  const handleDelete = async (entry: LogEntry) => {
    if (confirmingId !== entry.id) {
      setConfirmingId(entry.id)
      setTimeout(() => setConfirmingId((c) => (c === entry.id ? null : c)), 3000)
      return
    }
    setConfirmingId(null)
    setDeletingId(entry.id)
    try {
      await deleteIdentification(entry)
      setEntries((prev) => prev.filter((e) => e.id !== entry.id))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SiteHeader onLoginClick={() => setShowAuthModal(true)} />

      {/* Content */}
      <section className="flex-1 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <Fish className="w-16 h-16 text-[#2e9eb3] mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-[#0d2a50] mb-2">Fish Log</h1>
            <p className="text-lg text-[#138094]">Your personal collection of identified fish species</p>
          </div>

          {!isInitialized || loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#2e9eb3] mx-auto mb-4" />
                <p className="text-gray-600">Loading your fish log...</p>
              </div>
            </div>
          ) : !user ? (
            <div className="bg-white rounded-3xl p-12 shadow-lg border border-gray-100 max-w-xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-[#0d2a50] mb-4">Sign in to see your log</h2>
              <p className="text-gray-600 mb-8">
                Your identified fish are saved to your account so they&apos;re here whenever you come back.
              </p>
              <Button
                className="bg-[#2e9eb3] hover:bg-[#138094] text-white px-8 py-3 rounded-full"
                onClick={() => setShowAuthModal(true)}
              >
                Log In
              </Button>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center max-w-md">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-700">{error}</p>
              </div>
            </div>
          ) : entries.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 shadow-lg border border-gray-100 max-w-xl mx-auto text-center">
              <Camera className="w-16 h-16 text-[#2e9eb3] mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-[#0d2a50] mb-4">No fish logged yet</h2>
              <p className="text-gray-600 mb-8">
                Identify a fish and hit &quot;Save to Fish Log&quot; — it&apos;ll show up here with your photo.
              </p>
              <Link href="/">
                <Button className="bg-[#2e9eb3] hover:bg-[#138094] text-white px-8 py-3 rounded-full">
                  Start Identifying Fish
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-6">
                {entries.length} {entries.length === 1 ? "fish" : "fish"} logged
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {entries.map((entry) => (
                  <Card key={entry.id} className="overflow-hidden flex flex-col">
                    <div className="relative h-48 bg-gradient-to-br from-blue-50 to-teal-50">
                      {entry.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={entry.photoUrl}
                          alt={entry.common_name || entry.scientific_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Fish className="w-12 h-12 text-[#2e9eb3]/40" />
                        </div>
                      )}
                      {entry.confidence !== null && (
                        <Badge className="absolute top-3 right-3 bg-white/90 text-gray-800">
                          {entry.confidence}%
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-4 flex-1 flex flex-col">
                      <h3 className="font-semibold text-[#0d2a50]">
                        {entry.common_name || entry.scientific_name}
                      </h3>
                      <p className="text-sm italic text-[#138094] mb-2">{entry.scientific_name}</p>
                      {entry.candidates.length > 1 && (
                        <p className="text-xs text-gray-500 mb-2">
                          Also possible:{" "}
                          {entry.candidates
                            .slice(1)
                            .map((c) => c.name)
                            .join(", ")}
                        </p>
                      )}
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <span className="text-xs text-gray-500">{formatDate(entry.created_at)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={
                            confirmingId === entry.id
                              ? "text-white bg-red-500 hover:bg-red-600 hover:text-white"
                              : "text-gray-400 hover:text-red-500"
                          }
                          onClick={() => handleDelete(entry)}
                          disabled={deletingId === entry.id}
                        >
                          {deletingId === entry.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : confirmingId === entry.id ? (
                            "Confirm?"
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <SiteFooter />

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  )
}

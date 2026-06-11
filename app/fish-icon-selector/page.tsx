"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Search, Fish, Check, Save } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import Link from "next/link"

// Fish icon data with names
const fishIcons = [
  { id: "001-gold-fish", name: "Gold Fish", path: "/images/fish-icons/001-gold-fish.png" },
  { id: "002-salmon", name: "Salmon", path: "/images/fish-icons/002-salmon.png" },
  { id: "003-cod", name: "Cod", path: "/images/fish-icons/003-cod.png" },
  { id: "004-manta-ray", name: "Manta Ray", path: "/images/fish-icons/004-manta-ray.png" },
  { id: "005-fish", name: "Fish", path: "/images/fish-icons/005-fish.png" },
  { id: "006-whale", name: "Whale", path: "/images/fish-icons/006-whale.png" },
  { id: "007-swordfish", name: "Swordfish", path: "/images/fish-icons/007-swordfish.png" },
  { id: "008-discus", name: "Discus", path: "/images/fish-icons/008-discus.png" },
  { id: "009-angel-fish", name: "Angel Fish", path: "/images/fish-icons/009-angel-fish.png" },
  { id: "010-tuna", name: "Tuna", path: "/images/fish-icons/010-tuna.png" },
  { id: "011-trout", name: "Trout", path: "/images/fish-icons/011-trout.png" },
  { id: "012-pollock", name: "Pollock", path: "/images/fish-icons/012-pollock.png" },
  { id: "013-catfish", name: "Catfish", path: "/images/fish-icons/013-catfish.png" },
  { id: "014-bream", name: "Bream", path: "/images/fish-icons/014-bream.png" },
  { id: "015-perch", name: "Perch", path: "/images/fish-icons/015-perch.png" },
  { id: "016-fish-1", name: "Fish 1", path: "/images/fish-icons/016-fish-1.png" },
  { id: "017-guppy", name: "Guppy", path: "/images/fish-icons/017-guppy.png" },
  { id: "018-carp-fish", name: "Carp Fish", path: "/images/fish-icons/018-carp-fish.png" },
  { id: "019-fish-2", name: "Fish 2", path: "/images/fish-icons/019-fish-2.png" },
  { id: "020-halibut", name: "Halibut", path: "/images/fish-icons/020-halibut.png" },
  { id: "021-angel-fish-1", name: "Angel Fish 1", path: "/images/fish-icons/021-angel-fish-1.png" },
  { id: "022-fish-3", name: "Fish 3", path: "/images/fish-icons/022-fish-3.png" },
  { id: "023-flying-fish", name: "Flying Fish", path: "/images/fish-icons/023-flying-fish.png" },
  { id: "024-zander", name: "Zander", path: "/images/fish-icons/024-zander.png" },
  { id: "025-surgeon-fish", name: "Surgeon Fish", path: "/images/fish-icons/025-surgeon-fish.png" },
  { id: "026-dolphin", name: "Dolphin", path: "/images/fish-icons/026-dolphin.png" },
  { id: "027-fish-4", name: "Fish 4", path: "/images/fish-icons/027-fish-4.png" },
  { id: "028-fish-5", name: "Fish 5", path: "/images/fish-icons/028-fish-5.png" },
  { id: "029-clown-fish", name: "Clown Fish", path: "/images/fish-icons/029-clown-fish.png" },
  { id: "030-starfish", name: "Starfish", path: "/images/fish-icons/030-starfish.png" },
  { id: "031-fish-6", name: "Fish 6", path: "/images/fish-icons/031-fish-6.png" },
  { id: "032-sunfish", name: "Sunfish", path: "/images/fish-icons/032-sunfish.png" },
  { id: "033-fish-7", name: "Fish 7", path: "/images/fish-icons/033-fish-7.png" },
  { id: "034-moon-fish", name: "Moon Fish", path: "/images/fish-icons/034-moon-fish.png" },
  { id: "035-hammerhead-fish", name: "Hammerhead Fish", path: "/images/fish-icons/035-hammerhead-fish.png" },
  { id: "036-fish-8", name: "Fish 8", path: "/images/fish-icons/036-fish-8.png" },
  { id: "037-fish-9", name: "Fish 9", path: "/images/fish-icons/037-fish-9.png" },
  { id: "038-fish-10", name: "Fish 10", path: "/images/fish-icons/038-fish-10.png" },
  { id: "039-shark", name: "Shark", path: "/images/fish-icons/039-shark.png" },
  { id: "040-fish-11", name: "Fish 11", path: "/images/fish-icons/040-fish-11.png" },
  { id: "041-fish-12", name: "Fish 12", path: "/images/fish-icons/041-fish-12.png" },
  { id: "042-fish-13", name: "Fish 13", path: "/images/fish-icons/042-fish-13.png" },
  { id: "043-horn", name: "Horn", path: "/images/fish-icons/043-horn.png" },
  { id: "044-fish-14", name: "Fish 14", path: "/images/fish-icons/044-fish-14.png" },
  { id: "045-fish-15", name: "Fish 15", path: "/images/fish-icons/045-fish-15.png" },
  { id: "046-sickle", name: "Sickle", path: "/images/fish-icons/046-sickle.png" },
  { id: "047-fish-16", name: "Fish 16", path: "/images/fish-icons/047-fish-16.png" },
  { id: "048-rock-fish", name: "Rock Fish", path: "/images/fish-icons/048-rock-fish.png" },
  { id: "049-fish-17", name: "Fish 17", path: "/images/fish-icons/049-fish-17.png" },
  { id: "050-fish-18", name: "Fish 18", path: "/images/fish-icons/050-fish-18.png" },
]

export default function FishIconSelectorPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedIcon, setSelectedIcon] = useState<string>("/images/fish-icons/001-gold-fish.png")
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  const { user, updateFishIcon } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user?.fish_icon) {
      setSelectedIcon(user.fish_icon)
    }
  }, [user])

  const filteredIcons = fishIcons.filter(icon =>
    icon.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSave = async () => {
    if (!user) {
      setSaveMessage("Please log in to save your fish icon")
      setTimeout(() => setSaveMessage(""), 3000)
      return
    }

    setIsSaving(true)
    try {
      await updateFishIcon(selectedIcon)
      setSaveMessage("✓ Fish icon updated successfully!")
      setTimeout(() => {
        setSaveMessage("")
        router.back()
      }, 1500)
    } catch (error) {
      setSaveMessage("Failed to update fish icon. Please try again.")
      setTimeout(() => setSaveMessage(""), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button variant="ghost" size="icon" className="text-gray-600">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <Fish className="w-6 h-6 text-[#2e9eb3]" />
                <h1 className="text-xl font-semibold text-gray-900">Choose Your Fish Icon</h1>
              </div>
            </div>
            {user && (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#2e9eb3] hover:bg-[#138094] text-white"
              >
                {isSaving ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Save className="w-4 h-4" />
                    <span>Save</span>
                  </div>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search fish icons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Current Selection */}
        {selectedIcon && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Current Selection:</p>
              <div className="flex items-center space-x-3">
                <div className="w-16 h-16 relative bg-gray-100 rounded-lg p-2">
                  <Image
                    src={selectedIcon}
                    alt="Selected icon"
                    width={48}
                    height={48}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {fishIcons.find(icon => icon.path === selectedIcon)?.name}
                  </p>
                  <p className="text-sm text-gray-500">Your fish icon</p>
                </div>
                <Check className="w-5 h-5 text-green-500" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save Message */}
        {saveMessage && (
          <div className={`mb-4 p-3 rounded-lg ${
            saveMessage.includes("✓") 
              ? "bg-green-50 text-green-700 border border-green-200" 
              : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {saveMessage}
          </div>
        )}

        {/* Icons Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {filteredIcons.map((icon) => (
            <button
              key={icon.id}
              onClick={() => setSelectedIcon(icon.path)}
              className={`relative p-4 rounded-lg border-2 transition-all hover:scale-105 active:scale-95 ${
                selectedIcon === icon.path
                  ? "border-[#2e9eb3] bg-[#2e9eb3]/10"
                  : "border-gray-200 hover:border-[#2e9eb3]/50"
              }`}
              title={icon.name}
            >
              <div className="relative mx-auto w-12 h-12">
                <Image
                  src={icon.path}
                  alt={icon.name}
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                />
                {selectedIcon === icon.path && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#2e9eb3] rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {filteredIcons.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Fish className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">No fish icons found matching "{searchTerm}"</p>
            <p className="text-sm mt-2">Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  )
} 
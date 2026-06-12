"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Search, Fish, Check } from "lucide-react"

interface FishIconSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (iconPath: string) => void
  currentIcon?: string
  title?: string
}

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

export function FishIconSelector({ isOpen, onClose, onSelect, currentIcon, title = "Choose Your Fish Icon" }: FishIconSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedIcon, setSelectedIcon] = useState<string | undefined>(currentIcon)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setSelectedIcon(currentIcon)
  }, [currentIcon])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const filteredIcons = fishIcons.filter(icon =>
    icon.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelect = (iconPath: string) => {
    setSelectedIcon(iconPath)
    onSelect(iconPath)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className={`w-full ${isMobile ? 'max-w-full h-full max-h-full' : 'max-w-4xl max-h-[90vh]'} overflow-y-auto`}>
        <CardHeader className="relative sticky top-0 bg-white z-10 border-b">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-2 top-2" 
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
          <CardTitle className="text-xl text-center flex items-center justify-center space-x-2 pr-8">
            <Fish className="w-5 h-5 text-[#2e9eb3]" />
            <span>{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search fish icons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Current Selection - Mobile Optimized */}
          {selectedIcon && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Current Selection:</p>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 relative bg-white rounded-lg p-1">
                  <Image
                    src={selectedIcon}
                    alt="Selected icon"
                    width={32}
                    height={32}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-sm text-gray-600 flex-1">
                  {fishIcons.find(icon => icon.path === selectedIcon)?.name}
                </span>
                <Check className="w-4 h-4 text-green-500" />
              </div>
            </div>
          )}

          {/* Icons Grid - Responsive */}
          <div className={`grid gap-3 ${
            isMobile 
              ? 'grid-cols-4 sm:grid-cols-5' 
              : 'grid-cols-6 md:grid-cols-8 lg:grid-cols-10'
          }`}>
            {filteredIcons.map((icon) => (
              <button
                key={icon.id}
                onClick={() => handleSelect(icon.path)}
                className={`relative p-3 rounded-lg border-2 transition-all hover:scale-105 active:scale-95 ${
                  selectedIcon === icon.path
                    ? "border-[#2e9eb3] bg-[#2e9eb3]/10"
                    : "border-gray-200 hover:border-[#2e9eb3]/50"
                }`}
                title={icon.name}
              >
                <div className={`relative mx-auto ${isMobile ? 'w-12 h-12' : 'w-12 h-12'}`}>
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
            <div className="text-center py-8 text-gray-500">
              <Fish className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No fish icons found matching &quot;{searchTerm}&quot;</p>
            </div>
          )}

          {/* Mobile Action Buttons */}
          {isMobile && selectedIcon && (
            <div className="sticky bottom-0 bg-white border-t pt-4 mt-4">
              <Button 
                onClick={() => handleSelect(selectedIcon)}
                className="w-full bg-[#2e9eb3] hover:bg-[#138094] text-white"
              >
                Confirm Selection
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 
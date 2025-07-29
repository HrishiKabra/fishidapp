"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Instagram,
  Github,
  Linkedin,
  Search,
  Filter,
  MapPin,
  Waves,
  Ruler,
  Eye,
  Loader2,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { AuthModal } from "@/components/auth-modal"
import { UserDropdown } from "@/components/user-dropdown"
import { useAuth } from "@/lib/auth-context"

interface Species {
  id: string
  common_name: string
  scientific_name: string
  image_url?: string
  habitat?: string
  distribution?: string
  max_length_cm?: number
  conservation_status?: string
  description?: string
  family?: string
  region?: string
}

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
      return "LC"
    case "NT":
    case "NEAR_THREATENED":
      return "NT"
    case "VU":
    case "VULNERABLE":
      return "VU"
    case "EN":
    case "ENDANGERED":
      return "EN"
    case "CR":
    case "CRITICALLY_ENDANGERED":
      return "CR"
    default:
      return status || "UK"
  }
}

export default function SpeciesListPage() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [species, setSpecies] = useState<Species[]>([])
  const [filteredSpecies, setFilteredSpecies] = useState<Species[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRegion, setSelectedRegion] = useState<string>("all")
  const [selectedHabitat, setSelectedHabitat] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const { user } = useAuth()

  const itemsPerPage = 12

  useEffect(() => {
    loadSpecies()
  }, [currentPage])

  useEffect(() => {
    filterSpecies()
  }, [species, searchTerm, selectedRegion, selectedHabitat, selectedStatus])

  const loadSpecies = async () => {
    setLoading(true)
    setError(null)

    // Use mock data by default for now
    try {
      console.log("🐟 Loading species data...")

      // Simulate API delay for realistic experience
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Use mock data
      const mockData = getMockSpecies()
      setSpecies(mockData)
      setTotalPages(Math.ceil(mockData.length / itemsPerPage))

      console.log("✅ Mock species data loaded:", mockData.length, "species")
    } catch (err) {
      console.error("Error loading species:", err)
      setError("Failed to load species data")
    } finally {
      setLoading(false)
    }
  }

  const filterSpecies = () => {
    let filtered = species

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (s) =>
          s.common_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.scientific_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.family?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Region filter
    if (selectedRegion !== "all") {
      filtered = filtered.filter((s) => s.region === selectedRegion)
    }

    // Habitat filter
    if (selectedHabitat !== "all") {
      filtered = filtered.filter((s) => s.habitat?.toLowerCase().includes(selectedHabitat.toLowerCase()))
    }

    // Conservation status filter
    if (selectedStatus !== "all") {
      filtered = filtered.filter((s) => s.conservation_status === selectedStatus)
    }

    setFilteredSpecies(filtered)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedRegion("all")
    setSelectedHabitat("all")
    setSelectedStatus("all")
  }

  const scrollToAbout = () => {
    window.location.href = "/#about-section"
  }

  // Mock data for development/fallback
  const getMockSpecies = (): Species[] => [
    {
      id: "1",
      common_name: "Clownfish",
      scientific_name: "Amphiprion ocellatus",
      image_url: "/placeholder.svg?height=200&width=300",
      habitat: "Coral reefs",
      distribution: "Indo-Pacific",
      max_length_cm: 11,
      conservation_status: "LC",
      description: "Bright orange fish with white stripes, lives symbiotically in sea anemones",
      family: "Pomacentridae",
      region: "Indo-Pacific",
    },
    {
      id: "2",
      common_name: "Blue Tang",
      scientific_name: "Paracanthurus hepatus",
      image_url: "/placeholder.svg?height=200&width=300",
      habitat: "Coral reefs",
      distribution: "Indo-Pacific",
      max_length_cm: 30,
      conservation_status: "LC",
      description: "Bright blue fish with black patterns, popular in aquariums and known as 'Dory'",
      family: "Acanthuridae",
      region: "Indo-Pacific",
    },
    {
      id: "3",
      common_name: "Emperor Angelfish",
      scientific_name: "Pomacanthus imperator",
      image_url: "/placeholder.svg?height=200&width=300",
      habitat: "Coral reefs",
      distribution: "Indo-Pacific",
      max_length_cm: 40,
      conservation_status: "LC",
      description: "Stunning reef fish with blue and yellow stripes, changes dramatically from juvenile to adult",
      family: "Pomacanthidae",
      region: "Indo-Pacific",
    },
    {
      id: "4",
      common_name: "Blue Parrotfish",
      scientific_name: "Scarus coeruleus",
      image_url: "/placeholder.svg?height=200&width=300",
      habitat: "Coral reefs",
      distribution: "Atlantic",
      max_length_cm: 120,
      conservation_status: "LC",
      description: "Large herbivorous fish that helps maintain coral reef health by eating algae",
      family: "Scaridae",
      region: "Atlantic",
    },
    {
      id: "5",
      common_name: "Nassau Grouper",
      scientific_name: "Epinephelus striatus",
      image_url: "/placeholder.svg?height=200&width=300",
      habitat: "Coral reefs",
      distribution: "Atlantic",
      max_length_cm: 122,
      conservation_status: "CR",
      description: "Large predatory fish, critically endangered due to overfishing and habitat loss",
      family: "Serranidae",
      region: "Atlantic",
    },
    {
      id: "6",
      common_name: "Threadfin Butterflyfish",
      scientific_name: "Chaetodon auriga",
      image_url: "/placeholder.svg?height=200&width=300",
      habitat: "Coral reefs",
      distribution: "Indo-Pacific",
      max_length_cm: 23,
      conservation_status: "LC",
      description: "Delicate reef fish with intricate patterns and a distinctive thread-like dorsal fin",
      family: "Chaetodontidae",
      region: "Indo-Pacific",
    },
    {
      id: "7",
      common_name: "Mandarin Fish",
      scientific_name: "Synchiropus splendidus",
      image_url: "/placeholder.svg?height=200&width=300",
      habitat: "Coral reefs",
      distribution: "Pacific",
      max_length_cm: 6,
      conservation_status: "LC",
      description: "One of the most colorful fish in the ocean with psychedelic patterns",
      family: "Callionymidae",
      region: "Pacific",
    },
    {
      id: "8",
      common_name: "Moorish Idol",
      scientific_name: "Zanclus cornutus",
      image_url: "/placeholder.svg?height=200&width=300",
      habitat: "Coral reefs",
      distribution: "Indo-Pacific",
      max_length_cm: 23,
      conservation_status: "LC",
      description: "Distinctive black and white striped fish with a long dorsal fin",
      family: "Zanclidae",
      region: "Indo-Pacific",
    },
    {
      id: "9",
      common_name: "Lionfish",
      scientific_name: "Pterois volitans",
      image_url: "/placeholder.svg?height=200&width=300",
      habitat: "Coral reefs",
      distribution: "Indo-Pacific",
      max_length_cm: 38,
      conservation_status: "LC",
      description: "Beautiful but venomous fish with elaborate fins and spines",
      family: "Scorpaenidae",
      region: "Indo-Pacific",
    },
    {
      id: "10",
      common_name: "Yellowtail Snapper",
      scientific_name: "Ocyurus chrysurus",
      image_url: "/placeholder.svg?height=200&width=300",
      habitat: "Coral reefs",
      distribution: "Atlantic",
      max_length_cm: 86,
      conservation_status: "LC",
      description: "Popular game fish with distinctive yellow tail and silver body",
      family: "Lutjanidae",
      region: "Atlantic",
    },
    {
      id: "11",
      common_name: "Banggai Cardinalfish",
      scientific_name: "Pterapogon kauderni",
      image_url: "/placeholder.svg?height=200&width=300",
      habitat: "Shallow waters",
      distribution: "Indo-Pacific",
      max_length_cm: 8,
      conservation_status: "EN",
      description: "Endangered species with distinctive black and white pattern, endemic to Indonesia",
      family: "Apogonidae",
      region: "Indo-Pacific",
    },
    {
      id: "12",
      common_name: "Whale Shark",
      scientific_name: "Rhincodon typus",
      image_url: "/placeholder.svg?height=200&width=300",
      habitat: "Open ocean",
      distribution: "Global",
      max_length_cm: 1200,
      conservation_status: "EN",
      description: "The largest fish in the ocean, gentle giant that feeds on plankton",
      family: "Rhincodontidae",
      region: "Global",
    },
    {
      id: "13",
      common_name: "Manta Ray",
      scientific_name: "Mobula birostris",
      image_url: "/placeholder.svg?height=200&width=300",
      habitat: "Open ocean",
      distribution: "Global",
      max_length_cm: 700,
      conservation_status: "VU",
      description: "Majestic ray with the largest brain of any fish, known for its intelligence",
      family: "Mobulidae",
      region: "Global",
    },
    {
      id: "14",
      common_name: "Leafy Sea Dragon",
      scientific_name: "Phycodurus eques",
      image_url: "/placeholder.svg?height=200&width=300",
      habitat: "Shallow waters",
      distribution: "Pacific",
      max_length_cm: 35,
      conservation_status: "NT",
      description: "Master of camouflage with leaf-like appendages, related to seahorses",
      family: "Syngnathidae",
      region: "Pacific",
    },
    {
      id: "15",
      common_name: "Giant Pacific Octopus",
      scientific_name: "Enteroctopus dofleini",
      image_url: "/placeholder.svg?height=200&width=300",
      habitat: "Deep sea",
      distribution: "Pacific",
      max_length_cm: 600,
      conservation_status: "LC",
      description: "Largest octopus species, highly intelligent with problem-solving abilities",
      family: "Enteroctopodidae",
      region: "Pacific",
    },
    {
      id: "16",
      common_name: "Bluefin Tuna",
      scientific_name: "Thunnus thynnus",
      image_url: "/placeholder.svg?height=200&width=300",
      habitat: "Open ocean",
      distribution: "Atlantic",
      max_length_cm: 458,
      conservation_status: "EN",
      description: "Highly prized commercial fish, endangered due to overfishing",
      family: "Scombridae",
      region: "Atlantic",
    },
    {
      id: "17",
      common_name: "Seahorse",
      scientific_name: "Hippocampus reidi",
      image_url: "/placeholder.svg?height=200&width=300",
      habitat: "Shallow waters",
      distribution: "Atlantic",
      max_length_cm: 17,
      conservation_status: "VU",
      description: "Unique fish where males carry the eggs, vulnerable due to habitat loss",
      family: "Syngnathidae",
      region: "Atlantic",
    },
    {
      id: "18",
      common_name: "Pufferfish",
      scientific_name: "Arothron meleagris",
      image_url: "/placeholder.svg?height=200&width=300",
      habitat: "Coral reefs",
      distribution: "Indo-Pacific",
      max_length_cm: 50,
      conservation_status: "LC",
      description: "Can inflate into a spiky ball when threatened, some species are highly toxic",
      family: "Tetraodontidae",
      region: "Indo-Pacific",
    },
  ]

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
            <Link href="/species-list" className="text-white text-[#2e9eb3] font-medium">
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

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-teal-50 to-blue-50 py-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[#0d2a50] mb-4">Marine Species Database</h1>
          <p className="text-xl text-[#138094] mb-8">Explore thousands of fish species from around the world</p>

          {/* Search and Filters */}
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, scientific name, or family..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>

              {/* Filter Toggle */}
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="h-12 px-6 bg-white">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="bg-white rounded-lg p-6 shadow-lg border mb-6">
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
                    <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                      <SelectTrigger>
                        <SelectValue placeholder="All regions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Regions</SelectItem>
                        <SelectItem value="Indo-Pacific">Indo-Pacific</SelectItem>
                        <SelectItem value="Atlantic">Atlantic</SelectItem>
                        <SelectItem value="Pacific">Pacific</SelectItem>
                        <SelectItem value="Mediterranean">Mediterranean</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Habitat</label>
                    <Select value={selectedHabitat} onValueChange={setSelectedHabitat}>
                      <SelectTrigger>
                        <SelectValue placeholder="All habitats" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Habitats</SelectItem>
                        <SelectItem value="coral">Coral Reefs</SelectItem>
                        <SelectItem value="deep">Deep Sea</SelectItem>
                        <SelectItem value="shallow">Shallow Waters</SelectItem>
                        <SelectItem value="open">Open Ocean</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Conservation Status</label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="LC">Least Concern</SelectItem>
                        <SelectItem value="NT">Near Threatened</SelectItem>
                        <SelectItem value="VU">Vulnerable</SelectItem>
                        <SelectItem value="EN">Endangered</SelectItem>
                        <SelectItem value="CR">Critically Endangered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">{filteredSpecies.length} species found</p>
                  <Button variant="ghost" onClick={clearFilters} className="text-[#2e9eb3]">
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Species Grid */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#2e9eb3] mx-auto mb-4" />
                <p className="text-gray-600">Loading species...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center max-w-md">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Species</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button onClick={loadSpecies} className="bg-[#2e9eb3] hover:bg-[#138094] text-white">
                  Try Again
                </Button>
              </div>
            </div>
          ) : filteredSpecies.length === 0 ? (
            <div className="text-center py-20">
              <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Species Found</h3>
              <p className="text-gray-600 mb-4">Try adjusting your search or filter criteria</p>
              <Button variant="outline" onClick={clearFilters} className="bg-transparent">
                Clear Filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredSpecies.map((fish) => (
                  <Card key={fish.id} className="group hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-0">
                      {/* Image */}
                      <div className="relative h-48 overflow-hidden rounded-t-lg">
                        <Image
                          src={fish.image_url || "/placeholder.svg?height=200&width=300&query=fish"}
                          alt={fish.common_name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {fish.conservation_status && (
                          <div className="absolute top-2 right-2">
                            <Badge className={`${getStatusColor(fish.conservation_status)} text-white text-xs`}>
                              {getStatusText(fish.conservation_status)}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h3 className="font-semibold text-[#0d2a50] mb-1 group-hover:text-[#2e9eb3] transition-colors">
                          {fish.common_name}
                        </h3>
                        <p className="text-sm text-gray-600 italic mb-3">{fish.scientific_name}</p>

                        {/* Quick Info */}
                        <div className="space-y-2 text-xs text-gray-600">
                          {fish.habitat && (
                            <div className="flex items-center space-x-2">
                              <Waves className="w-3 h-3 text-[#2e9eb3]" />
                              <span>{fish.habitat}</span>
                            </div>
                          )}
                          {fish.distribution && (
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-3 h-3 text-[#2e9eb3]" />
                              <span>{fish.distribution}</span>
                            </div>
                          )}
                          {fish.max_length_cm && (
                            <div className="flex items-center space-x-2">
                              <Ruler className="w-3 h-3 text-[#2e9eb3]" />
                              <span>Up to {fish.max_length_cm} cm</span>
                            </div>
                          )}
                        </div>

                        {/* Description */}
                        {fish.description && (
                          <p className="text-xs text-gray-500 mt-3 line-clamp-2">{fish.description}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-4 mt-12">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="bg-transparent"
                  >
                    Previous
                  </Button>

                  <div className="flex items-center space-x-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          onClick={() => setCurrentPage(page)}
                          className={currentPage === page ? "bg-[#2e9eb3] hover:bg-[#138094]" : "bg-transparent"}
                          size="sm"
                        >
                          {page}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="bg-transparent"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-[#0e496c] to-[#2e9eb3] py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Identify Your Own Fish?</h2>
          <p className="text-white/90 text-lg mb-8">
            Upload a photo and get instant AI-powered identification with detailed species information
          </p>
          <Link href="/">
            <Button className="bg-white text-[#0e496c] hover:bg-gray-100 px-8 py-3 text-lg rounded-full">
              Start Identifying
            </Button>
          </Link>
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

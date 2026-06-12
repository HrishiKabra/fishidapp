"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, MapPin, Waves, Ruler, Eye, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { AuthModal } from "@/components/auth-modal"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { fetchSpecies, type Species } from "@/lib/species"

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
  const [totalSpecies, setTotalSpecies] = useState(0)

  const loadSpecies = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await fetchSpecies({
        page: currentPage,
        limit: 20,
        search: searchTerm || undefined,
        region: selectedRegion,
        habitat: selectedHabitat,
        status: selectedStatus,
      })
      setSpecies(result.species)
      setFilteredSpecies(result.species)
      setTotalPages(result.totalPages)
      setTotalSpecies(result.total)
    } catch (error: any) {
      setError(error.message || "Failed to load species. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const filterSpecies = () => {
    setCurrentPage(1)
    loadSpecies()
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedRegion("all")
    setSelectedHabitat("all")
    setSelectedStatus("all")
    setCurrentPage(1)
    loadSpecies()
  }

  useEffect(() => {
    loadSpecies()
  }, [currentPage])

  useEffect(() => {
    // Debounce search
    const timeoutId = setTimeout(() => {
      if (searchTerm !== "") {
        filterSpecies()
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader onLoginClick={() => setShowAuthModal(true)} />

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
                  <p className="text-sm text-gray-600">{totalSpecies} species found</p>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={filterSpecies} className="text-[#2e9eb3]">
                      Apply Filters
                    </Button>
                    <Button variant="ghost" onClick={clearFilters} className="text-gray-500">
                      Clear Filters
                    </Button>
                </div>
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
                              <span>Up to {fish.max_length_cm}</span>
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
                      const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4))
                      const page = start + i
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

      <SiteFooter />

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  )
}

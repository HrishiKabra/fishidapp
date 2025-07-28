"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Instagram, Github, Linkedin, BookOpen, Clock } from "lucide-react"
import Link from "next/link"

import { AuthModal } from "@/components/auth-modal"
import { UserDropdown } from "@/components/user-dropdown"
import { HamburgerMenu } from "@/components/hamburger-menu"
import { useAuth } from "@/lib/auth-context"
import { useState } from "react"

export default function SpeciesListPage() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const { user } = useAuth()

  const scrollToAbout = () => {
    // Navigate to home page and scroll to about section
    window.location.href = "/#about-section"
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
          {/* Desktop Nav */}
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
          {/* Mobile Hamburger Menu */}
          <HamburgerMenu onAboutClick={scrollToAbout} onLoginClick={() => setShowAuthModal(true)} />
        </div>
      </header>

      {/* Coming Soon Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center py-20">
        {/* Background with subtle pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-blue-50"></div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="mb-8">
            <BookOpen className="w-24 h-24 text-[#2e9eb3] mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold text-[#0d2a50] mb-4">Species List</h1>
            <p className="text-xl text-[#138094] mb-8">Comprehensive database of marine fish species</p>
          </div>

          <div className="bg-white rounded-3xl p-12 shadow-lg border border-gray-100 max-w-2xl mx-auto">
            <Clock className="w-16 h-16 text-[#2e9eb3] mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-[#0d2a50] mb-4">Coming Soon!</h2>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              We're building a comprehensive database of marine fish species with detailed information, photos, and
              identification guides to help you learn more about ocean life.
            </p>

            <div className="space-y-4 text-left bg-gray-50 rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-[#0d2a50] mb-3">What's coming:</h3>
              <div className="space-y-2 text-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#2e9eb3] rounded-full"></div>
                  <span>Browse thousands of fish species</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#2e9eb3] rounded-full"></div>
                  <span>Filter by region, habitat, and size</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#2e9eb3] rounded-full"></div>
                  <span>Detailed species information and photos</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#2e9eb3] rounded-full"></div>
                  <span>Conservation status and fun facts</span>
                </div>
              </div>
            </div>

            <Link href="/">
              <Button className="bg-[#2e9eb3] hover:bg-[#138094] text-white px-8 py-3 text-lg rounded-full">
                Start Identifying Fish
              </Button>
            </Link>
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

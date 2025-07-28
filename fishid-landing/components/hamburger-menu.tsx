"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X, User, LogOut, Fish, Settings, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { UserDropdown } from "./user-dropdown"
import { BackendStatus } from "./backend-status"
import { FishIconSelector } from "./fish-icon-selector"
import { usePathname } from "next/navigation"
import Image from "next/image"

export function HamburgerMenu({ 
  onAboutClick, 
  onLoginClick 
}: { 
  onAboutClick: () => void
  onLoginClick?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [showBackendStatus, setShowBackendStatus] = useState(false)
  const [showIconSelector, setShowIconSelector] = useState(false)
  const { user, logout, updateFishIcon } = useAuth()
  const pathname = usePathname()
  const isResultsPage = pathname === "/results"

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        className="text-white hover:bg-white/10 p-2"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="w-7 h-7" />
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)}>
          <nav
            className="absolute top-0 right-0 w-80 h-full bg-white shadow-lg flex flex-col p-6 space-y-6 animate-slide-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <span className="text-xl font-bold text-[#0e496c]">Menu</span>
              <Button
                variant="ghost"
                className="text-[#0e496c] hover:bg-[#0e496c]/10 p-2"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            {/* User Profile Card - Show when logged in */}
            {user && (
              <Card className="mb-6 border-2 border-gray-100 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                      {user.fish_icon ? (
                        <Image
                          src={user.fish_icon}
                          alt={user.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <User className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-lg">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  
                  {/* User Actions */}
                  <div className="mt-4 space-y-2">
                    <Link
                      href="/fish-log"
                      className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      onClick={() => setOpen(false)}
                    >
                      <Fish className="w-4 h-4" />
                      <span>My Fish Log</span>
                    </Link>

                    <button
                      className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors w-full text-left"
                      onClick={() => {
                        setOpen(false)
                        setShowBackendStatus(true)
                      }}
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>

                    <button
                      className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors w-full text-left"
                      onClick={() => {
                        setOpen(false)
                        setShowIconSelector(true)
                      }}
                    >
                      <Fish className="w-4 h-4" />
                      <span>Change Fish Icon</span>
                    </button>

                    <Link
                      href="/fish-icon-selector"
                      className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      onClick={() => setOpen(false)}
                    >
                      <Fish className="w-4 h-4" />
                      <span>Fish Icon Gallery</span>
                    </Link>

                    <hr className="my-2" />

                    <button
                      onClick={() => {
                        logout()
                        setOpen(false)
                      }}
                      className="flex items-center space-x-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation Links */}
            {isResultsPage && (
              <Link
                href="/"
                className="text-[#0e496c] text-lg py-2 px-2 rounded hover:text-[#2e9eb3] transition-colors"
                onClick={() => setOpen(false)}
              >
                New Search
              </Link>
            )}
            <button
              className="text-[#0e496c] text-lg text-left py-2 px-2 rounded hover:text-[#2e9eb3] transition-colors"
              onClick={() => {
                setOpen(false)
                onAboutClick()
              }}
            >
              About Us
            </button>
            <Link
              href="/fish-log"
              className="text-[#0e496c] text-lg py-2 px-2 rounded hover:text-[#2e9eb3] transition-colors"
              onClick={() => setOpen(false)}
            >
              Fish Log
            </Link>
            <Link
              href="/species-list"
              className="text-[#0e496c] text-lg py-2 px-2 rounded hover:text-[#2e9eb3] transition-colors"
              onClick={() => setOpen(false)}
            >
              Species List
            </Link>

            {/* Login Button - Show when not logged in */}
            {!user && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  className="w-full border-[#0e496c] text-[#0e496c] bg-white hover:bg-[#0e496c] hover:text-white transition-colors"
                  onClick={() => {
                    setOpen(false)
                    if (onLoginClick) {
                      onLoginClick()
                    }
                  }}
                >
                  Log In
                </Button>
              </div>
            )}
          </nav>
          <style jsx global>{`
            @keyframes slide-in {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
            .animate-slide-in {
              animation: slide-in 0.2s ease-out;
            }
          `}</style>
        </div>
      )}

      {/* Modals */}
      <BackendStatus isOpen={showBackendStatus} onClose={() => setShowBackendStatus(false)} />
      <FishIconSelector
        isOpen={showIconSelector}
        onClose={() => setShowIconSelector(false)}
        onSelect={(iconPath) => {
          updateFishIcon(iconPath)
          setShowIconSelector(false)
        }}
        currentIcon={user?.fish_icon}
        title="Change Your Fish Icon"
      />
    </div>
  )
} 
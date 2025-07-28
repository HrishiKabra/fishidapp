"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { User, LogOut, Fish, Settings, ChevronDown } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { BackendStatus } from "./backend-status"
import { FishIconSelector } from "./fish-icon-selector"
import Image from "next/image"
import Link from "next/link"

export function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [showBackendStatus, setShowBackendStatus] = useState(false)
  const [showIconSelector, setShowIconSelector] = useState(false)
  const { user, logout, updateFishIcon } = useAuth()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (!user) return null

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="ghost"
          className="flex items-center space-x-2 text-white hover:bg-white/20 px-3 py-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="w-8 h-8 rounded-full overflow-hidden bg-white/20">
            {user.fish_icon ? (
              <Image
                src={user.fish_icon}
                alt={user.name}
                width={32}
                height={32}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
          <span className="hidden md:block">{user.name}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </Button>

        {isOpen && (
          <Card className="absolute right-0 top-full mt-2 w-64 z-50 shadow-lg">
            <CardContent className="p-0">
              <div className="p-4 border-b">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                    {user.fish_icon ? (
                      <Image
                        src={user.fish_icon}
                        alt={user.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
              </div>

              <div className="py-2">
                <Link
                  href="/fish-log"
                  className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <Fish className="w-4 h-4" />
                  <span>My Fish Log</span>
                </Link>

                <button
                  className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors w-full text-left"
                  onClick={() => {
                    setIsOpen(false)
                    setShowBackendStatus(true)
                  }}
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>

                <button
                  className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors w-full text-left"
                  onClick={() => {
                    setIsOpen(false)
                    setShowIconSelector(true)
                  }}
                >
                  <Fish className="w-4 h-4" />
                  <span>Change Fish Icon</span>
                </button>

                <hr className="my-2" />

                <button
                  onClick={() => {
                    logout()
                    setIsOpen(false)
                  }}
                  className="flex items-center space-x-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <BackendStatus isOpen={showBackendStatus} onClose={() => setShowBackendStatus(false)} />
      <FishIconSelector
        isOpen={showIconSelector}
        onClose={() => setShowIconSelector(false)}
        onSelect={(iconPath) => {
          updateFishIcon(iconPath)
          setShowIconSelector(false)
        }}
        currentIcon={user.fish_icon}
        title="Change Your Fish Icon"
      />
    </>
  )
}

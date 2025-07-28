"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { UserDropdown } from "./user-dropdown"
import { usePathname } from "next/navigation"

export function HamburgerMenu({ 
  onAboutClick, 
  onLoginClick 
}: { 
  onAboutClick: () => void
  onLoginClick?: () => void
}) {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
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
            className="absolute top-0 right-0 w-64 h-full bg-white shadow-lg flex flex-col p-6 space-y-6 animate-slide-in"
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
            <div className="mt-4">
              {user ? (
                <UserDropdown />
              ) : (
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
              )}
            </div>
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
    </div>
  )
} 
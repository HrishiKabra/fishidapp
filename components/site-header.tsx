"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { UserDropdown } from "@/components/user-dropdown"
import { HamburgerMenu } from "@/components/hamburger-menu"
import { useAuth } from "@/lib/auth-context"

interface SiteHeaderProps {
  showBack?: boolean
  onLoginClick: () => void
}

export function SiteHeader({ showBack = false, onLoginClick }: SiteHeaderProps) {
  const { user } = useAuth()
  const pathname = usePathname()

  const handleAboutClick = () => {
    if (pathname === "/") {
      document.getElementById("about-section")?.scrollIntoView({ behavior: "smooth" })
    } else {
      window.location.href = "/#about-section"
    }
  }

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={
        pathname === href ? "text-[#2e9eb3] font-medium" : "text-white hover:text-[#2e9eb3] transition-colors"
      }
    >
      {label}
    </Link>
  )

  return (
    <header className="bg-[#0e496c] px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {showBack && (
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
          )}
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
          {showBack && navLink("/", "New Search")}
          <button onClick={handleAboutClick} className="text-white hover:text-[#2e9eb3] transition-colors">
            About Us
          </button>
          {navLink("/fish-log", "Fish Log")}
          {navLink("/species-list", "Species List")}
          {user ? (
            <UserDropdown />
          ) : (
            <Button
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-[#0e496c] transition-colors bg-transparent"
              onClick={onLoginClick}
            >
              Log In
            </Button>
          )}
        </nav>
        <HamburgerMenu onAboutClick={handleAboutClick} onLoginClick={onLoginClick} />
      </div>
    </header>
  )
}

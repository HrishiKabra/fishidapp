import Image from "next/image"
import { Instagram, Github, Linkedin } from "lucide-react"

export function SiteFooter() {
  return (
    <footer className="bg-[#0e496c] text-white py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="text-2xl font-bold mb-4">Reach Out!</h3>
            <p className="text-sm mb-2">Feel free to reach out to me on Instagram, LinkedIn or via email.</p>
            <p className="text-sm mb-6">kabrahrishi@gmail.com</p>

            <div className="flex space-x-4 mb-6">
              <a href="https://instagram.com/hrishikabra" target="_blank" rel="noopener noreferrer">
                <Instagram className="w-6 h-6 hover:text-[#2e9eb3] cursor-pointer transition-colors" />
              </a>
              <a href="https://github.com/HrishiKabra" target="_blank" rel="noopener noreferrer">
                <Github className="w-6 h-6 hover:text-[#2e9eb3] cursor-pointer transition-colors" />
              </a>
              <a href="https://linkedin.com/in/HrishiKabra" target="_blank" rel="noopener noreferrer">
                <Linkedin className="w-6 h-6 hover:text-[#2e9eb3] cursor-pointer transition-colors" />
              </a>
            </div>

            <p className="text-xs text-gray-300">© 2026 All Rights Reserved</p>
          </div>

          <div className="flex justify-end">
            <Image src="/images/logo.png" alt="FishID Logo" width={200} height={80} className="h-16 w-auto" />
          </div>
        </div>
      </div>
    </footer>
  )
}

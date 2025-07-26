"use client"
import { useRef, useEffect } from "react"
import type React from "react"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, X, AlertCircle } from "lucide-react"
import { useFileUpload } from "@/hooks/use-file-upload"

interface FileUploadProps {
  onUploadComplete?: (result: any) => void
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { file, preview, isProcessing, progress, result, error, setFile, reset } = useFileUpload()

  // Call onUploadComplete when processing is done successfully
  useEffect(() => {
    if (result?.success && onUploadComplete) {
      onUploadComplete(result)
    }
  }, [result, onUploadComplete])

  /* ---------- event handlers ---------- */
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    handleDrag(e)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) setFile(files[0])
  }

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files?.length) setFile(files[0])
  }

  const formatBytes = (b: number) => {
    if (!b) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(b) / Math.log(k))
    return `${(b / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  /* ---------- JSX ---------- */
  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* No file selected */}
      {!file && (
        <div
          className="border-4 border-dashed border-white rounded-2xl p-12 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors h-[280px] flex flex-col items-center justify-center"
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-12 h-12 text-white mb-4" />
          <p className="text-white text-lg font-medium">Drag your file(s) or browse:</p>
          <p className="text-white/70 text-sm mt-2">JPEG / PNG / WebP – max 10 MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={handleSelect}
          />
        </div>
      )}

      {/* File chosen */}
      {file && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 space-y-3 border border-white/20">
          {/* header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white font-medium text-sm">{file.name}</p>
              <p className="text-white/70 text-xs">{formatBytes(file.size)}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={reset} className="text-white hover:bg-white/20 h-8 w-8">
              <X className="w-3 h-3" />
            </Button>
          </div>

          {/* processed image display - fixed height */}
          {result?.processedImage ? (
            <div className="relative w-full h-[200px] rounded-lg overflow-hidden border border-white/20">
              <Image
                src={result.processedImage.url || "/placeholder.svg"}
                alt="processed fish image"
                fill
                className="object-cover"
              />
            </div>
          ) : preview ? (
            <div className="relative w-full h-[200px] rounded-lg overflow-hidden border border-white/20">
              <Image src={preview || "/placeholder.svg"} alt="preview" fill className="object-cover" />
            </div>
          ) : null}

          {/* progress */}
          {isProcessing && (
            <div>
              <div className="flex justify-between text-white text-xs mb-1">
                <span>Processing image...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="bg-white/20 h-2" />
            </div>
          )}

          {/* errors */}
          {error && (
            <div className="flex items-center gap-2 text-red-300 bg-red-500/20 p-2 rounded-lg text-xs border border-red-500/30">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* just upload new button */}
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              className="border-white text-white bg-transparent hover:bg-white hover:text-[#0e496c] transition-colors text-xs"
              onClick={reset}
            >
              Upload Different Image
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

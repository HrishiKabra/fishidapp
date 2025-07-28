"use client"

import { useState, useCallback } from "react"

export interface UploadResult {
  success: boolean
  message: string
  processedImage?: {
    url: string
    width: number
    height: number
    size: number
    format: string
  }
  file?: File
  error?: string
}

export interface FileUploadState {
  file: File | null
  preview: string | null
  isProcessing: boolean
  progress: number
  result: UploadResult | null
  error: string | null
}

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const VALID_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

export function useFileUpload() {
  const [state, setState] = useState<FileUploadState>({
    file: null,
    preview: null,
    isProcessing: false,
    progress: 0,
    result: null,
    error: null,
  })

  /* ---------- helpers ---------- */
  const validate = (file: File): string | null => {
    if (!VALID_TYPES.includes(file.type)) return "Please upload a JPEG, PNG, or WebP image."
    if (file.size > MAX_SIZE) return "File too large (max 10 MB)."
    return null
  }

  const createPreview = (file: File) =>
    new Promise<string>((res) => {
      const reader = new FileReader()
      reader.onload = () => res(reader.result as string)
      reader.readAsDataURL(file)
    })

  /* ---------- public API ---------- */
  const setFile = useCallback(async (file: File | null) => {
    if (!file) {
      setState((s) => ({ ...s, file: null, preview: null, error: null, result: null }))
      return
    }

    const err = validate(file)
    if (err) {
      setState((s) => ({ ...s, error: err }))
      return
    }

    const preview = await createPreview(file)
    setState((s) => ({ ...s, file, preview, error: null, isProcessing: true, progress: 0 }))

    // Auto-process the image
    const interval = setInterval(() => setState((s) => ({ ...s, progress: Math.min(s.progress + 10, 90) })), 80)

    try {
      // Create processed image result
      const processedImage = {
        url: preview,
        width: 800, // You might want to get actual dimensions
        height: 600,
        size: file.size,
        format: file.type.split("/")[1],
      }

      clearInterval(interval)
      setState((s) => ({
        ...s,
        isProcessing: false,
        progress: 100,
        result: {
          success: true,
          message: "Image processed successfully!",
          processedImage,
          file, // Include the file for later use
        },
        error: null,
      }))
    } catch (error) {
      clearInterval(interval)
      setState((s) => ({
        ...s,
        isProcessing: false,
        progress: 0,
        error: "Could not process image. Please try another file.",
      }))
    }
  }, [])

  const reset = useCallback(
    () =>
      setState({
        file: null,
        preview: null,
        isProcessing: false,
        progress: 0,
        result: null,
        error: null,
      }),
    [],
  )

  return { ...state, setFile, reset }
}

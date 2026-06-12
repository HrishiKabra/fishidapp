const MAX_DIM = 1024
const JPEG_QUALITY = 0.85

export async function prepareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Could not process image")
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not process image"))),
      "image/jpeg",
      JPEG_QUALITY,
    ),
  )
}

/**
 * Compresses an image file and returns a base64 string
 * @param file - The image file to compress
 * @param quality - Compression quality (0.0 to 1.0, default 0.85)
 * @param maxWidth - Maximum width in pixels (default 1920)
 * @param maxHeight - Maximum height in pixels (default 1080)
 * @returns Promise<string> - Base64 encoded compressed image
 */
export function compressImage(
  file: File,
  quality: number = 0.85,
  maxWidth: number = 1920,
  maxHeight: number = 1080
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      const img = new Image()
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }
        
        // Use high quality image rendering
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        
        // Draw the image
        ctx.drawImage(img, 0, 0, width, height)
        
        // Convert to base64 with compression
        // Use JPEG for photos (smaller size), PNG for screenshots with text
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        const compressedBase64 = canvas.toDataURL(mimeType, quality)
        
        resolve(compressedBase64)
      }
      
      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }
      
      img.src = event.target?.result as string
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsDataURL(file)
  })
}

/**
 * Compresses a final work screenshot with optimized settings
 * @param file - The image file to compress
 * @returns Promise<string> - Base64 encoded compressed image
 */
export function compressFinalWorkScreenshot(file: File): Promise<string> {
  // Use 85% quality for good balance of size and quality
  // Max 1920x1080 which is Full HD - good for PDFs
  return compressImage(file, 0.85, 1920, 1080)
}


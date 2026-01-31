/**
 * Photo Processing Utilities for GAMA Photo Capture
 * 
 * Provides functions for capturing video frames and processing images:
 * - Capture video frame to canvas
 * - Resize to max dimension while maintaining aspect ratio
 * - Compress to JPEG format
 * 
 * @see .kiro/specs/v0.4-camera-gps/design.md for architecture details
 */

// ============================================
// TYPES
// ============================================

/**
 * Options for processing images
 */
export interface ProcessOptions {
  /** Maximum dimension (width or height) in pixels. Default: 2048 */
  maxDimension?: number
  /** JPEG quality (0-1). Default: 0.8 */
  quality?: number
  /** Output format. Default: 'image/jpeg' */
  format?: 'image/jpeg' | 'image/webp'
}

/**
 * Result of image processing
 */
export interface ProcessResult {
  /** Processed image blob */
  blob: Blob
  /** Original width before processing */
  originalWidth: number
  /** Original height before processing */
  originalHeight: number
  /** Processed width */
  width: number
  /** Processed height */
  height: number
  /** File size in bytes */
  size: number
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_MAX_DIMENSION = 2048
const DEFAULT_QUALITY = 0.8
const DEFAULT_FORMAT = 'image/jpeg'

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate new dimensions while maintaining aspect ratio
 * 
 * @param originalWidth - Original width in pixels
 * @param originalHeight - Original height in pixels
 * @param maxDimension - Maximum allowed dimension
 * @returns New dimensions that fit within maxDimension while preserving aspect ratio
 */
export function calculateResizedDimensions(
  originalWidth: number,
  originalHeight: number,
  maxDimension: number
): { width: number; height: number } {
  // If already within bounds, return original dimensions (no upscaling)
  if (originalWidth <= maxDimension && originalHeight <= maxDimension) {
    return { width: originalWidth, height: originalHeight }
  }

  // Calculate scale factor based on the larger dimension
  const scale = maxDimension / Math.max(originalWidth, originalHeight)
  
  // Apply scale and round to integers
  const width = Math.round(originalWidth * scale)
  const height = Math.round(originalHeight * scale)

  return { width, height }
}

/**
 * Draw source to canvas with optional resizing
 * 
 * @param source - Image or video element to draw
 * @param sourceWidth - Width of the source
 * @param sourceHeight - Height of the source
 * @param targetWidth - Target canvas width
 * @param targetHeight - Target canvas height
 * @returns Canvas with the drawn image
 */
function drawToCanvas(
  source: HTMLVideoElement | HTMLImageElement,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas 2D context')
  }

  // Draw the source to canvas, scaling if necessary
  ctx.drawImage(source, 0, 0, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight)

  return canvas
}

/**
 * Convert canvas to blob
 * 
 * @param canvas - Canvas element to convert
 * @param format - Output format (image/jpeg or image/webp)
 * @param quality - Compression quality (0-1)
 * @returns Promise resolving to the blob
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to convert canvas to blob'))
        }
      },
      format,
      quality
    )
  })
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Process a video frame into a compressed image blob
 * 
 * Captures the current frame from a video element, resizes it to fit within
 * the maximum dimension while maintaining aspect ratio, and compresses it
 * to JPEG format.
 * 
 * @param video - HTMLVideoElement with active video stream
 * @param options - Processing options
 * @returns Promise resolving to ProcessResult with blob and dimensions
 * 
 * @example
 * const video = document.querySelector('video')
 * const result = await processVideoFrame(video, { maxDimension: 2048, quality: 0.8 })
 * console.log(`Processed: ${result.width}x${result.height}, ${result.size} bytes`)
 * 
 * @throws Error if video has no dimensions or canvas operations fail
 */
export async function processVideoFrame(
  video: HTMLVideoElement,
  options?: ProcessOptions
): Promise<ProcessResult> {
  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION
  const quality = options?.quality ?? DEFAULT_QUALITY
  const format = options?.format ?? DEFAULT_FORMAT

  // Get original dimensions from video
  const originalWidth = video.videoWidth
  const originalHeight = video.videoHeight

  if (originalWidth === 0 || originalHeight === 0) {
    throw new Error('Video has no dimensions. Ensure video is playing and has loaded metadata.')
  }

  // Calculate target dimensions
  const { width, height } = calculateResizedDimensions(
    originalWidth,
    originalHeight,
    maxDimension
  )

  // Draw video frame to canvas
  const canvas = drawToCanvas(video, originalWidth, originalHeight, width, height)

  // Convert to blob
  const blob = await canvasToBlob(canvas, format, quality)

  return {
    blob,
    originalWidth,
    originalHeight,
    width,
    height,
    size: blob.size,
  }
}

/**
 * Process an image blob (resize and compress)
 * 
 * Loads an image from a blob, resizes it to fit within the maximum dimension
 * while maintaining aspect ratio, and compresses it to JPEG format.
 * 
 * @param blob - Image blob to process
 * @param options - Processing options
 * @returns Promise resolving to ProcessResult with blob and dimensions
 * 
 * @example
 * const fileInput = document.querySelector('input[type="file"]')
 * const file = fileInput.files[0]
 * const result = await processImageBlob(file, { maxDimension: 2048, quality: 0.8 })
 * 
 * @throws Error if image fails to load or canvas operations fail
 */
export async function processImageBlob(
  blob: Blob,
  options?: ProcessOptions
): Promise<ProcessResult> {
  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION
  const quality = options?.quality ?? DEFAULT_QUALITY
  const format = options?.format ?? DEFAULT_FORMAT

  // Load image from blob
  const image = await loadImageFromBlob(blob)

  // Get original dimensions
  const originalWidth = image.naturalWidth
  const originalHeight = image.naturalHeight

  if (originalWidth === 0 || originalHeight === 0) {
    throw new Error('Image has no dimensions')
  }

  // Calculate target dimensions
  const { width, height } = calculateResizedDimensions(
    originalWidth,
    originalHeight,
    maxDimension
  )

  // Draw image to canvas
  const canvas = drawToCanvas(image, originalWidth, originalHeight, width, height)

  // Convert to blob
  const processedBlob = await canvasToBlob(canvas, format, quality)

  // Clean up object URL
  URL.revokeObjectURL(image.src)

  return {
    blob: processedBlob,
    originalWidth,
    originalHeight,
    width,
    height,
    size: processedBlob.size,
  }
}

/**
 * Load an image from a blob
 * 
 * @param blob - Image blob to load
 * @returns Promise resolving to loaded HTMLImageElement
 */
function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(blob)

    image.onload = () => {
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image from blob'))
    }

    image.src = url
  })
}

'use client'

import { useRef, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CameraPreviewProps {
  /** MediaStream to display */
  stream: MediaStream | null
  /** Whether camera is loading */
  isLoading: boolean
  /** Current facing mode */
  facingMode: 'user' | 'environment'
  /** Additional CSS classes */
  className?: string
}

/**
 * CameraPreview - Video element for displaying camera stream
 * 
 * Displays a live camera preview with proper iOS Safari support.
 * Features:
 * - Video element with stream binding
 * - iOS Safari attributes (playsinline, webkit-playsinline)
 * - Loading skeleton state
 * - Viewfinder corner guides
 * - Proper aspect ratio handling (4:3)
 * - Mirror effect for front camera (user facing mode)
 * 
 * @example
 * <CameraPreview
 *   stream={mediaStream}
 *   isLoading={false}
 *   facingMode="environment"
 * />
 */
export function CameraPreview({
  stream,
  isLoading,
  facingMode,
  className
}: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Bind stream to video element when stream changes
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (stream) {
      video.srcObject = stream
    } else {
      video.srcObject = null
    }

    // Cleanup: remove srcObject when component unmounts or stream changes
    return () => {
      if (video) {
        video.srcObject = null
      }
    }
  }, [stream])

  const showLoading = isLoading || !stream

  return (
    <div 
      className={cn(
        'relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-muted',
        className
      )}
      data-testid="camera-preview"
    >
      {/* Video element with iOS Safari support */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        webkit-playsinline="true"
        className={cn(
          'absolute inset-0 w-full h-full object-cover',
          // Mirror the video for front camera (selfie mode)
          facingMode === 'user' && 'scale-x-[-1]',
          // Hide video when loading
          showLoading && 'invisible'
        )}
        aria-label={`Camera preview - ${facingMode === 'user' ? 'front' : 'rear'} camera`}
        data-testid="camera-video"
      />

      {/* Loading skeleton state */}
      {showLoading && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center bg-muted animate-pulse"
          data-testid="camera-loading"
          aria-label="Camera loading"
        >
          <Loader2 
            className="h-10 w-10 text-muted-foreground/50 animate-spin" 
            aria-hidden="true"
          />
          <span className="mt-3 text-sm text-muted-foreground/70">
            Starting camera...
          </span>
        </div>
      )}

      {/* Viewfinder corner guides */}
      <div 
        className={cn(
          'absolute inset-4 pointer-events-none',
          showLoading && 'opacity-30'
        )}
        aria-hidden="true"
      >
        {/* Top-left corner */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/80 rounded-tl" />
        {/* Top-right corner */}
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/80 rounded-tr" />
        {/* Bottom-left corner */}
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/80 rounded-bl" />
        {/* Bottom-right corner */}
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/80 rounded-br" />
      </div>

      {/* Rule of thirds grid overlay (subtle) */}
      <div 
        className={cn(
          'absolute inset-0 pointer-events-none opacity-20',
          showLoading && 'opacity-10'
        )}
        aria-hidden="true"
      >
        {/* Horizontal lines */}
        <div className="absolute top-1/3 left-0 right-0 h-px bg-white" />
        <div className="absolute top-2/3 left-0 right-0 h-px bg-white" />
        {/* Vertical lines */}
        <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white" />
        <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white" />
      </div>
    </div>
  )
}

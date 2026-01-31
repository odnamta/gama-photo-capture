'use client'

import { WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OfflineIndicatorProps {
  isOnline: boolean
  className?: string
}

export function OfflineIndicator({ isOnline, className }: OfflineIndicatorProps) {
  if (isOnline) return null

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-destructive',
        className
      )}
      role="status"
      aria-label="You are offline"
    >
      <WifiOff className="h-4 w-4" />
      <span className="text-xs font-medium">Offline</span>
    </div>
  )
}

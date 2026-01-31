'use client'

/**
 * App Header Component
 * 
 * Main header for the app with navigation, offline indicator,
 * and sync status badge.
 * 
 * @see .kiro/specs/v0.5-photo-upload-sync/design.md - AppHeader enhancement
 * 
 * **Validates: Requirements 5.1, 5.4, 5.5**
 */

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { OfflineIndicator } from '@/components/atoms/offline-indicator'
import { SyncStatusBadge } from '@/components/atoms/sync-status-badge'
import { cn } from '@/lib/utils'

interface AppHeaderProps {
  title: string
  showBack?: boolean
  showQueue?: boolean
  queueCount?: number
  isOnline?: boolean
  isSyncing?: boolean
  className?: string
  headerAction?: React.ReactNode
}

export function AppHeader({
  title,
  showBack = false,
  showQueue = false,
  queueCount = 0,
  isOnline = true,
  isSyncing = false,
  className,
  headerAction,
}: AppHeaderProps) {
  const router = useRouter()

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b bg-background px-4',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {headerAction}
        <OfflineIndicator isOnline={isOnline} />
        
        {showQueue && (
          <SyncStatusBadge
            pendingCount={queueCount}
            isUploading={isSyncing}
            isOnline={isOnline}
            onClick={() => router.push('/queue')}
          />
        )}
      </div>
    </header>
  )
}

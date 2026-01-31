'use client'

/**
 * App Layout Template
 * 
 * Main layout template with header, content area, and bottom navigation.
 * Integrates with sync context for queue status display.
 * 
 * **Validates: Requirements 5.1, 5.4, 5.5**
 */

import { usePathname } from 'next/navigation'
import { AppHeader } from '@/components/organisms/app-header'
import { BottomNav } from '@/components/organisms/bottom-nav'
import { useSync } from '@/contexts/sync-context'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  children: React.ReactNode
  title: string
  showBack?: boolean
  showQueue?: boolean
  className?: string
  headerAction?: React.ReactNode
}

export function AppLayout({
  children,
  title,
  showBack = false,
  showQueue = true,
  className,
  headerAction,
}: AppLayoutProps) {
  const pathname = usePathname()
  
  // Get sync state from context
  const { pendingCount, uploadingCount, isSyncing, isOnline } = useSync()
  
  // Queue count is pending + uploading
  const queueCount = pendingCount + uploadingCount

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title={title}
        showBack={showBack}
        showQueue={showQueue}
        queueCount={queueCount}
        isOnline={isOnline}
        isSyncing={isSyncing}
        headerAction={headerAction}
      />
      <main
        className={cn(
          'pt-14 pb-16', // Account for fixed header (h-14) and nav (h-16)
          className
        )}
      >
        {children}
      </main>
      <BottomNav currentPath={pathname} />
    </div>
  )
}

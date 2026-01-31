'use client'

import { ArrowLeft, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { OfflineIndicator } from '@/components/atoms/offline-indicator'
import { cn } from '@/lib/utils'

interface AppHeaderProps {
  title: string
  showBack?: boolean
  showQueue?: boolean
  queueCount?: number
  isOnline?: boolean
  className?: string
  headerAction?: React.ReactNode
}

export function AppHeader({
  title,
  showBack = false,
  showQueue = false,
  queueCount = 0,
  isOnline = true,
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

      <div className="flex items-center gap-3">
        {headerAction}
        <OfflineIndicator isOnline={isOnline} />
        
        {showQueue && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/queue')}
            aria-label={`Upload queue: ${queueCount} pending`}
            className="relative"
          >
            <Upload className="h-5 w-5" />
            {queueCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {queueCount > 99 ? '99+' : queueCount}
              </span>
            )}
          </Button>
        )}
      </div>
    </header>
  )
}

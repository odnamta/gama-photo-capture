'use client'

import { usePathname } from 'next/navigation'
import { AppHeader } from '@/components/organisms/app-header'
import { BottomNav } from '@/components/organisms/bottom-nav'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  children: React.ReactNode
  title: string
  showBack?: boolean
  showQueue?: boolean
  queueCount?: number
  isOnline?: boolean
  className?: string
}

export function AppLayout({
  children,
  title,
  showBack = false,
  showQueue = true,
  queueCount = 0,
  isOnline = true,
  className,
}: AppLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title={title}
        showBack={showBack}
        showQueue={showQueue}
        queueCount={queueCount}
        isOnline={isOnline}
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

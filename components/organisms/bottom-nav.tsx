'use client'

import Link from 'next/link'
import { Camera, Briefcase, Image, Upload, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { href: '/camera', label: 'Camera', icon: Camera },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/gallery', label: 'Gallery', icon: Image },
  { href: '/queue', label: 'Queue', icon: Upload },
  { href: '/settings', label: 'Settings', icon: Settings },
]

interface BottomNavProps {
  currentPath: string
  className?: string
}

export function BottomNav({ currentPath, className }: BottomNavProps) {
  const isActive = (href: string) => {
    if (href === '/') return currentPath === '/'
    return currentPath.startsWith(href)
  }

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-background',
        className
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      {navItems.map((item) => {
        const Icon = item.icon
        const active = isActive(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-3 py-2 transition-colors',
              active
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

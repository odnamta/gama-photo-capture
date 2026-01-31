'use client'

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  className?: string
}

/**
 * Empty state placeholder for lists with no data
 */
export function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center p-8',
      className
    )}>
      <div className="rounded-full bg-muted p-4 mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm mb-4 max-w-xs">
        {description}
      </p>
      {action}
    </div>
  )
}

'use client'

import { Camera, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepInstructionsProps {
  title: string
  description: string | null
  tips: string | null
  className?: string
}

/**
 * StepInstructions - Displays capture instructions for a checklist step
 * 
 * Shows the title (with camera icon), description, and optional tips
 * for the current photo capture step in the guided capture flow.
 * 
 * The component handles null values gracefully:
 * - Title is always displayed (required)
 * - Description is displayed if provided
 * - Tips are displayed with a lightbulb icon if provided
 * 
 * Locale-aware content selection should be done by the parent component
 * using the getLocalizedContent helper before passing props.
 * 
 * @example
 * <StepInstructions
 *   title="Cargo Front View"
 *   description="Take photo of cargo from the front before loading"
 *   tips="Ensure cargo label is visible"
 * />
 * 
 * @example
 * // With locale-aware content
 * <StepInstructions
 *   title={getLocalizedContent(locale, item.title, item.title_id)}
 *   description={getLocalizedContentNullable(locale, item.description, item.description_id)}
 *   tips={item.tips}
 * />
 */
export function StepInstructions({
  title,
  description,
  tips,
  className
}: StepInstructionsProps) {
  return (
    <div 
      className={cn('flex flex-col gap-3', className)}
      role="region"
      aria-label="Capture instructions"
    >
      {/* Title with camera icon */}
      <div className="flex items-center gap-2">
        <Camera 
          className="h-5 w-5 text-primary flex-shrink-0" 
          aria-hidden="true"
        />
        <h2 className="text-lg font-semibold text-foreground">
          {title}
        </h2>
      </div>

      {/* Separator line */}
      <div className="h-px bg-border" aria-hidden="true" />

      {/* Description */}
      {description && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}

      {/* Tips with lightbulb icon */}
      {tips && (
        <div 
          className="flex items-start gap-2 text-sm"
          role="note"
          aria-label="Tip"
        >
          <Lightbulb 
            className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" 
            aria-hidden="true"
          />
          <span className="text-muted-foreground">
            <span className="font-medium text-amber-600 dark:text-amber-400">
              Tip:
            </span>{' '}
            {tips}
          </span>
        </div>
      )}
    </div>
  )
}

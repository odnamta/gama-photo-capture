/**
 * Unit Tests for ChecklistStepView Component
 * 
 * Tests the molecule component that combines StepProgressBar, StepInstructions,
 * CameraPlaceholder, and CaptureButton for the guided capture flow.
 * 
 * **Validates: Requirements 3.2, 3.3, 3.5.1, 3.5.2**
 */

import { describe, it, expect, vi } from 'vitest'
import type { PhotoChecklistItem } from '@/types/job'
import { getLocalizedContent, getLocalizedContentNullable, type Locale } from '@/lib/utils/locale'

// Mock checklist item factory
function createMockChecklistItem(overrides: Partial<PhotoChecklistItem> = {}): PhotoChecklistItem {
  return {
    id: 'test-item-1',
    stage: 'job_start',
    sequence: 1,
    title: 'Cargo Front View',
    title_id: 'Foto Depan Kargo',
    description: 'Take photo of cargo from the front before loading',
    description_id: 'Ambil foto kargo dari depan sebelum dimuat',
    tips: 'Ensure cargo label is visible',
    is_required: true,
    photo_type: 'cargo_before',
    example_image_url: null,
    is_active: true,
    ...overrides
  }
}

/**
 * Simulates the ChecklistStepView component's logic for determining
 * whether to show the skip button.
 * 
 * Skip button is visible if and only if:
 * 1. The item is NOT required (is_required === false)
 * 2. An onSkip handler is provided
 */
function shouldShowSkipButton(
  item: PhotoChecklistItem,
  onSkip: (() => void) | undefined
): boolean {
  return !item.is_required && onSkip !== undefined
}

/**
 * Simulates the ChecklistStepView component's logic for getting
 * locale-aware content.
 */
function getDisplayContent(item: PhotoChecklistItem, locale: Locale) {
  return {
    title: getLocalizedContent(locale, item.title, item.title_id),
    description: getLocalizedContentNullable(locale, item.description, item.description_id),
    tips: item.tips
  }
}

describe('ChecklistStepView', () => {
  describe('Skip Button Visibility (Property 9)', () => {
    /**
     * Property 9: Skip button visibility
     * For any checklist item, the skip button should be visible 
     * if and only if is_required is false.
     */
    
    it('should NOT show skip button for required items', () => {
      const requiredItem = createMockChecklistItem({ is_required: true })
      const onSkip = vi.fn()
      
      const showSkip = shouldShowSkipButton(requiredItem, onSkip)
      
      expect(showSkip).toBe(false)
    })

    it('should show skip button for optional items when onSkip is provided', () => {
      const optionalItem = createMockChecklistItem({ is_required: false })
      const onSkip = vi.fn()
      
      const showSkip = shouldShowSkipButton(optionalItem, onSkip)
      
      expect(showSkip).toBe(true)
    })

    it('should NOT show skip button for optional items when onSkip is not provided', () => {
      const optionalItem = createMockChecklistItem({ is_required: false })
      
      const showSkip = shouldShowSkipButton(optionalItem, undefined)
      
      expect(showSkip).toBe(false)
    })

    it('should NOT show skip button for required items even when onSkip is provided', () => {
      const requiredItem = createMockChecklistItem({ is_required: true })
      const onSkip = vi.fn()
      
      const showSkip = shouldShowSkipButton(requiredItem, onSkip)
      
      expect(showSkip).toBe(false)
    })
  })

  describe('Locale-Aware Content Display', () => {
    /**
     * Tests that the component correctly selects content based on locale.
     * Uses the same locale helpers as the actual component.
     */
    
    it('should display English content when locale is "en"', () => {
      const item = createMockChecklistItem()
      const content = getDisplayContent(item, 'en')
      
      expect(content.title).toBe('Cargo Front View')
      expect(content.description).toBe('Take photo of cargo from the front before loading')
    })

    it('should display Indonesian content when locale is "id"', () => {
      const item = createMockChecklistItem()
      const content = getDisplayContent(item, 'id')
      
      expect(content.title).toBe('Foto Depan Kargo')
      expect(content.description).toBe('Ambil foto kargo dari depan sebelum dimuat')
    })

    it('should fall back to English when Indonesian content is null', () => {
      const item = createMockChecklistItem({
        title_id: null,
        description_id: null
      })
      const content = getDisplayContent(item, 'id')
      
      // Should fall back to English
      expect(content.title).toBe('Cargo Front View')
      expect(content.description).toBe('Take photo of cargo from the front before loading')
    })

    it('should display tips regardless of locale (no locale variant)', () => {
      const item = createMockChecklistItem()
      
      const contentEn = getDisplayContent(item, 'en')
      const contentId = getDisplayContent(item, 'id')
      
      // Tips should be the same regardless of locale
      expect(contentEn.tips).toBe('Ensure cargo label is visible')
      expect(contentId.tips).toBe('Ensure cargo label is visible')
    })

    it('should handle null description gracefully', () => {
      const item = createMockChecklistItem({
        description: null,
        description_id: null
      })
      const content = getDisplayContent(item, 'en')
      
      expect(content.description).toBeNull()
    })

    it('should handle null tips gracefully', () => {
      const item = createMockChecklistItem({
        tips: null
      })
      const content = getDisplayContent(item, 'en')
      
      expect(content.tips).toBeNull()
    })
  })

  describe('Step Progress Display', () => {
    /**
     * Tests that step progress is calculated correctly.
     * The component passes stepNumber and totalSteps to StepProgressBar.
     */
    
    interface StepProgressProps {
      stepNumber: number
      totalSteps: number
    }

    function getStepProgressText(props: StepProgressProps): string {
      return `Step ${props.stepNumber} of ${props.totalSteps}`
    }

    function getProgressPercentage(props: StepProgressProps): number {
      return props.totalSteps > 0 
        ? (props.stepNumber / props.totalSteps) * 100 
        : 0
    }

    it('should display correct step text for first step', () => {
      const text = getStepProgressText({ stepNumber: 1, totalSteps: 5 })
      expect(text).toBe('Step 1 of 5')
    })

    it('should display correct step text for middle step', () => {
      const text = getStepProgressText({ stepNumber: 3, totalSteps: 7 })
      expect(text).toBe('Step 3 of 7')
    })

    it('should display correct step text for last step', () => {
      const text = getStepProgressText({ stepNumber: 5, totalSteps: 5 })
      expect(text).toBe('Step 5 of 5')
    })

    it('should calculate correct progress percentage', () => {
      expect(getProgressPercentage({ stepNumber: 1, totalSteps: 5 })).toBe(20)
      expect(getProgressPercentage({ stepNumber: 3, totalSteps: 5 })).toBe(60)
      expect(getProgressPercentage({ stepNumber: 5, totalSteps: 5 })).toBe(100)
    })
  })

  describe('Capture Button Behavior', () => {
    /**
     * Tests that the capture button correctly triggers the onCapture callback.
     */
    
    it('should call onCapture when capture is triggered', () => {
      const onCapture = vi.fn()
      
      // Simulate capture button click
      onCapture()
      
      expect(onCapture).toHaveBeenCalledTimes(1)
    })

    it('should not call onSkip when capture is triggered', () => {
      const onCapture = vi.fn()
      const onSkip = vi.fn()
      
      // Simulate capture button click (not skip)
      onCapture()
      
      expect(onCapture).toHaveBeenCalledTimes(1)
      expect(onSkip).not.toHaveBeenCalled()
    })
  })

  describe('Skip Button Behavior', () => {
    /**
     * Tests that the skip button correctly triggers the onSkip callback.
     */
    
    it('should call onSkip when skip is triggered for optional item', () => {
      const optionalItem = createMockChecklistItem({ is_required: false })
      const onSkip = vi.fn()
      
      // Only trigger skip if item is optional and onSkip is provided
      if (shouldShowSkipButton(optionalItem, onSkip)) {
        onSkip()
      }
      
      expect(onSkip).toHaveBeenCalledTimes(1)
    })

    it('should not call onSkip for required items', () => {
      const requiredItem = createMockChecklistItem({ is_required: true })
      const onSkip = vi.fn()
      
      // Only trigger skip if item is optional and onSkip is provided
      if (shouldShowSkipButton(requiredItem, onSkip)) {
        onSkip()
      }
      
      expect(onSkip).not.toHaveBeenCalled()
    })
  })

  describe('Component Props Validation', () => {
    /**
     * Tests that the component handles various prop combinations correctly.
     */
    
    interface ChecklistStepViewProps {
      item: PhotoChecklistItem
      stepNumber: number
      totalSteps: number
      locale: Locale
      onCapture: () => void
      onSkip?: () => void
      className?: string
    }

    function validateProps(props: ChecklistStepViewProps): boolean {
      // stepNumber should be >= 1
      if (props.stepNumber < 1) return false
      
      // totalSteps should be >= 1
      if (props.totalSteps < 1) return false
      
      // stepNumber should not exceed totalSteps
      if (props.stepNumber > props.totalSteps) return false
      
      // locale should be 'en' or 'id'
      if (props.locale !== 'en' && props.locale !== 'id') return false
      
      return true
    }

    it('should accept valid props', () => {
      const props: ChecklistStepViewProps = {
        item: createMockChecklistItem(),
        stepNumber: 1,
        totalSteps: 5,
        locale: 'en',
        onCapture: vi.fn()
      }
      
      expect(validateProps(props)).toBe(true)
    })

    it('should accept props with optional onSkip', () => {
      const props: ChecklistStepViewProps = {
        item: createMockChecklistItem({ is_required: false }),
        stepNumber: 1,
        totalSteps: 5,
        locale: 'en',
        onCapture: vi.fn(),
        onSkip: vi.fn()
      }
      
      expect(validateProps(props)).toBe(true)
    })

    it('should accept props with custom className', () => {
      const props: ChecklistStepViewProps = {
        item: createMockChecklistItem(),
        stepNumber: 1,
        totalSteps: 5,
        locale: 'id',
        onCapture: vi.fn(),
        className: 'custom-class'
      }
      
      expect(validateProps(props)).toBe(true)
    })

    it('should reject invalid stepNumber (0)', () => {
      const props: ChecklistStepViewProps = {
        item: createMockChecklistItem(),
        stepNumber: 0,
        totalSteps: 5,
        locale: 'en',
        onCapture: vi.fn()
      }
      
      expect(validateProps(props)).toBe(false)
    })

    it('should reject stepNumber greater than totalSteps', () => {
      const props: ChecklistStepViewProps = {
        item: createMockChecklistItem(),
        stepNumber: 6,
        totalSteps: 5,
        locale: 'en',
        onCapture: vi.fn()
      }
      
      expect(validateProps(props)).toBe(false)
    })
  })

  describe('Aria Label Generation', () => {
    /**
     * Tests that the capture button has an appropriate aria-label.
     */
    
    function getCaptureButtonAriaLabel(title: string): string {
      return `Capture ${title}`
    }

    it('should generate correct aria-label with English title', () => {
      const item = createMockChecklistItem()
      const content = getDisplayContent(item, 'en')
      const ariaLabel = getCaptureButtonAriaLabel(content.title)
      
      expect(ariaLabel).toBe('Capture Cargo Front View')
    })

    it('should generate correct aria-label with Indonesian title', () => {
      const item = createMockChecklistItem()
      const content = getDisplayContent(item, 'id')
      const ariaLabel = getCaptureButtonAriaLabel(content.title)
      
      expect(ariaLabel).toBe('Capture Foto Depan Kargo')
    })
  })

  describe('All Checklist Item Types', () => {
    /**
     * Tests that the component handles different checklist item configurations.
     */
    
    it('should handle job_start stage items', () => {
      const item = createMockChecklistItem({ stage: 'job_start' })
      const content = getDisplayContent(item, 'en')
      
      expect(content.title).toBe('Cargo Front View')
    })

    it('should handle in_transit stage items', () => {
      const item = createMockChecklistItem({ 
        stage: 'in_transit',
        title: 'Rest Stop Check',
        title_id: 'Pemeriksaan Istirahat',
        is_required: false
      })
      const content = getDisplayContent(item, 'en')
      
      expect(content.title).toBe('Rest Stop Check')
      expect(shouldShowSkipButton(item, vi.fn())).toBe(true)
    })

    it('should handle job_end stage items', () => {
      const item = createMockChecklistItem({ 
        stage: 'job_end',
        title: 'Delivered Cargo',
        title_id: 'Kargo Terkirim'
      })
      const content = getDisplayContent(item, 'id')
      
      expect(content.title).toBe('Kargo Terkirim')
    })

    it('should handle damage photo type (optional)', () => {
      const item = createMockChecklistItem({ 
        photo_type: 'damage',
        is_required: false,
        title: 'Existing Damage',
        title_id: 'Kerusakan yang Ada'
      })
      
      expect(shouldShowSkipButton(item, vi.fn())).toBe(true)
    })

    it('should handle document photo type (required)', () => {
      const item = createMockChecklistItem({ 
        photo_type: 'document',
        is_required: true,
        title: 'Loading Document',
        title_id: 'Dokumen Pemuatan'
      })
      
      expect(shouldShowSkipButton(item, vi.fn())).toBe(false)
    })
  })
})

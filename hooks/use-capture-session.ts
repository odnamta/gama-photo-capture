'use client'

import { useCallback, useMemo, useReducer } from 'react'
import type { PhotoChecklistItem } from '@/types/job'
import type {
  CaptureSessionState,
  CaptureSessionAction,
  CaptureSessionOptions,
  PreviewPhotoData,
  CapturedPhotoData,
  UseCaptureSessionReturn,
} from '@/types/capture'
import { createInitialState } from '@/types/capture'

/**
 * Reducer for capture session state management
 * 
 * State Machine:
 * INIT → CAPTURE → PREVIEW → NEXT → (back to CAPTURE or COMPLETE)
 *                    ↓
 *                 CAPTURE (retake)
 */
function captureSessionReducer(
  state: CaptureSessionState,
  action: CaptureSessionAction
): CaptureSessionState {
  switch (action.type) {
    case 'CAPTURE': {
      // Transition from capture to preview state
      return {
        ...state,
        viewState: 'preview',
        previewPhoto: action.payload,
      }
    }

    case 'CONFIRM': {
      // Save the photo and advance to next item
      const currentItem = state.checklist[state.currentIndex]
      if (!currentItem || !state.previewPhoto) {
        return state
      }

      // Create captured photo data
      const capturedPhoto: CapturedPhotoData = {
        checklistItemId: currentItem.id,
        blobUrl: state.previewPhoto.blobUrl,
        blob: state.previewPhoto.blob,
        metadata: state.previewPhoto.metadata,
        notes: action.payload.notes,
      }

      // Add to captures map
      const newCaptures = new Map(state.captures)
      newCaptures.set(currentItem.id, capturedPhoto)

      // Calculate next index
      const nextIndex = state.currentIndex + 1
      const isLastItem = nextIndex >= state.checklist.length

      return {
        ...state,
        captures: newCaptures,
        currentIndex: nextIndex,
        viewState: isLastItem ? 'complete' : 'capture',
        previewPhoto: null,
      }
    }

    case 'RETAKE': {
      // Return to capture state without saving
      // Clean up the preview blob URL
      if (state.previewPhoto?.blobUrl) {
        URL.revokeObjectURL(state.previewPhoto.blobUrl)
      }

      return {
        ...state,
        viewState: 'capture',
        previewPhoto: null,
      }
    }

    case 'SKIP': {
      // Skip current item (only valid for optional items)
      const currentItem = state.checklist[state.currentIndex]
      if (!currentItem || currentItem.is_required) {
        return state
      }

      // Add to skipped items set
      const newSkippedItems = new Set(state.skippedItems)
      newSkippedItems.add(currentItem.id)

      // Calculate next index
      const nextIndex = state.currentIndex + 1
      const isLastItem = nextIndex >= state.checklist.length

      return {
        ...state,
        skippedItems: newSkippedItems,
        currentIndex: nextIndex,
        viewState: isLastItem ? 'complete' : 'capture',
        previewPhoto: null,
      }
    }

    case 'RESET': {
      // Clean up all blob URLs
      state.captures.forEach((photo) => {
        URL.revokeObjectURL(photo.blobUrl)
      })
      if (state.previewPhoto?.blobUrl) {
        URL.revokeObjectURL(state.previewPhoto.blobUrl)
      }

      // Reset to initial state
      return createInitialState({
        jobId: state.jobId,
        stage: state.stage,
        checklist: state.checklist,
      })
    }

    default:
      return state
  }
}

/**
 * Hook for managing capture session state
 * 
 * Provides state management for the guided capture flow:
 * 1. State initialization with jobId, stage, checklist
 * 2. Capture action: transition to preview state
 * 3. Confirm action: save photo, advance index, transition to capture or complete
 * 4. Retake action: return to capture state without saving
 * 5. Skip action (for optional items): advance without capturing
 * 
 * @param options - Session initialization options
 * @returns Session state and action handlers
 * 
 * @example
 * ```tsx
 * const session = useCaptureSession({
 *   jobId: 'job-123',
 *   stage: 'job_start',
 *   checklist: checklistItems,
 *   existingPhotoIds: ['item-1'], // Already captured
 * })
 * 
 * // Capture a photo
 * session.capture({ blobUrl, blob, metadata })
 * 
 * // Confirm with optional notes
 * session.confirm('Minor scratch noted')
 * 
 * // Or retake
 * session.retake()
 * 
 * // Skip optional items
 * if (session.canSkip) {
 *   session.skip()
 * }
 * ```
 */
export function useCaptureSession(
  options: CaptureSessionOptions
): UseCaptureSessionReturn {
  // Initialize state with reducer
  const [state, dispatch] = useReducer(
    captureSessionReducer,
    options,
    createInitialState
  )

  // Get current checklist item
  const currentItem: PhotoChecklistItem | null = useMemo(() => {
    if (state.currentIndex >= state.checklist.length) {
      return null
    }
    return state.checklist[state.currentIndex]
  }, [state.checklist, state.currentIndex])

  // Check if current item can be skipped
  const canSkip = useMemo(() => {
    return currentItem !== null && !currentItem.is_required
  }, [currentItem])

  // Check if session is complete (all required items captured)
  const isComplete = useMemo(() => {
    const requiredItems = state.checklist.filter((item) => item.is_required)
    return requiredItems.every((item) => state.captures.has(item.id))
  }, [state.checklist, state.captures])

  // Calculate progress stats
  const progress = useMemo(() => {
    return {
      current: state.currentIndex + 1,
      total: state.checklist.length,
      captured: state.captures.size,
      skipped: state.skippedItems.size,
    }
  }, [state.currentIndex, state.checklist.length, state.captures.size, state.skippedItems.size])

  // Action handlers
  const capture = useCallback((photo: PreviewPhotoData) => {
    dispatch({ type: 'CAPTURE', payload: photo })
  }, [])

  const confirm = useCallback((notes?: string | null) => {
    dispatch({ type: 'CONFIRM', payload: { notes: notes ?? null } })
  }, [])

  const retake = useCallback(() => {
    dispatch({ type: 'RETAKE' })
  }, [])

  const skip = useCallback(() => {
    dispatch({ type: 'SKIP' })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  return {
    state,
    currentItem,
    canSkip,
    isComplete,
    progress,
    capture,
    confirm,
    retake,
    skip,
    reset,
  }
}

export default useCaptureSession

'use client'

/**
 * Hook for tracking online/offline status
 * 
 * Provides real-time tracking of the device's network connectivity status.
 * Uses the navigator.onLine API and listens to online/offline events.
 * 
 * @see .kiro/specs/v0.5-photo-upload-sync/design.md - useOnlineStatus hook
 * 
 * **Validates: Requirements 2.1, 2.4**
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

// ============================================
// TYPES
// ============================================

/**
 * Return type for the useOnlineStatus hook
 */
export interface UseOnlineStatusReturn {
  /** Whether the device is currently online */
  isOnline: boolean
  /** Whether the device is currently offline (convenience inverse of isOnline) */
  isOffline: boolean
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined'
}

/**
 * Get the current online status from navigator
 * Returns true if not in browser (SSR) to avoid hydration mismatches
 */
function getOnlineStatus(): boolean {
  if (!isBrowser()) {
    // Default to online during SSR to avoid hydration issues
    return true
  }
  return navigator.onLine
}

/**
 * Subscribe to online/offline events
 * Returns an unsubscribe function
 */
function subscribeToOnlineStatus(callback: () => void): () => void {
  if (!isBrowser()) {
    // No-op for SSR
    return () => {}
  }
  
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

/**
 * Get server snapshot for SSR
 * Always returns true to avoid hydration mismatches
 */
function getServerSnapshot(): boolean {
  return true
}

// ============================================
// HOOK (useSyncExternalStore version)
// ============================================

/**
 * Hook for tracking online/offline status using useSyncExternalStore
 * 
 * This is the recommended approach for subscribing to external stores
 * in React 18+. It handles SSR correctly and avoids tearing issues.
 * 
 * @returns Online status state
 * 
 * @example
 * ```tsx
 * const { isOnline, isOffline } = useOnlineStatus()
 * 
 * if (isOffline) {
 *   return <OfflineBanner />
 * }
 * ```
 * 
 * **Validates: Requirements 2.1, 2.4**
 */
export function useOnlineStatus(): UseOnlineStatusReturn {
  const isOnline = useSyncExternalStore(
    subscribeToOnlineStatus,
    getOnlineStatus,
    getServerSnapshot
  )
  
  return {
    isOnline,
    isOffline: !isOnline,
  }
}

// ============================================
// ALTERNATIVE HOOK (useState/useEffect version)
// ============================================

/**
 * Alternative hook using useState/useEffect pattern
 * 
 * This is provided for compatibility with older React versions
 * or for cases where useSyncExternalStore is not available.
 * 
 * @returns Online status state
 * 
 * **Validates: Requirements 2.1, 2.4**
 */
export function useOnlineStatusLegacy(): UseOnlineStatusReturn {
  const [isOnline, setIsOnline] = useState<boolean>(() => getOnlineStatus())
  
  useEffect(() => {
    // Update state when online status changes
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    // Sync initial state in case it changed between render and effect
    setIsOnline(getOnlineStatus())
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  
  return {
    isOnline,
    isOffline: !isOnline,
  }
}

export default useOnlineStatus

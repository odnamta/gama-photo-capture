'use client'

import { useEffect } from 'react'

/**
 * Hook to register the service worker for PWA functionality.
 * Should be called once in the root layout or a top-level component.
 */
export function useServiceWorker() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker after page load
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[SW] Service worker registered:', registration.scope)
          })
          .catch((error) => {
            console.error('[SW] Service worker registration failed:', error)
          })
      })
    }
  }, [])
}

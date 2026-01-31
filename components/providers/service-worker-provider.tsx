'use client'

import { useServiceWorker } from '@/hooks/use-service-worker'

interface ServiceWorkerProviderProps {
  children: React.ReactNode
}

/**
 * Provider component that registers the service worker.
 * Wrap your app with this component to enable PWA functionality.
 */
export function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  useServiceWorker()
  return <>{children}</>
}

'use client'

/**
 * Queue Page
 * 
 * Displays the upload queue with summary statistics and photo list.
 * Allows users to retry failed uploads and delete photos.
 * 
 * @see .kiro/specs/v0.5-photo-upload-sync/design.md - QueuePage
 * 
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**
 */

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/templates/app-layout'
import { QueueSummary } from '@/components/molecules/queue-summary'
import { QueueList } from '@/components/organisms/queue-list'
import { useSync } from '@/contexts/sync-context'

export default function QueuePage() {
  const {
    groupedPhotos,
    stats,
    uploadProgress,
    isSyncing,
    isOnline,
    isLoading,
    retryPhoto,
    retryAllFailed,
    deletePhoto,
  } = useSync()
  
  // Map job IDs to job numbers (placeholder - would fetch from API)
  const [jobNumbers] = useState<Map<string, string>>(new Map())
  
  // Show loading state
  if (isLoading) {
    return (
      <AppLayout title="Upload Queue" showQueue={false}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading queue...</p>
        </div>
      </AppLayout>
    )
  }
  
  return (
    <AppLayout title="Upload Queue" showQueue={false}>
      <div className="flex flex-col min-h-[calc(100vh-8rem)]">
        {/* Summary section */}
        <QueueSummary
          pendingCount={stats.pending}
          failedCount={stats.failed}
          uploadingCount={stats.uploading}
          totalSize={stats.totalSize}
          isSyncing={isSyncing}
          isOnline={isOnline}
          onRetryAll={retryAllFailed}
        />
        
        {/* Queue list */}
        <QueueList
          photos={groupedPhotos}
          jobNumbers={jobNumbers}
          uploadProgress={uploadProgress}
          onRetry={retryPhoto}
          onDelete={deletePhoto}
          className="flex-1"
        />
      </div>
    </AppLayout>
  )
}

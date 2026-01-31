'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Camera, Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/templates/app-layout'
import { GuidedCaptureSession } from '@/components/organisms/guided-capture-session'
import { loadChecklist, loadExistingPhotos, type ExistingPhoto } from '@/lib/actions/capture'
import type { PhotoChecklistItem, JobStage } from '@/types/job'

// ============================================
// TYPES
// ============================================

interface CapturePageState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  checklist: PhotoChecklistItem[]
  existingPhotos: ExistingPhoto[]
  error: string | null
}

// ============================================
// LOADING COMPONENT
// ============================================

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4">
      <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
      <p className="text-muted-foreground">Loading checklist...</p>
    </div>
  )
}

// ============================================
// ERROR COMPONENT
// ============================================

function ErrorState({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4">
      <div className="rounded-full bg-destructive/10 p-6">
        <Camera className="h-12 w-12 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold">Unable to Load</h2>
      <p className="text-muted-foreground text-center max-w-sm">{message}</p>
      <button
        onClick={onBack}
        className="text-primary underline underline-offset-4"
      >
        Go back to jobs
      </button>
    </div>
  )
}

// ============================================
// IDLE STATE (NO PARAMS)
// ============================================

function IdleState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4">
      <div className="rounded-full bg-muted p-6">
        <Camera className="h-12 w-12 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold">Camera</h2>
      <p className="text-muted-foreground text-center">
        Select a job and stage to start capturing photos
      </p>
    </div>
  )
}

// ============================================
// CAPTURE PAGE CONTENT
// ============================================

function CapturePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Parse query params
  const jobId = searchParams.get('job')
  const stageParam = searchParams.get('stage')
  const stage = isValidStage(stageParam) ? stageParam : null
  
  // Page state
  const [state, setState] = useState<CapturePageState>({
    status: 'idle',
    checklist: [],
    existingPhotos: [],
    error: null
  })

  // Determine user locale (could be from context/settings in future)
  const locale: 'en' | 'id' = 'en'

  // Load checklist and existing photos when params are present
  useEffect(() => {
    if (!jobId || !stage) {
      setState(prev => ({ ...prev, status: 'idle' }))
      return
    }

    async function loadData() {
      setState(prev => ({ ...prev, status: 'loading', error: null }))

      try {
        // Load checklist for the stage
        const checklistResult = await loadChecklist(stage!)
        if (checklistResult.error) {
          setState(prev => ({
            ...prev,
            status: 'error',
            error: checklistResult.error
          }))
          return
        }

        // Load existing photos for resume support
        const photosResult = await loadExistingPhotos(jobId!, stage!)
        if (photosResult.error) {
          // Non-fatal - continue without existing photos
          console.warn('Failed to load existing photos:', photosResult.error)
        }

        setState({
          status: 'ready',
          checklist: checklistResult.checklist,
          existingPhotos: photosResult.photos,
          error: null
        })
      } catch (err) {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: err instanceof Error ? err.message : 'Failed to load data'
        }))
      }
    }

    loadData()
  }, [jobId, stage])

  // Handle completion - navigate back to job detail
  const handleComplete = useCallback(() => {
    if (jobId) {
      router.push(`/jobs/${jobId}`)
    } else {
      router.push('/jobs')
    }
  }, [router, jobId])

  // Handle exit - navigate back to job detail
  const handleExit = useCallback(() => {
    if (jobId) {
      router.push(`/jobs/${jobId}`)
    } else {
      router.push('/jobs')
    }
  }, [router, jobId])

  // Handle back navigation for error state
  const handleBack = useCallback(() => {
    router.push('/jobs')
  }, [router])

  // Render based on state
  if (state.status === 'idle' || !jobId || !stage) {
    return (
      <AppLayout title="Camera">
        <IdleState />
      </AppLayout>
    )
  }

  if (state.status === 'loading') {
    return (
      <AppLayout title="Camera">
        <LoadingState />
      </AppLayout>
    )
  }

  if (state.status === 'error') {
    return (
      <AppLayout title="Camera">
        <ErrorState message={state.error || 'Unknown error'} onBack={handleBack} />
      </AppLayout>
    )
  }

  // Ready state - render guided capture session
  // Note: GuidedCaptureSession manages its own layout (no AppLayout wrapper)
  return (
    <div className="h-screen">
      <GuidedCaptureSession
        jobId={jobId}
        stage={stage}
        checklist={state.checklist}
        existingPhotos={state.existingPhotos}
        locale={locale}
        onComplete={handleComplete}
        onExit={handleExit}
        className="h-full"
      />
    </div>
  )
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

/**
 * GuidedCapturePage - Main camera/capture page
 * 
 * Routes:
 * - /camera (no params) - Shows idle state with instructions
 * - /camera?job={jobId}&stage={stage} - Starts guided capture session
 * 
 * The page loads the checklist for the specified stage and any existing
 * photos for resume support, then renders the GuidedCaptureSession component.
 * 
 * On completion or exit, navigates back to the job detail page.
 * 
 * Requirements 3.1.1: Parse job and stage from query params
 * Requirements 3.6.4: Handle completion navigation back to job detail
 */
export default function CameraPage() {
  return (
    <Suspense fallback={
      <AppLayout title="Camera">
        <LoadingState />
      </AppLayout>
    }>
      <CapturePageContent />
    </Suspense>
  )
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate stage parameter
 */
function isValidStage(stage: string | null): stage is JobStage {
  return stage === 'job_start' || stage === 'in_transit' || stage === 'job_end'
}

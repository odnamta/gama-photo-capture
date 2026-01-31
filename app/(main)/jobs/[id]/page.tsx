'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, AlertCircle, Briefcase } from 'lucide-react'
import { AppLayout } from '@/components/templates/app-layout'
import { StageCard } from '@/components/molecules/stage-card'
import { EmptyState } from '@/components/molecules/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getJobDetail } from '@/lib/actions/jobs'
import type { JobWithProgress, PhotoChecklistItem, JobStage } from '@/types/job'
import { JOB_STAGES } from '@/types/job'

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string

  const [job, setJob] = useState<JobWithProgress | null>(null)
  const [checklist, setChecklist] = useState<PhotoChecklistItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(true)

  const loadJob = () => {
    startTransition(async () => {
      const result = await getJobDetail(jobId)
      setJob(result.job)
      setChecklist(result.checklist)
      setError(result.error)
      setIsLoading(false)
    })
  }

  useEffect(() => {
    if (jobId) {
      loadJob()
    }
  }, [jobId])

  const handleStartCapture = (stage: JobStage) => {
    // Navigate to capture flow (will be implemented in v0.3)
    router.push(`/camera?job=${jobId}&stage=${stage}`)
  }

  const handleBack = () => {
    router.push('/jobs')
  }

  return (
    <AppLayout 
      title="Job Detail"
      headerAction={
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      }
    >
      <div className="p-4 space-y-4">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center min-h-[50vh]">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <EmptyState
            icon={<AlertCircle className="h-10 w-10 text-destructive" />}
            title="Error Loading Job"
            description={error}
            action={
              <Button onClick={loadJob} variant="outline">
                Try Again
              </Button>
            }
          />
        )}

        {/* Job Not Found */}
        {!isLoading && !error && !job && (
          <EmptyState
            icon={<Briefcase className="h-10 w-10 text-muted-foreground" />}
            title="Job Not Found"
            description="This job doesn't exist or you don't have access to it."
            action={
              <Button onClick={handleBack} variant="outline">
                Back to Jobs
              </Button>
            }
          />
        )}

        {/* Job Detail */}
        {!isLoading && !error && job && (
          <>
            {/* Job Header Card */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h2 className="font-bold text-lg">{job.joNumber}</h2>
                    <p className="text-sm text-muted-foreground">
                      {job.customerName}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {job.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {job.description}
                </p>
              </CardContent>
            </Card>

            {/* Stage Cards */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Photo Documentation
              </h3>
              
              {JOB_STAGES.map(stage => (
                <StageCard
                  key={stage}
                  stage={stage}
                  progress={job.progress[stage]}
                  onStartCapture={() => handleStartCapture(stage)}
                />
              ))}
            </div>

            {/* Checklist Summary */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">Checklist Summary</h3>
                <div className="space-y-1 text-sm">
                  {JOB_STAGES.map(stage => {
                    const stageItems = checklist.filter(c => c.stage === stage)
                    const required = stageItems.filter(c => c.is_required).length
                    const optional = stageItems.filter(c => !c.is_required).length
                    
                    return (
                      <div key={stage} className="flex justify-between text-muted-foreground">
                        <span className="capitalize">{stage.replace('_', ' ')}</span>
                        <span>
                          {required} required, {optional} optional
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  )
}

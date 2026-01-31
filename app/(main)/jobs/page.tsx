'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, RefreshCw, AlertCircle } from 'lucide-react'
import { AppLayout } from '@/components/templates/app-layout'
import { JobCard } from '@/components/molecules/job-card'
import { EmptyState } from '@/components/molecules/empty-state'
import { Button } from '@/components/ui/button'
import { getMyJobs } from '@/lib/actions/jobs'
import type { JobWithProgress } from '@/types/job'

export default function JobsPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<JobWithProgress[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(true)

  const loadJobs = () => {
    startTransition(async () => {
      const result = await getMyJobs()
      setJobs(result.jobs)
      setError(result.error)
      setIsLoading(false)
    })
  }

  useEffect(() => {
    loadJobs()
  }, [])

  const handleJobClick = (jobId: string) => {
    router.push(`/jobs/${jobId}`)
  }

  return (
    <AppLayout 
      title="My Jobs"
      headerAction={
        <Button 
          variant="ghost" 
          size="icon"
          onClick={loadJobs}
          disabled={isPending}
        >
          <RefreshCw className={`h-5 w-5 ${isPending ? 'animate-spin' : ''}`} />
        </Button>
      }
    >
      <div className="p-4 space-y-3">
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
            title="Error Loading Jobs"
            description={error}
            action={
              <Button onClick={loadJobs} variant="outline">
                Try Again
              </Button>
            }
          />
        )}

        {/* Empty State */}
        {!isLoading && !error && jobs.length === 0 && (
          <EmptyState
            icon={<Briefcase className="h-10 w-10 text-muted-foreground" />}
            title="No Jobs Assigned"
            description="You don't have any jobs assigned yet. Jobs will appear here when assigned to you."
            action={
              <Button onClick={loadJobs} variant="outline">
                Refresh
              </Button>
            }
          />
        )}

        {/* Job List */}
        {!isLoading && !error && jobs.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">
              {jobs.length} job{jobs.length !== 1 ? 's' : ''} assigned
            </p>
            {jobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                onClick={() => handleJobClick(job.id)}
              />
            ))}
          </>
        )}
      </div>
    </AppLayout>
  )
}

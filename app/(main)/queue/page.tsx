'use client'

import { Upload } from 'lucide-react'
import { AppLayout } from '@/components/templates/app-layout'

export default function QueuePage() {
  return (
    <AppLayout title="Upload Queue" showQueue={false}>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4">
        <div className="rounded-full bg-muted p-6">
          <Upload className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">Upload Queue</h2>
        <p className="text-muted-foreground text-center">
          Queue management coming soon
        </p>
      </div>
    </AppLayout>
  )
}

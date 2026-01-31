'use client'

import { Camera } from 'lucide-react'
import { AppLayout } from '@/components/templates/app-layout'

export default function CameraPage() {
  return (
    <AppLayout title="Camera">
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4">
        <div className="rounded-full bg-muted p-6">
          <Camera className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">Camera</h2>
        <p className="text-muted-foreground text-center">
          Photo capture coming soon
        </p>
      </div>
    </AppLayout>
  )
}

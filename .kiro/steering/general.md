---
inclusion: always
---
# GAMA Photo Capture - Code Conventions & Patterns

> **Purpose**: Code conventions and patterns for AI agents assisting with GAMA Photo Capture development.
> **See also**: `project-context.md` for project overview, `database-schema.md` for data models.

---

## 1. File Structure
```
app/
├── (auth)/              # Authentication routes (login)
├── (main)/              # Main application routes
│   ├── camera/          # Camera capture screen
│   ├── gallery/         # Photo gallery
│   ├── jobs/            # Job selection
│   ├── queue/           # Upload queue management
│   └── settings/        # App settings
├── api/                 # API routes
│   ├── jobs/            # Job-related endpoints
│   ├── photos/          # Photo CRUD endpoints
│   └── queue/           # Queue management
└── manifest.ts          # PWA manifest

components/
├── atoms/               # Base components (buttons, badges, indicators)
├── molecules/           # Composite components (cards, selectors)
├── organisms/           # Complex components (camera, gallery, queue)
├── templates/           # Page layouts
└── ui/                  # shadcn/ui components

contexts/                # React contexts (job, offline, queue)
hooks/                   # Custom hooks (useCamera, useGeolocation, useOffline)
lib/
├── offline/             # IndexedDB and sync logic
├── supabase/            # Supabase client (server.ts, client.ts)
└── utils/               # Utility functions

types/                   # TypeScript type definitions
public/                  # Static assets, PWA icons, service worker
```

## 2. Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `CaptureButton.tsx`, `PhotoGallery.tsx` |
| Hooks | camelCase with `use` prefix | `useCamera.ts`, `useOffline.ts` |
| Utilities | camelCase | `imageUtils.ts`, `storageHelpers.ts` |
| Types/Interfaces | PascalCase | `Photo`, `QueueItem`, `JobSummary` |
| DB columns | snake_case | `created_at`, `job_order_id`, `upload_status` |
| API routes | kebab-case folders | `/api/photos/my-recent` |
| Contexts | PascalCase with `Context` suffix | `JobContext`, `OfflineContext` |

## 3. Supabase Patterns

### Server-side (Server Components, API Routes, Server Actions)
```typescript
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shipment_photos')
    .select('*')
    .eq('upload_status', 'completed')
  
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ data })
}
```

### Client-side (Client Components)
```typescript
'use client'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data } = await supabase
  .from('shipment_photos')
  .select('id, file_name, storage_path')
```

### Server Action Pattern
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deletePhoto(photoId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('shipment_photos')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', photoId)
  
  if (error) throw new Error(error.message)
  revalidatePath('/gallery')
}
```

## 4. Component Patterns

### Atomic Design Hierarchy
```typescript
// atoms/capture-button.tsx - Single responsibility
interface CaptureButtonProps {
  onCapture: () => void
  disabled?: boolean
  isCapturing?: boolean
}

// molecules/photo-type-selector.tsx - Combines atoms
interface PhotoTypeSelectorProps {
  selected: PhotoType
  onChange: (type: PhotoType) => void
}

// organisms/camera-capture.tsx - Complex logic
interface CameraCaptureProps {
  jobOrderId: string
  photoType: PhotoType
  onCapture: (blob: Blob, metadata: PhotoMetadata) => void
}
```

### Guided Capture Components

```typescript
// Checklist Step Component
interface ChecklistStepProps {
  item: PhotoChecklistItem
  stepNumber: number
  totalSteps: number
  onCapture: () => void
  onSkip?: () => void  // Only for optional items
  isComplete: boolean
}

// Stage Card Component
interface StageCardProps {
  stage: 'job_start' | 'in_transit' | 'job_end'
  requiredCount: number
  completedCount: number
  isLocked: boolean  // job_end locked until job_start complete
  onStart: () => void
}

// Progress Indicator
// Always show current step and total
// Example: "Step 2 of 5" with progress bar
<div className="flex items-center gap-2">
  <span className="text-sm">Step {current} of {total}</span>
  <Progress value={(current / total) * 100} />
</div>
```

### Context Pattern
```typescript
// contexts/job-context.tsx
'use client'
import { createContext, useContext, useState, useEffect } from 'react'

interface JobContextType {
  selectedJob: JobSummary | null
  setSelectedJob: (job: JobSummary | null) => void
}

const JobContext = createContext<JobContextType | undefined>(undefined)

export function JobProvider({ children }: { children: React.ReactNode }) {
  const [selectedJob, setSelectedJob] = useState<JobSummary | null>(null)
  
  // Persist to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('selectedJob')
    if (saved) setSelectedJob(JSON.parse(saved))
  }, [])
  
  useEffect(() => {
    if (selectedJob) {
      localStorage.setItem('selectedJob', JSON.stringify(selectedJob))
    }
  }, [selectedJob])
  
  return (
    <JobContext.Provider value={{ selectedJob, setSelectedJob }}>
      {children}
    </JobContext.Provider>
  )
}

export function useJob() {
  const context = useContext(JobContext)
  if (!context) throw new Error('useJob must be used within JobProvider')
  return context
}
```

## 5. PWA & Offline Patterns

### Service Worker Registration
```typescript
// In app/layout.tsx or dedicated hook
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
  }
}, [])
```

### IndexedDB with Dexie
```typescript
// lib/offline/db.ts
import Dexie, { Table } from 'dexie'

export interface OfflinePhoto {
  id: string
  blob: Blob
  metadata: PhotoMetadata
  status: 'pending' | 'uploading' | 'failed'
  retryCount: number
  createdAt: string
}

class PhotoCaptureDB extends Dexie {
  photos!: Table<OfflinePhoto>
  jobs!: Table<CachedJob>

  constructor() {
    super('GamaPhotoCapture')
    this.version(1).stores({
      photos: 'id, status, createdAt',
      jobs: 'id, cachedAt'
    })
  }
}

export const db = new PhotoCaptureDB()
```

### Online/Offline Detection
```typescript
// hooks/use-offline.ts
export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  
  return { isOnline, isOffline: !isOnline }
}
```

## 6. Photo Processing Standards

| Setting | Value | Notes |
|---------|-------|-------|
| Max resolution | 2048 x 2048 | Resize before upload |
| Quality | 80% JPEG | Configurable in settings |
| Max file size | 5 MB | Reject if larger |
| Format | JPEG | Convert HEIC/PNG to JPEG |
| Thumbnail size | 256 x 256 | Generate client-side |

```typescript
// lib/utils/image.ts
export async function resizeImage(blob: Blob, maxSize: number = 2048): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height)
        width *= ratio
        height *= ratio
      }
      
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob(resolve, 'image/jpeg', 0.8)
    }
    img.src = URL.createObjectURL(blob)
  })
}
```

## 7. Type Definitions

```typescript
// types/photo.ts
export type PhotoType = 'before' | 'after' | 'damage' | 'document' | 'survey' | 'other'
export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed'

export interface Photo {
  id: string
  jobOrderId: string | null
  photoType: PhotoType
  fileName: string
  fileSize: number
  storagePath: string
  thumbnailPath?: string
  gpsLatitude?: number
  gpsLongitude?: number
  takenAt: string
  uploadedAt?: string
  uploadStatus: UploadStatus
  notes?: string
}

export interface PhotoMetadata {
  takenAt: string
  gpsLatitude?: number
  gpsLongitude?: number
  gpsAccuracy?: number
  deviceId?: string
  deviceModel?: string
}
```

## 8. API Route Patterns

### Authentication Check
```typescript
// All API routes must verify auth
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Continue with authorized request...
}
```

### Role Check
```typescript
// Check user has photo capture access
const allowedRoles = ['owner', 'director', 'operations_manager', 'operations', 'engineer', 'ops']

const { data: profile } = await supabase
  .from('user_profiles')
  .select('role')
  .eq('user_id', user.id)
  .single()

if (!profile || !allowedRoles.includes(profile.role)) {
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}
```

## 9. Error Handling

```typescript
// Consistent error response format
interface ApiError {
  error: string
  code?: string
  details?: unknown
}

// Toast notifications for user feedback
import { toast } from 'sonner'

try {
  await uploadPhoto(blob)
  toast.success('Photo uploaded successfully')
} catch (error) {
  toast.error(error instanceof Error ? error.message : 'Upload failed')
}
```

## 10. Code Generation Rules

### ✅ DO
- Check existing components in `/components` before creating new ones
- Use existing Supabase client from `/lib/supabase`
- Follow TypeScript strict mode (no `any` types without justification)
- Use Server Actions for mutations
- Handle offline scenarios for all photo operations
- Generate thumbnails client-side before upload
- Run `npm run build` before committing
- Add proper loading and error states
- Use Tailwind CSS (no inline styles)
- Follow Atomic Design for component organization
- Enforce required photos before allowing stage completion
- Show clear instructions and tips for each photo
- Lock job_end stage until job_start is complete
- Support Indonesian language (title_id, description_id)
- Show completion status on job cards (e.g., "3/5 photos")
- Auto-advance to next step after confirming photo

### ❌ DON'T
- Create duplicate components
- Expose environment variables in client code
- Skip offline support for critical features
- Upload full-resolution images without resizing
- Query database in middleware
- Hard delete photos (use soft delete with `is_deleted`)
- Ignore camera/location permission denials
- Use localStorage for large data (use IndexedDB)
- Create API routes without auth checks
- Allow skipping required checklist items
- Build gallery view in MVP (focus on capture flow)
- Allow job_end photos before job_start is complete
- Require photos for in_transit stage (all optional)
- Block on GPS failure (capture anyway, note missing GPS)

---
*Last Updated: January 2026*

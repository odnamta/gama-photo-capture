# GAMA Photo Capture - Product Requirements Document
## Satellite App #1 for GAMA ERP
### Version 1.0 | January 2026

---

# Executive Summary

**App Name:** GAMA Photo Capture  
**Type:** Progressive Web App (PWA)  
**Primary Users:** Operations staff, Engineers, Drivers  
**Problem:** Field staff photos fill phone storage, get deleted, aren't linked to jobs  
**Solution:** Lightweight PWA that captures photos, uploads to cloud storage, and links metadata to job orders in GAMA ERP

---

# 1. User Stories

| ID | Role | Story | Priority |
|----|------|-------|----------|
| US-01 | Operations Staff | As operations staff, I want to quickly select my active job order so that photos are automatically linked to the correct shipment | P0 |
| US-02 | Operations Staff | As operations staff, I want to capture photos with one tap and categorize them (before/after/damage/document) so that photos are organized | P0 |
| US-03 | Operations Staff | As operations staff, I want photos to upload in the background so that I can continue working without waiting | P0 |
| US-04 | Operations Staff | As operations staff, I want to work offline and have photos sync when I'm back online so that poor signal doesn't stop my work | P0 |
| US-05 | Engineer | As an engineer, I want to capture site survey photos with GPS coordinates so that location context is preserved | P1 |
| US-06 | Operations Staff | As operations staff, I want to see upload progress and retry failed uploads so that I know my photos are saved | P1 |
| US-07 | Operations Staff | As operations staff, I want to view recent photos I've taken so that I can verify captures before leaving site | P1 |
| US-08 | Manager | As a manager, I want to see photo counts per job in the main ERP so that I can verify documentation completeness | P2 |
| US-09 | Operations Staff | As operations staff, I want to scan a job order barcode/QR to select it quickly so that I don't type on site | P2 |
| US-10 | Operations Staff | As operations staff, I want photos deleted from my phone after upload so that storage is freed automatically | P2 |

---

# 2. Database Schema

## 2.1 Tables

```sql
-- ============================================
-- PHOTO CAPTURE APP - DATABASE SCHEMA
-- Run in Supabase SQL Editor
-- ============================================

-- Main photos table
CREATE TABLE IF NOT EXISTS shipment_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  job_order_id UUID REFERENCES job_orders(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Photo metadata
  photo_type TEXT NOT NULL CHECK (photo_type IN ('before', 'after', 'damage', 'document', 'survey', 'other')),
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL, -- bytes
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  
  -- Storage paths
  storage_bucket TEXT NOT NULL DEFAULT 'shipment-photos',
  storage_path TEXT NOT NULL, -- Full path in storage bucket
  thumbnail_path TEXT, -- Optional thumbnail
  
  -- Location data
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  gps_accuracy DECIMAL(8, 2), -- meters
  
  -- Device info
  device_id TEXT, -- For tracking which device
  device_model TEXT,
  
  -- Timestamps
  taken_at TIMESTAMPTZ NOT NULL, -- When photo was captured
  uploaded_at TIMESTAMPTZ, -- When upload completed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Status
  upload_status TEXT DEFAULT 'pending' CHECK (upload_status IN ('pending', 'uploading', 'completed', 'failed')),
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('local', 'syncing', 'synced')),
  
  -- Notes
  notes TEXT,
  
  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

-- Upload queue for offline support
CREATE TABLE IF NOT EXISTS photo_upload_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to photo record
  photo_id UUID REFERENCES shipment_photos(id) ON DELETE CASCADE,
  
  -- Local blob reference (for indexedDB key)
  local_blob_key TEXT NOT NULL,
  
  -- Upload tracking
  retry_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Queue management
  priority INTEGER DEFAULT 0, -- Higher = upload first
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photo tags for flexible categorization
CREATE TABLE IF NOT EXISTS photo_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID REFERENCES shipment_photos(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(photo_id, tag)
);
```

## 2.2 Indexes

```sql
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_photos_job_order ON shipment_photos(job_order_id);
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_by ON shipment_photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_photos_upload_status ON shipment_photos(upload_status);
CREATE INDEX IF NOT EXISTS idx_photos_taken_at ON shipment_photos(taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_type ON shipment_photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_photos_not_deleted ON shipment_photos(is_deleted) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_queue_photo ON photo_upload_queue(photo_id);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON photo_upload_queue(priority DESC, created_at ASC);
```

## 2.3 RLS Policies

```sql
-- Enable RLS
ALTER TABLE shipment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_upload_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_tags ENABLE ROW LEVEL SECURITY;

-- shipment_photos policies
CREATE POLICY "Users view own photos"
  ON shipment_photos FOR SELECT
  USING (uploaded_by = auth.uid());

CREATE POLICY "Users view job photos they can access"
  ON shipment_photos FOR SELECT
  USING (
    job_order_id IN (
      SELECT id FROM job_orders 
      WHERE job_orders.id = shipment_photos.job_order_id
    )
  );

CREATE POLICY "Users insert own photos"
  ON shipment_photos FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users update own photos"
  ON shipment_photos FOR UPDATE
  USING (uploaded_by = auth.uid());

CREATE POLICY "Admins view all photos"
  ON shipment_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('owner', 'director', 'sysadmin', 'operations_manager')
    )
  );

-- photo_upload_queue policies
CREATE POLICY "Users manage own queue"
  ON photo_upload_queue FOR ALL
  USING (
    photo_id IN (
      SELECT id FROM shipment_photos WHERE uploaded_by = auth.uid()
    )
  );

-- photo_tags policies
CREATE POLICY "Users manage own photo tags"
  ON photo_tags FOR ALL
  USING (
    photo_id IN (
      SELECT id FROM shipment_photos WHERE uploaded_by = auth.uid()
    )
  );

-- Grants
GRANT ALL ON shipment_photos TO authenticated;
GRANT ALL ON photo_upload_queue TO authenticated;
GRANT ALL ON photo_tags TO authenticated;
```

## 2.4 Storage Bucket

```sql
-- Create storage bucket (run via Supabase Dashboard or API)
-- Bucket name: shipment-photos
-- Public: false
-- File size limit: 10MB
-- Allowed MIME types: image/jpeg, image/png, image/webp, image/heic

-- Storage policies (set in Supabase Dashboard → Storage → Policies)
-- Policy 1: Users can upload to their own folder
-- Condition: bucket_id = 'shipment-photos' AND (storage.foldername(name))[1] = auth.uid()::text

-- Policy 2: Users can read their own files
-- Condition: bucket_id = 'shipment-photos' AND (storage.foldername(name))[1] = auth.uid()::text
```

## 2.5 Storage Path Convention

```
shipment-photos/
└── {user_id}/
    └── {year}/
        └── {month}/
            └── {job_order_id}/
                └── {photo_type}/
                    └── {timestamp}_{uuid}.jpg

Example:
shipment-photos/abc123-user-id/2026/01/jo-2026-0001/before/1706745600_xyz789.jpg
```

---

# 3. API Endpoints

## 3.1 Photo Management

### POST /api/photos/create
Create photo metadata record (before upload)

**Auth:** Required  
**Request:**
```typescript
{
  jobOrderId: string;
  photoType: 'before' | 'after' | 'damage' | 'document' | 'survey' | 'other';
  fileName: string;
  fileSize: number;
  mimeType: string;
  takenAt: string; // ISO date
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAccuracy?: number;
  deviceId?: string;
  deviceModel?: string;
  notes?: string;
}
```
**Response:**
```typescript
{
  id: string;
  uploadUrl: string; // Signed URL for direct upload to storage
  storagePath: string;
}
```

### PATCH /api/photos/{id}/complete
Mark upload as completed

**Auth:** Required  
**Request:**
```typescript
{
  thumbnailPath?: string;
}
```
**Response:**
```typescript
{
  id: string;
  uploadStatus: 'completed';
  uploadedAt: string;
}
```

### PATCH /api/photos/{id}/failed
Mark upload as failed

**Auth:** Required  
**Request:**
```typescript
{
  errorMessage: string;
}
```

### GET /api/photos/my-recent
Get user's recent photos

**Auth:** Required  
**Query Params:**
- `limit`: number (default: 20)
- `offset`: number (default: 0)
- `jobOrderId`: string (optional filter)

**Response:**
```typescript
{
  photos: Photo[];
  total: number;
  hasMore: boolean;
}
```

### DELETE /api/photos/{id}
Soft delete a photo

**Auth:** Required

## 3.2 Job Orders (Read-only)

### GET /api/jobs/my-active
Get user's assigned active jobs

**Auth:** Required  
**Response:**
```typescript
{
  jobs: {
    id: string;
    jobNumber: string;
    customerName: string;
    projectName: string;
    status: string;
    photoCount: number;
  }[];
}
```

### GET /api/jobs/{id}/summary
Get job summary for photo capture context

**Auth:** Required  
**Response:**
```typescript
{
  id: string;
  jobNumber: string;
  customerName: string;
  projectName: string;
  origin: string;
  destination: string;
  cargoDescription: string;
  status: string;
  photos: {
    before: number;
    after: number;
    damage: number;
    document: number;
    other: number;
  };
}
```

## 3.3 Upload Queue

### GET /api/queue/pending
Get pending uploads count

**Auth:** Required  
**Response:**
```typescript
{
  pendingCount: number;
  totalSize: number; // bytes
  oldestPending: string; // ISO date
}
```

### POST /api/queue/retry-all
Retry all failed uploads

**Auth:** Required

---

# 4. UI Components

## 4.1 Atoms (Base Components)

| Component | Props | Purpose |
|-----------|-------|---------|
| `CaptureButton` | `onCapture: () => void, disabled: boolean, isCapturing: boolean` | Large circular button for photo capture |
| `PhotoTypeChip` | `type: PhotoType, selected: boolean, onSelect: () => void` | Selectable chip for photo categorization |
| `UploadStatusBadge` | `status: UploadStatus, size?: 'sm' \| 'md'` | Shows pending/uploading/completed/failed |
| `JobBadge` | `jobNumber: string, customerName: string, compact?: boolean` | Display job identifier |
| `OfflineIndicator` | `isOnline: boolean` | Shows offline status in header |
| `PhotoThumbnail` | `src: string, alt: string, onClick?: () => void, status?: UploadStatus` | Square thumbnail with status overlay |
| `GPSIndicator` | `hasLocation: boolean, accuracy?: number` | Shows GPS lock status |

## 4.2 Molecules (Composite Components)

| Component | Props | Purpose | Used In |
|-----------|-------|---------|---------|
| `PhotoTypeSelector` | `selected: PhotoType, onChange: (type: PhotoType) => void` | Row of PhotoTypeChip components | CameraScreen |
| `JobSelector` | `jobs: Job[], selected: string, onSelect: (id: string) => void` | Searchable job dropdown | CameraScreen, JobsPage |
| `PhotoPreview` | `photo: Photo, onRetake: () => void, onConfirm: () => void` | Full-screen preview after capture | CameraScreen |
| `UploadProgress` | `current: number, total: number, isUploading: boolean` | Progress bar with counts | Header |
| `PhotoCard` | `photo: Photo, onView: () => void, onDelete: () => void` | Photo thumbnail with metadata | GalleryPage |
| `JobCard` | `job: JobSummary, onSelect: () => void` | Job info with photo counts | JobsPage |
| `EmptyState` | `icon: ReactNode, title: string, description: string, action?: ReactNode` | Empty state placeholder | GalleryPage, JobsPage |

## 4.3 Organisms (Complex Components)

| Component | Props | Purpose | Used In |
|-----------|-------|---------|---------|
| `CameraCapture` | `jobOrderId: string, photoType: PhotoType, onCapture: (blob: Blob, metadata: Metadata) => void` | Camera access, capture logic, GPS | CameraScreen |
| `PhotoGallery` | `photos: Photo[], onView: (id: string) => void, onDelete: (id: string) => void, loading: boolean` | Grid of photos with lazy loading | GalleryPage |
| `UploadQueue` | `queue: QueueItem[], onRetry: (id: string) => void, onRetryAll: () => void` | List of pending/failed uploads | QueuePage |
| `JobList` | `jobs: Job[], onSelect: (id: string) => void, loading: boolean` | List of active jobs | JobsPage |
| `AppHeader` | `title: string, showBack?: boolean, showQueue?: boolean` | App header with offline/queue status | All pages |
| `BottomNav` | `currentPath: string` | Bottom navigation tabs | Layout |

## 4.4 Templates (Page Layouts)

| Component | Purpose |
|-----------|---------|
| `AppLayout` | Main app shell with header, content area, bottom nav |
| `FullScreenLayout` | No nav, for camera/preview screens |

---

# 5. Pages/Routes

## 5.1 Route Structure

```
/                       → Redirect to /camera
/camera                 → Main camera capture screen
/camera/preview         → Photo preview after capture
/jobs                   → Job selection list
/jobs/[id]              → Job detail with photo gallery
/gallery                → All recent photos
/gallery/[id]           → Full photo view
/queue                  → Upload queue management
/settings               → App settings
/offline                → Offline mode indicator
```

## 5.2 Page Details

### /camera (CameraPage)
**Purpose:** Primary capture screen  
**Components:** AppHeader, JobSelector, PhotoTypeSelector, CameraCapture, CaptureButton, GPSIndicator  
**Data:** Current selected job (from state), GPS coordinates  
**Actions:** Capture photo → navigate to /camera/preview

### /camera/preview (PreviewPage)
**Purpose:** Review captured photo before saving  
**Components:** PhotoPreview, PhotoTypeSelector (changeable), notes input  
**Data:** Captured blob from state  
**Actions:** Confirm (save to queue) or Retake (back to camera)

### /jobs (JobsPage)
**Purpose:** Select which job to capture photos for  
**Components:** AppHeader, JobList, SearchInput, EmptyState  
**Data:** Fetch user's active jobs via API  
**Actions:** Select job → update state, navigate to /camera

### /jobs/[id] (JobDetailPage)
**Purpose:** View job details and existing photos  
**Components:** AppHeader, JobCard (expanded), PhotoGallery (filtered by job)  
**Data:** Fetch job summary and photos via API  
**Actions:** View photo, take more photos for this job

### /gallery (GalleryPage)
**Purpose:** View all recent photos  
**Components:** AppHeader, PhotoGallery, filter chips (by type, by status)  
**Data:** Fetch recent photos via API with pagination  
**Actions:** View photo, filter, delete

### /gallery/[id] (PhotoViewPage)
**Purpose:** Full-screen photo view with metadata  
**Components:** Full-screen image, metadata overlay, delete button  
**Data:** Fetch single photo details  
**Actions:** Delete, share (future)

### /queue (QueuePage)
**Purpose:** Manage upload queue  
**Components:** AppHeader, UploadQueue, stats summary  
**Data:** Local queue from IndexedDB  
**Actions:** Retry single, retry all, clear failed

### /settings (SettingsPage)
**Purpose:** App configuration  
**Components:** Toggle switches, storage info  
**Settings:**
- Auto-delete after upload (on/off)
- Photo quality (high/medium/low)
- GPS capture (on/off)
- Cache management

---

# 6. Implementation Order

## Phase 1: Foundation (Days 1-2)
**Goal:** Project setup, auth, basic navigation

### Task 1.1: Project Setup
- Initialize Next.js 14 app with App Router
- Configure TypeScript, Tailwind, shadcn/ui
- Set up PWA manifest and service worker base
- Configure Supabase client
- Duration: 2 hours

### Task 1.2: Authentication
- Implement Supabase auth (reuse from main ERP)
- Protected route middleware
- Login redirect
- Duration: 2 hours

### Task 1.3: App Shell
- Create AppLayout with header
- Create BottomNav component
- Set up route structure (placeholder pages)
- Duration: 2 hours

### Task 1.4: Database Setup
- Run SQL schema in Supabase
- Create storage bucket
- Set up RLS policies
- Test with manual insert
- Duration: 1 hour

## Phase 2: Job Selection (Day 3)
**Goal:** User can select active job

### Task 2.1: Jobs API
- Create GET /api/jobs/my-active endpoint
- Query job_orders for user's assignments
- Return with photo counts
- Duration: 2 hours

### Task 2.2: JobsPage UI
- Implement JobList component
- Implement JobCard component
- Add search/filter
- Persist selected job to localStorage
- Duration: 3 hours

### Task 2.3: Job Context
- Create JobContext for app-wide job selection
- Auto-load from localStorage on mount
- Duration: 1 hour

## Phase 3: Camera Capture (Days 4-5)
**Goal:** Capture and save photos

### Task 3.1: Camera Access
- Implement CameraCapture component
- Request camera permissions
- Handle multiple cameras (front/back)
- Capture to blob
- Duration: 3 hours

### Task 3.2: GPS Capture
- Request location permissions
- Get coordinates on capture
- Handle permission denied gracefully
- Duration: 2 hours

### Task 3.3: CameraPage UI
- Implement PhotoTypeSelector
- Large CaptureButton
- Selected job display
- GPS indicator
- Duration: 2 hours

### Task 3.4: Preview Flow
- Implement PhotoPreview component
- Navigation to /camera/preview with state
- Confirm/retake actions
- Duration: 2 hours

### Task 3.5: Photo Save Logic
- Create photo metadata record via API
- Upload blob to Supabase Storage
- Mark upload complete
- Handle errors
- Duration: 3 hours

## Phase 4: Gallery & Viewing (Day 6)
**Goal:** View captured photos

### Task 4.1: Gallery API
- Create GET /api/photos/my-recent endpoint
- Implement pagination
- Add filters (job, type, status)
- Duration: 2 hours

### Task 4.2: PhotoGallery Component
- Grid layout with PhotoThumbnail
- Lazy loading
- Pull to refresh
- Duration: 2 hours

### Task 4.3: PhotoViewPage
- Full-screen image display
- Pinch to zoom
- Metadata overlay
- Delete action
- Duration: 2 hours

### Task 4.4: GalleryPage Integration
- Connect components
- Filter chips
- Empty state
- Duration: 1 hour

## Phase 5: Offline Support (Days 7-8)
**Goal:** Work without internet

### Task 5.1: IndexedDB Setup
- Install and configure Dexie.js
- Define offline database schema
- Photo blob storage
- Upload queue
- Duration: 2 hours

### Task 5.2: Offline Photo Capture
- Save blob to IndexedDB first
- Queue metadata for sync
- Update UI for offline mode
- Duration: 3 hours

### Task 5.3: Background Sync
- Implement sync logic
- Process queue when online
- Retry failed uploads
- Duration: 3 hours

### Task 5.4: Service Worker
- Configure next-pwa
- Cache app shell
- Cache API responses
- Duration: 2 hours

### Task 5.5: Queue UI
- Implement QueuePage
- Show pending/failed counts
- Retry actions
- Duration: 2 hours

## Phase 6: Polish & PWA (Days 9-10)
**Goal:** Installable, polished app

### Task 6.1: PWA Manifest
- App icons (all sizes)
- Splash screens
- Theme colors
- Duration: 1 hour

### Task 6.2: Install Prompt
- Detect installable state
- Show custom install banner
- Track installation
- Duration: 1 hour

### Task 6.3: Settings Page
- Photo quality toggle
- GPS toggle
- Storage usage display
- Cache clear action
- Duration: 2 hours

### Task 6.4: Error Handling
- Global error boundary
- Toast notifications
- Network error handling
- Duration: 2 hours

### Task 6.5: Performance
- Image optimization
- Bundle analysis
- Lighthouse audit
- Fix issues
- Duration: 2 hours

### Task 6.6: Testing
- Manual test all flows
- Test offline mode
- Test on actual device
- Fix bugs
- Duration: 4 hours

---

# 7. Offline Strategy

## 7.1 Data to Cache

| Data Type | Storage | TTL | Strategy |
|-----------|---------|-----|----------|
| App shell (HTML/JS/CSS) | Service Worker | Until update | Cache-first |
| User's active jobs | IndexedDB | 24 hours | Stale-while-revalidate |
| Recent photos metadata | IndexedDB | 7 days | Network-first |
| Photo blobs (pending upload) | IndexedDB | Until uploaded | Persist |
| Selected job | localStorage | Indefinite | Persist |
| User preferences | localStorage | Indefinite | Persist |

## 7.2 Offline Photo Capture Flow

```
User captures photo
        ↓
Generate UUID for photo
        ↓
Save blob to IndexedDB (key: UUID)
        ↓
Create queue entry in IndexedDB:
{
  id: UUID,
  jobOrderId: selectedJob.id,
  photoType: selected,
  blobKey: UUID,
  metadata: { gps, timestamp, device },
  status: 'pending',
  createdAt: now
}
        ↓
Show "Saved offline" toast
        ↓
[When online detected]
        ↓
Process queue (oldest first):
1. Create photo record via API
2. Upload blob to storage
3. Mark complete via API
4. Delete from IndexedDB
5. Update queue status
        ↓
Show "Synced" indicator
```

## 7.3 Sync Conflict Resolution

| Scenario | Resolution |
|----------|------------|
| Photo record exists (duplicate UUID) | Skip, delete from local queue |
| Storage upload fails | Retry up to 3 times, then mark failed |
| API unreachable | Keep in queue, retry on next online |
| User deletes before upload | Remove from queue, delete local blob |
| Job order no longer exists | Upload anyway with null job_order_id |

## 7.4 IndexedDB Schema (Dexie)

```typescript
// lib/offline/db.ts
import Dexie, { Table } from 'dexie';

interface OfflinePhoto {
  id: string; // UUID
  blob: Blob;
  metadata: {
    jobOrderId: string | null;
    photoType: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    takenAt: string;
    gpsLatitude?: number;
    gpsLongitude?: number;
    gpsAccuracy?: number;
    deviceId?: string;
    notes?: string;
  };
  status: 'pending' | 'uploading' | 'failed';
  retryCount: number;
  lastAttempt?: string;
  errorMessage?: string;
  createdAt: string;
}

interface CachedJob {
  id: string;
  data: JobSummary;
  cachedAt: string;
}

class PhotoCaptureDB extends Dexie {
  photos!: Table<OfflinePhoto>;
  jobs!: Table<CachedJob>;

  constructor() {
    super('GamaPhotoCapture');
    this.version(1).stores({
      photos: 'id, status, createdAt',
      jobs: 'id, cachedAt'
    });
  }
}

export const db = new PhotoCaptureDB();
```

---

# 8. Integration Points

## 8.1 Shared Supabase Project

The Photo Capture app uses the **same Supabase project** as GAMA ERP:
- Same authentication (users log in once)
- Same database (new tables added)
- Same storage (new bucket)

Environment variables needed:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://photos.gama.co.id
```

## 8.2 Authentication Flow

```
User opens Photo Capture app
        ↓
Check for existing Supabase session
        ↓
[If no session]
        ↓
Redirect to /login
        ↓
"Sign in with Google" (same as main ERP)
        ↓
Session stored in localStorage
        ↓
Redirect back to /camera
        ↓
[If session exists]
        ↓
Verify session still valid
        ↓
Load user profile from user_profiles
        ↓
Check role has photo capture access
```

## 8.3 Data Relationships

```
Main ERP Database
├── job_orders
│   └── Referenced by shipment_photos.job_order_id
├── user_profiles
│   └── Used for role checking, user display name
└── customers
    └── Retrieved via job_orders for display

Photo Capture Tables (New)
├── shipment_photos
│   └── Core photo metadata, links to job_orders
├── photo_upload_queue
│   └── Offline sync tracking
└── photo_tags
    └── Flexible tagging (future)
```

## 8.4 Main ERP Integration

The main GAMA ERP can access photos via:

1. **Job Order Detail Page**
   - Query shipment_photos WHERE job_order_id = ?
   - Display photo gallery component
   - Show photo counts by type

2. **Dashboard Widgets**
   - Recent photos across all jobs
   - Photos pending sync (for admins)

3. **Reports**
   - Photo documentation completeness
   - Photos per job statistics

Sample query for main ERP:
```typescript
// In main ERP: lib/photos.ts
export async function getJobPhotos(jobOrderId: string) {
  const { data } = await supabase
    .from('shipment_photos')
    .select('*')
    .eq('job_order_id', jobOrderId)
    .eq('is_deleted', false)
    .eq('upload_status', 'completed')
    .order('taken_at', { ascending: true });
  
  return data;
}

export async function getJobPhotoCount(jobOrderId: string) {
  const { count } = await supabase
    .from('shipment_photos')
    .select('*', { count: 'exact', head: true })
    .eq('job_order_id', jobOrderId)
    .eq('is_deleted', false)
    .eq('upload_status', 'completed');
  
  return count || 0;
}
```

## 8.5 API Route Security

All API routes verify:
1. Valid Supabase session
2. User has appropriate role
3. User can access the requested job order

```typescript
// Middleware pattern for API routes
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Check user role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  
  const allowedRoles = ['owner', 'director', 'operations_manager', 'operations', 'engineer'];
  
  if (!profile || !allowedRoles.includes(profile.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Proceed with request...
}
```

---

# 9. Technical Specifications

## 9.1 Photo Processing

| Setting | Value | Notes |
|---------|-------|-------|
| Max resolution | 2048 x 2048 | Resize on capture |
| Quality | 80% JPEG | Configurable in settings |
| Max file size | 5 MB | Reject if larger |
| Format | JPEG | Convert HEIC to JPEG |
| Thumbnail size | 256 x 256 | Generated client-side |

## 9.2 Performance Targets

| Metric | Target |
|--------|--------|
| App load (cached) | < 1 second |
| Camera ready | < 2 seconds |
| Photo capture to preview | < 500ms |
| Upload (good connection) | < 5 seconds per photo |
| Offline detection | < 1 second |

## 9.3 Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome (Android) | 90+ |
| Safari (iOS) | 14+ |
| Samsung Internet | 14+ |
| Firefox (Android) | 90+ |

## 9.4 Permissions Required

| Permission | Required | Used For |
|------------|----------|----------|
| Camera | Yes | Photo capture |
| Location | Optional | GPS coordinates |
| Storage | Yes | Offline photos |
| Notifications | Future | Upload complete alerts |

---

# 10. Success Metrics

## 10.1 Adoption Metrics

| Metric | Target (Month 1) |
|--------|------------------|
| App installs | 10+ (all field staff) |
| Weekly active users | 8+ |
| Photos captured per week | 100+ |
| Offline captures synced | 95%+ |

## 10.2 Quality Metrics

| Metric | Target |
|--------|--------|
| Failed uploads | < 2% |
| Photos linked to jobs | > 95% |
| Average photos per job | 4+ |
| App crash rate | < 1% |

## 10.3 Performance Metrics

| Metric | Target |
|--------|--------|
| Time to first capture | < 30 seconds from install |
| Upload success rate | > 98% |
| Offline queue clear time | < 5 minutes when online |
| Storage used per user | < 100 MB |

---

# Appendix A: Component Interfaces

```typescript
// types/photo.ts
export type PhotoType = 'before' | 'after' | 'damage' | 'document' | 'survey' | 'other';
export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed';
export type SyncStatus = 'local' | 'syncing' | 'synced';

export interface Photo {
  id: string;
  jobOrderId: string | null;
  photoType: PhotoType;
  fileName: string;
  fileSize: number;
  storagePath: string;
  thumbnailPath?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAccuracy?: number;
  takenAt: string;
  uploadedAt?: string;
  uploadStatus: UploadStatus;
  syncStatus: SyncStatus;
  notes?: string;
}

export interface JobSummary {
  id: string;
  jobNumber: string;
  customerName: string;
  projectName: string;
  origin?: string;
  destination?: string;
  cargoDescription?: string;
  status: string;
  photoCount: {
    before: number;
    after: number;
    damage: number;
    document: number;
    survey: number;
    other: number;
    total: number;
  };
}

export interface QueueItem {
  id: string;
  photoType: PhotoType;
  jobOrderId: string | null;
  status: 'pending' | 'uploading' | 'failed';
  retryCount: number;
  errorMessage?: string;
  createdAt: string;
}
```

---

# Appendix B: File Structure

```
gama-photo-capture/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (main)/
│   │   ├── camera/
│   │   │   ├── page.tsx
│   │   │   └── preview/
│   │   │       └── page.tsx
│   │   ├── gallery/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── jobs/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── queue/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── jobs/
│   │   │   ├── my-active/
│   │   │   │   └── route.ts
│   │   │   └── [id]/
│   │   │       └── summary/
│   │   │           └── route.ts
│   │   ├── photos/
│   │   │   ├── create/
│   │   │   │   └── route.ts
│   │   │   ├── my-recent/
│   │   │   │   └── route.ts
│   │   │   └── [id]/
│   │   │       ├── complete/
│   │   │       │   └── route.ts
│   │   │       └── failed/
│   │   │           └── route.ts
│   │   └── queue/
│   │       ├── pending/
│   │       │   └── route.ts
│   │       └── retry-all/
│   │           └── route.ts
│   ├── layout.tsx
│   ├── manifest.ts
│   └── page.tsx
├── components/
│   ├── atoms/
│   │   ├── capture-button.tsx
│   │   ├── gps-indicator.tsx
│   │   ├── job-badge.tsx
│   │   ├── offline-indicator.tsx
│   │   ├── photo-thumbnail.tsx
│   │   ├── photo-type-chip.tsx
│   │   └── upload-status-badge.tsx
│   ├── molecules/
│   │   ├── empty-state.tsx
│   │   ├── job-card.tsx
│   │   ├── job-selector.tsx
│   │   ├── photo-card.tsx
│   │   ├── photo-preview.tsx
│   │   ├── photo-type-selector.tsx
│   │   └── upload-progress.tsx
│   ├── organisms/
│   │   ├── app-header.tsx
│   │   ├── bottom-nav.tsx
│   │   ├── camera-capture.tsx
│   │   ├── job-list.tsx
│   │   ├── photo-gallery.tsx
│   │   └── upload-queue.tsx
│   ├── templates/
│   │   ├── app-layout.tsx
│   │   └── full-screen-layout.tsx
│   └── ui/
│       └── (shadcn components)
├── contexts/
│   ├── job-context.tsx
│   ├── offline-context.tsx
│   └── queue-context.tsx
├── hooks/
│   ├── use-camera.ts
│   ├── use-geolocation.ts
│   ├── use-offline.ts
│   └── use-upload-queue.ts
├── lib/
│   ├── offline/
│   │   ├── db.ts
│   │   └── sync.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── utils/
│   │   ├── image.ts
│   │   └── storage.ts
│   └── constants.ts
├── public/
│   ├── icons/
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── maskable-icon.png
│   └── sw.js
├── types/
│   ├── photo.ts
│   └── job.ts
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

*GAMA Photo Capture PRD v1.0*
*Created: January 2026*
*For use with Kiro AI coding assistant*

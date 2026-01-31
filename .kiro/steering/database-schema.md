---
inclusion: always
---
# GAMA Photo Capture - Database Schema

## ⚠️ SATELLITE APP DATABASE RULES

This app shares Supabase with GAMA ERP (300+ tables).

**CRITICAL RULES:**
- DO NOT run `npx supabase gen types` (will bloat context)
- DO NOT query tables not listed in this document
- Types are manually defined in `types/database.ts`

**TABLE ACCESS:**
| Level | Tables | Access |
|-------|--------|--------|
| PRIMARY | photo_checklists, shipment_photos, photo_upload_queue | Full CRUD |
| SECONDARY | job_orders, user_profiles, customers, employees | Read-only |
| FORBIDDEN | All other GAMA ERP tables | Do not access |

---

## Overview

This document defines the database schema for the Photo Capture app. Tables are created in the shared GAMA ERP Supabase project.

---

## photo_checklists

Defines the required and optional photos for each job stage. This is the "template" that guides users through documentation.

```sql
CREATE TABLE photo_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Checklist definition
  stage TEXT NOT NULL,                    -- 'job_start', 'in_transit', 'job_end'
  sequence INT NOT NULL,                  -- Display order (1, 2, 3...)
  title TEXT NOT NULL,                    -- "Cargo Front View"
  title_id TEXT,                          -- Indonesian: "Foto Depan Kargo"
  description TEXT,                       -- "Take clear photo of cargo from front"
  description_id TEXT,                    -- Indonesian translation
  tips TEXT,                              -- "Ensure cargo label is visible"
  
  -- Requirements
  is_required BOOLEAN DEFAULT true,       -- Required or optional?
  photo_type TEXT NOT NULL,               -- 'cargo_before', 'cargo_after', 'document', 'damage'
  
  -- Visual guidance
  example_image_url TEXT,                 -- URL to example photo
  
  -- Admin
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_photo_checklists_stage ON photo_checklists(stage);
CREATE INDEX idx_photo_checklists_active ON photo_checklists(is_active) WHERE is_active = true;

-- Unique constraint: one item per stage+sequence
CREATE UNIQUE INDEX idx_photo_checklists_stage_seq ON photo_checklists(stage, sequence) WHERE is_active = true;
```

### Column Notes

| Column | Description |
|--------|-------------|
| stage | Job stage: 'job_start', 'in_transit', 'job_end' |
| sequence | Order to display (1 = first) |
| title | English title shown to user |
| title_id | Indonesian title (for localization) |
| description | Instructions for the photo |
| tips | Helpful tips shown below instructions |
| is_required | true = must capture, false = can skip |
| photo_type | Category for filtering/reporting |
| example_image_url | Future: show example of good photo |

### Seed Data

```sql
-- JOB START: Before loading cargo (5 items)
INSERT INTO photo_checklists (stage, sequence, title, title_id, description, description_id, tips, is_required, photo_type) VALUES
('job_start', 1, 'Cargo Front View', 'Foto Depan Kargo',
  'Take photo of cargo from the front before loading',
  'Ambil foto kargo dari depan sebelum dimuat',
  'Ensure cargo ID/label is visible', true, 'cargo_before'),

('job_start', 2, 'Cargo Left Side', 'Foto Sisi Kiri Kargo',
  'Take photo of cargo from the left side',
  'Ambil foto kargo dari sisi kiri',
  'Capture the full length of cargo', true, 'cargo_before'),

('job_start', 3, 'Cargo Right Side', 'Foto Sisi Kanan Kargo',
  'Take photo of cargo from the right side',
  'Ambil foto kargo dari sisi kanan',
  'Capture the full length of cargo', true, 'cargo_before'),

('job_start', 4, 'Existing Damage', 'Kerusakan yang Ada',
  'Document any existing damage before loading (skip if none)',
  'Dokumentasikan kerusakan yang sudah ada sebelum dimuat (lewati jika tidak ada)',
  'Take close-up photos of any scratches, dents, or damage', false, 'damage'),

('job_start', 5, 'Loading Document', 'Dokumen Pemuatan',
  'Photo of loading document, manifest, or delivery order',
  'Foto dokumen pemuatan, manifest, atau surat jalan',
  'Ensure all text is readable', true, 'document');

-- IN TRANSIT: During transport (2 optional items)
INSERT INTO photo_checklists (stage, sequence, title, title_id, description, description_id, tips, is_required, photo_type) VALUES
('in_transit', 1, 'Rest Stop Check', 'Pemeriksaan Istirahat',
  'Photo of secured cargo at rest stop',
  'Foto kargo yang diamankan di tempat istirahat',
  'Show cargo straps/securing are intact', false, 'cargo_transit'),

('in_transit', 2, 'Issue Documentation', 'Dokumentasi Masalah',
  'Document any issues during transport',
  'Dokumentasikan masalah selama pengangkutan',
  'Include location context in photo', false, 'issue');

-- JOB END: After delivery (4 items)
INSERT INTO photo_checklists (stage, sequence, title, title_id, description, description_id, tips, is_required, photo_type) VALUES
('job_end', 1, 'Delivered Cargo', 'Kargo Terkirim',
  'Photo of cargo at delivery location',
  'Foto kargo di lokasi pengiriman',
  'Show cargo and surroundings', true, 'cargo_after'),

('job_end', 2, 'Unloading Complete', 'Bongkar Muat Selesai',
  'Photo showing unloading is complete',
  'Foto yang menunjukkan bongkar muat selesai',
  'Show empty truck or cargo in place', true, 'cargo_after'),

('job_end', 3, 'Delivery Document', 'Dokumen Pengiriman',
  'Photo of signed delivery receipt',
  'Foto tanda terima pengiriman yang sudah ditandatangani',
  'Ensure signature is visible', true, 'document'),

('job_end', 4, 'Damage Report', 'Laporan Kerusakan',
  'Document any damage found after delivery (skip if none)',
  'Dokumentasikan kerusakan yang ditemukan setelah pengiriman (lewati jika tidak ada)',
  'Take multiple angles of any damage', false, 'damage');
```

### RLS Policies

```sql
-- Enable RLS
ALTER TABLE photo_checklists ENABLE ROW LEVEL SECURITY;

-- Everyone can read active checklists
CREATE POLICY "Anyone can read active checklists"
  ON photo_checklists FOR SELECT
  USING (is_active = true);

-- Only admins can modify checklists
CREATE POLICY "Admins can manage checklists"
  ON photo_checklists FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('owner', 'director', 'sysadmin')
    )
  );

GRANT SELECT ON photo_checklists TO authenticated;
```

---

## shipment_photos

Stores metadata for photos captured in the app. Links to both job_orders and photo_checklists.

```sql
CREATE TABLE shipment_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  job_order_id UUID REFERENCES job_orders(id) NOT NULL,
  checklist_item_id UUID REFERENCES photo_checklists(id), -- Links to checklist
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Photo classification
  photo_type TEXT NOT NULL,               -- 'cargo_before', 'cargo_after', 'document', 'damage'
  stage TEXT NOT NULL,                    -- 'job_start', 'in_transit', 'job_end'
  
  -- File info
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  storage_bucket TEXT NOT NULL DEFAULT 'shipment-photos',
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  
  -- Location
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  gps_accuracy DECIMAL(10, 2),
  
  -- Timestamps
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Status
  upload_status TEXT DEFAULT 'pending',   -- 'pending', 'uploading', 'completed', 'failed'
  sync_status TEXT DEFAULT 'local',       -- 'local', 'syncing', 'synced'
  
  -- Optional metadata
  notes TEXT,
  has_damage BOOLEAN DEFAULT false,       -- Quick flag for damage photos
  
  -- Soft delete
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_shipment_photos_job ON shipment_photos(job_order_id);
CREATE INDEX idx_shipment_photos_stage ON shipment_photos(job_order_id, stage);
CREATE INDEX idx_shipment_photos_checklist ON shipment_photos(checklist_item_id);
CREATE INDEX idx_shipment_photos_uploaded_by ON shipment_photos(uploaded_by);
CREATE INDEX idx_shipment_photos_status ON shipment_photos(upload_status);
CREATE INDEX idx_shipment_photos_not_deleted ON shipment_photos(is_deleted) WHERE is_deleted = false;
```

### RLS Policies

```sql
ALTER TABLE shipment_photos ENABLE ROW LEVEL SECURITY;

-- Users can view their own photos
CREATE POLICY "Users view own photos"
  ON shipment_photos FOR SELECT
  USING (uploaded_by = auth.uid());

-- Users can view photos for jobs they can access
CREATE POLICY "Users view job photos"
  ON shipment_photos FOR SELECT
  USING (
    job_order_id IN (
      SELECT id FROM job_orders WHERE assigned_to = auth.uid()
    )
  );

-- Users can insert their own photos
CREATE POLICY "Users insert own photos"
  ON shipment_photos FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

-- Users can update their own photos
CREATE POLICY "Users update own photos"
  ON shipment_photos FOR UPDATE
  USING (uploaded_by = auth.uid());

-- Admins can view all photos
CREATE POLICY "Admins view all photos"
  ON shipment_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('owner', 'director', 'sysadmin', 'operations_manager')
    )
  );

GRANT ALL ON shipment_photos TO authenticated;
```

---

## photo_upload_queue

Tracks photos pending upload for offline sync functionality.

```sql
CREATE TABLE photo_upload_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to photo record
  photo_id UUID REFERENCES shipment_photos(id) ON DELETE CASCADE,
  
  -- Local blob reference (for IndexedDB key)
  local_blob_key TEXT NOT NULL,
  
  -- Upload tracking
  retry_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Queue management
  priority INTEGER DEFAULT 0,             -- Higher = upload first
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_queue_photo ON photo_upload_queue(photo_id);
CREATE INDEX idx_queue_priority ON photo_upload_queue(priority DESC, created_at ASC);
```

### RLS Policies

```sql
ALTER TABLE photo_upload_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own queue"
  ON photo_upload_queue FOR ALL
  USING (
    photo_id IN (
      SELECT id FROM shipment_photos WHERE uploaded_by = auth.uid()
    )
  );

GRANT ALL ON photo_upload_queue TO authenticated;
```

---

## Common Query Patterns

### Get checklist for a stage

```typescript
const { data: checklist } = await supabase
  .from('photo_checklists')
  .select('*')
  .eq('stage', 'job_start')
  .eq('is_active', true)
  .order('sequence')
```

### Get job's photo completion status

```typescript
const { data: photos } = await supabase
  .from('shipment_photos')
  .select('checklist_item_id, stage')
  .eq('job_order_id', jobId)
  .eq('is_deleted', false)

// Count completed per stage
const completedByStage = {
  job_start: photos.filter(p => p.stage === 'job_start').length,
  in_transit: photos.filter(p => p.stage === 'in_transit').length,
  job_end: photos.filter(p => p.stage === 'job_end').length,
}
```

### Check if stage is complete (all required photos taken)

```typescript
async function isStageComplete(jobId: string, stage: string): Promise<boolean> {
  // Get required checklist items
  const { data: required } = await supabase
    .from('photo_checklists')
    .select('id')
    .eq('stage', stage)
    .eq('is_required', true)
    .eq('is_active', true)
  
  // Get photos taken for this job+stage
  const { data: photos } = await supabase
    .from('shipment_photos')
    .select('checklist_item_id')
    .eq('job_order_id', jobId)
    .eq('stage', stage)
    .eq('is_deleted', false)
  
  const takenIds = new Set(photos?.map(p => p.checklist_item_id))
  return required?.every(r => takenIds.has(r.id)) ?? false
}
```

### Get photos for a job with checklist info

```typescript
const { data: photos } = await supabase
  .from('shipment_photos')
  .select(`
    *,
    checklist:photo_checklists(title, title_id, sequence)
  `)
  .eq('job_order_id', jobId)
  .eq('is_deleted', false)
  .order('stage')
  .order('checklist(sequence)')
```

---

## Storage Bucket

| Setting | Value |
|---------|-------|
| Bucket Name | `shipment-photos` |
| Public | `false` |
| File Size Limit | `10 MB` |
| Allowed MIME Types | `image/jpeg`, `image/png`, `image/webp` |

### Path Convention

```
{user_id}/{year}/{month}/{job_order_id}/{stage}/{timestamp}_{uuid}.jpg
```

---

*Last Updated: January 2026*

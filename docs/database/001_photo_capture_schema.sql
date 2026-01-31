-- ============================================
-- GAMA PHOTO CAPTURE - DATABASE SCHEMA
-- Migration: 001_photo_capture_schema
-- Run in Supabase SQL Editor
-- ============================================

-- ============================================
-- TABLES
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

-- ============================================
-- INDEXES
-- ============================================

-- Performance indexes for shipment_photos
CREATE INDEX IF NOT EXISTS idx_photos_job_order ON shipment_photos(job_order_id);
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_by ON shipment_photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_photos_upload_status ON shipment_photos(upload_status);
CREATE INDEX IF NOT EXISTS idx_photos_taken_at ON shipment_photos(taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_type ON shipment_photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_photos_not_deleted ON shipment_photos(is_deleted) WHERE is_deleted = FALSE;

-- Performance indexes for photo_upload_queue
CREATE INDEX IF NOT EXISTS idx_queue_photo ON photo_upload_queue(photo_id);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON photo_upload_queue(priority DESC, created_at ASC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE shipment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_upload_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_tags ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - shipment_photos
-- ============================================

-- Users can view their own photos
CREATE POLICY "Users view own photos"
  ON shipment_photos FOR SELECT
  USING (uploaded_by = auth.uid());

-- Users can view photos for job orders they can access
CREATE POLICY "Users view job photos they can access"
  ON shipment_photos FOR SELECT
  USING (
    job_order_id IN (
      SELECT id FROM job_orders 
      WHERE job_orders.id = shipment_photos.job_order_id
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

-- ============================================
-- RLS POLICIES - photo_upload_queue
-- ============================================

-- Users can manage their own queue items
CREATE POLICY "Users manage own queue"
  ON photo_upload_queue FOR ALL
  USING (
    photo_id IN (
      SELECT id FROM shipment_photos WHERE uploaded_by = auth.uid()
    )
  );

-- ============================================
-- RLS POLICIES - photo_tags
-- ============================================

-- Users can manage tags on their own photos
CREATE POLICY "Users manage own photo tags"
  ON photo_tags FOR ALL
  USING (
    photo_id IN (
      SELECT id FROM shipment_photos WHERE uploaded_by = auth.uid()
    )
  );

-- ============================================
-- GRANTS
-- ============================================

GRANT ALL ON shipment_photos TO authenticated;
GRANT ALL ON photo_upload_queue TO authenticated;
GRANT ALL ON photo_tags TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE shipment_photos IS 'Stores metadata for photos captured in the GAMA Photo Capture app';
COMMENT ON TABLE photo_upload_queue IS 'Tracks photos pending upload for offline sync functionality';
COMMENT ON TABLE photo_tags IS 'Flexible tagging system for photo categorization';

COMMENT ON COLUMN shipment_photos.photo_type IS 'Type of photo: before, after, damage, document, survey, other';
COMMENT ON COLUMN shipment_photos.upload_status IS 'Upload status: pending, uploading, completed, failed';
COMMENT ON COLUMN shipment_photos.sync_status IS 'Sync status: local (offline), syncing, synced';
COMMENT ON COLUMN shipment_photos.is_deleted IS 'Soft delete flag - photos are never hard deleted';

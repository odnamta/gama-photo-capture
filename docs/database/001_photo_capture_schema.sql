-- ============================================
-- GAMA PHOTO CAPTURE - DATABASE SCHEMA
-- Migration: 001_photo_capture_schema
-- Run in Supabase SQL Editor
-- ============================================

-- ============================================
-- TABLE: photo_checklists
-- Defines required/optional photos per job stage
-- ============================================

CREATE TABLE IF NOT EXISTS photo_checklists (
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
CREATE INDEX IF NOT EXISTS idx_photo_checklists_stage ON photo_checklists(stage);
CREATE INDEX IF NOT EXISTS idx_photo_checklists_active ON photo_checklists(is_active) WHERE is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_photo_checklists_stage_seq ON photo_checklists(stage, sequence) WHERE is_active = true;

-- ============================================
-- TABLE: shipment_photos
-- Stores photo metadata, links to jobs and checklists
-- ============================================

CREATE TABLE IF NOT EXISTS shipment_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  job_order_id UUID REFERENCES job_orders(id) NOT NULL,
  checklist_item_id UUID REFERENCES photo_checklists(id),
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
  has_damage BOOLEAN DEFAULT false,
  
  -- Soft delete
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shipment_photos_job ON shipment_photos(job_order_id);
CREATE INDEX IF NOT EXISTS idx_shipment_photos_stage ON shipment_photos(job_order_id, stage);
CREATE INDEX IF NOT EXISTS idx_shipment_photos_checklist ON shipment_photos(checklist_item_id);
CREATE INDEX IF NOT EXISTS idx_shipment_photos_uploaded_by ON shipment_photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_shipment_photos_status ON shipment_photos(upload_status);
CREATE INDEX IF NOT EXISTS idx_shipment_photos_not_deleted ON shipment_photos(is_deleted) WHERE is_deleted = false;

-- ============================================
-- TABLE: photo_upload_queue
-- Tracks photos pending upload for offline sync
-- ============================================

CREATE TABLE IF NOT EXISTS photo_upload_queue (
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
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_queue_photo ON photo_upload_queue(photo_id);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON photo_upload_queue(priority DESC, created_at ASC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE photo_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_upload_queue ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - photo_checklists
-- ============================================

CREATE POLICY "Anyone can read active checklists"
  ON photo_checklists FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage checklists"
  ON photo_checklists FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('owner', 'director', 'sysadmin')
    )
  );

-- ============================================
-- RLS POLICIES - shipment_photos
-- ============================================

CREATE POLICY "Users view own photos"
  ON shipment_photos FOR SELECT
  USING (uploaded_by = auth.uid());

CREATE POLICY "Users view job photos"
  ON shipment_photos FOR SELECT
  USING (
    job_order_id IN (
      SELECT ra.job_order_id 
      FROM resource_assignments ra
      JOIN employees e ON e.id = ra.resource_id
      WHERE e.user_id = auth.uid()
      AND ra.job_order_id IS NOT NULL
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

-- ============================================
-- RLS POLICIES - photo_upload_queue
-- ============================================

CREATE POLICY "Users manage own queue"
  ON photo_upload_queue FOR ALL
  USING (
    photo_id IN (
      SELECT id FROM shipment_photos WHERE uploaded_by = auth.uid()
    )
  );

-- ============================================
-- GRANTS
-- ============================================

GRANT SELECT ON photo_checklists TO authenticated;
GRANT ALL ON shipment_photos TO authenticated;
GRANT ALL ON photo_upload_queue TO authenticated;

-- ============================================
-- SEED DATA: photo_checklists
-- ============================================

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

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE photo_checklists IS 'Defines required/optional photos for each job stage (guided capture)';
COMMENT ON TABLE shipment_photos IS 'Stores metadata for photos captured in the GAMA Photo Capture app';
COMMENT ON TABLE photo_upload_queue IS 'Tracks photos pending upload for offline sync functionality';

COMMENT ON COLUMN photo_checklists.stage IS 'Job stage: job_start, in_transit, job_end';
COMMENT ON COLUMN photo_checklists.is_required IS 'true = must capture, false = can skip';
COMMENT ON COLUMN shipment_photos.checklist_item_id IS 'Links photo to specific checklist item';
COMMENT ON COLUMN shipment_photos.stage IS 'Job stage when photo was taken';

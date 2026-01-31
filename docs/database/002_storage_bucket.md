# GAMA Photo Capture - Storage Bucket Configuration

## Bucket Details

| Setting | Value |
|---------|-------|
| Bucket Name | `shipment-photos` |
| Public | `false` |
| File Size Limit | `10 MB` |
| Allowed MIME Types | `image/jpeg`, `image/png`, `image/webp`, `image/heic` |

## Storage Path Convention

Photos are organized using the following path structure:

```
shipment-photos/
└── {user_id}/
    └── {year}/
        └── {month}/
            └── {job_order_id}/
                └── {photo_type}/
                    └── {timestamp}_{uuid}.jpg
```

### Example Path

```
shipment-photos/abc123-user-id/2026/01/jo-2026-0001/before/1706745600_xyz789.jpg
```

### Path Components

| Component | Description | Example |
|-----------|-------------|---------|
| `user_id` | UUID of the user who uploaded the photo | `abc123-user-id` |
| `year` | 4-digit year | `2026` |
| `month` | 2-digit month (01-12) | `01` |
| `job_order_id` | UUID or job number of the associated job | `jo-2026-0001` |
| `photo_type` | Type of photo | `before`, `after`, `damage`, `document`, `survey`, `other` |
| `timestamp` | Unix timestamp when photo was taken | `1706745600` |
| `uuid` | Unique identifier for the photo | `xyz789` |

## Storage Policies

### Policy 1: Users can upload to their own folder

```sql
-- Bucket: shipment-photos
-- Operation: INSERT
-- Condition:
bucket_id = 'shipment-photos' 
AND (storage.foldername(name))[1] = auth.uid()::text
```

### Policy 2: Users can read their own files

```sql
-- Bucket: shipment-photos
-- Operation: SELECT
-- Condition:
bucket_id = 'shipment-photos' 
AND (storage.foldername(name))[1] = auth.uid()::text
```

### Policy 3: Users can delete their own files

```sql
-- Bucket: shipment-photos
-- Operation: DELETE
-- Condition:
bucket_id = 'shipment-photos' 
AND (storage.foldername(name))[1] = auth.uid()::text
```

### Policy 4: Admins can read all files

```sql
-- Bucket: shipment-photos
-- Operation: SELECT
-- Condition:
bucket_id = 'shipment-photos'
AND EXISTS (
  SELECT 1 FROM user_profiles
  WHERE user_profiles.user_id = auth.uid()
  AND user_profiles.role IN ('owner', 'director', 'sysadmin', 'operations_manager')
)
```

## Creating the Bucket

### Via Supabase Dashboard

1. Go to **Storage** in the Supabase Dashboard
2. Click **New bucket**
3. Enter bucket name: `shipment-photos`
4. Uncheck **Public bucket**
5. Set file size limit: `10485760` (10 MB in bytes)
6. Add allowed MIME types
7. Click **Create bucket**

### Via SQL

```sql
-- Note: Storage bucket creation is typically done via Dashboard or API
-- This is for reference only

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shipment-photos',
  'shipment-photos',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
);
```

## Thumbnail Storage

Thumbnails are stored alongside the original photos with a `_thumb` suffix:

```
shipment-photos/{user_id}/{year}/{month}/{job_order_id}/{photo_type}/{timestamp}_{uuid}_thumb.jpg
```

| Setting | Value |
|---------|-------|
| Max Size | 256 x 256 pixels |
| Quality | 70% JPEG |
| Generated | Client-side before upload |

## Photo Processing Requirements

| Setting | Value | Notes |
|---------|-------|-------|
| Max Resolution | 2048 x 2048 | Resize before upload |
| Quality | 80% JPEG | Configurable in settings |
| Max File Size | 5 MB | Reject if larger after resize |
| Format | JPEG | Convert HEIC/PNG to JPEG |

## Usage in Code

### Generating Storage Path

```typescript
function generateStoragePath(
  userId: string,
  jobOrderId: string,
  photoType: string,
  photoId: string
): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const timestamp = Math.floor(now.getTime() / 1000)
  
  return `${userId}/${year}/${month}/${jobOrderId}/${photoType}/${timestamp}_${photoId}.jpg`
}
```

### Uploading a Photo

```typescript
const storagePath = generateStoragePath(userId, jobOrderId, photoType, photoId)

const { data, error } = await supabase.storage
  .from('shipment-photos')
  .upload(storagePath, blob, {
    contentType: 'image/jpeg',
    upsert: false
  })
```

### Getting a Signed URL

```typescript
const { data } = await supabase.storage
  .from('shipment-photos')
  .createSignedUrl(storagePath, 3600) // 1 hour expiry
```

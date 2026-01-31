# Requirements Document

## Introduction

This document defines the requirements for v0.5 Photo Upload + Offline Sync in the GAMA Photo Capture PWA. This version implements the actual upload functionality to sync photos from IndexedDB to Supabase Storage, completing the offline-first architecture established in v0.3.

Currently, photos are captured and saved to IndexedDB with status 'pending' but never uploaded. v0.5 adds background sync when online, queue management UI, retry logic for failed uploads, and visual feedback for sync status throughout the app.

## Glossary

- **Upload_Service**: The module responsible for uploading photo blobs to Supabase Storage and creating metadata records in the shipment_photos table
- **Sync_Manager**: The module that monitors online/offline status and orchestrates background sync of pending photos
- **Upload_Queue**: The collection of photos in IndexedDB with status 'pending' or 'failed' awaiting upload
- **Queue_UI**: The user interface on the /queue page for viewing and managing pending uploads
- **Offline_Photo**: A photo record stored in IndexedDB (as defined in lib/offline/db.ts)
- **Shipment_Photo**: A photo metadata record in the Supabase shipment_photos table
- **Storage_Bucket**: The Supabase Storage bucket 'shipment-photos' where photo blobs are stored

## Requirements

### Requirement 1: Upload Photo to Supabase Storage

**User Story:** As a field staff member, I want my captured photos to be uploaded to cloud storage, so that they are safely backed up and accessible from the main ERP system.

#### Acceptance Criteria

1. WHEN a photo upload is initiated, THE Upload_Service SHALL upload the photo blob to the Storage_Bucket at path `{user_id}/{year}/{month}/{job_order_id}/{stage}/{timestamp}_{photo_id}.jpg`
2. THE Upload_Service SHALL update the Offline_Photo status to 'uploading' before starting the upload
3. WHEN the blob upload succeeds, THE Upload_Service SHALL create a Shipment_Photo record in the database with all metadata (job_order_id, checklist_item_id, stage, photo_type, GPS coordinates, taken_at, notes)
4. WHEN both blob upload and database insert succeed, THE Upload_Service SHALL delete the blob from IndexedDB to free storage
5. IF the upload fails, THEN THE Upload_Service SHALL update the Offline_Photo status to 'failed' and preserve the blob for retry
6. THE Upload_Service SHALL set upload_status to 'completed' and sync_status to 'synced' in the Shipment_Photo record upon successful upload

### Requirement 2: Background Sync When Online

**User Story:** As a field staff member, I want photos to upload automatically when I'm back online, so that I don't have to manually trigger uploads.

#### Acceptance Criteria

1. WHEN the app detects an online connection, THE Sync_Manager SHALL automatically start processing the Upload_Queue
2. THE Sync_Manager SHALL process photos in FIFO order (oldest first based on createdAt)
3. THE Sync_Manager SHALL upload one photo at a time to avoid overwhelming the connection
4. WHILE uploading, THE Sync_Manager SHALL continue monitoring for offline status and pause if connection is lost
5. WHEN a photo upload completes, THE Sync_Manager SHALL immediately start the next pending photo
6. THE Sync_Manager SHALL NOT block the UI during background sync operations

### Requirement 3: Retry Failed Uploads

**User Story:** As a field staff member, I want to retry failed uploads, so that temporary network issues don't cause permanent data loss.

#### Acceptance Criteria

1. WHEN an upload fails, THE Upload_Service SHALL increment the retry_count for that Offline_Photo
2. THE Sync_Manager SHALL automatically retry failed photos up to 3 times with exponential backoff (1s, 2s, 4s delays)
3. IF a photo fails 3 times, THEN THE Sync_Manager SHALL mark it as permanently failed and stop automatic retries
4. THE Queue_UI SHALL provide a "Retry" button for each failed photo to allow manual retry
5. THE Queue_UI SHALL provide a "Retry All" button to retry all failed photos at once
6. WHEN a manual retry is triggered, THE Upload_Service SHALL reset the retry_count and attempt upload immediately

### Requirement 4: Queue Management UI

**User Story:** As a field staff member, I want to see my pending uploads and their status, so that I know my photos are being synced.

#### Acceptance Criteria

1. THE Queue_UI SHALL display a list of all photos in the Upload_Queue grouped by status (uploading, pending, failed)
2. FOR EACH photo in the queue, THE Queue_UI SHALL display: thumbnail, job number, stage, photo type, and status
3. THE Queue_UI SHALL display the total count of pending photos and total size in MB
4. THE Queue_UI SHALL display the error message for failed photos
5. THE Queue_UI SHALL provide a "Delete" action for failed photos that cannot be recovered
6. WHEN the queue is empty, THE Queue_UI SHALL display an empty state message

### Requirement 5: Sync Status Indicator

**User Story:** As a field staff member, I want to see sync status in the app header, so that I always know if photos are pending upload.

#### Acceptance Criteria

1. THE App_Header SHALL display a queue icon with badge showing the count of pending photos
2. WHEN photos are actively uploading, THE App_Header SHALL show an animated upload indicator
3. WHEN all photos are synced, THE App_Header SHALL hide the queue badge or show a checkmark
4. WHEN offline, THE App_Header SHALL display the existing offline indicator alongside the queue count
5. WHEN the user taps the queue icon, THE App_Header SHALL navigate to the Queue_UI page

### Requirement 6: Upload Progress Feedback

**User Story:** As a field staff member, I want to see upload progress for each photo, so that I know the sync is working.

#### Acceptance Criteria

1. WHILE a photo is uploading, THE Queue_UI SHALL display a progress indicator for that photo
2. THE Queue_UI SHALL update the progress indicator in real-time during upload
3. WHEN an upload completes, THE Queue_UI SHALL remove the photo from the list with a brief success animation
4. WHEN an upload fails, THE Queue_UI SHALL display the error message and highlight the failed item

### Requirement 7: Offline Data Integrity

**User Story:** As a field staff member, I want my photos to be safe even if the app crashes, so that I never lose captured documentation.

#### Acceptance Criteria

1. THE Upload_Service SHALL NOT delete the IndexedDB blob until the Supabase upload is confirmed successful
2. IF the app is closed during upload, THEN THE Sync_Manager SHALL resume pending uploads on next app open
3. THE Sync_Manager SHALL verify the Shipment_Photo record exists before deleting the local blob
4. IF a partial upload is detected (blob uploaded but no database record), THEN THE Upload_Service SHALL create the missing database record

### Requirement 8: Storage Path Convention

**User Story:** As a system administrator, I want photos organized in a consistent folder structure, so that they can be easily located and managed.

#### Acceptance Criteria

1. THE Upload_Service SHALL generate storage paths following the pattern: `{user_id}/{year}/{month}/{job_order_id}/{stage}/{timestamp}_{photo_id}.jpg`
2. THE Upload_Service SHALL use the photo's taken_at timestamp for the year/month path components
3. THE Upload_Service SHALL use the photo's UUID as the photo_id in the filename
4. THE Upload_Service SHALL use Unix timestamp (seconds) for the timestamp component

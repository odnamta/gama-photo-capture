---
status: planned
priority: high
dependencies: [v0.3-guided-capture]
---

# v0.4 Camera + GPS Integration

## Overview

Real camera access and GPS capture, integrating with the guided capture flow from v0.3.

## User Stories

### US-4.1: Camera Access
As a field staff member, I want the app to access my phone camera so I can take photos directly.

**Acceptance Criteria:**
- [ ] Request camera permission on first capture attempt
- [ ] Handle permission denied gracefully
- [ ] Use rear camera by default
- [ ] Support both iOS Safari and Android Chrome

### US-4.2: Photo Quality
As a compliance officer, I want photos to be good enough quality for documentation but not huge files.

**Acceptance Criteria:**
- [ ] Capture at reasonable resolution (max 2048px)
- [ ] Compress to JPEG 80% quality
- [ ] Target file size < 2MB
- [ ] Preserve EXIF data (especially timestamp)

### US-4.3: GPS Capture
As a supervisor, I want photos to include GPS coordinates so I can verify location.

**Acceptance Criteria:**
- [ ] Request location permission
- [ ] Capture GPS with each photo
- [ ] Show accuracy indicator
- [ ] Handle GPS unavailable (capture anyway, note missing)

### US-4.4: Offline Camera
As a field staff member, I want to take photos even without internet so I can document in remote areas.

**Acceptance Criteria:**
- [ ] Camera works offline
- [ ] Photos saved to IndexedDB
- [ ] Thumbnails generated locally
- [ ] Queue for upload when online

## Technical Implementation

### Camera API
```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: 'environment',  // Rear camera
    width: { ideal: 2048 },
    height: { ideal: 2048 }
  }
})
```

### Photo Processing
```typescript
async function processPhoto(blob: Blob): Promise<ProcessedPhoto> {
  // Resize if needed
  const resized = await resizeImage(blob, { maxWidth: 2048, maxHeight: 2048 })
  
  // Compress
  const compressed = await compressImage(resized, { quality: 0.8 })
  
  // Generate thumbnail
  const thumbnail = await generateThumbnail(compressed, { width: 200 })
  
  return { full: compressed, thumbnail }
}
```

### GPS Capture
```typescript
async function captureGPS(): Promise<GPSData | null> {
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      })
    })
    
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy
    }
  } catch (error) {
    console.warn('GPS unavailable:', error)
    return null
  }
}
```

## Success Criteria

- [ ] Camera works on iOS Safari and Android Chrome
- [ ] Photos are properly compressed (< 2MB)
- [ ] GPS captured when available
- [ ] Graceful fallback when GPS unavailable
- [ ] Works completely offline

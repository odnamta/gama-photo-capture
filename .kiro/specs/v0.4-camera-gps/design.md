# Design Document: v0.4 Real Camera + GPS Integration

## Overview

This design document describes the implementation of real device camera access for the GAMA Photo Capture PWA, replacing the mock camera placeholder from v0.3. The feature uses the Web MediaDevices API (getUserMedia) to access device cameras, captures photos to canvas for processing, and integrates with the existing GPS capture functionality.

The implementation prioritizes cross-browser compatibility (iOS Safari, Android Chrome, Samsung Internet), graceful permission handling, and seamless integration with the existing guided capture flow.

## Architecture

### High-Level Component Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    GuidedCaptureSession                         │
│  (existing from v0.3 - orchestrates capture flow)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CameraCapture                              │
│  (NEW - replaces CameraPlaceholder)                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ useCamera   │  │ useGPS      │  │ PhotoProcessor          │  │
│  │ (hook)      │  │ (existing)  │  │ (utility)               │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Browser APIs                                  │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐   │
│  │ navigator.media     │  │ navigator.geolocation           │   │
│  │ Devices.getUserMedia│  │ (via existing useGeolocation)   │   │
│  └─────────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### State Machine for Camera

```
                    ┌─────────────────────────────────────┐
                    │                                     │
                    ▼                                     │
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐ │
│  IDLE   │───▶│REQUESTING│───▶│ ACTIVE  │───▶│CAPTURING│─┘
└─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │
     │              │              │              │
     │              ▼              ▼              │
     │         ┌─────────┐    ┌─────────┐        │
     │         │ DENIED  │    │SWITCHING│────────┘
     │         └─────────┘    └─────────┘
     │              │
     │              ▼
     │         ┌─────────┐
     └────────▶│  ERROR  │
               └─────────┘
```

## Components and Interfaces

### Component Hierarchy

```
GuidedCaptureSession (organisms - existing)
├── ChecklistStepView (molecules - existing)
│   ├── StepInstructions (atoms - existing)
│   ├── CameraCapture (organisms - NEW, replaces CameraPlaceholder)
│   │   ├── CameraPreview (atoms - NEW)
│   │   ├── CameraSwitchButton (atoms - NEW)
│   │   ├── GPSIndicator (atoms - existing, enhanced)
│   │   └── CameraPermissionError (atoms - NEW)
│   └── CaptureButton (atoms - existing)
└── PhotoPreviewSheet (molecules - existing)
```

### New Component Interfaces

```typescript
// organisms/camera-capture.tsx
interface CameraCaptureProps {
  /** Callback when photo is captured */
  onCapture: (blob: Blob, metadata: CaptureMetadata) => void
  /** Callback when camera error occurs */
  onError?: (error: CameraError) => void
  /** Whether capture is currently disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
}

interface CameraError {
  type: 'NOT_SUPPORTED' | 'PERMISSION_DENIED' | 'PERMISSION_DISMISSED' 
      | 'NOT_FOUND' | 'NOT_READABLE' | 'OVERCONSTRAINED' | 'UNKNOWN'
  message: string
  isPermanent: boolean
}

// atoms/camera-preview.tsx
interface CameraPreviewProps {
  /** MediaStream to display */
  stream: MediaStream | null
  /** Whether camera is loading */
  isLoading: boolean
  /** Current facing mode */
  facingMode: 'user' | 'environment'
  /** Additional CSS classes */
  className?: string
}

// atoms/camera-switch-button.tsx
interface CameraSwitchButtonProps {
  /** Callback when switch is requested */
  onSwitch: () => void
  /** Whether switching is in progress */
  isSwitching: boolean
  /** Whether button should be visible */
  isVisible: boolean
  /** Additional CSS classes */
  className?: string
}

// atoms/camera-permission-error.tsx
interface CameraPermissionErrorProps {
  /** Error details */
  error: CameraError
  /** Callback to retry camera access */
  onRetry: () => void
  /** Additional CSS classes */
  className?: string
}
```

### Hook Interface

```typescript
// hooks/use-camera.ts
interface UseCameraOptions {
  /** Initial facing mode (default: 'environment') */
  initialFacingMode?: 'user' | 'environment'
  /** Video constraints for resolution */
  videoConstraints?: MediaTrackConstraints
}

interface UseCameraReturn {
  /** Current camera state */
  state: CameraState
  /** Active media stream (null if not active) */
  stream: MediaStream | null
  /** Current facing mode */
  facingMode: 'user' | 'environment'
  /** Whether multiple cameras are available */
  hasMultipleCameras: boolean
  /** Current error (null if none) */
  error: CameraError | null
  
  // Actions
  /** Start the camera */
  startCamera: () => Promise<void>
  /** Stop the camera and release resources */
  stopCamera: () => void
  /** Switch between front and back camera */
  switchCamera: () => Promise<void>
  /** Capture current frame as blob */
  captureFrame: (videoElement: HTMLVideoElement) => Promise<Blob>
  /** Retry after error */
  retry: () => Promise<void>
}

type CameraState = 
  | 'idle'       // Initial state, camera not started
  | 'requesting' // Requesting permission
  | 'active'     // Camera stream active
  | 'capturing'  // Currently capturing a frame
  | 'switching'  // Switching cameras
  | 'denied'     // Permission denied
  | 'error'      // Other error occurred
```

### Photo Processor Interface

```typescript
// lib/utils/photo-processor.ts
interface ProcessOptions {
  /** Maximum dimension (width or height) in pixels */
  maxDimension?: number  // default: 2048
  /** JPEG quality (0-1) */
  quality?: number       // default: 0.8
  /** Output format */
  format?: 'image/jpeg' | 'image/webp'  // default: 'image/jpeg'
}

interface ProcessResult {
  /** Processed image blob */
  blob: Blob
  /** Original dimensions */
  originalWidth: number
  originalHeight: number
  /** Processed dimensions */
  width: number
  height: number
  /** File size in bytes */
  size: number
}

/** Process a video frame into a compressed image blob */
function processVideoFrame(
  video: HTMLVideoElement,
  options?: ProcessOptions
): Promise<ProcessResult>

/** Process an image blob (resize and compress) */
function processImageBlob(
  blob: Blob,
  options?: ProcessOptions
): Promise<ProcessResult>
```

## Data Models

### Camera State Model

```typescript
interface CameraStateModel {
  // Stream state
  stream: MediaStream | null
  facingMode: 'user' | 'environment'
  
  // Device info
  availableCameras: MediaDeviceInfo[]
  hasMultipleCameras: boolean
  
  // UI state
  state: CameraState
  error: CameraError | null
  
  // Capture state (preserved across camera switches)
  sessionState: {
    captureCount: number
    lastCaptureTime: Date | null
  }
}
```

### Enhanced Capture Metadata

```typescript
// Extends existing CaptureMetadata from types/capture.ts
interface EnhancedCaptureMetadata extends CaptureMetadata {
  // Existing fields
  takenAt: Date
  gpsLatitude: number | null
  gpsLongitude: number | null
  gpsAccuracy: number | null
  
  // New fields for v0.4
  deviceId?: string
  facingMode: 'user' | 'environment'
  imageWidth: number
  imageHeight: number
  originalWidth: number
  originalHeight: number
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Stream Cleanup on Unmount

*For any* active camera stream with N video tracks, when the CameraCapture component unmounts, all N tracks should have their `stop()` method called to release camera resources.

**Validates: Requirements 1.4**

### Property 2: Camera Switch Button Visibility

*For any* device configuration, the camera switch button should be visible if and only if the number of available video input devices is greater than 1.

**Validates: Requirements 2.1, 2.3**

### Property 3: FacingMode Toggle on Switch

*For any* camera switch action, if the current facingMode is 'environment', the new stream should be requested with facingMode 'user', and vice versa.

**Validates: Requirements 2.2**

### Property 4: State Preservation on Camera Switch

*For any* capture session state before a camera switch, the session state (capture count, captured photos, current checklist index) should be identical after the switch completes.

**Validates: Requirements 2.4**

### Property 5: Image Resize with Aspect Ratio Preservation

*For any* captured image with dimensions (W, H), the processed output should have dimensions (W', H') where:
- max(W', H') <= 2048
- W'/H' equals W/H (within floating point tolerance)
- If max(W, H) <= 2048, then W' = W and H' = H (no upscaling)

**Validates: Requirements 3.2**

### Property 6: Processed Image Size Constraint

*For any* typical photo (resolution up to 4000x3000), the processed JPEG blob at 80% quality should have a file size under 2MB.

**Validates: Requirements 3.4**

### Property 7: GPS Metadata Handling

*For any* photo capture:
- If GPS acquisition succeeds, metadata should include non-null latitude, longitude, and accuracy
- If GPS acquisition fails or times out, metadata should have null GPS fields but capture should still succeed
- GPS failure should never block or prevent photo capture

**Validates: Requirements 4.3, 4.4, 5.5**

### Property 8: GPS Indicator Status Mapping

*For any* GPS state, the indicator should display:
- 'acquiring' when GPS request is in progress
- 'available' when GPS coordinates are successfully obtained
- 'unavailable' when GPS request failed or timed out

**Validates: Requirements 4.5**

### Property 9: State Preservation on Capture Error

*For any* error that occurs during the capture process (canvas error, blob conversion error), the capture session state (current index, previous captures, skipped items) should remain unchanged.

**Validates: Requirements 8.3**

## Error Handling

### Camera Permission Errors

```typescript
function mapMediaError(error: DOMException): CameraError {
  switch (error.name) {
    case 'NotAllowedError':
      // Check if it's a permanent denial or dismissal
      return {
        type: 'PERMISSION_DENIED',
        message: 'Camera access was denied. Please enable camera access in your device settings.',
        isPermanent: true // May need to check permission state
      }
    case 'NotFoundError':
      return {
        type: 'NOT_FOUND',
        message: 'No camera found on this device.',
        isPermanent: true
      }
    case 'NotReadableError':
      return {
        type: 'NOT_READABLE',
        message: 'Camera is in use by another application.',
        isPermanent: false
      }
    case 'OverconstrainedError':
      return {
        type: 'OVERCONSTRAINED',
        message: 'Camera does not support the requested settings.',
        isPermanent: false
      }
    default:
      return {
        type: 'UNKNOWN',
        message: error.message || 'An unknown camera error occurred.',
        isPermanent: false
      }
  }
}
```

### Stream Interruption Recovery

```typescript
// Handle stream ending unexpectedly (e.g., phone call)
function setupStreamEndHandler(
  stream: MediaStream,
  onEnded: () => void
) {
  const videoTrack = stream.getVideoTracks()[0]
  if (videoTrack) {
    videoTrack.onended = () => {
      console.warn('Camera stream ended unexpectedly')
      onEnded()
    }
  }
}

// Auto-restart logic in useCamera hook
async function handleStreamEnded() {
  // Attempt automatic restart
  try {
    await startCamera()
  } catch (error) {
    // Show manual retry option
    setError({
      type: 'NOT_READABLE',
      message: 'Camera stream was interrupted. Tap to retry.',
      isPermanent: false
    })
  }
}
```

### GPS Error Handling

GPS errors are handled by the existing `useGeolocation` hook. The camera component treats GPS as optional:

```typescript
async function captureWithMetadata(
  videoElement: HTMLVideoElement
): Promise<{ blob: Blob; metadata: EnhancedCaptureMetadata }> {
  // Start GPS request (non-blocking)
  const gpsPromise = getCurrentPosition({ timeout: 5000 })
  
  // Capture and process image
  const result = await processVideoFrame(videoElement)
  
  // Wait for GPS (with timeout already applied)
  const gpsResult = await gpsPromise
  
  const metadata: EnhancedCaptureMetadata = {
    takenAt: new Date(),
    gpsLatitude: gpsResult.success ? gpsResult.coordinates.latitude : null,
    gpsLongitude: gpsResult.success ? gpsResult.coordinates.longitude : null,
    gpsAccuracy: gpsResult.success ? gpsResult.coordinates.accuracy : null,
    facingMode: currentFacingMode,
    imageWidth: result.width,
    imageHeight: result.height,
    originalWidth: result.originalWidth,
    originalHeight: result.originalHeight
  }
  
  return { blob: result.blob, metadata }
}
```

## Testing Strategy

### Unit Tests

Unit tests focus on specific examples and edge cases:

1. **useCamera hook**
   - Initial state is 'idle'
   - startCamera transitions to 'requesting' then 'active'
   - stopCamera releases all tracks
   - switchCamera toggles facingMode
   - Error states are set correctly

2. **Photo processor**
   - Images at or below 2048px are not resized
   - Large images are resized to max 2048px
   - Aspect ratio is preserved
   - Output is JPEG format

3. **Permission error component**
   - Displays correct message for each error type
   - Retry button calls onRetry
   - Settings link shown for permanent denial

4. **Camera preview**
   - Video element receives stream
   - playsinline attribute is set (iOS)
   - Loading state shows skeleton

### Property-Based Tests

Property tests verify universal properties across generated inputs. Use `fast-check` for TypeScript property-based testing.

Configuration:
- Minimum 100 iterations per property test
- Tag format: `Feature: v0.4-camera-gps, Property {N}: {description}`

Property tests to implement:

1. **Property 1: Stream cleanup**
   - Generate mock streams with 1-3 tracks
   - Verify all tracks have stop() called on cleanup

2. **Property 2: Camera switch button visibility**
   - Generate device lists with 0-5 cameras
   - Verify button visibility matches camera count > 1

3. **Property 3: FacingMode toggle**
   - Generate sequences of switch actions
   - Verify facingMode alternates correctly

4. **Property 5: Image resize with aspect ratio**
   - Generate random image dimensions (100-8000px)
   - Verify output dimensions satisfy constraints

5. **Property 6: Processed image size**
   - Generate test images at various resolutions
   - Verify output size is under 2MB

6. **Property 7: GPS metadata handling**
   - Generate success/failure GPS scenarios
   - Verify capture succeeds regardless of GPS result

7. **Property 8: GPS indicator status**
   - Generate all GPS states
   - Verify indicator shows correct status

8. **Property 9: State preservation on error**
   - Generate session states and error scenarios
   - Verify state unchanged after error

### Integration Tests

1. **Full capture flow** - Camera start → capture → preview → confirm
2. **Camera switch flow** - Start with rear → switch to front → capture
3. **Permission denied flow** - Deny permission → show error → retry
4. **GPS timeout flow** - Capture with GPS timeout → verify null GPS in metadata

## Implementation Notes

### iOS Safari Quirks

```typescript
// iOS Safari requires these attributes on video element
const videoAttributes = {
  autoPlay: true,
  playsInline: true,  // CRITICAL for iOS
  muted: true,
  'webkit-playsinline': true  // Legacy iOS support
}

// iOS may require user gesture to start camera
// Wrap startCamera in click handler if needed
```

### Android Chrome Considerations

```typescript
// Android Chrome handles facingMode well
// But may need to enumerate devices first for reliable switching
async function getAvailableCameras(): Promise<MediaDeviceInfo[]> {
  // Request permission first to get device labels
  await navigator.mediaDevices.getUserMedia({ video: true })
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter(d => d.kind === 'videoinput')
}
```

### Performance Considerations

- Video preview should use `object-fit: cover` for consistent display
- Canvas capture should happen on main thread (fast enough for single frame)
- Image processing (resize/compress) is synchronous but fast for single images
- GPS request runs in parallel with capture to minimize delay

### Accessibility

- Camera preview has `aria-label` describing the view
- Capture button has clear focus state and aria-label
- Error messages are announced to screen readers
- Camera switch button has descriptive aria-label

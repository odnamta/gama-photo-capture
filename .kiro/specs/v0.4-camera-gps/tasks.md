# Implementation Plan: v0.4 Real Camera + GPS Integration

## Overview

This implementation plan converts the mock camera placeholder from v0.3 into a real device camera using the getUserMedia API. The implementation follows a bottom-up approach: utilities first, then hooks, then components, and finally integration.

## Tasks

- [x] 1. Create photo processing utility
  - [x] 1.1 Create `lib/utils/photo-processor.ts` with processVideoFrame function
    - Capture video frame to canvas
    - Resize to max 2048px maintaining aspect ratio
    - Compress to JPEG at 80% quality
    - Return blob with dimensions metadata
    - _Requirements: 3.2, 3.3, 3.4_
  
  - [x] 1.2 Write property test for image resize with aspect ratio
    - **Property 5: Image resize with aspect ratio preservation**
    - **Validates: Requirements 3.2**
  
  - [x] 1.3 Write property test for processed image size
    - **Property 6: Processed image size constraint**
    - **Validates: Requirements 3.4**

- [x] 2. Create useCamera hook
  - [x] 2.1 Create `hooks/use-camera.ts` with camera stream management
    - Implement startCamera with getUserMedia
    - Request rear camera by default (facingMode: 'environment')
    - Request 720p minimum resolution
    - Handle permission errors with proper error types
    - Implement stopCamera to release all tracks
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 2.2 Add camera switching functionality to useCamera
    - Enumerate available cameras
    - Track hasMultipleCameras state
    - Implement switchCamera to toggle facingMode
    - Stop current stream before starting new one
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 2.3 Add stream interruption handling to useCamera
    - Listen for track ended events
    - Attempt automatic restart on interruption
    - Set error state if restart fails
    - _Requirements: 8.1, 8.2_
  
  - [x] 2.4 Write property test for stream cleanup
    - **Property 1: Stream cleanup on unmount**
    - **Validates: Requirements 1.4**
  
  - [x] 2.5 Write property test for camera switch button visibility
    - **Property 2: Camera switch button visibility**
    - **Validates: Requirements 2.1, 2.3**
  
  - [x] 2.6 Write property test for facingMode toggle
    - **Property 3: FacingMode toggle on switch**
    - **Validates: Requirements 2.2**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create camera UI components
  - [x] 4.1 Create `components/atoms/camera-preview.tsx`
    - Video element with stream binding
    - iOS Safari attributes (playsinline, webkit-playsinline)
    - Loading skeleton state
    - Viewfinder corner guides
    - Proper aspect ratio handling
    - _Requirements: 6.4, 7.1, 7.3, 7.5_
  
  - [x] 4.2 Create `components/atoms/camera-switch-button.tsx`
    - Switch icon button
    - Conditional visibility based on hasMultipleCameras
    - Disabled state during switching
    - _Requirements: 2.1, 2.3_
  
  - [x] 4.3 Create `components/atoms/camera-permission-error.tsx`
    - Error message display by error type
    - Instructions for enabling camera in settings
    - Try Again button for retry
    - Settings link for permanent denial
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 4.4 Enhance `components/atoms/gps-indicator.tsx` with status states
    - Show 'acquiring' during GPS request
    - Show 'available' with accuracy on success
    - Show 'unavailable' on failure/timeout
    - _Requirements: 4.5_
  
  - [x] 4.5 Write property test for GPS indicator status mapping
    - **Property 8: GPS indicator status mapping**
    - **Validates: Requirements 4.5**

- [x] 5. Create CameraCapture organism
  - [x] 5.1 Create `components/organisms/camera-capture.tsx`
    - Integrate useCamera hook
    - Integrate useGeolocation hook (existing)
    - Compose CameraPreview, CameraSwitchButton, GPSIndicator
    - Handle permission error state with CameraPermissionError
    - _Requirements: 1.1, 1.2, 1.3, 4.1, 5.1, 5.6_
  
  - [x] 5.2 Add capture functionality to CameraCapture
    - Capture frame using processVideoFrame
    - Get GPS coordinates with 5-second timeout
    - Create metadata with GPS (or null if unavailable)
    - Call onCapture with blob and metadata
    - Handle capture errors gracefully
    - _Requirements: 3.1, 3.5, 4.1, 4.2, 4.3, 4.4, 8.3, 8.4_
  
  - [x] 5.3 Write property test for GPS metadata handling
    - **Property 7: GPS metadata handling**
    - **Validates: Requirements 4.3, 4.4, 5.5**
  
  - [x] 5.4 Write property test for state preservation on error
    - **Property 9: State preservation on capture error**
    - **Validates: Requirements 8.3**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Integrate CameraCapture into guided capture flow
  - [x] 7.1 Update `components/molecules/checklist-step-view.tsx`
    - Replace CameraPlaceholder with CameraCapture
    - Pass onCapture handler to CameraCapture
    - Handle camera errors at step level
    - _Requirements: 1.1, 3.5_
  
  - [x] 7.2 Update `components/organisms/guided-capture-session.tsx`
    - Remove createPlaceholderBlob function
    - Update handleCapture to receive blob from CameraCapture
    - Ensure session state preserved on camera errors
    - _Requirements: 8.3, 8.5_
  
  - [x] 7.3 Write property test for state preservation on camera switch
    - **Property 4: State preservation on camera switch**
    - **Validates: Requirements 2.4**

- [x] 8. Update CameraPlaceholder as fallback
  - [x] 8.1 Convert `components/atoms/camera-placeholder.tsx` to fallback mode
    - Keep existing file picker functionality
    - Add prop to indicate fallback mode
    - Show message that camera is unavailable
    - Use as fallback when getUserMedia not supported
    - _Requirements: 1.5, 8.5_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required including property tests
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The existing useGeolocation hook is reused without modification
- iOS Safari requires playsinline attribute on video element
- GPS is always optional - capture should never be blocked by GPS failure

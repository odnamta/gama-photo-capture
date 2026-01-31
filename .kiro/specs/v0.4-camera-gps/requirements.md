# Requirements Document

## Introduction

This document defines the requirements for v0.4 Real Camera + GPS Integration in the GAMA Photo Capture PWA. This version replaces the mock camera placeholder from v0.3 with real device camera access using the getUserMedia API, enabling field staff to capture actual photos during the guided capture flow.

The feature must work reliably on iOS Safari 14+ and Android Chrome 90+, handle permission denials gracefully, and integrate with the existing GPS capture functionality.

## Glossary

- **Camera_Component**: The React component that manages camera stream access, video preview, and photo capture
- **Camera_Stream**: The MediaStream object obtained from getUserMedia containing video track(s)
- **Photo_Processor**: The module responsible for resizing and compressing captured images
- **Permission_Handler**: The module that manages camera and GPS permission requests and error states
- **GPS_Capture**: The existing geolocation functionality that captures coordinates with each photo
- **Capture_Session**: The guided photo capture flow from v0.3 that orchestrates the checklist-based capture

## Requirements

### Requirement 1: Camera Stream Access

**User Story:** As a field staff member, I want the camera to open automatically when I start capturing, so that I can take photos without extra steps.

#### Acceptance Criteria

1. WHEN the capture screen loads, THE Camera_Component SHALL request camera access using navigator.mediaDevices.getUserMedia
2. THE Camera_Component SHALL request the rear camera by default using facingMode: 'environment'
3. WHEN camera access is granted, THE Camera_Component SHALL display the live video stream in a video element
4. WHEN the capture session ends or user navigates away, THE Camera_Component SHALL stop all tracks in the Camera_Stream to release the camera
5. IF getUserMedia is not supported, THEN THE Camera_Component SHALL display a browser compatibility error message

### Requirement 2: Camera Switching

**User Story:** As a field staff member, I want to switch between front and back cameras, so that I can take photos from different angles when needed.

#### Acceptance Criteria

1. THE Camera_Component SHALL display a camera switch button when multiple cameras are available
2. WHEN the user taps the camera switch button, THE Camera_Component SHALL stop the current Camera_Stream and request a new stream with the opposite facingMode
3. IF only one camera is available, THEN THE Camera_Component SHALL hide the camera switch button
4. WHEN switching cameras, THE Camera_Component SHALL maintain the capture session state without data loss

### Requirement 3: Photo Capture

**User Story:** As a field staff member, I want to capture a photo from the camera preview, so that I can document the cargo condition.

#### Acceptance Criteria

1. WHEN the user taps the capture button, THE Camera_Component SHALL capture the current video frame to a canvas element
2. THE Photo_Processor SHALL resize the captured image to a maximum dimension of 2048 pixels while maintaining aspect ratio
3. THE Photo_Processor SHALL compress the image to JPEG format at 80% quality
4. THE Photo_Processor SHALL output the processed image as a Blob with size under 2MB for typical photos
5. WHEN capture is complete, THE Camera_Component SHALL pass the Blob to the Capture_Session for preview

### Requirement 4: GPS Integration

**User Story:** As a field staff member, I want GPS coordinates captured with each photo, so that the location is documented automatically.

#### Acceptance Criteria

1. WHEN a photo is captured, THE Camera_Component SHALL request GPS coordinates using the existing GPS_Capture hook
2. THE Camera_Component SHALL use a 5-second timeout for GPS acquisition to avoid blocking capture
3. IF GPS is unavailable or times out, THEN THE Camera_Component SHALL proceed with capture and set GPS fields to null
4. WHEN GPS is successfully captured, THE Camera_Component SHALL include latitude, longitude, and accuracy in the photo metadata
5. THE Camera_Component SHALL display a GPS indicator showing lock status (available, acquiring, unavailable)

### Requirement 5: Permission Handling

**User Story:** As a field staff member, I want clear feedback when camera access is denied, so that I know how to enable it.

#### Acceptance Criteria

1. WHEN camera permission is denied, THE Permission_Handler SHALL display a clear error message explaining the issue
2. THE Permission_Handler SHALL provide instructions for enabling camera access in device settings
3. THE Permission_Handler SHALL display a "Try Again" button to re-request camera permission
4. IF camera permission is permanently denied, THEN THE Permission_Handler SHALL show a link to device settings
5. THE Permission_Handler SHALL NOT block the app if GPS permission is denied (GPS is optional)
6. WHEN permission state changes, THE Permission_Handler SHALL update the UI immediately

### Requirement 6: Cross-Browser Compatibility

**User Story:** As a field staff member using different devices, I want the camera to work on my phone regardless of browser, so that I can always capture photos.

#### Acceptance Criteria

1. THE Camera_Component SHALL support iOS Safari 14 and later versions
2. THE Camera_Component SHALL support Android Chrome 90 and later versions
3. THE Camera_Component SHALL support Samsung Internet 14 and later versions
4. THE Camera_Component SHALL handle iOS Safari's specific getUserMedia constraints (playsinline attribute required)
5. IF a browser-specific quirk is detected, THEN THE Camera_Component SHALL apply the appropriate workaround automatically

### Requirement 7: Camera Preview Quality

**User Story:** As a field staff member, I want to see a clear camera preview, so that I can frame my photos properly.

#### Acceptance Criteria

1. THE Camera_Component SHALL request video resolution of at least 1280x720 (720p) for preview
2. THE Camera_Component SHALL display the video preview at full width of the capture area
3. THE Camera_Component SHALL maintain the correct aspect ratio without stretching
4. WHEN the device orientation changes, THE Camera_Component SHALL adjust the preview layout accordingly
5. THE Camera_Component SHALL display viewfinder guides (corner brackets) to help frame photos

### Requirement 8: Error Recovery

**User Story:** As a field staff member, I want the camera to recover from errors automatically, so that I don't lose my capture progress.

#### Acceptance Criteria

1. IF the Camera_Stream is interrupted (e.g., phone call), THEN THE Camera_Component SHALL attempt to restart the stream automatically
2. IF camera restart fails, THEN THE Camera_Component SHALL display an error with a manual retry option
3. WHEN an error occurs during capture, THE Camera_Component SHALL preserve the current session state
4. THE Camera_Component SHALL log camera errors for debugging purposes
5. IF the camera becomes unavailable mid-session, THEN THE Camera_Component SHALL allow the user to exit gracefully without data loss

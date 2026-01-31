---
status: planned
priority: high
dependencies: [v0.2-job-selection]
---

# v0.3 Guided Capture Flow

## Overview

The core capture experience: step-by-step guided photo documentation following a checklist. Users are walked through each required photo with instructions, tips, and visual guidance.

## User Stories

### US-3.1: Start Capture Session
As a field staff member, I want to start a guided capture session for a job stage so the app tells me exactly what photos to take.

**Acceptance Criteria:**
- [ ] Tap "Start Capture" on stage card
- [ ] Load checklist items for that stage from photo_checklists
- [ ] Show first checklist item with instructions
- [ ] Display step indicator (Step 1 of 5)

### US-3.2: View Capture Instructions
As a field staff member, I want to see clear instructions for each photo so I take the right documentation.

**Acceptance Criteria:**
- [ ] Show title in user's language (title or title_id based on locale)
- [ ] Show description explaining what to capture
- [ ] Show tips for better photos
- [ ] Future: Show example image

### US-3.3: Capture Photo
As a field staff member, I want to capture a photo directly in the app so it's automatically linked to the job.

**Acceptance Criteria:**
- [ ] Camera viewfinder displayed (placeholder in v0.3, real in v0.4)
- [ ] Large capture button (thumb-friendly)
- [ ] Capture triggers preview screen
- [ ] GPS captured automatically with photo

### US-3.4: Preview and Confirm
As a field staff member, I want to preview my photo before confirming so I can retake if needed.

**Acceptance Criteria:**
- [ ] Show captured photo full-screen
- [ ] Display GPS coordinates and timestamp
- [ ] Optional notes field
- [ ] "Retake" button to try again
- [ ] "Confirm" button to save and continue

### US-3.5: Skip Optional Items
As a field staff member, I want to skip optional photos (like damage when there's none) so I don't waste time.

**Acceptance Criteria:**
- [ ] Optional items show "Skip" button
- [ ] Required items do NOT show skip option
- [ ] Skipping advances to next item
- [ ] Skipped items can be captured later

### US-3.6: Complete Stage
As a field staff member, I want to see confirmation when I've completed all required photos so I know I'm done.

**Acceptance Criteria:**
- [ ] After last item, show completion summary
- [ ] List photos captured with thumbnails
- [ ] Show any skipped optional items
- [ ] "Done" button returns to job detail
- [ ] Job detail now shows stage as complete

### US-3.7: Resume Incomplete Session
As a field staff member, I want to resume where I left off if I exit mid-capture so I don't lose progress.

**Acceptance Criteria:**
- [ ] Track which items are captured per job+stage
- [ ] When starting capture, skip already-completed items
- [ ] Or show completed items as done with option to retake

## UI Flow

```
Job Detail
    │
    ▼
Tap "Start Capture" on job_start

┌─────────────────────────────────────────┐
│  Step 1 of 5                    [X] Exit│
│ ═══════════════════════════════════════ │
│                                         │
│  📷 Cargo Front View                    │
│  ─────────────────────                  │
│  Take photo of cargo from the front     │
│  before loading begins.                 │
│                                         │
│  💡 Tip: Ensure cargo label is visible  │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │     [Camera Viewfinder]        │    │
│  │                                │    │
│  └─────────────────────────────────┘    │
│                                         │
│           [📸 CAPTURE]                  │
│                                         │
└─────────────────────────────────────────┘
    │
    ▼
Photo captured

┌─────────────────────────────────────────┐
│  Step 1 of 5                            │
│ ═══════════════════════════════════════ │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │     [Captured Photo]           │    │
│  │                                │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ✓ GPS: -6.2088, 106.8456               │
│  ✓ Time: 08:42 AM, 15 Jan 2026          │
│                                         │
│  Add note (optional):                   │
│  ┌─────────────────────────────────┐    │
│  │ Minor scratch - pre-existing   │    │
│  └─────────────────────────────────┘    │
│                                         │
│      [Retake]        [✓ Confirm]        │
│                                         │
└─────────────────────────────────────────┘
    │
    ▼
Confirmed, auto-advance to Step 2
... repeat until done ...
    │
    ▼
All required complete

┌─────────────────────────────────────────┐
│  ✅ Job Start Complete!                 │
│ ═══════════════════════════════════════ │
│                                         │
│  Photos captured: 5                     │
│                                         │
│  [thumb] Cargo Front View      ✓        │
│  [thumb] Cargo Left Side       ✓        │
│  [thumb] Cargo Right Side      ✓        │
│  [thumb] Existing Damage       skipped  │
│  [thumb] Loading Document      ✓        │
│                                         │
│  📤 Uploading in background...          │
│                                         │
│              [Done]                     │
│                                         │
└─────────────────────────────────────────┘
```

## Components Needed

### GuidedCaptureScreen
- Main container for capture flow
- Manages current step index
- Handles navigation (next, back, skip)

### ChecklistStepView
- Shows current checklist item
- Title, description, tips
- Camera trigger button
- Skip button (if optional)

### PhotoPreviewSheet
- Full-screen photo preview
- GPS/time metadata display
- Notes input
- Retake/Confirm buttons

### CaptureCompleteSummary
- List of captured photos
- Thumbnail grid
- Upload status
- Done button

### StepProgressBar
- "Step X of Y"
- Visual progress bar

## Data Flow

```typescript
// On entering capture flow
const stage = 'job_start'
const checklist = await loadChecklist(stage)  // Ordered by sequence
const existingPhotos = await loadJobPhotos(jobId, stage)

// Track state
const [currentIndex, setCurrentIndex] = useState(0)
const [captures, setCaptures] = useState<Map<string, CapturedPhoto>>()

// On confirm
async function confirmPhoto(photo: CapturedPhoto) {
  // Save to IndexedDB for offline support
  await saveToLocalQueue(photo)
  
  // Try immediate upload
  uploadInBackground(photo)
  
  // Advance to next
  setCurrentIndex(i => i + 1)
}
```

## Success Criteria

- [ ] Step-by-step flow guides user through all checklist items
- [ ] Required items cannot be skipped
- [ ] Optional items can be skipped
- [ ] Photos are queued for upload immediately
- [ ] Session can be resumed if interrupted
- [ ] Completion shows summary of captured photos
- [ ] < 500ms transition between steps

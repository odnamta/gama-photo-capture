# Implementation Plan: v0.2-job-selection

## Overview

This implementation plan covers the Job Selection feature for GAMA Photo Capture. The feature enables field staff to view their assigned jobs and photo documentation status, serving as the entry point to the guided capture flow.

**Status**: ✅ Complete - All tasks implemented

## Tasks

- [x] 1. Define job types and constants
  - [x] 1.1 Create types/job.ts with JobStage, StageProgress, JobWithProgress types
    - Define JobStage union type for 'job_start', 'in_transit', 'job_end'
    - Define StageProgress interface with required, completed, total, isComplete, isLocked
    - Define JobWithProgress interface with progress per stage
    - _Requirements: 2.2.1, 2.2.3, 2.4.1_
  
  - [x] 1.2 Add stage labels and descriptions
    - Create STAGE_LABELS constant with English and Indonesian translations
    - Create STAGE_DESCRIPTIONS constant for each stage
    - _Requirements: 2.3.2_
  
  - [x] 1.3 Implement getStageStatus helper function
    - Return 'locked', 'not_started', 'in_progress', or 'complete' based on progress
    - Create STAGE_STATUS_COLORS mapping for UI
    - _Requirements: 2.2.2_

- [x] 2. Implement server actions for job data
  - [x] 2.1 Create getMyJobs server action
    - Get current user from Supabase auth
    - Query employees table to get employee ID
    - Query resource_assignments for job assignments
    - Query job_orders with customer info
    - Query shipment_photos for photo counts
    - Query photo_checklists for requirements
    - Calculate progress per stage
    - _Requirements: 2.1.1, 2.1.3, 2.2.1, 2.2.3_
  
  - [x] 2.2 Create getJobDetail server action
    - Fetch single job order with customer
    - Fetch checklist items for all stages
    - Fetch photos for the job
    - Calculate stage progress with locking logic
    - _Requirements: 2.3.1, 2.4.1_
  
  - [x] 2.3 Implement stage locking logic
    - job_start never locked
    - in_transit never locked
    - job_end locked until job_start.isComplete = true
    - _Requirements: 2.4.1, 2.4.3_

- [x] 3. Checkpoint - Verify server actions work correctly
  - Ensure getMyJobs returns jobs for authenticated user
  - Ensure getJobDetail returns job with correct progress
  - Ensure stage locking logic is correct

- [x] 4. Create UI components
  - [x] 4.1 Create PhotoProgressBadge component
    - Display "X/Y" format for progress
    - Apply color based on status (red/yellow/green)
    - Support 'sm' and 'md' sizes
    - _Requirements: 2.2.1, 2.2.2_
  
  - [x] 4.2 Create JobCard component
    - Display JO number, customer name, status badge
    - Display description (truncated)
    - Show PhotoProgressBadge for job_start and job_end
    - Handle click to navigate to detail
    - _Requirements: 2.1.4, 2.2.1_
  
  - [x] 4.3 Create StageCard component
    - Display stage title with icon (CheckCircle2, Lock, Circle)
    - Show Indonesian subtitle
    - Display progress bar for stages with required photos
    - Show PhotoProgressBadge
    - Show locked message when isLocked = true
    - Show "Start Capture" or "Add More Photos" button
    - _Requirements: 2.3.2, 2.3.3, 2.3.4, 2.4.2_

- [x] 5. Implement Jobs page
  - [x] 5.1 Create jobs list page at app/(main)/jobs/page.tsx
    - Use AppLayout with "My Jobs" title
    - Fetch jobs using getMyJobs on mount
    - Show loading spinner while fetching
    - Show error state with retry button
    - Show empty state when no jobs
    - Render JobCard for each job
    - Handle refresh button
    - _Requirements: 2.1.1, 2.1.3, 2.1.4_
  
  - [x] 5.2 Implement job click navigation
    - Navigate to /jobs/[id] on JobCard click
    - _Requirements: 2.3.1_

- [x] 6. Implement Job Detail page
  - [x] 6.1 Create job detail page at app/(main)/jobs/[id]/page.tsx
    - Use AppLayout with "Job Detail" title
    - Fetch job using getJobDetail on mount
    - Show loading spinner while fetching
    - Show error state with retry button
    - Show "Job Not Found" empty state when job is null
    - _Requirements: 2.3.1_
  
  - [x] 6.2 Render job header card
    - Display JO number, customer name, status badge
    - Display description
    - _Requirements: 2.3.1_
  
  - [x] 6.3 Render stage cards
    - Render StageCard for job_start, in_transit, job_end
    - Pass progress data to each card
    - Handle "Start Capture" button click (navigate to camera)
    - _Requirements: 2.3.2, 2.3.3, 2.3.4, 2.4.1, 2.4.2_
  
  - [x] 6.4 Render checklist summary card
    - Show required and optional counts per stage
    - _Requirements: 2.3.3_

- [x] 7. Checkpoint - Verify UI components work correctly
  - Ensure jobs page loads and displays jobs
  - Ensure job detail page shows all stage cards
  - Ensure stage locking UI works correctly
  - Ensure navigation between pages works

- [x] 8. Write tests
  - [x] 8.1 Write unit tests for job types
    - Test getStageStatus function
    - Test STAGE_STATUS_COLORS mapping
    - _Requirements: 2.2.2_
  
  - [x] 8.2 Write unit tests for components
    - Test JobCard renders required fields
    - Test StageCard renders with different states
    - Test PhotoProgressBadge color coding
    - _Requirements: 2.1.4, 2.2.2, 2.3.3_

- [x] 9. Final checkpoint - All tests pass
  - Ensure all unit tests pass
  - Ensure TypeScript compilation succeeds
  - Ensure no lint errors

## Notes

- All tasks are marked complete as the implementation already exists
- The feature was implemented as part of v0.2 milestone
- Stage locking ensures sequential documentation (job_start before job_end)
- in_transit stage has no required photos (all optional)
- Progress is calculated from photo_checklists requirements and shipment_photos counts

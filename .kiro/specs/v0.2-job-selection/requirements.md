---
status: complete
priority: high
dependencies: [v0.1-foundation]
---

# v0.2 Job Selection + Checklist Status

## Overview

Enable users to see their assigned jobs and the photo documentation status for each job. This is the entry point to the guided capture flow.

## User Stories

### US-2.1: View Today's Jobs
As a field staff member, I want to see my assigned jobs for today so I can start documenting them.

**Acceptance Criteria:**
- [x] Fetch jobs from job_orders where assigned to current user
- [x] Filter to jobs with execution date = today (or recent)
- [x] Show job list sorted by priority/time
- [x] Each job card shows: JO number, customer, route, status

### US-2.2: See Photo Completion Status
As a field staff member, I want to see how many photos I've taken per job so I know what's left to do.

**Acceptance Criteria:**
- [x] Job card shows photo progress (e.g., "3/5 start | 0/4 end")
- [x] Visual indicator: red (not started), yellow (in progress), green (complete)
- [x] Separate counts for job_start and job_end stages

### US-2.3: View Job Detail
As a field staff member, I want to see job details and available capture stages so I can start documenting.

**Acceptance Criteria:**
- [x] Job detail page shows: customer, cargo, origin, destination
- [x] Stage cards for: job_start, in_transit (optional), job_end
- [x] Each stage card shows: required count, completed count, status
- [x] "Start Capture" button on each stage card

### US-2.4: Stage Locking
As a supervisor, I want job_end photos to require job_start completion so documentation is sequential.

**Acceptance Criteria:**
- [x] job_end stage is locked until job_start is complete
- [x] Locked stage shows message: "Complete Job Start photos first"
- [x] in_transit stage is always available (optional photos)

## UI Components Needed

### JobCard
- JO number, customer name
- Route (origin → destination) 
- Status badge
- Photo progress indicator
- Tap to open detail

### JobDetailPage
- Job header info
- List of StageCard components
- Back navigation

### StageCard
- Stage title (Job Start / In Transit / Job End)
- Required photo count
- Completed photo count
- Progress bar
- Lock indicator (for job_end)
- "Start Capture" button

### PhotoProgressBadge
- Shows "X/Y photos"
- Color coded by status

## API/Data Requirements

### Fetch user's jobs
```typescript
const { data: jobs } = await supabase
  .from('job_orders')
  .select('id, jo_number, customer:customers(name), status, ...')
  .eq('assigned_to', userId)
  .gte('execution_date', today)
  .order('execution_date')
```

### Fetch photo counts per job
```typescript
const { data: counts } = await supabase
  .from('shipment_photos')
  .select('job_order_id, stage')
  .in('job_order_id', jobIds)
  .eq('is_deleted', false)
```

### Check stage completion
```typescript
// See database-schema.md for isStageComplete() function
```

## Success Criteria

- [x] User sees only their assigned jobs
- [x] Photo progress is accurate and updates after capture
- [x] Stage locking works correctly
- [x] Page loads < 2 seconds
- [ ] Works offline with cached data (deferred to v0.5)

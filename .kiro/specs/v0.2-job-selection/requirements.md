---
status: in-progress
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
- [ ] Fetch jobs from job_orders where assigned to current user
- [ ] Filter to jobs with execution date = today (or recent)
- [ ] Show job list sorted by priority/time
- [ ] Each job card shows: JO number, customer, route, status

### US-2.2: See Photo Completion Status
As a field staff member, I want to see how many photos I've taken per job so I know what's left to do.

**Acceptance Criteria:**
- [ ] Job card shows photo progress (e.g., "3/5 start | 0/4 end")
- [ ] Visual indicator: red (not started), yellow (in progress), green (complete)
- [ ] Separate counts for job_start and job_end stages

### US-2.3: View Job Detail
As a field staff member, I want to see job details and available capture stages so I can start documenting.

**Acceptance Criteria:**
- [ ] Job detail page shows: customer, cargo, origin, destination
- [ ] Stage cards for: job_start, in_transit (optional), job_end
- [ ] Each stage card shows: required count, completed count, status
- [ ] "Start Capture" button on each stage card

### US-2.4: Stage Locking
As a supervisor, I want job_end photos to require job_start completion so documentation is sequential.

**Acceptance Criteria:**
- [ ] job_end stage is locked until job_start is complete
- [ ] Locked stage shows message: "Complete Job Start photos first"
- [ ] in_transit stage is always available (optional photos)

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

- [ ] User sees only their assigned jobs
- [ ] Photo progress is accurate and updates after capture
- [ ] Stage locking works correctly
- [ ] Page loads < 2 seconds
- [ ] Works offline with cached data

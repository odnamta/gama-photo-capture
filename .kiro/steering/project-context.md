---
inclusion: always
---
# GAMA Photo Capture - Project Context for Kiro

## Project Overview
- **App Name**: GAMA Photo Capture
- **Type**: Progressive Web App (PWA) - Satellite App for GAMA ERP
- **Company**: PT. Gama Intisamudera
- **Purpose**: Field photo capture for logistics operations (shipment documentation)
- **Primary Users**: Operations staff, Engineers, Drivers
- **Parent System**: GAMA ERP (shares Supabase project)

### App Model: Guided Photo Capture (Zipcar-Style)

This app uses a **guided checklist approach**, not free-form photo capture:
- Users follow step-by-step photo checklists per job stage
- Required photos must be taken before proceeding
- Each step shows instructions, tips, and example expectations
- Photos automatically link to correct job and checklist item
- Compliance-focused: ensures all required documentation captured

**Job Stages:**
| Stage | When | Required Photos | Optional |
|-------|------|-----------------|----------|
| `job_start` | Before loading | 4 | 1 (damage) |
| `in_transit` | During transport | 0 | 2 |
| `job_end` | After delivery | 3 | 1 (damage) |

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL) - shared with GAMA ERP
- **Auth**: Supabase Auth (same as GAMA ERP)
- **Styling**: TailwindCSS + shadcn/ui (new-york theme)
- **Offline Storage**: IndexedDB via Dexie.js
- **PWA**: next-pwa
- **Deployment**: Vercel

## Deployment

**Separate from GAMA ERP:**
- Repo: gama-photo-capture
- URL: foto.gama.co.id (production)
- Port: 3001 (development)
- Vercel: Separate project

**Shared with GAMA ERP:**
- Supabase: ljbkjtaowrdddvjhsygj
- Auth: Same Google OAuth
- Tables: job_orders, user_profiles, customers

## Key Commands
```bash
# Development
npm run dev              # Start dev server (localhost:3001)
npm run build            # Production build (ALWAYS run before push)
npm run lint             # ESLint check

# Database types (run after schema changes in main ERP)
npx supabase gen types typescript --project-id ljbkjtaowrdddvjhsygj > types/supabase.ts

# PWA testing
npm run build && npm run start  # Test PWA locally

# Deployment
git add . && git commit -m "message" && git push   # Triggers Vercel auto-deploy
```

## Integration with GAMA ERP
This satellite app shares:
- **Same Supabase project** (ljbkjtaowrdddvjhsygj)
- **Same authentication** (users log in once)
- **Same user_profiles table** (roles, permissions)
- **Same job_orders table** (photos link to jobs)

New tables specific to Photo Capture:
- `photo_checklists` - Defines required/optional photos per stage
- `shipment_photos` - Photo metadata and storage references
- `photo_upload_queue` - Offline sync tracking

## User Roles (from GAMA ERP)
| Role | Access Level |
|------|--------------|
| `owner` | Full access |
| `director` | Full access |
| `operations_manager` | View all, capture for assigned |
| `ops` / `operations` | Capture for assigned jobs |
| `engineer` | Capture survey photos |

## Key Workflows

### Guided Capture Flow

```
Select Job → Choose Stage → Step-by-Step Capture → Review → Done

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Job List   │───▶│ Job Detail  │───▶│   Guided    │───▶│  Complete   │
│  (Today's)  │    │  (Stages)   │    │   Capture   │    │  (Synced)   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                          │                   │
                          ▼                   ▼
                   ┌───────────┐       ┌───────────────┐
                   │ job_start │       │ Step 1 of 5   │
                   │ in_transit│       │ Instructions  │
                   │ job_end   │       │ [Capture]     │
                   └───────────┘       │ Preview       │
                                       │ Confirm/Next  │
                                       └───────────────┘
```

**Capture Step Flow:**
1. Show checklist item (title, description, tips)
2. User captures photo
3. Preview with GPS/timestamp confirmation
4. Optional: Add note (e.g., "existing scratch")
5. Confirm → Auto-advance to next step
6. Repeat until all required photos done

### Offline Sync Flow
```
1. Photo captured offline → Blob saved to IndexedDB
2. Metadata queued in photo_upload_queue
3. Online detected → Process queue
4. Upload to Supabase Storage
5. Create/update metadata record
6. Delete local blob
7. Update sync status
```

## Photo Types
| Type | Use Case |
|------|----------|
| `cargo_before` | Pre-loading cargo condition |
| `cargo_after` | Post-delivery cargo condition |
| `cargo_transit` | Cargo during transport |
| `document` | Permits, receipts, paperwork |
| `damage` | Any damage documentation |
| `issue` | Problems during transport |

## Storage Structure
```
Supabase Storage Bucket: shipment-photos
Path: {user_id}/{year}/{month}/{job_order_id}/{stage}/{timestamp}_{uuid}.jpg

Example:
shipment-photos/abc123-user-id/2026/01/jo-uuid/job_start/1706745600_xyz789.jpg
```

## Current State (January 2026)
- **Status**: v0.4 Real Camera + GPS Integration Complete ✅ | Next: Photo Upload + Offline Sync (v0.5)
- **Phase**: Development
- **Dependencies**: GAMA ERP v1.0 launch (March 12, 2026)
- **Planned Start**: April 2026

## Active Sprint Tasks

### v0.2 Job Selection + Checklist Status ✅
- [x] Fetch jobs assigned to current user from job_orders
- [x] Job list UI showing today's jobs
- [x] Job card shows checklist progress (e.g., "3/5 photos")
- [x] Job detail page with stage cards
- [x] Stage cards show: status, required count, completion
- [x] "Start Capture" button per stage
- [x] Lock job_end until job_start complete

### v0.3 Guided Capture Flow ✅
- [x] Create photo_checklists table with seed data (applied via Supabase MCP)
- [x] Load checklist items for selected stage
- [x] Step indicator (Step 1 of 5)
- [x] Instruction display with tips
- [x] Capture button (placeholder, actual camera in v0.4)
- [x] Preview screen with confirm/retake
- [x] Progress tracking per job
- [x] Handle required vs optional items

### v0.4 Real Camera + GPS Integration ✅
- [x] Camera access with getUserMedia API
- [x] Front/back camera switching
- [x] Photo capture to blob
- [x] Image resizing (max 2048px)
- [x] GPS integration with 5-second timeout
- [x] Camera permission error handling
- [x] Stream interruption handling
- [x] Fallback to file picker

### v0.5 Photo Upload + Offline Sync (Next)
- [ ] Upload photos to Supabase Storage
- [ ] Create shipment_photos records
- [ ] Background sync when online
- [ ] Queue management UI
- [ ] Retry failed uploads

## Recent Changes
- 2026-01-31: v0.4 Real Camera Complete - getUserMedia, camera switching, GPS, 1235 tests, 131 property tests
- 2026-01-31: v0.3 Guided Capture Complete - Full capture flow with 793 tests, 14 property tests, IndexedDB persistence
- 2026-01-31: v0.3 Spec Complete - design.md and tasks.md with 13 correctness properties, 12 implementation tasks
- 2026-01-31: v0.2.1 Database Types - Manual types/database.ts for type-safe Supabase queries
- 2026-01-31: v0.2 Job Selection Complete - Job list, job detail, stage cards, stage locking, 131 tests
- 2026-01-31: Database migration applied - photo_checklists, shipment_photos, photo_upload_queue tables
- 2026-01-31: Pivot to guided capture model (Zipcar-style) - Updated steering files and specs
- 2026-01-31: v0.1 Foundation Complete - Full app shell, auth, PWA foundation, 116 tests passing
See `CHANGELOG.md` for detailed version history.

---

## DO NOT
- ❌ Create separate Supabase project (use GAMA ERP's)
- ❌ Implement own auth (use shared Supabase Auth)
- ❌ Store photos in IndexedDB permanently (only for queue)
- ❌ Skip offline support (critical for field use)
- ❌ Upload full-resolution images (resize to max 2048px)
- ❌ Hard delete photos (use soft delete)
- ❌ Build free-form "take any photo" capture
- ❌ Prioritize gallery/album view (later phase)
- ❌ Skip required photos in checklist flow
- ❌ Allow job_end capture before job_start complete

## Quick References
- **GAMA ERP Repo**: https://github.com/odnamta/Gama-ERP
- **Supabase Dashboard**: https://supabase.com/dashboard/project/ljbkjtaowrdddvjhsygj
- **PRD Document**: `.kiro/steering/GAMA_PHOTO_CAPTURE_PRD.md`

---
*Last Updated: January 2026*

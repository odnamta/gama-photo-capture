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

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL) - shared with GAMA ERP
- **Auth**: Supabase Auth (same as GAMA ERP)
- **Styling**: TailwindCSS + shadcn/ui (new-york theme)
- **Offline Storage**: IndexedDB via Dexie.js
- **PWA**: next-pwa
- **Deployment**: Vercel

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
- `shipment_photos` - Photo metadata and storage references
- `photo_upload_queue` - Offline sync tracking
- `photo_tags` - Flexible categorization

## User Roles (from GAMA ERP)
| Role | Access Level |
|------|--------------|
| `owner` | Full access |
| `director` | Full access |
| `operations_manager` | View all, capture for assigned |
| `ops` / `operations` | Capture for assigned jobs |
| `engineer` | Capture survey photos |

## Key Workflows

### Photo Capture Flow
```
1. User opens app → Auto-login (Supabase session)
2. Select job order (or scan barcode)
3. Choose photo type (before/after/damage/document/survey)
4. Capture photo → Camera API
5. Preview → Confirm or retake
6. Save to queue → IndexedDB
7. Upload in background → Supabase Storage
8. Link metadata → shipment_photos table
```

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
| `before` | Pre-shipment cargo condition |
| `after` | Post-delivery confirmation |
| `damage` | Any damage documentation |
| `document` | Permits, receipts, paperwork |
| `survey` | Site/route surveys (engineering) |
| `other` | Miscellaneous |

## Storage Structure
```
Supabase Storage Bucket: shipment-photos
Path: {user_id}/{year}/{month}/{job_order_id}/{photo_type}/{timestamp}_{uuid}.jpg

Example:
shipment-photos/abc123-user-id/2026/01/jo-uuid/before/1706745600_xyz789.jpg
```

## Current State (January 2026)
- **Status**: v0.1 Foundation Complete ✅
- **Phase**: Development
- **Dependencies**: GAMA ERP v1.0 launch (March 12, 2026)
- **Planned Start**: April 2026

## Active Sprint Tasks
- [x] Project setup (Next.js 15, TypeScript, Tailwind)
- [x] Supabase integration (reuse GAMA ERP config)
- [x] Authentication with Google OAuth
- [x] Role-based access control
- [x] App shell (header, bottom nav, layout)
- [x] All main routes with placeholders
- [x] PWA manifest and service worker
- [x] Database schema documentation
- [ ] Create shipment_photos table with RLS (run migration in Supabase)
- [ ] Camera capture component
- [ ] Offline storage with Dexie.js

## Recent Changes
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

## Quick References
- **GAMA ERP Repo**: https://github.com/odnamta/Gama-ERP
- **Supabase Dashboard**: https://supabase.com/dashboard/project/ljbkjtaowrdddvjhsygj
- **PRD Document**: `/docs/GAMA_PHOTO_CAPTURE_PRD.md`

---
*Last Updated: January 2026*

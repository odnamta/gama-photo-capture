# GAMA Photo Capture - Satellite App

> **Part of**: `gama/` ecosystem (see `gama/CLAUDE.md`)

## Overview
- **Type**: Progressive Web App (PWA) — satellite app for GIS-ERP
- **Purpose**: Field photo capture for logistics (guided checklist, not free-form)
- **Users**: Operations staff, engineers, drivers
- **Status**: v0.5 complete (photo upload + offline sync)

## Tech Stack
- Next.js 16 (App Router) + TypeScript (strict)
- Supabase (shared with GIS-ERP: `ljbkjtaowrdddvjhsygj`)
- TailwindCSS + shadcn/ui + Dexie.js (IndexedDB) + next-pwa
- Dev port: 3001 | Production: foto.gama.co.id

## Key Commands
```bash
npm run dev              # Dev server (localhost:3001)
npm run build            # Production build
npm run build && npm run start  # Test PWA locally
```

## App Model: Guided Capture (Zipcar-Style)
- Step-by-step photo checklists per job stage
- Required photos must be taken before proceeding
- Stages: `job_start` (4 required) → `in_transit` (0 required) → `job_end` (3 required)
- `job_end` locked until `job_start` complete

## Shared with GIS-ERP
- Same Supabase project and auth
- Reads: `job_orders`, `user_profiles`, `customers`
- Owns: `photo_checklists`, `shipment_photos`, `photo_upload_queue`

## Offline Sync
Photos captured offline → IndexedDB → background sync when online → Supabase Storage.
Queue managed via `photo_upload_queue` table.

## DO NOT
- Create separate Supabase project (use GIS-ERP's)
- Implement own auth (use shared Supabase Auth)
- Store photos permanently in IndexedDB (queue only)
- Upload full-resolution images (resize to max 2048px)
- Build free-form photo capture (guided checklists only)
- Skip required photos in checklist flow

## External References
- GitHub: `odnamta/gama-photo-capture`
- Supabase: `ljbkjtaowrdddvjhsygj` (shared with GIS-ERP)

# Changelog

All notable changes to GAMA Photo Capture will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### 🎯 Planned
- Camera capture component
- Offline storage with Dexie.js
- Full PWA configuration

---

## [0.1.0] - 2026-01-31 - Foundation Complete ✅

### ✨ Features
- Next.js 16 project with TypeScript strict mode, TailwindCSS, shadcn/ui (new-york theme)
- Supabase client configuration (server + client) with environment variable validation
- Google OAuth authentication with Supabase Auth
- Role-based access control (owner, director, operations_manager, operations, ops, engineer)
- Protected route middleware with URL preservation for post-login redirect
- Login page with Google OAuth sign-in
- Access denied page for unauthorized roles
- App shell components (OfflineIndicator, AppHeader, BottomNav, AppLayout)
- All main routes with placeholder pages (Camera, Jobs, Gallery, Queue, Settings)
- PWA manifest with icons and service worker registration
- Database schema documentation (SQL migration, storage bucket docs, TypeScript types)

### 🎨 UI/UX
- Bottom navigation with 5 tabs (Camera, Jobs, Gallery, Queue, Settings)
- Fixed header with offline indicator and queue count badge
- Responsive app layout with proper spacing for fixed elements

### 📦 Dependencies
- @supabase/supabase-js, @supabase/ssr for Supabase integration
- fast-check for property-based testing
- vitest for unit testing
- lucide-react for icons

### 🧪 Tests
- 116 tests passing across 9 test files
- Property tests for environment validation, authentication, role verification, UI components
- Unit tests for routes, PWA configuration, project setup

### 📝 Documentation
- Database migration SQL: `docs/database/001_photo_capture_schema.sql`
- Storage bucket guide: `docs/database/002_storage_bucket.md`
- TypeScript types: `types/photo.ts`

---

## [0.0.1] - 2026-01-31 - Project Initialization

### ✨ Features
- Initial project structure created
- Kiro agent steering files configured
- PRD document completed

### 📝 Documentation
- Created `.kiro/steering/general.md` - Code conventions
- Created `.kiro/steering/project-context.md` - Project overview
- Created `.kiro/steering/database-schema.md` - Schema reference
- Created `.kiro/steering/formatting-standards.md` - Date/currency formatting
- Created `.kiro/hooks/update-project-context.md` - Auto-documentation hook
- Created `.kiro/hooks/update-database-schema.md` - Schema sync hook
- Created `CHANGELOG.md` - Version history tracking

---

## Version History Guidelines

### Version Numbering: v0.X.Y

| Segment | Meaning | Example |
|---------|---------|---------|
| **0** | Pre-1.0 (development) | v0.x.x |
| **X** | Major feature/module | v0.1 → v0.2 (new module) |
| **Y** | Sub-feature/enhancement | v0.1.0 → v0.1.1 (enhancement) |

### Changelog Entry Format

```markdown
## [X.X.X] - YYYY-MM-DD - [Title]

### ✨ Features
- New feature description

### 🐛 Bug Fixes
- Fixed [issue] that caused [problem]

### 🔧 Improvements
- Improved [area] for better [outcome]

### 📦 Dependencies
- Added/Updated [package] for [reason]

### ⚠️ Breaking Changes
- [Description of breaking change]

### 🗑️ Deprecated
- [Feature] is deprecated in favor of [replacement]

### 📝 Documentation
- Updated [document] with [changes]
```

### Emoji Reference

| Emoji | Category |
|-------|----------|
| ✨ | Features |
| 🐛 | Bug Fixes |
| 🔧 | Improvements |
| 📦 | Dependencies |
| ⚠️ | Breaking Changes |
| 🗑️ | Deprecated |
| 📝 | Documentation |
| 🚀 | Performance |
| 🔒 | Security |
| ♻️ | Refactor |
| 🎨 | UI/UX |
| 🧪 | Tests |

---

## Planned Milestones

### v0.1.0 - Foundation (Week 1-2) ✅
- [x] Project setup
- [x] Authentication integration
- [x] App shell with navigation
- [x] Database tables documented (run migration manually)

### v0.2.0 - Job Selection (Week 3)
- [ ] Jobs API endpoints
- [ ] Job list page
- [ ] Job selection context
- [ ] Search/filter

### v0.3.0 - Camera Capture (Week 4-5)
- [ ] Camera access component
- [ ] GPS capture
- [ ] Photo type selector
- [ ] Preview and confirm flow

### v0.4.0 - Gallery (Week 6)
- [ ] Photo gallery page
- [ ] Photo detail view
- [ ] Delete functionality

### v0.5.0 - Offline Support (Week 7-8)
- [ ] IndexedDB setup
- [ ] Offline photo capture
- [ ] Background sync
- [ ] Queue management UI

### v0.6.0 - PWA & Polish (Week 9-10)
- [ ] PWA manifest
- [ ] Service worker
- [ ] Install prompt
- [ ] Settings page
- [ ] Performance optimization

### v1.0.0 - Production Release
- [ ] All features complete
- [ ] Testing completed
- [ ] Documentation finalized
- [ ] Deployed to production

---

*This changelog is maintained by the Kiro agent hook `update-project-context`.*

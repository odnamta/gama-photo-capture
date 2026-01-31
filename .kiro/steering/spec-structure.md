---
inclusion: optional
---
# Spec Folder Structure & Naming Convention

> Guidelines for organizing feature specifications in the `.kiro/specs/` directory.

---

## Folder Naming Convention: v0.X.Y

```
.kiro/specs/
├── v0.1-foundation/                    # Major feature: Foundation
├── v0.2-job-selection/                 # Major feature: Job Selection
├── v0.3-camera-capture/                # Major feature: Camera Capture
├── v0.3.1-camera-permissions/          # Sub-feature of Camera
├── v0.3.2-gps-capture/                 # Sub-feature of Camera
├── v0.4-gallery/                       # Major feature: Gallery
├── v0.4.1-photo-viewer/                # Sub-feature of Gallery
├── v0.5-offline-support/               # Major feature: Offline
├── v0.5.1-sync-queue/                  # Sub-feature of Offline
├── v0.5.2-conflict-resolution/         # Sub-feature of Offline
├── v0.6-pwa-polish/                    # Major feature: PWA
└── v1.0-release/                       # Release milestone
```

---

## Version Numbering Rules

| Pattern | When to Use | Example |
|---------|-------------|---------|
| `v0.X` | New major feature/module | `v0.3-camera-capture` |
| `v0.X.Y` | Sub-feature, enhancement, or branch | `v0.3.1-camera-permissions` |
| `v0.X.Y.Z` | Patch, hotfix, or iteration | `v0.3.1.1-ios-camera-fix` |
| `vX.0` | Major release milestone | `v1.0-release` |

### Guidelines

1. **Sequential Major Numbers**: Increment X for each new major feature
2. **Descriptive Suffix**: Always include a kebab-case description
3. **Sub-features Follow Parent**: v0.3.1 must relate to v0.3's scope
4. **No Gaps**: Don't skip version numbers (v0.1, v0.2, v0.3... not v0.1, v0.5)

---

## Folder Contents

Each spec folder should contain:

```
v0.3-camera-capture/
├── requirements.md       # Feature requirements (what)
├── design.md             # Technical design (how)
├── tasks.md              # Implementation tasks (who/when)
├── tests.md              # Test cases (verify)
└── notes.md              # Additional notes, decisions, links
```

### Minimum Required Files

| File | Required | Purpose |
|------|----------|---------|
| `requirements.md` | ✅ Yes | User stories, acceptance criteria |
| `design.md` | ✅ Yes | Technical approach, architecture |
| `tasks.md` | ⚠️ Optional | Task breakdown for implementation |
| `tests.md` | ⚠️ Optional | Test cases, QA checklist |
| `notes.md` | ⚠️ Optional | Meeting notes, decisions |

---

## File Templates

### requirements.md
```markdown
# [Feature Name] - Requirements

## Overview
Brief description of the feature.

## User Stories
- As a [role], I want to [action] so that [benefit]

## Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2

## Out of Scope
- Item not included in this version

## Dependencies
- Depends on v0.X (other feature)
```

### design.md
```markdown
# [Feature Name] - Technical Design

## Overview
Technical approach summary.

## Architecture
Diagrams, component structure.

## Database Changes
New tables, columns, migrations.

## API Endpoints
New or modified endpoints.

## Components
New UI components needed.

## Security Considerations
Auth, RLS, permissions.

## Performance Considerations
Caching, optimization needs.
```

### tasks.md
```markdown
# [Feature Name] - Implementation Tasks

## Phase 1: [Phase Name]
- [ ] Task 1 (Est: 2h)
- [ ] Task 2 (Est: 1h)

## Phase 2: [Phase Name]
- [ ] Task 3 (Est: 3h)

## Total Estimate: Xh
```

---

## Photo Capture App Spec Structure

```
.kiro/specs/
│
├── v0.1-foundation/
│   ├── requirements.md     # Project setup, auth, navigation
│   ├── design.md           # Tech stack, file structure
│   └── tasks.md            # Setup tasks
│
├── v0.2-job-selection/
│   ├── requirements.md     # Job list, search, selection
│   ├── design.md           # API design, caching
│   └── tasks.md            # Implementation tasks
│
├── v0.3-camera-capture/
│   ├── requirements.md     # Camera access, capture, preview
│   ├── design.md           # Camera API, image processing
│   └── tasks.md            # Camera implementation
│
├── v0.3.1-camera-permissions/
│   ├── requirements.md     # Permission handling edge cases
│   └── design.md           # Permission UX flows
│
├── v0.3.2-gps-capture/
│   ├── requirements.md     # Location capture requirements
│   └── design.md           # Geolocation API usage
│
├── v0.4-gallery/
│   ├── requirements.md     # Gallery view, photo detail
│   ├── design.md           # Grid layout, lazy loading
│   └── tasks.md            # Gallery tasks
│
├── v0.4.1-photo-viewer/
│   ├── requirements.md     # Full-screen view, zoom
│   └── design.md           # Touch gestures, performance
│
├── v0.5-offline-support/
│   ├── requirements.md     # Offline capture, sync
│   ├── design.md           # IndexedDB schema, sync logic
│   ├── tasks.md            # Offline implementation
│   └── tests.md            # Offline test scenarios
│
├── v0.5.1-sync-queue/
│   ├── requirements.md     # Queue management UI
│   └── design.md           # Queue state machine
│
├── v0.5.2-conflict-resolution/
│   ├── requirements.md     # Sync conflict handling
│   └── design.md           # Resolution strategies
│
├── v0.6-pwa-polish/
│   ├── requirements.md     # PWA features, install
│   ├── design.md           # Service worker, manifest
│   └── tasks.md            # PWA tasks
│
└── v1.0-release/
    ├── requirements.md     # Release criteria
    ├── checklist.md        # Launch checklist
    └── notes.md            # Release notes draft
```

---

## Best Practices

### 1. Create Spec Before Coding
Always create the spec folder before starting implementation. This ensures clear requirements and design decisions are documented.

### 2. Keep Specs Updated
Update the spec files as requirements evolve during implementation. Mark changes with dates.

### 3. Link Related Specs
Reference related specs in the requirements:
```markdown
## Dependencies
- Requires [v0.3-camera-capture](../v0.3-camera-capture/requirements.md)
```

### 4. Use Consistent Formatting
Follow the templates to maintain consistency across all specs.

### 5. Include Kiro Context
At the top of `requirements.md`, include context for Kiro:
```markdown
---
kiro_context: true
---
```

### 6. Archive Completed Specs
Don't delete completed specs. They serve as documentation and decision history.

---

## Cross-Referencing with GAMA ERP

Since Photo Capture is a satellite app, some specs may reference GAMA ERP:

```markdown
## Integration Points
- Uses shared auth from GAMA ERP (see [GAMA-ERP/.kiro/specs/v0.3-authentication])
- Links to job_orders table (see [GAMA-ERP database-schema.md])
```

---

## Automated Spec Management

The Kiro hooks can help maintain specs:

1. **update-project-context**: Links new specs to project context
2. **update-database-schema**: Syncs database changes from design.md

---
*Last Updated: January 2026*

# Changelog - AG Dental Lab

All notable project changes are summarized here for future handoff.

---

## 2026-07 - Tracking IDs, Storage, Per‑Stage Images, Performance

### Added

- Public **tracking‑ID** system (`AG‑XXXXXX`): public tracking now searches by tracking ID instead of patient name; each `PatientCase` has a unique `trackingId`.
- **Category → case type taxonomy** (`src/lib/case-types.ts`); the admin case form constrains case type to the selected category.
- **Estimated completion time**: `estimatedCompletionDate` now captures date and time; admin form has a time picker and Track/admin display both.
- **Per‑stage case images**: `CaseImage.stage` column (migration `add_case_image_stage`, backfilled); admin tags uploads with the current stage; the public Track Case step indicator is clickable to view each stage's images.
- **Working object storage**: Supabase Storage (S3‑compatible) presigned uploads configured; a placeholder‑detection guard makes unconfigured storage return a clear 503.
- **Completed‑case Archive**: completed cases are excluded from All Cases and shown only in the Archive.
- Dark glassmorphism theme across landing, Track Case, and login; glassmorphism footer; account dropdown with sign‑out confirmation.
- Committed Prisma migrations; the build runs `prisma migrate deploy` so migrations auto‑apply on Vercel.

### Changed

- **Dashboard performance**: replaced five `count()` queries with one `groupBy`, and added a count‑free recent‑cases query (dashboard DB work 7 → 2 logical queries).
- **Caching**: dashboard counts cached ~30s via `unstable_cache` (tag `cases`), revalidated on case writes; public tracking made explicitly always‑fresh (removed the Redis wrapper on tracking search).
- Vercel region set to `sin1` to co‑locate with the Supabase database region.

### Verified

- `npm.cmd run typecheck` passes.
- `npm.cmd run build` passes.
- Feature flows verified in a real browser (uploads, per‑stage viewing, archive move, cache invalidation).

---

## Current State - UI/Branding Polish Complete

### Added

- Official AG Dental Lab logo asset.
- Official icon asset.
- Favicon.
- Apple touch icon.
- Open Graph image.
- Brand palette based on official logo.
- Shared brand tokens in Tailwind and global CSS.
- Designed empty states for admin cases and public tracking.
- Table skeleton rows for admin case loading state.
- Polished progress timeline card entries.
- Polished admin shell surfaces.
- Public tracking pre-search state.
- Login page brand treatment.

### Changed

- Replaced generic branding with official AG Dental Lab branding.
- Updated navbar with glass effect and responsive mobile menu.
- Redesigned hero section around the official logo.
- Improved about section timeline/counters.
- Improved services cards and category chips.
- Improved mission/vision panels.
- Improved work gallery placeholder grid.
- Completed and polished Why Choose Us section.
- Completed and polished Contact section.
- Completed and polished Footer.
- Refined shared UI components:
  - Button
  - Card
  - Badge
  - Dialog
  - Dropdown menu
  - Input
  - Select
  - Textarea
  - Skeleton
- Refined Framer Motion reveal timing.
- Improved admin dashboard cards and recent cases list.
- Improved admin cases table, filters, loading state, and empty state.
- Improved case detail layout and responsive stacking.
- Improved progress manager and image manager surfaces.
- Improved status stepper mobile behavior.
- Improved public tracking result layout.
- Cleaned visible encoding artifacts in UI copy.
- Fixed Tailwind opacity classes that prevented production build.

### Verified

- `npm.cmd run typecheck` passes.
- `npm.cmd run lint` passes.
- `npm.cmd run build` passes.

### Known Warnings

- Sentry/OpenTelemetry may print non-blocking dynamic dependency warnings during build.
- Prisma warns that `package.json#prisma` config is deprecated for Prisma 7.
- Next.js warns that `next lint` is deprecated before Next.js 16.

---

## Original Implemented Product

### Added

- Next.js 15 App Router application.
- PostgreSQL/Supabase schema with Prisma.
- Auth.js / NextAuth v5 credentials auth.
- Single admin account seed flow.
- Protected admin dashboard.
- Case CRUD.
- Case status lifecycle.
- Case progress manager.
- Case image metadata and upload flow.
- Public tracking by patient full name.
- Public health endpoint.
- Rate limiting and cache helpers.
- S3/R2 upload helpers.
- Sentry config.
- Docker and Vercel deployment support.

---

## Next Planned Changes

- QR/share tracking links.
- Better duplicate-name handling.
- Admin reporting/analytics.
- Admin-managed landing portfolio images.
- Image ordering/captions.
- ESLint CLI migration for Next.js 16 readiness.
- Prisma config migration for Prisma 7 readiness.

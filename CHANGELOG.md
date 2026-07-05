# Changelog - AG Dental Lab

All notable project changes are summarized here for future handoff.

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

- Category to case type dependency.
- Tracking ID system.
- QR/share tracking links.
- Better duplicate-name handling.
- Admin reporting/analytics.
- Admin-managed landing portfolio images.
- Image ordering/captions.
- ESLint CLI migration for Next.js 16 readiness.
- Prisma config migration for Prisma 7 readiness.

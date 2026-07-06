# Architecture - AG Dental Lab

This document describes the current application architecture so future work can continue without prior chat history.

---

## Overview

AG Dental Lab is a single Next.js 15 application that serves:

- A public marketing landing page.
- A public dental case tracking page.
- A protected admin dashboard.
- Authenticated admin APIs.
- Public tracking and health APIs.

The app uses PostgreSQL through Prisma on Supabase and is deployed on Vercel (region `sin1`, co‑located with the database region). Object storage is Supabase Storage (S3‑compatible). Upstash Redis and Sentry are optional.

---

## Runtime Architecture

```text
Browser
  |
  |-- Public pages
  |     |-- /
  |     |-- /track
  |     |-- /login
  |
  |-- Protected pages
  |     |-- /admin
  |     |-- /admin/cases
  |     |-- /admin/cases/[id]
  |
  |-- API routes
        |-- /api/track
        |-- /api/health
        |-- /api/auth/[...nextauth]
        |-- /api/admin/*
              |
              |-- Prisma ORM
                    |
                    |-- PostgreSQL/Supabase
```

---

## Data Model

Defined in `prisma/schema.prisma`.

### Admin

Single admin account.

Fields:

- `id`
- `email`
- `passwordHash`
- `name`
- `createdAt`
- `updatedAt`

### PatientCase

Main dental case record.

Fields:

- `id`
- `trackingId` (unique public tracking code, e.g. `AG-8F3K2A`)
- `patientFirstName`
- `patientLastName`
- `patientFullNameNorm`
- `doctorName`
- `caseType`
- `category`
- `currentStatus`
- `estimatedCompletionDate` (`DateTime` — stores both date and time)
- `notes`
- `createdAt`
- `updatedAt`

Relations:

- `progress`
- `images`

### CaseProgress

Production timeline step.

Fields:

- `id`
- `caseId`
- `stepTitle`
- `description`
- `completed`
- `order`
- `createdAt`
- `updatedAt`

### CaseImage

Case image metadata.

Fields:

- `id`
- `caseId`
- `imageUrl`
- `key`
- `caption`
- `stage` (nullable `CaseStatus` — which lifecycle stage the image documents)
- `createdAt`

Image files live in Supabase Storage (S3‑compatible). The database stores the public URL and object key. New uploads are tagged with the case's current stage, and the public Track Case page shows images per stage. Indexed on `caseId` and `[caseId, stage]`.

---

## Status and Category Enums

### CaseStatus

- `RECEIVED`
- `IN_PROGRESS`
- `PRODUCTION`
- `COMPLETED`

### CaseCategory

- `IMPLANT`
- `C_AND_B`
- `PRESSABLE_CERAMIC`
- `VACUUM_FORMER`
- `SPECIAL_TRAY`
- `RESIN_MODEL`
- `EXTERNAL_LABORATORY_SERVICES`
- `DENTAL_EQUIPMENT`
- `GYPSUM_MODEL`
- `FLEX_DENTURE`

Allowed case types per category are defined in `src/lib/case-types.ts`; the admin case form constrains case type to the selected category.

---

## Authentication

Files:

- `src/auth.config.ts`
- `src/auth.ts`
- `src/middleware.ts`
- `src/app/login/page.tsx`
- `src/components/admin/login-form.tsx`

Auth uses Auth.js / NextAuth v5 with credentials.

Login flow:

1. Admin enters email and password at `/login`.
2. Credentials provider validates form data with Zod.
3. Prisma looks up `Admin` by lowercased email.
4. bcrypt compares the provided password with `passwordHash`.
5. JWT session is created with `role = admin`.
6. Middleware protects `/admin`.

Admin credentials are seeded from `.env` by `prisma/seed.ts`.

---

## API Architecture

### Public APIs

`GET /api/health`

- Health check.

`GET /api/track`

- Searches a case by its public tracking ID (`AG-XXXXXX`).
- Returns a sanitized public DTO (status, doctor, case type, category, estimated completion date+time, notes, progress timeline, and per‑stage images).
- Does not expose internal IDs.
- IP rate limited when Upstash is configured.
- Always served fresh (not cached) so patients see real‑time status.

### Admin APIs

All admin APIs require authenticated admin session.

`GET /api/admin/cases`

- List, search, filter, paginate.
- Default ("All Cases") excludes `COMPLETED`; `?archived=true` returns `COMPLETED` only (the Archive view).

`POST /api/admin/cases`

- Create case.

`GET /api/admin/cases/[id]`

- Fetch one case with progress/images.

`PATCH /api/admin/cases/[id]`

- Update case.

`DELETE /api/admin/cases/[id]`

- Delete case.

`POST /api/admin/cases/[id]/progress`

- Add progress step.

`PATCH /api/admin/cases/[id]/progress/[progressId]`

- Update progress step.

`DELETE /api/admin/cases/[id]/progress/[progressId]`

- Delete progress step.

`POST /api/admin/upload`

- Return a presigned upload URL. Returns a clear 503 when storage is not configured (placeholder `S3_*` values are treated as unconfigured).

`POST /api/admin/cases/[id]/images`

- Persist uploaded image metadata.

`DELETE /api/admin/cases/[id]/images/[imageId]`

- Delete image metadata and storage object when possible.

---

## Frontend Architecture

### Landing

Files in `src/components/landing/`:

- `hero.tsx`
- `about.tsx`
- `services.tsx`
- `mission-vision.tsx`
- `work-gallery.tsx`
- `why-us.tsx`
- `contact.tsx`

Site chrome:

- `src/components/site/navbar.tsx`
- `src/components/site/footer.tsx`

Brand:

- `src/components/brand/logo.tsx`

### Admin

Files in `src/components/admin/`:

- `sidebar.tsx`
- `mobile-topbar.tsx`
- `cases-client.tsx`
- `case-detail-client.tsx`
- `case-form-dialog.tsx`
- `progress-manager.tsx`
- `image-manager.tsx`
- `login-form.tsx`
- `confirm-dialog.tsx`

Admin state:

- `src/store/admin-ui.ts`

Admin data hooks:

- `src/hooks/use-cases.ts`
- `src/hooks/use-progress.ts`

### Tracking

Files:

- `src/app/track/page.tsx`
- `src/components/track/track-client.tsx`

Shared case UI:

- `src/components/case/status-badge.tsx`
- `src/components/case/status-stepper.tsx`
- `src/components/case/progress-timeline.tsx`

---

## Design System

Tailwind config:

- `tailwind.config.ts`

Global tokens:

- `src/app/globals.css`

Primary brand:

- `#275F4D`

Dark ink:

- `#121816`

Shared component classes:

- `glass`
- `glass-dark`
- `container-tight`
- `text-gradient`
- `section-eyebrow`
- `premium-panel`

Shared primitives:

- `Button`
- `Card`
- `Badge`
- `Dialog`
- `DropdownMenu`
- `Input`
- `Select`
- `Textarea`
- `Skeleton`

Motion:

- `src/components/motion/reveal.tsx`
- `src/components/motion/counter.tsx`

Reduced-motion CSS is included globally.

---

## SEO and Metadata

Files:

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/manifest.ts`
- `src/app/robots.ts`
- `src/app/sitemap.ts`

Assets:

- `public/favicon.svg`
- `public/apple-icon.png`
- `public/og-image.png`
- `public/ag-dental-lab-logo.png`
- `public/ag-dental-lab-icon.png`

Implemented:

- Canonical metadata.
- Open Graph/Twitter metadata.
- Manifest.
- Robots.
- Sitemap.
- JSON-LD on the landing page.

---

## External Services

### Supabase PostgreSQL

Required for production.

### Upstash Redis

Optional. Used for IP rate limiting. If unset, the app falls back gracefully. Public tracking is intentionally not cached, so freshness does not depend on Redis.

### Supabase Storage (S3‑compatible)

Configured and in use for case image uploads via presigned `PUT`. Also compatible with Cloudflare R2 / AWS S3 by swapping the `S3_*` variables. Placeholder values are detected and treated as "not configured," so uploads fail with a clear 503 instead of a confusing error.

### Sentry

Optional monitoring. If variables are blank, it is effectively disabled.

---

## Important Constraints for Future Development

- Preserve existing backend behavior unless explicitly requested.
- Change the Prisma schema only via committed migrations (`prisma migrate deploy` runs during the Vercel build).
- Do not change auth/session behavior casually.
- Continue using existing UI primitives and brand tokens.
- Keep new UI consistent with the current official AG Dental Lab dark‑theme style.
- Public tracking searches by tracking ID, avoids exposing internal case IDs, and must remain fresh/uncached.
- Dashboard counts are cached with `unstable_cache` (tag `cases`); any new write path that changes case counts should call `revalidateTag("cases")`.

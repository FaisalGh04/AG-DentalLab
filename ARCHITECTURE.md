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

The app uses PostgreSQL through Prisma and is designed for Supabase. It supports optional Upstash Redis, Cloudflare R2/AWS S3, and Sentry.

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
- `patientFirstName`
- `patientLastName`
- `patientFullNameNorm`
- `doctorName`
- `caseType`
- `category`
- `currentStatus`
- `estimatedCompletionDate`
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
- `createdAt`

Image files live in R2/S3. The database stores URLs and object keys.

---

## Status and Category Enums

### CaseStatus

- `RECEIVED`
- `IN_PROGRESS`
- `PRODUCTION`
- `COMPLETED`

### CaseCategory

- `FIXED_RESTORATIONS`
- `IMPLANT_SOLUTIONS`
- `ORAL_APPLIANCES`
- `DIGITAL_DENTISTRY`

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

- Searches cases by patient full name.
- Returns sanitized public DTO.
- Does not expose internal IDs.
- Uses rate limiting/cache when Upstash is configured.

### Admin APIs

All admin APIs require authenticated admin session.

`GET /api/admin/cases`

- List, search, filter, paginate.

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

- Return presigned upload URL when storage is configured.

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

Optional. Used for:

- Rate limiting.
- Public tracking cache.

If unset, app falls back gracefully.

### Cloudflare R2 / AWS S3

Optional. Used for:

- Case image upload storage.

If unset, image upload returns a clear storage configuration error.

### Sentry

Optional monitoring. If variables are blank, it is effectively disabled.

---

## Important Constraints for Future Development

- Preserve existing backend behavior unless explicitly requested.
- Do not change Prisma schema casually.
- Do not change auth/session behavior casually.
- Continue using existing UI primitives and brand tokens.
- Keep new UI consistent with the current official AG Dental Lab style.
- Public tracking currently avoids exposing internal case IDs.
- Any tracking ID feature should be designed intentionally before changing public API behavior.

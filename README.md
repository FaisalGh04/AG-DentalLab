# AG Dental Lab

Production-ready company website and dental case tracking system for AG Dental Lab.

The application is complete from a backend, database, authentication, admin, and tracking perspective. The most recent work focused on UI/UX refinement, official branding, shared design tokens, and visual polish across the landing page, admin dashboard, login, and public tracking experience.

Current completion: **95%**

Remaining work is optional product refinement, not core implementation.

---

## Current Project Status

### Completed

- Official AG Dental Lab logo integrated across the app.
- Transparent logo padding removed and production assets added under `public/`.
- Brand palette created from the official logo.
- Global Tailwind/theme tokens updated.
- Landing page fully redesigned and polished.
- Navbar, hero, about, services, mission/vision, portfolio, why-us, contact, and footer updated.
- Shared UI components redesigned: buttons, cards, forms, dialogs, menus, badges, inputs, selects, skeletons, focus states, shadows, hover states.
- Admin dashboard UI polished.
- Case management UI polished.
- Public case tracking UI polished.
- Login page UI polished.
- Loading states, empty states, table skeletons, badges, and progress timeline improved.
- Metadata, manifest, favicon, Apple icon, Open Graph image, and SEO assets updated.
- TypeScript, lint, and production build pass.

### Pending

- Category to case type dependency in the admin case form.
- Tracking ID system as an alternative to patient-name lookup.
- Optional final visual QA on real mobile devices.
- Optional admin analytics/reporting enhancements.
- Optional richer portfolio image management for landing page work samples.
- Optional storage configuration for production image uploads if Cloudflare R2/AWS S3 is not yet configured.

---

## Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 App Router + TypeScript |
| Styling | Tailwind CSS + shadcn-style Radix primitives + Framer Motion |
| Data client | TanStack React Query + Zustand |
| Backend | Next.js Route Handlers |
| Database | PostgreSQL, intended for Supabase |
| ORM | Prisma |
| Auth | Auth.js / NextAuth v5 credentials provider, single admin |
| Storage | Cloudflare R2 or AWS S3 presigned uploads |
| Cache/rate limit | Upstash Redis, graceful fallback when unset |
| Validation | Zod + React Hook Form |
| Monitoring | Sentry optional |
| Deploy | Vercel primary, Docker supported |

---

## Implemented Features

### Landing Page

- Premium animated marketing homepage.
- Sections: navbar, hero, about/story, services, mission/vision, work gallery, why choose us, contact, footer.
- Official logo used in navbar, hero, shared logo component, metadata, manifest, favicon, Apple icon, and Open Graph image.
- Responsive layout across mobile, tablet, and desktop.
- Framer Motion reveal animations and counters.
- SEO metadata, sitemap, robots, JSON-LD, manifest, and social preview image.

### Admin Dashboard

- Protected `/admin` dashboard.
- Status overview cards for total, received, in progress, production, and completed cases.
- Recent cases list.
- Branded admin shell, sidebar, mobile topbar, and responsive layout.
- Empty states and improved elevation/spacing.

### Case Management

- Protected `/admin/cases` list.
- Search by patient, doctor, or case type.
- Filter by status and category.
- Pagination.
- Create, edit, delete cases.
- Case detail page with status selector, status stepper, notes, case metadata, progress manager, and image manager.
- Progress steps can be added, completed/uncompleted, or deleted.
- Image upload UI is implemented; storage requires S3/R2 environment configuration.

### Tracking System

- Public `/track` page.
- Search by patient full name.
- Sanitized public result DTO with no internal IDs.
- Shows status, doctor, case type, category, estimated completion, notes, and production timeline.
- Initial empty state, error state, and animated result state.

### Authentication

- Single admin account.
- Credentials login via `/login`.
- Admin routes protected by middleware.
- Passwords stored as bcrypt hashes in PostgreSQL.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env` are applied when running `npm.cmd run db:seed`.

### Database

- PostgreSQL database via Prisma.
- Models:
  - `Admin`
  - `PatientCase`
  - `CaseProgress`
  - `CaseImage`
- Enums:
  - `CaseStatus`: `RECEIVED`, `IN_PROGRESS`, `PRODUCTION`, `COMPLETED`
  - `CaseCategory`: `FIXED_RESTORATIONS`, `IMPLANT_SOLUTIONS`, `ORAL_APPLIANCES`, `DIGITAL_DENTISTRY`
- Indexes for public name search and admin list performance.

### API Architecture

- Public:
  - `GET /api/track`
  - `GET /api/health`
- Auth:
  - `/api/auth/[...nextauth]`
- Admin:
  - `/api/admin/cases`
  - `/api/admin/cases/[id]`
  - `/api/admin/cases/[id]/progress`
  - `/api/admin/cases/[id]/progress/[progressId]`
  - `/api/admin/cases/[id]/images`
  - `/api/admin/cases/[id]/images/[imageId]`
  - `/api/admin/upload`

### Design System

- Official AG Dental Lab green/ink brand system.
- Brand palette:
  - `brand-50` through `brand-950`
  - primary brand: `#275F4D`
  - dark ink: `#121816`
- Updated CSS variables and Tailwind theme tokens.
- Shared utility classes:
  - `glass`
  - `glass-dark`
  - `container-tight`
  - `text-gradient`
  - `section-eyebrow`
  - `premium-panel`
- Improved components:
  - `Button`
  - `Card`
  - `Badge`
  - `Dialog`
  - `DropdownMenu`
  - `Input`
  - `Select`
  - `Textarea`
  - `Skeleton`
- Accessible focus states and improved contrast.

### Performance

- Static landing page where possible.
- Dynamic admin routes only where needed.
- `next/image` used for logo and case images.
- `optimizePackageImports` enabled.
- Redis read-through cache for public search when Upstash is configured.
- Graceful fallback when Redis, S3/R2, or Sentry are not configured.
- Production build currently passes.

---

## UI/UX Changes

- New official logo and icon assets replace generic branding.
- Refined brand palette based on the official logo.
- Softer cream/white surfaces balanced with deep green and ink tones.
- Improved typography hierarchy with display and body font tokens.
- Landing hero redesigned with official brand signal in first viewport.
- Navbar redesigned with glass surface and mobile menu.
- About timeline and counters polished.
- Services cards polished with consistent icon styling and chips.
- Mission/vision section polished with light/dark paired panels.
- Work gallery placeholder state refined until real portfolio images are added.
- Why Choose Us completed with card grid, supporting copy, and subtle background treatment.
- Contact completed with dark branded panel, contact cards, and dual CTA.
- Footer completed with logo, navigation, contact info, and corrected copy.
- Admin dashboard cards gained elevation, hover states, and better spacing.
- Cases table gained stronger header, row hover, skeleton loading rows, and designed empty state.
- Case detail page improved for mobile stacking and visual consistency.
- Tracking page gained pre-search empty state and polished result cards.
- Progress timeline changed from plain list to carded entries.
- Login screen now matches the brand system.
- Motion timing was smoothed via shared reveal helpers.
- Reduced-motion CSS remains in place.

---

## Project Structure

```text
prisma/
  schema.prisma          Database schema
  seed.ts                Seeds admin and demo case

public/
  ag-dental-lab-logo.png Official logo
  ag-dental-lab-icon.png App icon
  favicon.svg            Favicon
  apple-icon.png         Apple touch icon
  og-image.png           Open Graph image

src/
  app/
    page.tsx             Landing page composition
    layout.tsx           Root layout and metadata
    manifest.ts          Web app manifest
    robots.ts            Robots file
    sitemap.ts           Sitemap
    login/               Admin login page
    track/               Public tracking page
    admin/               Protected admin dashboard and cases
    api/                 Route handlers

  components/
    admin/               Admin dashboard, cases, forms, managers
    brand/               Shared logo component
    case/                Status badge, stepper, progress timeline
    landing/             Landing page sections
    motion/              Reveal and counter animation helpers
    site/                Navbar and footer
    track/               Public tracking client
    ui/                  Shared UI primitives

  hooks/                 React Query hooks
  lib/                   Prisma, API, validation, constants, services
  store/                 Zustand admin UI state
  types/                 DTO and NextAuth types
  auth.ts                Full NextAuth config
  auth.config.ts         Edge-safe auth config
  middleware.ts          Admin route protection
```

---

## Environment

Use `.env.example` as the template.

Minimum required for local app + admin login:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
AUTH_SECRET="long-random-secret"
AUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST="true"
ADMIN_EMAIL="owner@agdentallab.com"
ADMIN_PASSWORD="strong-password"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

If Next.js starts on `3001`, update local URL values while testing:

```env
AUTH_URL="http://localhost:3001"
NEXT_PUBLIC_SITE_URL="http://localhost:3001"
```

After changing `ADMIN_EMAIL` or `ADMIN_PASSWORD`, run:

```powershell
npm.cmd run db:seed
```

The `.env` values do not change the stored database password until the seed script writes the new bcrypt hash.

---

## Quick Start

```powershell
cd D:\AG_DentalLab
npm.cmd install
npm.cmd run db:push
npm.cmd run db:seed
npm.cmd run dev
```

Open the URL printed by Next.js, usually:

```text
http://localhost:3000
```

If port `3000` is busy, Next.js may use:

```text
http://localhost:3001
```

---

## Scripts

| Script | Purpose |
| --- | --- |
| `npm.cmd run dev` | Start local dev server |
| `npm.cmd run build` | Generate Prisma client and build Next.js |
| `npm.cmd run start` | Start production server after build |
| `npm.cmd run typecheck` | Run TypeScript check |
| `npm.cmd run lint` | Run Next lint |
| `npm.cmd run db:push` | Push Prisma schema to database |
| `npm.cmd run db:migrate` | Create and apply development migration |
| `npm.cmd run db:deploy` | Apply migrations in deployment |
| `npm.cmd run db:seed` | Seed admin and demo case |
| `npm.cmd run db:studio` | Open Prisma Studio |

Use `npm.cmd` in Windows PowerShell to avoid execution policy issues with `npm.ps1`.

---

## Known Limitations

- Case tracking currently searches by patient full name only.
- No tracking ID or QR code system yet.
- Case type options are free-text and not dependent on selected category yet.
- Portfolio section currently uses placeholders; real work images are not managed from admin.
- Image uploads require S3/R2 configuration before they work in production.
- There is only one admin role; no multi-admin or doctor accounts.
- Redis and Sentry are optional and may be blank.
- Next.js/Sentry/OpenTelemetry can emit non-blocking build warnings.

---

## Next Development Tasks

- [ ] Add category to case type dependency in the case create/edit form.
- [ ] Add a tracking ID system so public tracking can use ID plus patient name or ID alone.
- [ ] Add QR/share link support for case tracking.
- [ ] Add stricter duplicate-case handling for same patient names.
- [ ] Add richer admin filters, sorting, and saved views.
- [ ] Add dashboard charts or trend summaries.
- [ ] Add admin-managed portfolio images for the landing page.
- [ ] Add optional image captions and ordering controls.
- [ ] Add production-ready S3/R2 setup verification flow.
- [ ] Add final real-device responsive QA checklist.
- [ ] Consider migrating from deprecated `next lint` script to ESLint CLI before Next.js 16.

---

## Documentation Map

- `README.md`: product overview, current state, setup, implemented features.
- `DEPLOYMENT.md`: deployment and environment guide.
- `PROJECT_STATUS.md`: concise handoff status for future development.
- `ARCHITECTURE.md`: system architecture and data/API flow.
- `CHANGELOG.md`: notable completed changes.

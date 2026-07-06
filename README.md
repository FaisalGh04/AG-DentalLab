# AG Dental Lab

Company website and dental case tracking system for AG Dental Lab.

The application is deployed to production on Vercel and is functionally complete: backend, database, authentication, admin management, public case tracking, image storage, and a fully branded dark‑theme UI are all in place. Recent work covered the tracking‑ID system, per‑stage case images, working object storage, estimated‑completion time, database/query performance, and caching.

Production: https://ag-dental-lab-2005.vercel.app

---

## Current Project Status

The core product is complete and live. Remaining items are optional product refinements, not core implementation.

### Completed

- Official AG Dental Lab branding, brand palette, and shared design tokens across the app.
- Dark glassmorphism theme on the public surfaces (landing, Track Case, login); light theme retained for the internal admin.
- Landing page fully built and polished (hero with animated 3D tooth, about, services, mission/vision, work gallery, why‑us, contact, glass footer).
- Admin dashboard with status count cards and recent‑cases list.
- Case management CRUD with category‑dependent case types, status lifecycle, progress steps, and images.
- **Public tracking by tracking ID** (`AG‑XXXXXX`) with a sanitized public DTO.
- **Per‑stage case images**: images are tagged to the lifecycle stage and viewable by clicking each stage on the public Track Case step indicator.
- **Estimated completion date + time**.
- **Completed cases move to the Archive** and are excluded from All Cases.
- **Object storage configured and working** (Supabase Storage, S3‑compatible, presigned uploads).
- Performance work: grouped dashboard stat query, cached dashboard counts, and always‑fresh public tracking.
- Prisma migrations committed and auto‑applied on deploy.
- TypeScript and production build pass.

### Pending (optional)

- Admin‑managed portfolio images for the landing page work gallery (currently placeholders).
- Richer admin analytics / reporting (charts, trends).
- Optional image captions and ordering controls.
- Final real‑device responsive QA pass.
- Maintenance: migrate off deprecated `next lint` (ESLint CLI) and `package.json#prisma` config (`prisma.config.ts`) before Next.js 16 / Prisma 7.

---

## Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 App Router + TypeScript, React 19 |
| Styling | Tailwind CSS + shadcn‑style Radix primitives + Framer Motion |
| Data client | TanStack React Query + Zustand |
| Backend | Next.js Route Handlers |
| Database | PostgreSQL (Supabase, ap‑southeast‑1) |
| ORM | Prisma 6 with committed migrations |
| Auth | Auth.js / NextAuth v5 credentials provider (JWT sessions), single admin |
| Storage | Supabase Storage (S3‑compatible) presigned uploads; also compatible with Cloudflare R2 / AWS S3 |
| Cache/rate limit | Upstash Redis, graceful fallback when unset |
| Validation | Zod + React Hook Form |
| Monitoring | Sentry optional |
| Deploy | Vercel (region `sin1`, co‑located with Supabase); Docker supported |

---

## Implemented Features

### Landing Page

- Premium animated dark‑theme marketing homepage.
- Sections: navbar, hero (with auto‑rotating 3D tooth), about/story, services, mission/vision, work gallery, why choose us, contact, and a glassmorphism footer.
- Official logo used in navbar, hero, shared logo component, metadata, manifest, favicon, Apple icon, and Open Graph image.
- Responsive across mobile, tablet, and desktop.
- Framer Motion reveal animations and counters.
- SEO metadata, sitemap, robots, JSON‑LD, manifest, and social preview image.
- Statically prerendered (no per‑request database work).

### Admin Dashboard

- Protected `/admin` dashboard (light theme, internal tool).
- Status overview cards: total, received, in progress, production, completed. Counts are computed with a single grouped query and cached briefly (revalidated instantly on case writes).
- Recent cases list.
- Branded admin shell, sidebar, mobile topbar, account dropdown with sign‑out confirmation.

### Case Management

- Protected `/admin/cases` list with search, status filter, category filter, and pagination.
- **All Cases** excludes completed cases; the **Archive** (`/admin/cases?archived=true`) shows completed cases only. Marking a case Completed moves it from All Cases to the Archive.
- Create, edit, delete cases. Case type options are constrained by the selected category.
- Estimated completion captures both **date and time**.
- Case detail page: status selector, status stepper, notes, metadata, progress manager, and image manager.
- Progress steps can be added, completed/uncompleted, or deleted.
- **Image upload works** (Supabase Storage). Each uploaded image is tagged with the case's current lifecycle stage.

### Tracking System

- Public `/track` page (dark theme).
- **Search by public tracking ID** in the form `AG‑XXXXXX` (no internal IDs are exposed).
- Sanitized public result DTO: status, doctor, case type, category, estimated completion (date + time), notes, and production timeline.
- **Per‑stage images**: the 1‑2‑3‑4 step indicator (Received / In Progress / Production / Completed) is interactive — clicking a reached stage shows only that stage's images; future stages are not selectable.
- Pre‑search empty state, error state, and animated result state.
- Always served fresh (never cached), so status is real‑time.

### Authentication

- Single admin account.
- Credentials login via `/login`.
- JWT sessions; admin routes protected by middleware (edge‑safe config).
- Passwords stored as bcrypt hashes in PostgreSQL.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env` are applied when running `npm.cmd run db:seed`.

### Database

- PostgreSQL via Prisma with committed migrations under `prisma/migrations/`.
- Models:
  - `Admin`
  - `PatientCase` (includes a unique `trackingId`)
  - `CaseProgress`
  - `CaseImage` (includes a nullable `stage` linking the image to a lifecycle stage)
- Enums:
  - `CaseStatus`: `RECEIVED`, `IN_PROGRESS`, `PRODUCTION`, `COMPLETED`
  - `CaseCategory`: `IMPLANT`, `C_AND_B`, `PRESSABLE_CERAMIC`, `VACUUM_FORMER`, `SPECIAL_TRAY`, `RESIN_MODEL`, `EXTERNAL_LABORATORY_SERVICES`, `DENTAL_EQUIPMENT`, `GYPSUM_MODEL`, `FLEX_DENTURE`
- Indexes for public tracking‑ID lookup, name search, and admin list performance, plus a `[caseId, stage]` index on images.

### API Architecture

- Public:
  - `GET /api/track` — search by tracking ID
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
  - dark ink: `#121816`, near‑black green background `#0A1512`, cream `#F5F5F0`
- CSS variables and Tailwind theme tokens.
- Shared utility classes: `glass`, `glass-dark`, `container-tight`, `text-gradient`, `section-eyebrow`, `premium-panel`, `login-glass`, `footer-glass`, `landing-dark-shell`.
- Improved primitives: `Button`, `Card`, `Badge`, `Dialog`, `DropdownMenu`, `Input`, `Select`, `Textarea`, `Skeleton`.
- Accessible focus states and improved contrast.

### Performance

- Landing page statically prerendered; admin/tracking dynamic only where needed.
- Dashboard stats use a single `groupBy` (instead of five counts) and are cached ~30s via `unstable_cache`, tag‑invalidated on case create/update/delete so the admin's own actions reflect immediately.
- Public tracking is always fresh (uncached) so patients see real‑time status.
- `next/image` used for logos and case images.
- `optimizePackageImports` enabled.
- Server region (`sin1`) co‑located with the Supabase database region to minimize latency.
- Graceful fallback when Redis or Sentry are not configured.

---

## Project Structure

```text
prisma/
  schema.prisma          Database schema
  migrations/            Committed SQL migrations
  seed.ts                Seeds admin and demo case

public/
  ag-dental-lab-logo.png Official logo
  ag-dental-lab-icon.png App icon
  favicon.svg            Favicon
  apple-icon.png         Apple touch icon
  og-image.png           Open Graph image

src/
  app/
    page.tsx             Landing page composition (static)
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
    three/               3D tooth scene
    track/               Public tracking client
    ui/                  Shared UI primitives

  hooks/                 React Query hooks
  lib/                   Prisma, API, validation, constants, services, storage
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

Object storage (Supabase Storage / S3‑compatible) is required for image uploads to work — set the `S3_*` variables (see `DEPLOYMENT.md`). Upstash Redis and Sentry are optional and degrade gracefully when unset.

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
npm.cmd run db:deploy   # apply committed migrations (or db:push for a throwaway local DB)
npm.cmd run db:seed
npm.cmd run dev
```

Open the URL printed by Next.js, usually `http://localhost:3000` (or `3001` if the port is busy).

---

## Scripts

| Script | Purpose |
| --- | --- |
| `npm.cmd run dev` | Start local dev server |
| `npm.cmd run build` | Generate Prisma client, apply migrations, and build Next.js |
| `npm.cmd run start` | Start production server after build |
| `npm.cmd run typecheck` | Run TypeScript check |
| `npm.cmd run lint` | Run Next lint |
| `npm.cmd run db:push` | Push Prisma schema to a database (no migration history) |
| `npm.cmd run db:migrate` | Create and apply a development migration |
| `npm.cmd run db:deploy` | Apply committed migrations |
| `npm.cmd run db:seed` | Seed admin and demo case |
| `npm.cmd run db:studio` | Open Prisma Studio |

> The Vercel `build` command runs `prisma generate && prisma migrate deploy && next build`, so committed migrations apply automatically on every deploy.

Use `npm.cmd` in Windows PowerShell to avoid execution policy issues with `npm.ps1`.

---

## Known Limitations

- Portfolio/work‑gallery section uses placeholders; real work images are not yet managed from admin.
- One admin role only; no multi‑admin or doctor accounts.
- No audit log or CSV export/import yet.
- Redis and Sentry are optional and may be blank (public tracking is intentionally uncached regardless).
- Next.js/Sentry/OpenTelemetry can emit non‑blocking build warnings; `next lint` and `package.json#prisma` config are deprecated and slated for a future maintenance migration.

---

## Documentation Map

- `README.md`: product overview, current state, setup, implemented features.
- `DEPLOYMENT.md`: deployment and environment guide.
- `PROJECT_STATUS.md`: concise handoff status for future development.
- `ARCHITECTURE.md`: system architecture and data/API flow.
- `CHANGELOG.md`: notable completed changes.

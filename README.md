# AG Dental Lab

A production-grade website + dental **case tracking system** for AG Dental Lab.

Two products in one app:

1. **Company website** — premium, animated marketing site (hero, story/timeline,
   services, mission & vision, portfolio, why-us, contact).
2. **Case tracking system** — dentists search by patient full name to see live
   case status & production timeline; a single admin manages everything.

---

## Tech stack

| Layer         | Choice                                              |
| ------------- | --------------------------------------------------- |
| Framework     | Next.js 15 (App Router) + TypeScript                |
| Styling       | Tailwind CSS + shadcn/ui (Radix) + Framer Motion    |
| Data (client) | TanStack React Query + Zustand                      |
| Backend       | Next.js Route Handlers                              |
| Database      | PostgreSQL (Supabase) via Prisma ORM                |
| Auth          | Auth.js / NextAuth v5 (Credentials, single admin)   |
| Storage       | Cloudflare R2 / AWS S3 (presigned uploads)          |
| Cache + limit | Upstash Redis + `@upstash/ratelimit`                |
| Validation    | Zod + React Hook Form                               |
| Monitoring    | Sentry (optional)                                   |
| Deploy        | Vercel (primary) + Docker                           |

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env       # then fill in values

# 3. Create the schema + seed the admin (and a demo case)
npm run db:push
npm run db:seed

# 4. Run
npm run dev                # http://localhost:3000
```

> No Redis/S3/Sentry yet? Leave those env vars blank — the app degrades
> gracefully (rate limiting/caching become no-ops, uploads return a clear
> "storage not configured" error).

### Default admin

Seeded from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Log in at **`/login`**.
Change the password before going live.

---

## Project structure

```
prisma/
  schema.prisma          # Admin, PatientCase, CaseProgress, CaseImage
  seed.ts                # seeds the single admin + a demo case
src/
  app/
    page.tsx             # landing page (all sections)
    track/               # PUBLIC case tracking (search by patient name)
    login/               # admin sign-in
    admin/               # protected dashboard, cases list, case detail
    api/
      track/             # GET public search (rate limited)
      auth/[...nextauth] # NextAuth handlers
      admin/cases/...    # CRUD, progress steps, images (auth-guarded)
      admin/upload/      # presigned upload URLs
      health/            # health check
  components/
    ui/                  # shadcn primitives
    landing/             # marketing sections
    site/                # navbar + footer
    admin/               # dashboard, forms, managers
    case/                # shared status/timeline widgets
    motion/              # Reveal + Counter animation helpers
  lib/                   # prisma, auth guard, redis, ratelimit, s3, zod, utils
  hooks/                 # React Query hooks
  store/                 # Zustand UI state
  types/                 # DTOs + next-auth augmentation
  middleware.ts          # protects /admin
  auth.ts                # NextAuth config
```

---

## Case tracking flow

1. **Admin** creates a case when it arrives (`Received`).
2. Status advances: `Received → In Progress → Production → Completed`.
3. During production the admin adds **steps** (Digital Scan, Design, Milling,
   Ceramic Layering, QC, Polishing… + custom steps), each with title,
   description, timestamp and completed flag.
4. **Doctors** open `/track`, type the **patient full name**, and instantly see
   status, timeline, doctor, case type, estimated completion and notes.

### Security notes

- Doctors search **by name only** — the public API (`/api/track`) returns a
  sanitized DTO with **no internal IDs** and only that one matching case.
- All `/api/admin/*` routes require an authenticated admin session.
- Public search + login + admin mutations are **rate limited** (Upstash).
- Secure headers (HSTS, X-Frame-Options, nosniff…) set in `next.config.ts`.
- NextAuth uses signed, httpOnly session cookies with CSRF protection built in.

---

## Performance

- Server Components + `force-dynamic` only where needed; landing is static.
- Redis read-through cache on public search (30s TTL) with graceful fallback.
- DB indexes on `patient_full_name_norm`, `current_status`, `created_at`,
  `doctor_name` (see `schema.prisma`).
- `next/image` with AVIF/WebP, `optimizePackageImports`, font `display: swap`,
  lazy scroll-reveal animations, `keepPreviousData` for snappy pagination.

---

## Fonts

The display font maps to **Inter** by default (zero extra deps). To use the
real **Geist**:

```bash
npm i geist
```

Then in `src/app/layout.tsx` import `GeistSans` and pass
`GeistSans.variable` as `displayFontVariable`.

---

## Scripts

| Script             | Purpose                              |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Dev server                           |
| `npm run build`    | `prisma generate` + production build |
| `npm run start`    | Start production server              |
| `npm run typecheck`| TypeScript check                     |
| `npm run db:push`  | Push schema (no migration files)     |
| `npm run db:migrate`| Create + apply a migration          |
| `npm run db:deploy`| Apply migrations (CI/CD)             |
| `npm run db:seed`  | Seed admin + demo case               |
| `npm run db:studio`| Prisma Studio                        |

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for Vercel + Docker instructions.

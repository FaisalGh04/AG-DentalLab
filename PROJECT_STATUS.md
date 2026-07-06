# Project Status - AG Dental Lab

Last updated: 2026-07-06.

The project is a production Next.js application, **deployed live on Vercel** (region `sin1`) with a Supabase PostgreSQL database (`ap-southeast-1`). Backend, database, authentication, admin dashboard, case management, public tracking, object storage, and the branded dark‑theme UI are all complete. Recent work covered the tracking‑ID system, per‑stage case images, working storage, estimated‑completion time, performance/caching, and the completed‑case archive.

Production: https://ag-dental-lab-2005.vercel.app

---

## Completed

### Core Product

- Landing page (static, dark glassmorphism theme)
- Admin dashboard with cached status counts and recent cases
- Admin authentication (NextAuth v5 credentials, JWT sessions)
- Protected admin routes via edge middleware
- Case management CRUD
- Category‑dependent case types (taxonomy in `lib/case-types.ts`)
- Case status lifecycle and progress timeline
- Estimated completion **date + time**
- **Public case tracking by tracking ID (`AG‑XXXXXX`)**
- **Per‑stage case images** viewable from the public step indicator
- Completed cases move to the **Archive** and are excluded from All Cases
- **Object storage configured and working** (Supabase Storage, S3‑compatible presigned uploads)
- PostgreSQL schema with committed Prisma migrations
- API route handlers with Zod validation
- Rate limit/cache helpers with graceful fallback
- Optional Sentry integration

### Branding & UI

- Official AG Dental Lab logo and icon assets across the app
- Brand palette and Tailwind/CSS theme tokens
- Dark glassmorphism theme on landing, Track Case, and login; light theme on admin
- Glassmorphism footer; login glass card; premium‑panel card language
- Polished admin shell, cases table, case detail, progress/image managers
- Accessible focus states and contrast

### Performance & Caching

- Dashboard stats: single `groupBy` instead of five counts, plus a count‑free recent‑cases query
- Dashboard counts cached ~30s (`unstable_cache`, tag `cases`), revalidated immediately on case writes
- Public tracking kept fully dynamic/uncached for real‑time accuracy
- Landing statically prerendered
- Server region co‑located with the database region

### Verification

- `npm.cmd run typecheck` passes.
- `npm.cmd run build` passes.

---

## Pending (optional, not blockers)

- Admin‑managed portfolio images for the landing work gallery.
- Additional admin reporting/analytics (charts, trends).
- Image ordering/captions.
- Real‑device final responsive QA.
- Migrate off deprecated `next lint` (ESLint CLI).
- Migrate `package.json#prisma` config to `prisma.config.ts` for Prisma 7.

---

## Known Limitations

- Portfolio images are placeholders (not admin‑managed).
- Single admin only; no doctor accounts.
- No audit log yet.
- No CSV export/import yet.
- Public tracking is intentionally uncached (freshness over caching).

---

## Next Development Checklist

- [ ] Add admin‑managed landing portfolio images.
- [ ] Add image ordering/captions in case images.
- [ ] Add admin sorting by updated date, estimated completion, doctor, and status.
- [ ] Add dashboard charts for active workload.
- [ ] Add duplicate patient‑name disambiguation.
- [ ] Add QR/share link support for tracking IDs.
- [ ] Add final mobile/tablet visual QA pass.
- [ ] Add deployment smoke‑test checklist to CI/CD.
- [ ] Maintenance: ESLint CLI migration; `prisma.config.ts` migration.

---

## Handoff Notes

- The app is live in production; treat schema and auth changes with care and always use committed migrations (`prisma migrate deploy` runs during the Vercel build).
- Public tracking searches by tracking ID (`AG‑XXXXXX`), not patient name, and must stay fresh/uncached.
- Completed cases live only in the Archive view.
- Object storage is Supabase Storage (S3‑compatible); uploads tag images with the case's current stage.
- Continue using the existing design system and brand palette; prefer improving existing components over adding new patterns.
- Use `npm.cmd` on Windows PowerShell. After changing admin credentials in `.env`, run `npm.cmd run db:seed`.

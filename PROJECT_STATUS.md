# Project Status - AG Dental Lab

Last updated after the official branding and UI/UX polish pass.

Current completion: **95%**

The project is an existing, production-ready Next.js application. Core functionality is implemented. The backend, database, authentication, admin dashboard, case management, and public tracking system are complete. Recent work focused on frontend polish and official AG Dental Lab branding.

---

## Completed

### Core Product

- Landing page
- Admin dashboard
- Admin authentication
- Protected admin routes
- Case management CRUD
- Case status lifecycle
- Case progress timeline
- Public case tracking by patient full name
- PostgreSQL database schema
- Prisma ORM integration
- API route handlers
- Validation with Zod
- Rate limit/cache integration with graceful fallback
- Optional image upload infrastructure
- Optional Sentry integration

### Branding

- Official AG Dental Lab logo added.
- Logo transparent padding removed.
- Logo integrated in:
  - Navbar
  - Hero
  - Shared Logo component
  - Metadata
  - Manifest
  - Favicon
  - Apple icon
  - Open Graph image
- Brand palette created from the official logo.
- Theme tokens updated in Tailwind and CSS variables.

### UI/UX

- Navbar redesigned.
- Hero section redesigned.
- About section improved.
- Services section improved.
- Mission section improved.
- Vision section improved.
- Portfolio/work gallery improved.
- Why Choose Us completed and polished.
- Contact completed and polished.
- Footer completed and polished.
- Admin dashboard UI improved.
- Case tracking UI improved.
- Login page UI improved.
- Tables improved.
- Badges improved.
- Progress timeline improved.
- Loading states improved.
- Empty states improved.
- Skeleton loaders improved.
- Shared components redesigned.
- Accessibility and contrast improved.
- Framer Motion timing refined.

### Verification

- `npm.cmd run typecheck` passes.
- `npm.cmd run lint` passes.
- `npm.cmd run build` passes.

---

## Pending

These are not blockers for current functionality.

- Category to case type dependency.
- Tracking ID system.
- QR/share tracking links.
- Additional admin reporting/analytics.
- Admin-managed portfolio images.
- Production storage verification flow.
- Real-device final responsive QA.
- Migration away from deprecated `next lint`.
- Future Prisma config migration for Prisma 7 compatibility.

---

## Known Limitations

- Public tracking searches by patient full name only.
- Case type is currently free text.
- Portfolio images are placeholders.
- Image uploads require R2/S3 environment configuration.
- Single admin only; no doctor accounts.
- No tracking IDs yet.
- No audit log yet.
- No CSV export/import yet.

---

## Next Development Checklist

- [ ] Add category to case type dependency in `CaseFormDialog`.
- [ ] Define allowed case types per `CaseCategory`.
- [ ] Add tracking ID field to `PatientCase`.
- [ ] Update admin create/edit forms to show tracking ID.
- [ ] Update public `/track` to support tracking ID search.
- [ ] Consider QR code generation for tracking links.
- [ ] Add duplicate patient-name disambiguation.
- [ ] Add admin sorting by updated date, estimated completion, doctor, and status.
- [ ] Add dashboard charts for active workload.
- [ ] Add image ordering/captions in case images.
- [ ] Add admin-managed landing portfolio images.
- [ ] Add final mobile/tablet visual QA pass.
- [ ] Add deployment smoke-test checklist to CI/CD.

---

## Handoff Notes

- Do not rebuild the project from scratch.
- Do not change backend logic unless specifically requested.
- Do not change Prisma or authentication unless specifically requested.
- Continue using the existing design system and brand palette.
- Prefer improving existing components over adding new patterns.
- Use `npm.cmd` on Windows PowerShell.
- After changing admin credentials in `.env`, run `npm.cmd run db:seed`.

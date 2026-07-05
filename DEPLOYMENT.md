# Deployment Guide - AG Dental Lab

This guide reflects the current project state after the branding and UI/UX polish pass.

Supported deployment paths:

- Vercel, recommended
- Docker/self-hosting

The app is production-ready once environment variables, database schema, seeded admin credentials, and optional storage/cache providers are configured.

---

## Current Deployment Status

- Framework: Next.js 15 App Router
- Database: PostgreSQL through Prisma, intended for Supabase
- Auth: Auth.js / NextAuth v5 credentials provider
- Admin: single seeded admin account
- Storage: Cloudflare R2 or AWS S3 optional for image uploads
- Cache/rate limit: Upstash Redis optional
- Monitoring: Sentry optional
- Build status: `npm.cmd run build` passes

Current completion: **95%**

Pending deployment-related items:

- Configure real production database credentials.
- Configure production `AUTH_URL` and `NEXT_PUBLIC_SITE_URL`.
- Seed production admin credentials.
- Configure R2/S3 only if case image uploads are required.
- Configure Upstash only if production rate limiting/cache is required.
- Configure Sentry only if monitoring is required.

---

## Required Environment Variables

Use `.env.example` as the template.

### Database - Supabase PostgreSQL

```env
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

`DATABASE_URL` is the pooled runtime connection.

`DIRECT_URL` is used by Prisma for migrations and schema operations.

### Authentication

```env
AUTH_SECRET="long-random-secret"
AUTH_URL="https://your-domain.com"
AUTH_TRUST_HOST="true"
```

Generate `AUTH_SECRET` with:

```powershell
npx auth secret
```

For local development:

```env
AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

If Next.js uses port `3001`, use:

```env
AUTH_URL="http://localhost:3001"
NEXT_PUBLIC_SITE_URL="http://localhost:3001"
```

### Admin Account

```env
ADMIN_EMAIL="owner@agdentallab.com"
ADMIN_PASSWORD="strong-password"
```

These values are used by:

```powershell
npm.cmd run db:seed
```

Changing `.env` alone does not update the database. Run the seed script after changing admin credentials.

### Public Site URL

```env
NEXT_PUBLIC_SITE_URL="https://your-domain.com"
```

Used for metadata, canonical URLs, and public links.

---

## Optional Environment Variables

### Upstash Redis

Used for public search caching and rate limiting. Leave blank to disable gracefully.

```env
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

### Cloudflare R2 / AWS S3

Used for case image uploads. Leave blank if uploads are not needed yet.

```env
S3_ENDPOINT=""
S3_REGION=""
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
S3_BUCKET=""
S3_PUBLIC_URL=""
```

For Cloudflare R2:

```env
S3_ENDPOINT="https://<accountid>.r2.cloudflarestorage.com"
S3_REGION="auto"
S3_BUCKET="ag-dental-lab"
S3_PUBLIC_URL="https://pub-xxxx.r2.dev"
```

R2/S3 CORS must allow browser `PUT` uploads from the deployed origin:

```json
[
  {
    "AllowedOrigins": ["https://your-domain.com"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

### Sentry

Optional monitoring. Leave blank to disable.

```env
NEXT_PUBLIC_SENTRY_DSN=""
SENTRY_ORG=""
SENTRY_PROJECT=""
SENTRY_AUTH_TOKEN=""
```

---

## Local Development

```powershell
cd D:\AG_DentalLab
npm.cmd install
npm.cmd run db:push
npm.cmd run db:seed
npm.cmd run dev
```

Open the URL printed by Next.js.

If port `3000` is busy, Next.js will automatically use another port such as `3001`.

Use `npm.cmd` in Windows PowerShell to avoid `npm.ps1` execution policy issues.

---

## Production Build Locally

```powershell
cd D:\AG_DentalLab
npm.cmd run build
npm.cmd run start
```

If port `3000` is busy:

```powershell
npm.cmd run start -- -p 3001
```

---

## Deploy to Vercel

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Add environment variables from `.env.example`.
4. Set production values:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `AUTH_SECRET`
   - `AUTH_URL`
   - `AUTH_TRUST_HOST`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `NEXT_PUBLIC_SITE_URL`
5. Optional:
   - Add Upstash variables.
   - Add R2/S3 variables.
   - Add Sentry variables.
6. Apply database schema:

```powershell
npm.cmd run db:deploy
```

If no migrations exist and this is the first deployment, use:

```powershell
npm.cmd run db:push
```

7. Seed the admin:

```powershell
npm.cmd run db:seed
```

8. Deploy.
9. Verify:

```text
https://your-domain.com/api/health
```

Expected response:

```json
{ "ok": true }
```

---

## Deploy with Docker

### Local Compose

```powershell
docker compose up --build
```

The compose setup starts the app and supporting services defined in `docker-compose.yml`.

### Standalone Image

```powershell
docker build -t ag-dental-lab .
```

Example:

```powershell
docker run -p 3000:3000 `
  -e DATABASE_URL="postgresql://..." `
  -e DIRECT_URL="postgresql://..." `
  -e AUTH_SECRET="long-random-secret" `
  -e AUTH_URL="https://your-domain.com" `
  -e AUTH_TRUST_HOST="true" `
  -e ADMIN_EMAIL="owner@agdentallab.com" `
  -e ADMIN_PASSWORD="strong-password" `
  -e NEXT_PUBLIC_SITE_URL="https://your-domain.com" `
  ag-dental-lab
```

Before first production use:

```powershell
npm.cmd run db:deploy
npm.cmd run db:seed
```

---

## Post-Deploy Checklist

- [ ] `/` loads with official logo and polished landing sections.
- [ ] `/login` works with seeded admin credentials.
- [ ] `/admin` is protected from logged-out users.
- [ ] `/admin` dashboard loads.
- [ ] `/admin/cases` can create, edit, filter, and delete cases.
- [ ] Case progress steps can be added and toggled.
- [ ] `/track` can find the seeded demo case by patient full name.
- [ ] A newly created case appears in public tracking.
- [ ] Image upload works if R2/S3 is configured.
- [ ] Rate limiting/cache works if Upstash is configured.
- [ ] Metadata, favicon, Apple icon, manifest, and Open Graph preview are correct.
- [ ] Production `AUTH_URL` and `NEXT_PUBLIC_SITE_URL` match the deployed domain.
- [ ] Admin password has been changed from any placeholder value.

---

## Known Deployment Warnings

The build may show non-blocking warnings from Sentry/OpenTelemetry about dynamic dependencies. Current production builds still complete successfully.

Prisma may warn that `package.json#prisma` config is deprecated for Prisma 7. The current Prisma 6 setup works, but a future maintenance task should migrate to `prisma.config.ts`.

Next.js reports that `next lint` is deprecated and will be removed in Next.js 16. A future maintenance task should migrate to the ESLint CLI.

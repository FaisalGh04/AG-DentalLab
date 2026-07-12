# Deployment Guide - AG Dental Lab

The app is **deployed live on Railway** (Nixpacks) behind **Cloudflare**:
https://ag-dentallab.com

Supported deployment paths:

- Railway + Cloudflare, recommended (current production)
- Docker/self-hosting (alternative)

---

## Current Deployment Status

- Framework: Next.js 15 App Router
- Hosting: **Railway** (Nixpacks builder), origin region **Zurich (`zrh1`)**
- Edge/CDN: **Cloudflare** in front of Railway (TLS, WAF, and edge caching of
  the static public routes — see "Cloudflare" below)
- Database: PostgreSQL through Prisma on Supabase (`ap-southeast-1`, Singapore)
  - Note: the Railway origin (Zurich) is **not** co-located with the Supabase
    database (Singapore); cross-region DB round-trips are a known latency cost.
- Auth: Auth.js / NextAuth v5 credentials provider (JWT sessions)
- Admin: single seeded admin account
- Storage: Supabase Storage (S3-compatible) — **configured and working**; also compatible with Cloudflare R2 / AWS S3
- Cache/rate limit: Upstash Redis — **required in production** (the rate limiter
  fails closed, so `/track` and admin depend on it); optional in local dev
- Monitoring: Sentry optional
- Migrations: committed under `prisma/migrations/` and **applied automatically on
  deploy** via Railway's `preDeployCommand` (`prisma migrate deploy`, before
  traffic cuts over to the new container — see `railway.toml`)
- Build status: `npm.cmd run build` passes

Production environment already configured on Railway:

- Production database (Supabase), `AUTH_URL`, `NEXT_PUBLIC_SITE_URL`, seeded admin, and `S3_*` storage credentials are set.
- Upstash is set (required in prod); Sentry remains optional.

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
AUTH_URL="https://ag-dentallab.com"
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
NEXT_PUBLIC_SITE_URL="https://ag-dentallab.com"
```

Used for metadata, canonical URLs, public links, and the CSP report endpoint.

---

## Optional Environment Variables

### Upstash Redis

Used for rate limiting (public search + admin mutations). **Required in
production** — the limiter fails closed, so if Upstash is unset in prod, `/track`
and the admin panel return errors rather than run unthrottled. Leave blank only
in local dev (dev falls back to allow / in-memory throttling).

```env
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

### Object Storage (Supabase Storage / Cloudflare R2 / AWS S3)

Required for case image uploads. Production uses **Supabase Storage** (S3‑compatible). If the `S3_*` values are left blank or kept as the `.env.example` placeholders, the upload API returns a clear 503 ("Object storage is not configured") instead of failing obscurely.

```env
S3_ENDPOINT=""
S3_REGION=""
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
S3_BUCKET=""
S3_PUBLIC_URL=""
```

For Supabase Storage (S3‑compatible endpoint from the Supabase dashboard):

```env
S3_ENDPOINT="https://<project-ref>.storage.supabase.co/storage/v1/s3"
S3_REGION="<supabase-region>"
S3_BUCKET="<bucket-name>"
S3_PUBLIC_URL="https://<project-ref>.supabase.co/storage/v1/object/public/<bucket-name>"
```

For Cloudflare R2:

```env
S3_ENDPOINT="https://<accountid>.r2.cloudflarestorage.com"
S3_REGION="auto"
S3_BUCKET="ag-dental-lab"
S3_PUBLIC_URL="https://pub-xxxx.r2.dev"
```

The storage provider's CORS must allow browser `PUT` uploads from the deployed origin:

```json
[
  {
    "AllowedOrigins": ["https://ag-dentallab.com"],
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

## Deploy to Railway

Railway is connected to the GitHub repo and auto-deploys on push to `main`.
Deployment behavior is defined in `railway.toml`:

- **Builder:** Nixpacks
- **Build:** `prisma generate` + `next build`
- **preDeployCommand:** `prisma migrate deploy` — runs *before* traffic cuts over,
  so committed migrations apply automatically each deploy (requires `DIRECT_URL`
  in the environment)
- **Health check:** `/api/health` (30s timeout) gates cutover to the new container
- **Replicas:** 1, restart on failure (max 3 retries)

Steps:

1. Push the repository to GitHub (`main`).
2. In Railway, connect the repo (once) and set environment variables:
   - `DATABASE_URL`, `DIRECT_URL`
   - `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`
   - `NEXT_PUBLIC_SITE_URL`
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (required in prod)
   - Optional: `S3_*` storage, Sentry variables
3. Seed the admin (first deploy only, run once against the production database):

   ```powershell
   npm.cmd run db:seed
   ```

4. Push to `main`; Railway builds, runs `prisma migrate deploy`, health-checks
   `/api/health`, then cuts over.
5. **Purge the Cloudflare cache** after the deploy shows successful — see
   [`docs/deploy.md`](docs/deploy.md). Skipping this can leave a stale edge page
   pointing at old JS chunks until the 2-hour edge TTL expires.
6. Verify:

   ```text
   https://ag-dentallab.com/api/health
   ```

   Expected response:

   ```json
   { "ok": true }
   ```

---

## Cloudflare

Cloudflare fronts the Railway origin (DNS proxied) for TLS, security headers,
and **edge caching of the static public routes**.

- **Cache Rules** (dashboard → Caching → Cache Rules):
  - Cache `path eq "/"` and `path eq "/track"` — Edge TTL **Override → 2 hours**.
  - Bypass cache for `/admin`, `/login`, and `/api/*`.
- **Purge on deploy:** required, because a deploy changes JS chunk hashes and a
  stale edge page would reference the old ones. The 2-hour Edge TTL is a safety
  net (stale entries self-heal within 2h); purging makes the fix immediate. Full
  runbook — scoped API token, Zone ID, purge command, verification — is in
  [`docs/deploy.md`](docs/deploy.md).

---

## Deploy with Docker (alternative / self-hosting)

Railway uses Nixpacks, not Docker, but the app also ships a Docker path for
self-hosting.

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

- [ ] Railway shows **Deployment successful** (health check passed, cutover done).
- [ ] **Cloudflare cache purged** ([`docs/deploy.md`](docs/deploy.md)); `curl -sI /` and `/track` show `MISS` then `HIT`; `/api/track` stays `DYNAMIC`/`BYPASS`.
- [ ] `/` loads with official logo and polished landing sections.
- [ ] `/login` works with seeded admin credentials.
- [ ] `/admin` is protected from logged-out users.
- [ ] `/admin` dashboard loads.
- [ ] `/admin/cases` can create, edit, filter, and delete cases.
- [ ] Completed cases leave "All Cases" and appear only in the Archive.
- [ ] Case progress steps can be added and toggled.
- [ ] `/track` finds a case by its tracking ID (`AG-XXXXXX`).
- [ ] A newly created case appears in public tracking with live status.
- [ ] Image upload works and images appear under the correct stage on `/track`.
- [ ] Rate limiting works (Upstash configured).
- [ ] Metadata, favicon, Apple icon, manifest, and Open Graph preview are correct.
- [ ] Production `AUTH_URL` and `NEXT_PUBLIC_SITE_URL` match the deployed domain.
- [ ] Admin password has been changed from any placeholder value.

---

## Known Deployment Warnings

The build may show non-blocking warnings from Sentry/OpenTelemetry about dynamic dependencies. Current production builds still complete successfully.

Prisma may warn that `package.json#prisma` config is deprecated for Prisma 7. The current Prisma 6 setup works, but a future maintenance task should migrate to `prisma.config.ts`.

Next.js reports that `next lint` is deprecated and will be removed in Next.js 16. A future maintenance task should migrate to the ESLint CLI.

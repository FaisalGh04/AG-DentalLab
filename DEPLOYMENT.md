# Deployment Guide — AG Dental Lab

Two supported paths: **Vercel** (recommended) and **Docker** (self-host).

---

## 1. Provision services

### Database — Supabase Postgres

1. Create a Supabase project.
2. Copy two connection strings from **Project Settings → Database**:
   - **Pooled** (port `6543`, `?pgbouncer=true`) → `DATABASE_URL`
   - **Direct** (port `5432`) → `DIRECT_URL`

### Cache & rate limiting — Upstash Redis

1. Create an Upstash Redis database (global).
2. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

### Storage — Cloudflare R2 (or AWS S3)

1. Create a bucket (e.g. `ag-dental-lab`) and enable **public access** (or put
   a CDN in front) so uploaded images can be served.
2. Create an API token / access key with read+write.
3. Set:
   - `S3_ENDPOINT` = `https://<accountid>.r2.cloudflarestorage.com`
   - `S3_REGION` = `auto` (R2) or your AWS region
   - `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`
   - `S3_PUBLIC_URL` = the public/CDN base URL for the bucket
4. **CORS** — allow `PUT` from your site origin so the browser can upload
   directly via the presigned URL:

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

5. Add the public host to `next.config.ts → images.remotePatterns` if it isn't
   already covered by the `**.r2.dev` / `**.amazonaws.com` patterns.

### Monitoring — Sentry (optional)

Set `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`,
`SENTRY_AUTH_TOKEN`. If unset, Sentry is fully disabled (no build wrapping).

### Auth secret

```bash
npx auth secret        # or: openssl rand -base64 32
```

Set as `AUTH_SECRET`. Set `AUTH_URL` to your production URL and
`AUTH_TRUST_HOST=true`.

---

## 2. Deploy to Vercel

1. Push this repo to GitHub and **Import** it in Vercel.
2. Add **all** env vars from `.env.example` in **Project → Settings → Env Vars**.
3. Build command stays default (`next build`; our `build` script runs
   `prisma generate` first via package.json).
4. Run the schema + seed once (locally against the prod DB, or via a one-off):

   ```bash
   npm run db:deploy      # apply migrations
   npm run db:seed        # create the admin
   ```

   > First time with no migration files? Run `npm run db:migrate` locally to
   > generate `prisma/migrations`, commit them, then `db:deploy` in CI.

5. Deploy. Verify `https://your-domain.com/api/health` returns `{ ok: true }`.

---

## 3. Deploy with Docker

The app builds to a standalone server (`output: "standalone"`).

### One-command local stack (app + Postgres)

```bash
# optional: create a .env with AUTH_SECRET, ADMIN_* etc. for compose
docker compose up --build
```

Compose starts Postgres, waits for health, applies migrations, seeds the admin,
then serves on **http://localhost:3000**.

### Standalone image (external managed DB)

```bash
docker build -t ag-dental-lab .

docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://…:6543/postgres?pgbouncer=true" \
  -e DIRECT_URL="postgresql://…:5432/postgres" \
  -e AUTH_SECRET="…" \
  -e AUTH_URL="https://your-domain.com" \
  -e AUTH_TRUST_HOST="true" \
  -e ADMIN_EMAIL="owner@agdentallab.com" \
  -e ADMIN_PASSWORD="strong-password" \
  -e UPSTASH_REDIS_REST_URL="…" -e UPSTASH_REDIS_REST_TOKEN="…" \
  -e S3_ENDPOINT="…" -e S3_ACCESS_KEY_ID="…" -e S3_SECRET_ACCESS_KEY="…" \
  -e S3_BUCKET="ag-dental-lab" -e S3_PUBLIC_URL="https://pub-xxxx.r2.dev" \
  ag-dental-lab
```

Run migrations against your managed DB before/at first boot:

```bash
npm run db:deploy && npm run db:seed
```

The image exposes a `HEALTHCHECK` hitting `/api/health`.

---

## 4. Post-deploy checklist

- [ ] `/` loads with animations; Lighthouse ≥ 95.
- [ ] `/track` returns the seeded demo case ("Sara Khalil").
- [ ] `/login` works with the seeded admin; `/admin` is protected.
- [ ] Create a case → it appears in `/track`.
- [ ] Add progress steps → they show on the public timeline.
- [ ] Upload an image (requires S3 + CORS).
- [ ] Rate limiting active (Upstash configured).
- [ ] **Change the admin password.**
- [ ] Set a custom domain + HTTPS.

# Deploy runbook — Cloudflare cache purge

> Scope: the **post-deploy Cloudflare cache purge** step for production
> (`ag-dentallab.com`, Railway origin behind Cloudflare). For environment
> variables and the app deploy itself, see the repo's environment setup docs.
> (Note: the older root `DEPLOYMENT.md` still describes a Vercel setup and is
> out of date — production runs on **Railway + Cloudflare**.)

## Why this step exists

The public pages (`/`, `/track`) are cached at the Cloudflare edge (a Cache
Rule with **Edge TTL = Override → 2 hours**). After a Railway deploy that
changes JS chunk hashes, any page still cached at the edge points at the **old**
chunks — which can stall hydration on a client (this caused a ~20 s "hang" on
`/track` after the Cache Rule was first deployed). Purging the edge cache right
after a deploy makes the fix immediate.

We already have a safety net: the 2-hour Edge TTL means a *missed* purge
self-heals within 2 hours. **Purging just makes it instant instead of waiting.**

## ⚠️ Timing rule (important)

Purge **only after** Railway shows **"Deployment successful"** — that means the
health check (`/api/health`) passed and traffic has cut over to the new
container. **Never** purge during the build or before cutover: requests still
hitting the old container would immediately re-cache the old HTML, recreating
the exact stale entry you're trying to clear.

---

## One-time setup

### 1. Create a scoped Cloudflare API token

Cloudflare dashboard → **My Profile → API Tokens → Create Token → Create Custom
Token**:

- **Permissions:** `Zone` → `Cache Purge` → `Purge`
- **Zone Resources:** `Include` → `Specific zone` → `ag-dentallab.com`
- (Leave everything else default.) Create, then **copy the token once** — it is
  not shown again.

This token can *only* purge cache for this one zone. Do **not** use your Global
API Key.

### 2. Find the Zone ID

Cloudflare dashboard → select **ag-dentallab.com** → **Overview** → right-hand
sidebar → **API** section → **Zone ID** (copy it).

### 3. Store the credentials locally — NOT in the repo

These are operator credentials, not app runtime config, so keep them in your
shell environment, never in a committed file:

**Windows PowerShell** — add to your `$PROFILE` (run `notepad $PROFILE`):

```powershell
$env:CF_API_TOKEN = "your-scoped-token"
$env:CF_ZONE_ID   = "your-zone-id"
```

**macOS/Linux / Git Bash** — add to `~/.bashrc` or `~/.zshrc`:

```bash
export CF_API_TOKEN="your-scoped-token"
export CF_ZONE_ID="your-zone-id"
```

Do not put the token in `.env`, `.env.example`, or any tracked file. If you ever
paste it somewhere by accident, revoke it in the Cloudflare dashboard and
create a new one.

---

## Purge command

Run this **after** the Railway deploy shows successful:

**Git Bash / macOS / Linux:**

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

**Windows PowerShell:**

```powershell
Invoke-RestMethod -Method Post `
  -Uri "https://api.cloudflare.com/client/v4/zones/$env:CF_ZONE_ID/purge_cache" `
  -Headers @{ Authorization = "Bearer $env:CF_API_TOKEN" } `
  -ContentType "application/json" `
  -Body '{"purge_everything":true}'
```

Expected response contains `"success": true`. We purge **everything** (not by
URL) on purpose: the RSC responses vary on the `RSC` / `Next-Router-Prefetch`
headers, so a by-URL purge would miss those variants. For a small static site
this is cheap — immutable JS chunks re-cache on the first hit.

---

## Verify

1. **Edge is repopulating** — run twice; expect `MISS` then `HIT`:

   ```bash
   curl -sI https://ag-dentallab.com/       | grep -i cf-cache-status
   curl -sI https://ag-dentallab.com/track  | grep -i cf-cache-status
   ```

2. **API is still bypassed** (never cached):

   ```bash
   curl -sI "https://ag-dentallab.com/api/track?trackingId=AG-8F3K2A" | grep -i cf-cache-status
   ```
   Expect `DYNAMIC` (or `BYPASS`) — never `HIT`.

3. **On a phone:** hard-reload `/` and `/track`, tap around, and confirm the
   `/track` search box responds immediately (no hang).

---

## Post-deploy checklist

- [ ] Railway shows **Deployment successful** (cutover complete).
- [ ] Ran the purge command; response `"success": true`.
- [ ] `curl -sI /` and `/track` → `MISS` then `HIT`.
- [ ] `/api/track` → `DYNAMIC`/`BYPASS` (not cached).
- [ ] Phone: `/` and `/track` load and the search box is responsive.

> If deploy frequency picks up, automate this via a **Railway deploy webhook →
> Cloudflare Worker** that purges on deployment success (fires after cutover).
> Kept manual for now given current cadence.

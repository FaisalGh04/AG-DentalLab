# Staff confirmation layer — custody & operations

> Scope: the confirmation gate on **case creation** and **stage transitions**.
> This sits **on top of** the NextAuth admin login (`src/auth.ts`) — it does not
> replace it. The admin still signs in normally; these credentials authorise a
> specific privileged **action**.

> **The gate is two-factor for four of the five staff, and ONE factor for the
> manager.** That exception is deliberate and accepted; it is described in full
> under [The manager single-factor path](#the-manager-single-factor-path). If you
> read only one section of this document, read that one.

## What is gated

All six entry points require confirmation:

Each entry point requires confirmation — two factors for a normal staff member,
one for the manager (see below).

| # | Action | Where |
|---|--------|-------|
| 1 | Create a case | New Case dialog |
| 2 | Change stage | Stage dropdown (case detail) |
| 3 | Change stage | StageStepper click (case detail) |
| 4 | Change workflow | WorkflowSelect (case detail) |
| 5 | Show/hide a stage | Stage visibility toggle |
| 6 | Change workflow | Edit dialog |

**Not gated** — ordinary edits to `notes`, `doctorName`, `estimatedCompletionDate`,
patient name, progress steps and images. The server decides by **diffing** the
would-be lifecycle against the stored row (`src/lib/case-audit.ts`), so plain
editing is unaffected. Re-selecting the stage a case is already on is a no-op and
does not prompt.

## Who holds what

| Secret | Held by | Minimum length | Notes |
|--------|---------|----------------|-------|
| Staff password ×4 | each staff member | 6 | personal, not shared |
| Manager code | the manager | **6** (raised from 4) | one code approves any gated action — **and is the manager's ONLY credential** |
| **Break-glass code** | **someone OTHER than the manager** | 24, generated | emergency only; **two-factor path only** |

The manager identity (`المدير`) holds **no personal password**. Its
`StaffMember.pinHash` is bcrypt over random bytes nobody retains, and
`src/lib/staff-auth.ts` never reads it for that row.

## The manager single-factor path

When the staff member selected in the confirmation dialog is the one flagged
`StaffMember.isManager`, the dialog asks for **one code** — the manager code —
and that single secret satisfies both factors. Every other staff member is
unaffected: their own password **plus** the manager code, exactly as before.

This is a **deliberate, accepted reduction in assurance.** It exists because the
manager performs most gated actions personally, and requiring them to enter a
personal password *and* their own manager code is two secrets held by one person
— ceremony, not control.

### What this cost, stated honestly

An earlier version of this document justified the short manager code like this:

> *"Online guessing — barely affected. An attacker also needs a valid staff
> password…"*

**That justification no longer holds for the manager path, because there is no
second secret there.** The claim was true when written and is false now; it has
been removed rather than left to reassure someone who skims.

For an attacker who already holds an admin session:

| | Two-factor path (4 staff) | Manager path |
|---|---|---|
| Secrets required | staff password **+** manager code | manager code alone |
| Online search space | password space × code space | **code space alone** |
| Real defence | rate limit + lockout + two secrets | **rate limit + lockout only** |

At the old 4-character minimum the space was 10,000, and the 5-failure lockout
permits roughly 20 guesses an hour — exhaustible in about a fortnight of patient
grinding. **The minimum was therefore raised to 6**, which multiplies that by a
hundred for two extra keystrokes. `7171`-style repeating patterns are the first
thing a guess tries and must not be used.

Two consequences to keep in view:

- **Denial of service.** The manager identity can be locked out by repeated
  failed guesses, and it is the identity that performs most actions. The lockout
  is still correct — see [Unlocking someone early](#unlocking-someone-early).
- **Offline exposure is unchanged in kind and still weak.** If the database
  leaks, a short code falls to brute force regardless of bcrypt cost. The blast
  radius is now larger: that one code is also the manager's identity.

### Break-glass is NOT accepted on this path

The break-glass code satisfies the manager-code field **only on the two-factor
path**, where a staff password is also required. On the single-factor path it is
rejected.

This is deliberate. Break-glass exists to survive *the manager being
unreachable* — which by definition means somebody else is acting, using their own
password. Honouring it on the single-factor path would turn one long code into
full authority attributed to "the manager", with no staff password anywhere in
the chain: an emergency override promoted to a general-purpose one.

### Custody rules for the manager code

Because it is now a single factor, treat it as **more** sensitive than any staff
password:

- never written down anywhere near the workstation
- never shared with staff — if it is, the gate is theatre **and** every action
  taken with it is attributed to the manager
- **rotated routinely** — monthly is reasonable — and **immediately** if anyone
  else sees it typed
- rotated as part of any database-exposure response, alongside every other secret

Rotation no longer drags the whole roster with it:

```bash
npx tsx prisma/rotate-manager-code.ts
```

touches **only** `ManagerSecret.PRIMARY`, leaving every staff password, the
break-glass code, cases and audit logs untouched. There is no longer an excuse to
skip a rotation.

The break-glass code stays long (24 random chars) precisely because it is used
rarely, so friction costs nothing there.

The break-glass holder must **not** be the manager. The entire purpose is to
survive that one person being unreachable, so storing it with them defeats it.
Recommended: the lab owner, offline — sealed envelope in the safe, or a password
manager the manager cannot reach.

## Seeding / rotating credentials

```bash
npx tsx prisma/seed-staff.ts
```

Run it **in your own terminal** — it refuses to start without a TTY, so secrets
can never be piped in from a file or CI. It prompts with hidden input, requires
each secret twice, hashes everything at bcrypt cost 12, and writes **only
hashes**. Re-running **rotates** the secrets in place; it never duplicates rows
and never touches cases or audit logs.

It prompts for **four** staff passwords. The manager row is created/updated
without a prompt, flagged `isManager`, and given an unusable random `pinHash`.

Minimums: **6** for staff passwords, **6** for the manager code. The script
states the reasoning at the manager prompt, at the moment it applies.

### Rotating just the manager code

```bash
npx tsx prisma/rotate-manager-code.ts
```

Rotates **only** `ManagerSecret.PRIMARY` (and clears its `lastUsedAt`, which
otherwise refers to the *previous* code and misleads an audit). Staff passwords,
the break-glass code, cases and audit logs are untouched. Use this for the
routine monthly rotation; use the full seeder only when you also need to
re-issue staff passwords or regenerate break-glass.

### Renaming someone / appointing the manager

```bash
npx tsx prisma/rename-staff.ts --list
npx tsx prisma/rename-staff.ts --id <cuid> --to "<new name>" [--manager] [--apply]
```

**Dry run by default**; nothing is written without `--apply`.

Use this — **never** `seed-staff.ts` — to rename an existing person. The seeder
upserts *by name*, so pointing it at a new name creates a second row and leaves
the original active, while also re-prompting every staff password.

The script targets by **id**, refuses on anything other than exactly one match,
refuses a name that collides with another row, refuses a second manager, and
prints every name with its **Unicode codepoints**. That last one is not
decoration: the outgoing manager name was `ابو عمر` starting with a **bare alif
(U+0627)**, while the visually similar `أبو عمر` starts **U+0623**. They are not
equal even after NFC normalisation, and `StaffMember.name` is unique — so a
name-matched write silently creates a duplicate instead of failing.

`--manager` also **scrambles that row's `pinHash`**. The manager authenticates
against `ManagerSecret.PRIMARY` and its `pinHash` is never read, so leaving the
old hash would mean the person's previous personal password silently became
valid again the moment the flag was ever cleared. After `--manager`, clearing the
flag leaves the row with **no usable password** until the seeder is re-run —
fail closed.

The break-glass code is **generated by the script**, displayed **once**, and is
unrecoverable afterwards — only its hash is stored. Nobody gets to choose a
memorable (and therefore guessable) emergency override.

Secrets never appear in: shell history, argv, env vars, committed files, logs,
error messages, or the audit trail.

## Brute-force protection

Two complementary layers — the short secrets mean throttling, not hash cost,
carries the load:

- **Rate limit** — 5 attempts / 15 min, keyed on `staffId + IP`
  (`confirmationRatelimit`). Stops bursts. In production, if Upstash is
  unconfigured this **fails closed**.
- **Lockout** — 5 consecutive failures sets `lockedUntil` 15 minutes out
  (`staff_members.failed_attempts` / `locked_until`). Catches a slow attacker who
  waits out each rate-limit window, since the counter accumulates across them.
  Cleared on any successful confirmation.

Both thresholds are 5, so against a single IP the **lockout** is what actually
fires first: attempts 1–5 spend the rate-limit budget while incrementing
`failed_attempts`, and the fifth failure sets `locked_until` — so attempt 5 comes
back `locked`, and only attempt 6 onward comes back `throttled`. The rate limit's
distinct job is capping the cost of a burst from one address; the lockout is the
layer that both catches patient, low-rate grinding and survives IP rotation.

**These two layers carry more weight than they used to.** On the two-factor path
they back up a pair of secrets; on the manager path they back up **one**, and
they are the only online defence there. Note also that the rate limit is keyed on
`staffId + IP`, so rotating source IPs buys an attacker a fresh window each time —
the **lockout** is the layer that constrains a distributed attempt, because its
counter lives on the staff row and is IP-independent. Do not weaken it without
re-reading [What this cost](#what-this-cost-stated-honestly).

Failures return **one generic message** (`Confirmation failed.`). Never surface
"wrong password" vs "wrong manager code" — that turns the dialog into an oracle.
This matters on the single-factor path too: the dialog shows one field, so any
distinction in the response would say directly whether the code was right.

### Unlocking someone early

```sql
UPDATE staff_members
SET failed_attempts = 0, locked_until = NULL
WHERE name = '<name>';
```

## Break-glass use

1. Staff still authenticate normally — you never lose **who** performed the action.
2. The break-glass code is entered in the manager-code field.
3. The use is flagged loudly: `used_break_glass = true` on the log row, plus a
   Sentry warning and a server-log line.
4. **Rotate immediately afterwards** by re-running the seeder.

### Monthly review

```sql
SELECT created_at, action, staff_name_snapshot, tracking_id_snapshot, admin_email, ip
FROM case_action_logs
WHERE used_break_glass = true
ORDER BY created_at DESC;
```

If this is non-empty in a normal month, the primary process is not working —
the manager is not reachable when they need to be. Fix the process, not the code.

### Single-factor review

Every action approved through the manager's one-code path is recorded with
`single_factor = true`. It is an **explicit column**, not inferred from the staff
name — names are mutable snapshots (this one has already been renamed once) and
inference would break silently if a second manager identity ever existed.

```sql
-- everything approved by one person rather than two
SELECT created_at, action, staff_name_snapshot, tracking_id_snapshot, admin_email, ip
FROM case_action_logs
WHERE single_factor = true
ORDER BY created_at DESC;
```

This is expected to be a large share of normal activity — it is the manager's
daily path, not an anomaly. What matters is the **failures**:

```sql
-- failed SINGLE-FACTOR attempts: the brute-force signal that matters most,
-- because that path has only one secret to guess
SELECT created_at, outcome, staff_id, ip, count(*) OVER (PARTITION BY ip) AS per_ip
FROM case_action_logs
WHERE single_factor = true AND outcome <> 'SUCCESS'
ORDER BY created_at DESC;
```

A cluster here, especially from varied IPs, means someone is grinding the manager
code. Rotate it immediately (`rotate-manager-code.ts`) and check whether the
admin login itself has been compromised — the gate is only reachable behind it.

### Other useful audit queries

```sql
-- failed / locked-out attempts (brute-force signal)
SELECT created_at, action, outcome, staff_id, ip
FROM case_action_logs
WHERE outcome <> 'SUCCESS'
ORDER BY created_at DESC
LIMIT 100;

-- full history for one case, readable even if the case was deleted
SELECT created_at, action, outcome, from_stage_id, to_stage_id,
       is_completed_before, is_completed_after, staff_name_snapshot
FROM case_action_logs
WHERE tracking_id_snapshot = 'AG-XXXXXX'
ORDER BY created_at;

-- who is currently locked out
SELECT name, failed_attempts, locked_until
FROM staff_members
WHERE locked_until > now();
```

## Audit trail guarantees

- Written in the **same transaction** as the mutation — a confirmed action cannot
  exist without its log line, and vice versa.
- **Failures are logged too** (`CONFIRMATION_FAILED`, `LOCKED_OUT`), never with
  the attempted secret.
- Both FKs are `ON DELETE SET NULL`, and `tracking_id_snapshot` /
  `staff_name_snapshot` are stored alongside them — deleting a case or a staff
  member **nulls the link but never erases the history**, and renaming staff never
  rewrites who did what.
- `is_completed_before` / `is_completed_after` are captured explicitly, because
  hiding the last visible stage can **complete a case with no stage change**.

## Staffing changes

- **Someone leaves** — set `is_active = false`. They disappear from both the
  confirmation picker and the "Received By" dropdown. Past cases keep their name,
  because `patient_cases.received_by` is a **snapshot, not a foreign key**.
  This applies to the manager too: `is_active` is checked **before** the
  `isManager` branch, so a deactivated manager cannot authenticate at all.
- **Someone joins** — add a row, then re-run the seeder to set their password
  (add the name to `STAFF_NAMES` in `prisma/seed-staff.ts` first).
- **Rename** — use `prisma/rename-staff.ts` (see above). Changes who can be
  picked going forward only; history is untouched.
- **The manager changes** — rename/flag the new person with
  `rename-staff.ts --manager`, clear the flag on the old one first (only one row
  may hold it, enforced by a partial unique index), then **rotate the manager
  code** — the outgoing manager still knows it, and it is now a complete
  credential on its own.

## Display name

Staff names render raw and untranslated in both locales, with one exception: the
manager row shows **"Manager" / "المدير"**, keyed off `isManager` rather than off
the stored name (`src/lib/staff-display.ts`). Keying off the name would re-couple
display to a mutable string, which is precisely the codepoint trap described
above.

This is **display only**. Wherever a staff name is a *value* — above all the
"Received By" picker, whose selection is stored as `PatientCase.receivedBy` — the
raw name is submitted, so a historical snapshot never depends on which language
the operator happened to be using. Cases logged before the rename therefore still
read `ابو عمر`, and that is correct: history is not rewritten.

## Deployment note

`prisma/migrations/20260728160000_add_staff_auth` is additive: 3 tables, 3 enums,
2 FKs. It performs **no DDL against `patient_cases`** (that table appears only as
an FK reference target). Adding the FK does briefly take a
`ShareRowExclusiveLock` on `patient_cases` to validate existing rows — instant at
current data volume, but not a zero-lock operation.

**The gate is inert until credentials are seeded.** Deploy order:

1. Back up (`pg_dump -Fc`, see the pattern in `docs/deploy.md`).
2. `npx prisma migrate deploy` — remember `directUrl` also points at production,
   so **both** `DATABASE_URL` and `DIRECT_URL` must be set to the intended target.
3. `npx tsx prisma/seed-staff.ts` against production.
4. Deploy the app.

### Migration `20260805132105_add_manager_single_factor`

Adds `staff_members.is_manager` and `case_action_logs.single_factor` (both
`NOT NULL DEFAULT false`), plus a **partial unique index**
`staff_members_one_manager … WHERE is_manager = true` so at most one manager can
ever exist. Additive; no DDL against `patient_cases`.

The index is hand-written SQL because Prisma cannot express a partial unique
constraint — it is therefore invisible to `schema.prisma`. Verified on Prisma
6.19 not to be reported as drift, but if a future version ever generates a `DROP`
for it, delete that statement rather than accepting it.

**This migration is INERT on deploy.** Both columns default to `false`, so
behaviour is unchanged until a staff row is explicitly flagged. Deploy order for
the single-factor feature:

1. Back up.
2. `npx prisma migrate deploy` — still inert at this point.
3. Deploy the app — still inert; no row is flagged yet.
4. `npx tsx prisma/rename-staff.ts --list`, confirm the target row and its
   codepoints, then re-run with `--id <cuid> --to "المدير" --manager` (dry run),
   then again with `--apply`. **The reduced path goes live at this step.**
5. `npx tsx prisma/rotate-manager-code.ts` — the code is now a complete
   credential on its own, and must meet the raised 6-character minimum.

Steps 4 and 5 are the ones that change security posture; 2 and 3 are safe to do
ahead of time.

### Before trusting this in production

The throttle and lockout are now the **entire** online defence behind the manager
identity, so they carry weight they did not carry before. Scratch/local testing
cannot prove them: `confirmationRatelimit` is null without Upstash, and a null
limiter simply allows every attempt. **Verify against real Upstash in the
production environment** that the 5-attempts-per-15-minutes window and the
5-failure lockout both actually fire for the manager row, before relying on
them.

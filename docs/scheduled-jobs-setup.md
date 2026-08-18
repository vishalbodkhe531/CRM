# Scheduled Jobs — Setup

The app has no in-process scheduler. Timed work runs because something outside
the app calls a protected endpoint on a schedule.

**Why not `node-cron` inside the API?** It fires once per running instance. The
moment the API scales to two replicas, every reminder is sent twice. This design
survives that.

---

## 1. Generate a secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set it as `INTERNAL_JOB_SECRET` in the API's environment. Minimum 32 characters —
the app refuses to start otherwise.

> A local development value has already been written to `backend/.env.development`
> (gitignored). **Generate a different one for production.**

If the variable is unset, `/api/v1/internal/*` refuses every request with a 403.
That is deliberate: an open job runner anyone on the internet can trigger is
worse than no job runner.

## 2. Point a scheduler at the endpoint

```
POST https://<your-api>/api/v1/internal/jobs/run
Header:  x-internal-secret: <INTERNAL_JOB_SECRET>
Body:    {}                        # all jobs
         {"jobs": ["follow-up-reminders"]}   # a subset
```

**Recommended cadence: every 15 minutes.** Follow-up reminders fire in a window
before the due time (as short as 15 minutes for `MINUTES_15`), so a longer gap
means some reminders arrive late or not at all.

### Render Cron Job

```yaml
services:
  - type: cron
    name: crm-jobs
    schedule: "*/15 * * * *"
    buildCommand: ""
    startCommand: >
      curl -fsS -X POST "$API_URL/api/v1/internal/jobs/run"
      -H "x-internal-secret: $INTERNAL_JOB_SECRET"
      -H "Content-Type: application/json"
      -d '{}'
```

### GitHub Actions

```yaml
name: Scheduled jobs
on:
  schedule:
    - cron: "*/15 * * * *"
  workflow_dispatch:

jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger CRM jobs
        run: |
          curl -fsS -X POST "${{ secrets.API_URL }}/api/v1/internal/jobs/run" \
            -H "x-internal-secret: ${{ secrets.INTERNAL_JOB_SECRET }}" \
            -H "Content-Type: application/json" \
            -d '{}'
```

> GitHub's scheduler is best-effort and can drift by several minutes under load.
> Fine for overdue notices and billing warnings; if punctual 15-minute reminders
> matter, use a platform cron instead.

---

## 3. The jobs

`GET /api/v1/internal/jobs` lists them (same secret required).

| Job | What it does | Recipient |
|---|---|---|
| `follow-up-reminders` | Fires in the window before a prospect follow-up is due, using that follow-up's own reminder setting (15m/30m/1h/1d, default 30m) | The follow-up's assignee |
| `follow-up-overdue` | Flags a follow-up whose time has passed. Looks back 3 days. | The follow-up's assignee |
| `subscription-warnings` | Trial ending (at 7, 3 and 1 days), payment overdue, subscription expired | Organization **admins** only |

Billing warnings deliberately never reach executives: they can do nothing about
it, and it is a disclosure they don't need.

---

## 4. Running twice is safe

Every notification a job creates carries a deterministic `dedupeKey` with a
unique index behind it. A repeated run inserts the same keys and Postgres drops
them.

This matters because schedulers **do** double-fire, and a retry after a timeout
is routine. The guarantee is enforced by the database, not by careful `WHERE`
clauses — so a bug in a job's query still cannot notify anyone twice.

Rescheduling a follow-up correctly produces a *new* reminder, because the key
includes the due timestamp.

Verified by `backend/src/scripts/verifyJobs.ts` (16/16), which runs the whole set
three times and asserts nothing is created after the first.

---

## 5. Monitoring

The endpoint returns **200 even when an individual job fails**, because a
non-2xx makes most schedulers retry, and retrying a run where three of four jobs
succeeded just redoes the work.

Alert on the `error` field in the response body, not on the HTTP status:

```json
{
  "ranAt": "2026-07-22T12:00:00.000Z",
  "totalCreated": 4,
  "results": [
    { "job": "follow-up-reminders", "created": 3, "skipped": 12, "durationMs": 84 },
    { "job": "subscription-warnings", "created": 1, "skipped": 0, "durationMs": 41 }
  ]
}
```

`skipped` counts deduplicated rows. A high `skipped` with `created: 0` is the
healthy steady state, not a problem.

Each job also logs to Winston with `job`, `created`, `skipped` and `durationMs`.

---

## 6. Known limits

- **In-app only.** `nodemailer` is a dependency but is unused anywhere in `src/`;
  nothing is emailed. A user who never opens the app is never reached.
- **Batch cap of 1000 prospects per reminder run.** A larger backlog drains
  across successive runs rather than turning one tick into an unbounded write.
- **Server-local time.** Follow-up times are interpreted in the API server's
  timezone. Fine while the business is single-region; revisit before selling
  across timezones.

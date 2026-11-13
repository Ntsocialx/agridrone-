# AgriDrone API

Express and TypeScript REST API, versioned under `/api/v1`, backed by Neon
Postgres.

## Requirements

- Node.js 22.13 or newer
- npm 11

## Setup and commands

```powershell
npm ci
Copy-Item .env.example .env   # then fill in DATABASE_URL and JWT_SECRET
npm run db:migrate            # applies new files in migrations/
npm run dev
npm run lint
npm run typecheck
npm test                      # uses in-memory PGlite, never your Neon database
npm run build
```

Create the first admin (admins can never sign up through the app):

```powershell
$env:ADMIN_EMAIL="you@example.com"; $env:ADMIN_NAME="Your Name"; $env:ADMIN_PASSWORD="<12+ chars>"
npm run create-admin
Remove-Item Env:ADMIN_PASSWORD
```

Check your Cloudinary keys with a live private upload/download/delete round-trip:

```powershell
npm run check:cloudinary
```

Uploads go straight from the phone to Cloudinary using a server-signed request;
the API secret never leaves the server. Licences are `authenticated` (no public
URL, max 5 MB, pdf/jpg/png) and need separate consent. Portfolio photos are
public (jpg/png/webp).

Migrations are plain SQL in `migrations/`, applied in name order and tracked in
`schema_migrations`. Never edit an applied file; add a new one.

## Endpoints

All routes except `auth` and `health`/`ready` need `Authorization: Bearer <token>`.
Errors are `{ "error": { "code", "message" } }`.

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| GET | `/health`, `/ready` | anyone | `ready` checks the database |
| GET | `/me` | signed in | own id, role, name, email, phone |
| PATCH | `/me` | pilot, farm owner | `{ fullName, phone, email, currentPassword? }`; password needed only to change email; audited |
| POST | `/me/password` | pilot, farm owner | `{ currentPassword, newPassword }`; audited |
| POST | `/me/avatar/upload-signature` | pilot, farm owner | signed Cloudinary upload for a profile picture (jpg/png/webp, 5 MB) |
| PUT/DELETE | `/me/avatar` | pilot, farm owner | `{ publicId }` attaches (replacing the old one) / removes; `GET /me` returns `avatarUrl` |
| POST | `/auth/register` | anyone | `role`: `operator` or `farm_owner`; `acceptTerms: true` required |
| POST | `/auth/login` | anyone | rate-limited; generic error |
| POST | `/auth/password/forgot` | anyone | `{ email }`; same reply whether or not the account exists; 503 without Brevo |
| POST | `/auth/password/reset` | anyone | `{ email, code, newPassword }`; 15-min code, single use, locks after 5 tries; returns a session |
| GET/PUT | `/operators/me` | operator | base, radius, services, province, RPL number/expiry, ROC holder/number/expiry, Class 3 medical expiry, flight hours, training provider/programme/date; locked while in review/approved; GET also sends due expiry reminders |
| POST | `/operators/me/update` | operator | approved → `updating` (edit details; keeps bidding until `eligibleUntil`) |
| POST | `/operators/me/submit` | operator | → `in_review`; 409 lists anything missing (all details + licence, ROC proof, medical certificate, training certificate, flight log) |
| GET | `/admin/operators?status=` | admin | `in_review`, `approved`, `rejected`, `updating`, or `expiring` (stops within 30 days) |
| POST | `/admin/operators/:id/decision` | admin | `rejected` needs `reason`; approval sets `eligibleUntil` to the earliest RPL/ROC/medical expiry (refused if already past); audited |
| GET | `/jobs?service=&q=` | signed in | marketplace (`open` + `on_hold`) |
| GET | `/jobs/mine` | owner, operator | posted / assigned jobs |
| POST | `/jobs` | farm owner | optional `province`; Spraying is created `on_hold` |
| GET | `/jobs/:id` | signed in | owners see all bids, operators only theirs |
| POST | `/jobs/:id/bids` | eligible operator | approved and `eligibleUntil` not passed; not on held jobs; one per job |
| POST | `/jobs/:id/select` | job's owner | `{ bidId }`; the pilot must still be eligible; transaction; audited |
| POST | `/jobs/:id/complete` | assigned operator | `assigned` → `pending_confirmation` |
| POST | `/jobs/:id/confirm` | job's owner | → `completed` |
| POST | `/jobs/:id/cancel` | job's owner | only `open`/`on_hold` |
| POST | `/reviews` | job's owner | `{ jobId, rating 1–5, comment }`; completed jobs only; one per job |
| POST | `/reviews/:id/report` | reviewed operator | `{ reason }`; once per review |
| GET | `/pilots/:id` | signed in | completed jobs, average rating, visible reviews |
| POST | `/operators/me/licence/consent` | operator | `{ accept: true }`; consent to the verification-documents notice (version 2026-11-13) |
| POST | `/operators/me/:kind/upload-signature` | operator | `kind`: `licence`, `roc`, `medical_certificate`, `training_certificate`, `flight_log` (need consent) or `portfolio` |
| POST | `/operators/me/:kind` | operator | each document kind above: `{ publicId }` (the id Cloudinary returns; spreadsheets get `.csv`/`.xlsx`/`.xls` added); verified, private, replaces the old file. Flight logs may be PDF, photo, Excel or CSV |
| POST | `/operators/me/portfolio` | operator | `{ publicId, caption }` |
| DELETE | `/operators/me/portfolio/:id` | operator | also deletes from Cloudinary |
| GET | `/admin/operators/:id/documents/:kind` | admin | any document kind: 5-minute private link; audited (`/licence` still works) |
| GET | `/admin/reviews/reports` | admin | open reports |
| POST | `/admin/reviews/:id/moderation` | admin | `{ action: "hide" \| "keep" }`; audited |
| GET | `/notifications` | signed in | latest 50: personal notices + admin broadcasts, with `read` |
| GET | `/notifications/unread-count` | signed in | `{ count }` for the bell |
| POST | `/notifications/read-all` | signed in | marks everything read |
| POST | `/jobs/:id/reports` | pilot, farm owner | `{ category, note }`; not your own job; once per job |
| GET/POST | `/admin/notifications` | admin | broadcast history / send `{ kind, title, body }` (kind `announcement` or `update`); audited |
| GET | `/admin/job-reports` | admin | open job reports |
| POST | `/admin/job-reports/:id/decision` | admin | `{ action, note }` (action `dismiss`, `resolve`, `remove_job` or `suspend_owner`); note required to remove/suspend; reporters notified; audited |
| GET | `/admin/users/suspended` | admin | suspended accounts |
| POST | `/admin/users/:id/unsuspend` | admin | audited |

Suspended accounts get `ACCOUNT_SUSPENDED` (403 at sign-in, 401 on a live session) with `SUPPORT_EMAIL` in the message; a suspended owner's open jobs are hidden from the marketplace until unsuspended.

Set `CORS_ORIGINS` to a comma-separated list of trusted browser origins.
Native mobile requests do not require a browser CORS origin.

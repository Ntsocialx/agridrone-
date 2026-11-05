# Documentation prompt (for Claude on the web)

Paste everything below the line into a new chat at claude.ai (ideally inside a Project) to generate the API documentation, system documentation and the project progress report & weekly tracker. Status as of 5 November 2026 (Week 4).

---

You are helping me produce professional project documentation for my Work-Integrated Learning (WIL) project, AgriDrone. Please create THREE separate documents (one artifact/document each), using only the facts below. Where something is missing (marked TO CONFIRM), ask me before inventing it. Keep the language plain and professional: the readers are my 4IR/AgriSETA supervisors and assessors, not only developers.

## Document header (use on all three documents)

```
4IR  |  AgriSeta
AgriDrone
Tagline: A South African mobile marketplace connecting farm owners with certified drone pilots for agricultural mapping, monitoring and surveying.
Prepared by: Tiyani Nkuna
Student number: 224732015
Organisations: 4IR · AgriSeta
Reporting period: 12 October – 13 November 2026
Report date: 5 November 2026 (Week 4)  [my earlier draft said 3 November; use 5 November because the work below runs up to 5 November]
Version: 1.0
```

## Project facts

### What it is
- Farm owners post agricultural drone jobs; admin-verified drone pilots ("operators") bid; the owner picks a pilot; the pilot completes the job; the owner confirms and rates the pilot.
- Services: Mapping, Monitoring, Surveying. Spraying is a RESTRICTED service: spraying jobs are created "on hold" for compliance and can never receive bids or be assigned.
- Roles: farm_owner, operator (pilot), admin. Admin accounts are created only by a server script; nobody can sign up as admin.
- Compliance: POPIA-aware (recorded consent for terms/privacy and a separate consent for licence uploads, data minimisation, audit log of sensitive actions). Admin licence checks are internal checks, not aviation-authority approval.

### Tech stack
- Mobile app: Expo SDK 58, React Native 0.88, React 19.3, TypeScript, Expo Router (file-based navigation, protected routes), NativeWind (Tailwind styling), react-native-svg. Runs on iPhone via Expo Go and in a web browser.
- API: Node.js + Express 5 + TypeScript, Zod validation, JWT sessions (1 hour), bcrypt password hashing, Helmet, rate limiting on sign-in/password routes.
- Database: Neon serverless PostgreSQL (region us-east-2). Plain SQL migrations 001–006, tracked in a schema_migrations table.
- Hosting: Render web service (free plan, Ohio), deployed from a render.yaml Blueprint; auto-deploys on push to the main branch. Live API base URL: https://agridrone-api-olnv.onrender.com/api/v1
- File storage: Cloudinary, with server-signed direct uploads (the secret never leaves the server). Pilot licences are private ("authenticated"); admins open them through a 5-minute signed link, and every view is audited. Portfolio photos and profile pictures are public delivery.
- Email: Brevo transactional email, used to send password-reset codes.
- Source control: GitHub repository (Ntsocialx/agridrone-), with branches main, dev and master kept in sync.
- Testing: Vitest + Supertest against an in-memory PGlite Postgres. 40 automated API tests, all passing. App typecheck and lint pass.

### Database (migrations)
- 001_core: users, consents, operator_profiles (base, radius, services, verification status/reason), jobs (status: open, on_hold, assigned, pending_confirmation, completed, cancelled), bids, audit_log
- 002_reviews: reviews (1–5 stars + comment, one per completed job, can be hidden), review_reports
- 003_uploads: uploads (licence = private, one per pilot; portfolio = public)
- 004_password_resets: hashed 6-digit codes, 15-minute expiry, single use, lock after 5 wrong tries
- 005_notifications_reports: notifications (personal or broadcast) + notification_reads, job_reports (categories: fraud, fake_listing, unsafe_flying, harassment, other), user suspension (suspended_at, reason), job status "removed" with removed_reason
- 006_avatars: profile pictures (one per user)

### Job status flow
open → (owner selects a bid) assigned → (pilot marks complete) pending_confirmation → (owner confirms) completed → owner may rate the pilot.
Owner can cancel only open/on_hold jobs. Admin can "remove" an open/on_hold job after a violation report. Spraying: on_hold only.

### App screens
Welcome (AgriSETA logo with two sun rings, maize-field photo, "Get started" pill, footer "Terms and Conditions | Powered by 4IR"), Sign in (pilot/farm owner vs admin switch, show/hide password, forgot password), Create account (password typed twice, terms consent), Forgot password (emailed 6-digit code), Find jobs (pilot marketplace with search and filters), My jobs (with next-step hints), Post a job, Job details (one clear action per role and status, place-a-bid sheet, "Report this job post"), Review bids, Rate your pilot, Pilot public profile (rating, completed jobs, portfolio, reviews), Pilot profile (service details, licence upload, portfolio, verification submit), Farm owner profile, Account card (Edit details, Change password), Profile picture (camera or library, square crop), Notifications (bell with unread count in the headers), Report job post, Admin console (tabs: Pilots verification | Reports: job posts, reviews, suspended accounts | Notify: broadcast Announcement or App update to everyone). Animated drone loading screen while the free server wakes up.

### Key features
- Accounts: register, sign in, password reset by email, edit name/phone/email (current password required to change email), change password, profile picture, sign out from Profile.
- Pilot verification: licence upload (photo or PDF, with separate consent) → submit → admin approves, or rejects with a reason.
- Marketplace and bidding, owner selection (transactional), two-step completion, ratings and reviews; pilots can report a review and the admin hides or keeps it.
- In-app notifications (no phone push, by design for the MVP): admin broadcasts to everyone tagged "Announcement" or "App update", plus automatic notices for job activity (new bid, selected, marked complete, confirmed), verification results, reviews, report outcomes and job removal.
- Violation reports on job posts: the reporter picks a category and adds a note; the admin can dismiss, mark resolved, remove the post (the reason is shown to the owner), or suspend the owner. Suspended users can't sign in (they see an appeal message with a support email), and their open jobs are hidden from the marketplace while in-progress jobs stay; the admin can unsuspend. Every decision is audited and the reporters are notified.

### API endpoints
All under /api/v1; errors are `{ "error": { "code", "message" } }`; all routes except health/ready and auth need `Authorization: Bearer <token>`.

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| GET | /health, /ready | anyone | ready checks the database |
| POST | /auth/register | anyone | role operator or farm_owner; acceptTerms: true |
| POST | /auth/login | anyone | rate-limited; generic error; 403 ACCOUNT_SUSPENDED if suspended |
| POST | /auth/password/forgot | anyone | { email }; same reply whether or not the account exists; 503 if email isn't configured |
| POST | /auth/password/reset | anyone | { email, code, newPassword }; returns a session |
| GET | /me | signed in | id, role, fullName, email, phone, avatarUrl |
| PATCH | /me | pilot, farm owner | { fullName, phone, email, currentPassword? }; password only needed to change email; 409 if the email is taken; audited |
| POST | /me/password | pilot, farm owner | { currentPassword, newPassword }; audited |
| POST | /me/avatar/upload-signature | pilot, farm owner | signed Cloudinary upload (jpg/png/webp, 5 MB) |
| PUT / DELETE | /me/avatar | pilot, farm owner | attach { publicId } (replaces the old one) / remove |
| GET/PUT | /operators/me | operator | pilot profile; locked while in review or approved |
| POST | /operators/me/submit | operator | → in_review |
| POST | /operators/me/licence/consent | operator | { accept: true }; recorded with version |
| POST | /operators/me/:kind/upload-signature | operator | kind licence (needs consent) or portfolio |
| POST | /operators/me/licence | operator | { publicId }; verified; replaces the old licence |
| POST | /operators/me/portfolio | operator | { publicId, caption } |
| DELETE | /operators/me/portfolio/:id | operator | also deletes from Cloudinary |
| GET | /jobs?service=&q= | signed in | marketplace (open + on_hold, excludes suspended owners) |
| GET | /jobs/mine | owner, operator | posted / assigned jobs |
| POST | /jobs | farm owner | Spraying is created on_hold |
| GET | /jobs/:id | signed in | owners see all bids, operators only their own |
| POST | /jobs/:id/bids | approved operator | not on held jobs; one per job; notifies the owner |
| POST | /jobs/:id/select | job's owner | { bidId }; transaction; audited; notifies the pilot |
| POST | /jobs/:id/complete | assigned operator | assigned → pending_confirmation; notifies the owner |
| POST | /jobs/:id/confirm | job's owner | → completed; notifies the pilot |
| POST | /jobs/:id/cancel | job's owner | only open/on_hold |
| POST | /jobs/:id/reports | pilot, farm owner | { category, note }; not your own job; once per job |
| POST | /reviews | job's owner | { jobId, rating 1–5, comment }; completed jobs only; one per job |
| POST | /reviews/:id/report | reviewed operator | { reason }; once per review |
| GET | /pilots/:id | signed in | completed jobs, average rating, visible reviews, portfolio |
| GET | /notifications | signed in | latest 50 with a read flag |
| GET | /notifications/unread-count | signed in | { count } |
| POST | /notifications/read-all | signed in | marks all read |
| GET | /admin/operators?status= | admin | in_review / approved / rejected |
| POST | /admin/operators/:id/decision | admin | approved, or rejected + reason; audited; notifies the pilot |
| GET | /admin/operators/:id/licence | admin | 5-minute private link; audited |
| GET | /admin/reviews/reports | admin | open review reports |
| POST | /admin/reviews/:id/moderation | admin | { action: hide or keep }; audited |
| GET/POST | /admin/notifications | admin | broadcast history / send { kind: announcement or update, title, body }; audited |
| GET | /admin/job-reports | admin | open job reports |
| POST | /admin/job-reports/:id/decision | admin | { action: dismiss / resolve / remove_job / suspend_owner, note } (note required to remove or suspend); audited |
| GET | /admin/users/suspended | admin | suspended accounts |
| POST | /admin/users/:id/unsuspend | admin | audited |

### Timeline (from the Git history)
- Week 1 (12–18 Oct): TO CONFIRM (planning, requirements, Figma design work?)
- Week 2 (19–25 Oct): 23 Oct: repository created; runnable mobile and API foundations
- Week 3 (26 Oct–1 Nov): 26 Oct: mobile development workflow configured; Figma screen inventory documented
- Week 4 (2–8 Nov):
  - 3 Nov: interactive demo of the 8 MVP screens; Neon-backed API (auth, job flow, verification, reviews); Cloudinary uploads; Render deployment; app connected to the live API; My Jobs / Pilot Profile / Rate screens; iPhone photo fix; drone loading animation; password reset by email; new sign-in screen
  - 5 Nov: web preview fixed; new welcome screen (AgriSETA logo, sun rings, maize background, 4IR footer); upload fixes for browser and phone; Sign out moved to Profile; farm owner Profile tab; edit details and change password; in-app notifications and admin broadcasts; job-post violation reports with remove/suspend/unsuspend; profile pictures
- Week 5 (9–13 Nov): remaining work (see backlog)

### Backlog / open items
1. Restyle every screen to match the Figma Make prototype exactly (blocked: waiting on the Figma Make code export)
2. Full end-to-end test on iPhone (Expo Go) of every flow
3. Set the SUPPORT_EMAIL for suspended-account appeals (TO CONFIRM: address)
4. Cancel-job button in the app (the API already supports it)
5. Privacy documentation (purpose, access, retention, deletion, data-subject requests, incident response)
6. OpenAPI (Swagger) specification
7. Use sslmode=verify-full on the database connection
8. "Stay signed in" (sessions currently expire after 1 hour)
9. Render free-plan cold starts (paid plan or uptime ping)
10. Own email domain for better reset-email delivery (optional)
11. Real app build for TestFlight/App Store via EAS (later)
12. Terms link on the sign-up checkbox
13. Phone push notifications (deliberately out of MVP scope)

### Risks to mention
Free hosting cold starts; dependence on third-party services (Render, Neon, Cloudinary, Brevo); spraying regulation (kept on hold); POPIA obligations for licences and personal data; a single developer.

## What to produce

### Document 1: API documentation
- Overview, base URL, authentication (Bearer JWT, 1-hour expiry), roles, error format and common error codes (UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, VALIDATION_ERROR, INVALID_CREDENTIALS, WRONG_PASSWORD, EMAIL_TAKEN, INVALID_CODE, ACCOUNT_SUSPENDED, EMAIL_NOT_CONFIGURED), rate limits.
- Endpoints grouped by area (System, Auth, My account, Pilot profile & uploads, Jobs & bids, Reviews, Notifications, Reports, Admin). For each: method, path, who can call it, request body, example response, possible errors.
- The upload flow explained step by step (get a signature → upload directly to Cloudinary → attach on the API).
- Job status diagram.
- Never include real keys or passwords; use placeholders like `<token>`.

### Document 2: System documentation
- Purpose and scope, users and roles, the main user journeys (farm owner, pilot, admin) as step lists.
- Architecture diagram (phone/web app → Render API → Neon; app → Cloudinary direct upload; API → Brevo email), tech stack table, folder structure (mobile/, server/, docs/, render.yaml).
- Data model (tables and relationships) as an ER diagram.
- Security and privacy: hashing, JWT, rate limits, role checks on the server, private licences, consent records, audit log, suspension.
- Deployment and operations: environment variables (names only: DATABASE_URL, JWT_SECRET, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, BREVO_API_KEY, MAIL_FROM_EMAIL, MAIL_FROM_NAME, SUPPORT_EMAIL, CORS_ORIGINS), how to run locally, run tests, apply migrations, create an admin, deploy.
- Known limitations and future work.

### Document 3: Project progress report & weekly tracker
- Use the header above exactly.
- Executive summary (a short paragraph on where the project stands).
- Overall progress (percentage complete with how it was estimated) and a milestone table.
- Weekly log for Weeks 1–5 (what was done, outcomes, hours if I give them), using the timeline above.
- A task tracker table: ID, task, area (Mobile / API / Database / Uploads / Email / Design / Docs / Deployment / Testing), status (Done / In progress / Blocked / To do), priority, owner (Tiyani Nkuna), due week, notes. Include every completed feature and every backlog item.
- Blockers, risks with mitigation, decisions log (ratings in MVP, in-app-only notifications, admins by script only, AgriSETA logo used with permission, spraying on hold), and next week's plan.
- Make the tracker easy to update: when I later say "mark X done", "add task Y" or "Week 5 update: …", update it and show the new version.

## How to work with me
- First, list any TO CONFIRM questions in one short message (for example: Week 1 activities, my supervisor's name, hours worked, the support email, whether you want Word/PDF output). Then produce the documents.
- Use tables and diagrams (Mermaid is fine) where they help. Keep each document self-contained.
- Use plain English and explain technical terms briefly the first time they appear.
- Don't invent features, dates, names or numbers that aren't above.

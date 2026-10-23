# AgriDrone --- Master Coding-Agent Prompt

**Purpose:** Build the AgriDrone MVP in the existing VS Code project.
Treat this prompt, the repository, the TUT WIL Full-Stack Programme
Student Guide v1.0, and the linked Figma prototype as project
references. Do not start implementation until the user approves a
written plan.

## 1. Your role and operating rules

You are the senior full-stack/mobile engineer, product-minded architect,
QA engineer, and security reviewer for AgriDrone. Work incrementally,
explain important decisions, and produce code the student can understand
and defend.

**Mandatory plan-first gate** 1. Inspect the existing repository and
relevant project files before changing anything. Preserve existing work;
do not overwrite or scaffold over a working implementation without
approval. 2. Read `AGENTS.md`, `docs/AGENTS.md` if present, all relevant
`README` files, the TUT WIL Full-Stack Programme Student Guide v1.0 if
accessible in the workspace, and existing tests/configuration. 3.
Inspect the Figma prototype directly:
https://www.figma.com/make/ZW17DSdkpWRKGq0wWrny3w/AgriDrone-Mobile-MVP-Redesign?t=MzOBXo6hj94YSum8-1
. Capture its screens, design tokens, navigation, states, components,
and interactions in a design inventory. **Do not invent a replacement
UI.** Reproduce the prototype as closely as practical. If the link is
inaccessible from the coding environment, say so explicitly, ask the
user to provide exported screenshots or a PDF, and do not claim to have
reviewed it. You may continue non-visual planning, but do not implement
UI based on guesswork. 4. Write a detailed, reviewable plan to
`docs/prompts/00-project-plan.md` before implementation. Include current
repository state, assumptions, unresolved questions, architecture,
milestones, files to create/change, database/API contract, threat model,
tests, deployment, and acceptance criteria. 5. Present the plan and
wait. Do not modify implementation files, run destructive commands,
apply migrations, create cloud resources, or deploy until the user
explicitly approves the relevant stage. 6. After approval, implement
**one stage at a time**. Before each stage, write or update
`docs/prompts/<stage>-plan.md`, list exact changes and test commands,
and wait for approval. If the user explicitly approves a whole named
batch, follow that scope only. Stop for approval whenever scope, schema,
security posture, data handling, legal assumptions, or UI materially
changes. 7. After each stage, report changed files, decisions, commands
run, test results, known limitations, and the next approval needed. Do
not claim tests passed unless you ran them and observed the result. 8.
Never fabricate project files, test results, design inspection,
credentials, deployment status, legal approval, or certification checks.
Do not expose chain-of-thought; provide concise rationale and verifiable
outcomes.

## 2. Project facts and selected decisions

-   Product name: **AgriDrone**.
-   Purpose: connect farms that need lawful drone-based surveying,
    mapping, monitoring, and inspection with operators who have
    appropriate verified credentials, helping trained operators find
    legitimate work.
-   Existing repository structure must be preserved:
    -   `mobile/` --- React Native app built with Expo, TypeScript, and
        NativeWind.
    -   `server/` --- Node.js, Express, TypeScript REST API.
    -   `docs/` --- product, design, API, privacy, testing, deployment
        and prompt documentation.
-   Database: PostgreSQL on Neon.
-   Authentication: email/password and signed JWT access tokens. Use
    `expo-secure-store` for mobile token storage, never plain
    AsyncStorage for auth tokens.
-   Upload provider: Cloudinary, but licence documents must be handled
    as private/sensitive evidence. Do not assume that a public
    Cloudinary URL is safe. Use server-created, short-lived signed
    upload flows where appropriate, authenticated/private delivery,
    strict resource access rules, and a server-side record of the asset.
    Verify current Cloudinary capabilities and plan limits before
    choosing a specific private-delivery design. If the selected plan
    cannot protect documents adequately, stop and ask before
    substituting storage.
-   Roles: `operator`, `farm_owner`, `admin`.
-   Job workflow: operators may submit bids and/or express direct
    acceptance interest depending on the job's configured mode; the farm
    owner makes the final selection/confirmation. Prevent duplicate,
    conflicting or unauthorized transitions.
-   Payments: excluded from MVP. A price/agreed fee may be recorded as
    informational text/amount, but no payment processing, wallet,
    escrow, invoicing automation, or payout logic.
-   Notifications: in-app notifications only. No push-notification
    infrastructure in MVP.
-   Legal: require explicit Terms & Conditions acceptance at
    registration, and separate informed consent before uploading licence
    documents. Show aviation-compliance warnings and block
    restricted/unverified actions as specified.
-   Scope: strict MVP. Ratings/reviews, online payments, push
    notifications, advanced analytics, multi-tenant enterprise tools and
    advanced route planning are out of scope unless the user approves a
    change.
-   Mobile: Expo native app, not a PWA for this deliverable. Do not
    silently add a web/PWA client. The TUT guide describes PWA as the
    core stream and Expo as a stretch outcome; the user has explicitly
    selected Expo. Record this as an approved project-specific
    deviation, keep the same API contract suitable for another client
    later, and mention it in project documentation.
-   Hosting: API on Render; database on Neon; uploaded assets on
    Cloudinary. The user configures secrets and account settings. Do not
    ask the user to paste secrets into chat or commit them.

## 3. Requirements references and source discipline

Use the TUT WIL Full-Stack Programme Student Guide v1.0 as the academic
engineering baseline. Apply its principles: - define measurable problem,
constraints, assumptions, scope, personas, and success tests; - write an
AI rulebook and have plans reviewed before code; - build the design and
contracts before integration; - version the API and use consistent error
responses; - use parameterized SQL, server-side validation, role and
ownership checks, hashed passwords, short-lived tokens, HTTPS, limited
CORS, secret management and least-privilege data access; - test unit
behaviour, API contracts, security, and the end-to-end golden journey; -
use synthetic data in development/demo; never commit secrets; - keep
understandable Git commits, update documentation/logbook, declare AI
assistance, and verify rather than assuming code is correct. If the
guide is unavailable in the workspace, state that and ask the user to
make it available; do not claim to have read hidden content. Use
existing repository documentation as authoritative for current
implementation facts.

## 4. Problem, users and measurable outcomes

### Problem statement

Drone operators may complete training/licensing but lack a trustworthy
path to relevant work. Farms may struggle to find operators whose
credentials and services match a job. AgriDrone provides a role-based
marketplace for job discovery, credential review, and transparent farm
selection.

### Personas

-   **Operator:** creates a profile, submits licence/certificate
    evidence, waits for admin verification, browses jobs, submits a bid
    or direct-interest response, tracks selection and job status.
-   **Farm owner:** creates a farm/business profile, posts a job with
    service type, location, date/time, description and requirements,
    reviews eligible operators/bids, confirms a selected operator and
    updates job status.
-   **Administrator:** reviews credential evidence, records a
    verification decision and reason, manages user/job reports if
    included in the approved MVP, and views an auditable record of
    administrative actions. Admin privileges must never be self-assigned
    through public registration.

### MVP success tests

1.  An operator can register, accept Terms & Conditions, complete a
    profile, consent to upload a licence, and submit the document
    securely.
2.  An admin can review the credential and approve, reject, or request
    resubmission with a recorded reason; unverified operators cannot
    accept, bid on, or be selected for jobs where verification is
    required.
3.  A farm owner can create a job, eligible operators can bid or express
    interest, and the farm owner can select and confirm one operator
    without race-condition duplicates.
4.  All protected API routes enforce token validity, role, ownership and
    record status on the server.
5.  Tests demonstrate the golden journey and denial cases; deployment
    instructions work from a clean checkout without committed secrets.

## 5. MVP scope

### In scope

-   Onboarding and login/logout for operator and farm-owner roles;
    administrator accounts provisioned through a secure controlled
    process.
-   JWT auth, role middleware, secure mobile token storage, profile
    retrieval/update.
-   Operator profile and credential metadata; secure licence document
    upload and status tracking.
-   Admin credential review: pending, approved, rejected, resubmission
    required; reviewer, timestamp and reason captured.
-   Farm profile and job CRUD with status, service category, location,
    schedule, description, requirements, optional budget/agreed fee.
-   Job browsing/search/filter by service type, location/area and date
    where practical.
-   Job participation in both modes: bid and direct interest/acceptance
    request. Farm owner confirms one candidate; explicit state
    transitions and notifications.
-   Job statuses with a documented state machine (for example `draft`,
    `open`, `in_review`, `assigned`, `in_progress`, `completed`,
    `cancelled`); refine exact statuses in the approved plan.
-   In-app notification inbox for material events: verification result,
    bid/interest update, selection/confirmation, job cancellation/status
    update.
-   Device location permission only when needed for selecting/viewing a
    job site; provide manual location entry and never require continuous
    background tracking.
-   Photo/document selection through Expo image/document pickers;
    compress ordinary job photos if used. Do not put licence documents
    in public job images.
-   Consent records and versions of Terms & Conditions/privacy notice.
-   Admin audit events for sensitive decisions and changes.
-   API documentation (OpenAPI), database migrations, seed data using
    synthetic users only, tests, README, deployment/runbook, and project
    logbook support.
-   Clear empty/loading/error/offline states and mobile-first accessible
    interface that follows Figma.

### Out of scope unless explicitly approved

-   Payments, escrow, wallets, payouts, or payment-provider integration.
-   Ratings/reviews (stretch goal only), chat, live tracking, flight
    planning, drone telemetry, autonomous flight controls, crop
    diagnosis/AI analysis, external job feeds, social network,
    multi-language implementation, push notifications, and a web/PWA
    client.
-   Legal determination that a particular flight or service is lawful.
    The app can warn, collect evidence and gate platform features; it
    cannot replace SACAA/CAA authorisation, operational approvals,
    insurance, landowner permission or professional/legal advice.

## 6. South African aviation and platform safeguards

Treat this as a safety-sensitive marketplace. Do not imply that an
uploaded document alone proves that an operator or proposed operation is
lawful. - Research current authoritative South African Civil Aviation
Authority (SACAA) rules and relevant regulations before implementing
compliance copy or rules. Cite official sources in
`docs/compliance/south-african-aviation.md`, record access date, and
flag unresolved interpretation for user/legal review. Do not present AI
output as legal advice. - Distinguish operator credential verification
from approval for a particular operation, aircraft, service or location.
Admin approval on AgriDrone is an internal platform status, not
government certification. - Require appropriate credential status before
job participation; where a job/service has additional legal
requirements, do not let the platform claim it is approved unless those
requirements have been validated by a qualified reviewer and the user
explicitly approved the policy. - Restricted/high-risk services
(including agricultural spraying/dispensing) must display a prominent
warning and must not be presented as automatically permitted. Unless a
reviewed policy explicitly enables the service and captures required
approvals, disable posting/acceptance for it or mark it "requires manual
compliance review" and block assignment until review. - Provide a
report/flag route or documented escalation path for suspected unlawful
jobs. Preserve an audit record of compliance holds and decisions. - Do
not provide flight instructions, bypass methods, or workflows intended
to evade licensing or airspace restrictions. - Keep compliance rules
configurable and documented rather than hard-coded as claims of law.

## 7. Privacy, consent and data minimisation

Design for South Africa's Protection of Personal Information Act
(POPIA). This is engineering guidance, not legal advice. - Before
registration, show plain-language privacy notice and Terms & Conditions,
their version/effective date, and required acceptance. Store user,
document version, timestamp and relevant consent metadata. Do not bundle
unrelated optional marketing consent with required terms. - Before
licence upload, display a separate just-in-time notice explaining
purpose, who can review it, storage/provider, retention approach, access
limits, how to request correction/deletion, and that upload is optional
until needed for verification. Record affirmative consent and notice
version before accepting upload. - Collect only necessary profile and
credential data. Do not collect ID numbers, biometrics, health
information or children's data unless a documented, justified and
legally reviewed requirement is approved. Use synthetic data in
development. - Provide documented workflows for
access/correction/deletion requests and retention/deletion of licence
files and account data. Deletion may be subject to lawful recordkeeping
needs; disclose exceptions and require a human/legal policy decision
rather than silently retaining indefinitely. - Use private asset
delivery and least-privilege access. Do not return raw private document
URLs in public APIs, logs, analytics or notifications. Do not log
tokens, passwords, upload signatures, full document contents or
unnecessary personal data. - Record consent and administrative
verification decisions as auditable events. Do not treat consent as
irrevocable; document withdrawal handling and legal retention
exceptions. - Include a data inventory, purpose/retention matrix,
incident response notes and data-subject request instructions in
`docs/privacy/`. - No real personal data in seed data, screenshots, test
fixtures, or demos.

## 8. Required technical architecture

### `mobile/`

-   Expo + React Native + TypeScript + NativeWind.
-   Expo Router if the repository does not already use another coherent
    navigation pattern; confirm in plan.
-   Shared typed API client for `/api/v1`, centralized auth/session
    handling, role-aware route guards, reusable components, form
    validation, accessible touch targets, and predictable loading/error
    states.
-   `expo-secure-store` for JWT storage. Do not persist tokens in
    AsyncStorage, logs or source code.
-   Location and image/document permissions requested contextually, with
    graceful denial/fallback.
-   No secrets in `EXPO_PUBLIC_*`; these variables are public client
    configuration only (e.g. API base URL).
-   Configure Android/iOS permissions minimally. Explain local
    development networking: a physical phone cannot use the developer
    computer's `localhost`; use LAN IP or deployed API.

### `server/`

-   Node.js LTS, Express, TypeScript.
-   REST API rooted at `/api/v1`.
-   PostgreSQL on Neon using `pg` and parameterized SQL by default
    unless the existing repository has an approved ORM. Keep migrations
    explicit and repeatable.
-   Zod or equivalent schema validation at every external input
    boundary.
-   Password hashing with a maintained password-hashing library (bcrypt
    as taught in the guide, or Argon2 if justified); never plaintext.
-   JWT verification middleware, role checks, resource ownership checks,
    rate limits on auth and upload endpoints, security headers, strict
    CORS configuration, request-size limits, and central error handling.
-   OpenAPI contract, structured non-sensitive logging, health/readiness
    endpoints, graceful shutdown and safe DB pool management.
-   Use database transactions for multi-step job selection and
    credential decisions.
-   Never trust a client-supplied role, user ID, verification status,
    owner ID, price status, or audit actor. Derive actor identity from
    the verified JWT.

### `docs/`

Maintain product and engineering docs. At minimum: - `docs/AGENTS.md`
(this rulebook if not already present; merge carefully). -
`docs/prompts/00-project-plan.md` and approved per-stage plans. -
`docs/requirements/requirements.md` (personas, constraints, assumptions,
in/out of scope, success tests). - `docs/design/figma-inventory.md`
(screens, tokens, navigation, component states and gaps). -
`docs/architecture/architecture.md` (context, component diagram, trust
boundaries, key decisions). - `docs/database/data-dictionary.md` and
migration instructions. - `docs/api/openapi.yaml` plus endpoint
guide/examples. - `docs/privacy/data-inventory.md`,
`docs/privacy/consent-and-retention.md`, and request/deletion process. -
`docs/compliance/south-african-aviation.md`. -
`docs/testing/test-plan.md`, golden-journey checklist and defect log. -
`docs/deployment/render-neon-cloudinary.md`, `.env.example` files,
incident/rollback runbook. - `docs/logbook/` or a guide-compatible
logbook file recording weekly goal, work/learning, problems/solutions,
AI assistance, evidence and next plan.

## 9. Data model --- draft to confirm in plan before migration

Design normalized relational tables with UUID primary keys, UTC
timestamps (`timestamptz`), foreign keys, indexes, constraints and
explicit deletion policy. Never migrate until schema plan is approved.

Suggested entities: - `users`: id, email (normalized unique),
password_hash, role (`operator`/`farm_owner`/`admin`), account_status,
email_verified_at if implemented, created_at, updated_at. -
`terms_acceptances`: id, user_id, document_type, document_version,
accepted_at, notice metadata. - `operator_profiles`: user_id,
display_name, contact fields only as necessary, service area, bio,
verification summary/status. - `operator_licences`: id,
operator_user_id, licence_type, issuing_authority, credential_reference
only if needed, expiry_date if applicable, status (`pending`,
`approved`, `rejected`, `resubmission_required`, `expired`), private
asset identifier, submitted_at, reviewed_by, reviewed_at,
reviewer_reason, consent_record_id. Avoid public exposure of identifiers
and document links. - `farms`: id, owner_user_id, farm_name, location
text, optional coordinates, contact details, created_at. - `jobs`: id,
farm_id, created_by, title, description, service_type, service_mode
(`bid`, `direct_interest`, `both`), location text and optional
coordinates, scheduled_start/end, requirements, optional budget
amount/currency, compliance_status, job_status, created_at, updated_at,
closed_at. - `job_bids`: id, job_id, operator_user_id, proposal/message,
optional proposed_amount, status, created_at, updated_at; unique
constraint as needed to prevent duplicate active submissions. -
`job_assignments` or selection fields: represent one confirmed operator
per job, selected by farm owner, confirmed_at, status; enforce one
active assignment per job with a transaction/constraint. -
`notifications`: id, recipient_user_id, type, title/body with minimal
personal information, related resource, read_at, created_at. -
`admin_audit_events`: id, actor_user_id, action, entity_type/id, reason,
minimal metadata, created_at. - `compliance_reviews` or holds for
restricted services: job/service, reviewer, status, rationale,
timestamps. - `upload_assets`: provider, asset identifier/public ID,
resource type, privacy/access classification, owner, purpose, deletion
status/timestamps; do not store public URLs for sensitive files. -
Optional `consent_events` if terms acceptances are insufficient for
distinct upload consent; model consent version, purpose, affirmative
action, timestamp and withdrawal. Do not overbuild. In the approved plan
decide whether to combine/split tables, define enum/check constraints,
indexes, cascade/restrict rules, retention, and state transitions.
Include up/down migrations or a documented forward-only strategy and
safe seed script.

## 10. REST API contract --- draft to confirm in plan

Version all routes under `/api/v1`; use consistent JSON error shape
`{ "error": { "code": "SOME_CODE", "message": "Safe message", "requestId": "..." } }`.
Document pagination, validation, auth requirements, response schemas and
status codes in OpenAPI. Never expose password hashes, private document
URLs, JWTs, or internal stack traces.

### Auth and account

-   `POST /api/v1/auth/register` --- operator/farm-owner registration
    only; validate terms acceptance and version; never permit public
    admin role.
-   `POST /api/v1/auth/login`
-   `POST /api/v1/auth/logout` --- document JWT stateless logout
    semantics; if revocation is required, design it explicitly.
-   `GET /api/v1/auth/me`
-   `PATCH /api/v1/users/me`
-   Optional password reset only if approved with secure single-use,
    hashed, expiring tokens and generic responses.

### Operator credentials

-   `GET /api/v1/operators/me`
-   `PATCH /api/v1/operators/me`
-   `POST /api/v1/operators/me/licences/upload-intent` --- only after
    separate consent; server authorizes purpose/type/size and creates a
    short-lived signed upload authorization.
-   `POST /api/v1/operators/me/licences` --- register verified upload
    metadata after server-side validation.
-   `GET /api/v1/operators/me/licences`
-   Admin only: `GET /api/v1/admin/licences?status=pending`,
    `GET /api/v1/admin/licences/:id` via controlled private delivery,
    `POST /api/v1/admin/licences/:id/review` with
    approved/rejected/resubmission-required and reason.
-   Never allow user to set own licence status.

### Farms and jobs

-   `POST /api/v1/farms`, `GET /api/v1/farms/me`,
    `PATCH /api/v1/farms/:id`.
-   `GET /api/v1/jobs` with validated search/filter/pagination; public
    listing responses contain no private owner/operator data.
-   `POST /api/v1/jobs` (farm owner), `GET /api/v1/jobs/:id`,
    `PATCH /api/v1/jobs/:id`, `POST /api/v1/jobs/:id/cancel`.
-   `POST /api/v1/jobs/:id/bids` (verified eligible operator; only if
    job mode allows bidding).
-   `POST /api/v1/jobs/:id/interest` (verified eligible operator; only
    if job mode allows direct interest).
-   `GET /api/v1/jobs/:id/candidates` (owning farm only).
-   `POST /api/v1/jobs/:id/select` (farm owner selects a candidate;
    transactional, only one active assignment; compliance gate
    enforced).
-   `POST /api/v1/jobs/:id/confirm` or an equivalent explicit
    confirmation route if workflow design needs both parties to confirm.
    Specify exactly who confirms and when in the plan; do not duplicate
    state-changing endpoints without reason.
-   `PATCH /api/v1/jobs/:id/status` for allowed post-assignment
    transitions with actor authorization.
-   `GET /api/v1/operators/me/jobs` and `GET /api/v1/farms/me/jobs`.

### Notifications and admin

-   `GET /api/v1/notifications`, `PATCH /api/v1/notifications/:id/read`,
    `PATCH /api/v1/notifications/read-all`.
-   `GET /api/v1/admin/audit-events` (admin only, paginated, restricted
    fields).
-   `GET /api/v1/health` and `/api/v1/ready` (no secret/config detail).
    Do not implement every route blindly; approved API contract controls
    the build.

## 11. Upload security requirements

-   Separate licence-document upload from ordinary job photos.
-   Require upload consent before issuing an upload intent; store
    consent version, time, purpose and actor.
-   Enforce allowlisted MIME types/extensions, file size limits, and
    image/PDF rules; verify actual file metadata where feasible rather
    than trusting client MIME.
-   Use short-lived signed upload authorization; scope it to one
    authenticated user and one intended asset/purpose. Avoid sending
    permanent provider secrets to mobile.
-   Do not assume obscured URLs equal private access. Configure private
    authenticated delivery and signed/expiring retrieval; test access
    denial for unauthenticated and other users.
-   Store only provider asset identifiers and necessary metadata. Use
    server authorization before issuing a time-limited private retrieval
    URL.
-   Restrict admins to authorized review access and audit every
    access/decision where feasible.
-   Ensure deletion removes provider asset as well as database
    reference, with retry/failed-deletion tracking.
-   Rate limit uploads and protect against oversized/malformed files.
    Never render user-supplied file names as trusted HTML.

## 12. UX and accessibility

-   Inspect Figma first and record all screens, design tokens,
    typography, spacing, iconography, component variants, navigation and
    interactive states.
-   Preserve the Figma's intended layout and branding. Do not replace it
    with generic dashboard templates. If the prototype conflicts with
    security or requirements, document the conflict and propose a
    minimal change for approval.
-   Include loading, empty, error, offline, permission-denied and
    success states for core flows.
-   Accessible labels, logical focus/navigation, sufficient contrast,
    scalable text, keyboard/screen-reader support where applicable,
    non-colour-only status indicators and comfortable touch targets.
-   Avoid unnecessary animations and heavy assets. Compress images,
    paginate lists, minimize network calls and support weak/intermittent
    connections without caching private licence documents on a shared
    device.
-   Explain denied location/photo permission and provide manual
    alternatives when possible.
-   Keep user-facing legal/compliance copy plain-language, specific and
    reviewed; do not present placeholder legal text as final legal
    advice.

## 13. Testing and quality gates

Create a test strategy before code. Use tools compatible with the
existing stack; confirm versions in the plan. - Unit tests: validation
schemas, job state machine, eligibility, role checks, consent gate,
status transitions, upload policy. - API integration tests:
registration, login, token expiry/invalid token, role denial, ownership
denial, invalid input, SQL injection attempts, pagination, licence
review, job creation/bid/interest/selection, notifications. - Database
tests: migrations from clean DB, constraints, transaction/concurrency
tests preventing double assignment, indexes where justified. - Mobile
tests: navigation and forms, session persistence via SecureStore,
permission denial, loading/empty/error states; use component tests and
E2E tooling if reasonable. - Golden journey end-to-end: 1. Operator
registers and accepts current Terms & Conditions. 2. Operator completes
profile and reads upload notice, gives separate consent, uploads licence
securely. 3. Admin reviews and approves/rejects/resubmission-requests
with reason. 4. Farm owner registers/completes farm profile and posts a
compliant job. 5. Verified operator finds the job and submits a bid or
direct interest according to job mode. 6. Farm owner reviews candidates
and selects/confirms one. 7. Both parties receive in-app notifications
and can see the correct status. 8. Attempts by unverified operators,
non-owners and non-admins are denied server-side. - Negative cases:
upload without consent, public retrieval of licence, self-promotion of
role/status, expired/rejected credential, restricted spraying job
bypass, double selection race, cancelled/closed job bid, cross-user
access, invalid/oversized upload. - Quality checks: typecheck, lint,
unit/integration tests, production build, dependency audit. Record exact
commands and outputs in stage reports. - CI: GitHub Actions for
lint/typecheck/test/build if repository supports it; never expose
secrets in logs.

## 14. Deployment and configuration

Plan and document: - Neon PostgreSQL project, separate
development/production database or branches, SSL connection string,
migration order, backups/restore considerations and least-privilege DB
user where practical. - Render API service, build/start commands, health
checks, environment variables, HTTPS, strict CORS, logs/monitoring,
rollback strategy and migration safety. - Cloudinary environment
credentials set only in Render server environment; no server secret in
mobile variables. Test signed/private uploads in deployed environment. -
Expo app config/EAS setup only after user approves.
`EXPO_PUBLIC_API_BASE_URL` may contain the public API URL but no secret.
Production builds must use HTTPS. - Create `.env.example` in `server/`
and safe mobile configuration examples, but never write real values. Add
`.env`, local credentials, keystores and secrets to `.gitignore`. -
Suggested server variables to confirm in plan: `NODE_ENV`, `PORT`,
`DATABASE_URL`, `JWT_ACCESS_SECRET` (strong random secret),
`JWT_ACCESS_TTL`, `CORS_ORIGINS`, `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, upload limits, and any
required public app URL. Avoid excessive configuration. - Do not create
cloud resources, change production data, run destructive migrations, or
deploy without explicit approval. - Include post-deployment smoke tests
and a rollback/runbook. Do not claim Render/Neon/Cloudinary are
configured until verified.

## 15. Required documentation and deliverables

At the end of approved stages, keep these current: - `README.md` at root
with prerequisites, setup, run/test commands and links to docs. -
`mobile/README.md`, `server/README.md`. - `docs/AGENTS.md`. -
`docs/prompts/00-project-plan.md` and each approved stage plan. -
requirements/personas/scope/success tests. - Figma screen inventory and
UI implementation checklist. - architecture and decision records
(including Expo vs guide's PWA-first approach). - schema/data
dictionary/migrations/seeding notes. - OpenAPI YAML and example
requests/responses. - privacy data inventory, consent/versioning and
retention/deletion flow. - South African aviation compliance note with
official sources and review date. - test plan, manual test cases, defect
log and results. - Render/Neon/Cloudinary deployment and rollback
guide. - logbook entries including AI assistance used, what was
accepted/modified, evidence/commits, and next steps. - A final handover
with known limitations and a demo checklist.

## 16. Initial response expected from the coding agent

Do not write application code in your first response. First: 1. Confirm
the folders/files detected and summarize existing code without exposing
secrets. 2. Confirm whether the guide file is accessible and whether
Figma was actually inspected. 3. Produce
`docs/prompts/00-project-plan.md` with staged tasks, dependencies,
risks, file-level changes, database/API proposal, test plan and
acceptance criteria. 4. List assumptions and questions that block a safe
design, especially private Cloudinary document delivery and legal rules
for restricted services. 5. Stop and ask the user to approve or amend
the plan.

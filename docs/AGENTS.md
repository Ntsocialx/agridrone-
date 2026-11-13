# AgriDrone (AgricDrone Hub) --- Coding Agent Rules

Version 1.1 · updated 10 November 2026 (Week 5) · Tiyani Nkuna (224732015)
· 4IR | AgriSeta

These rules apply to all work in this repository. If any instruction
conflicts with a user-approved decision, stop and ask rather than
silently changing scope.

## 1. Product and repository boundaries

-   Product: **AgriDrone**, a marketplace connecting farms with drone
    operators for lawful surveying, mapping, monitoring and inspection.
    The on-screen app name is **AgricDrone Hub** (user decision,
    2026-11-06); keep that spelling in all user-facing text.
-   Preserve the existing root folders: `mobile/`, `server/`, `docs/`.
    Inspect before editing; do not replace working files or scaffold
    over existing code without approval.
-   `mobile/`: Expo (SDK 58), React Native, TypeScript, Expo Router and
    NativeWind. Runs in Expo Go, in a web browser, and as an Android
    APK built with EAS (app ID `com.ir4.agridrone`).
-   `server/`: Node.js + Express + TypeScript REST API.
-   Database: Neon PostgreSQL. Upload provider: Cloudinary. Deployment
    target: Render for API.
-   Roles: `operator`, `farm_owner`, `admin`. Public registration must
    never grant `admin`.
-   Auth: JWT; store mobile tokens in `expo-secure-store`, never plain
    AsyncStorage.
-   Job participation is by bidding (one bid per pilot per job); the
    farm owner makes the final selection/confirmation. "Direct
    interest" was in the original plan but is not built; add it only
    with approval.
-   MVP excludes payments and payouts. Notifications are in-app only
    (personal notices plus admin broadcasts). Phone push notifications
    are planned (Firebase) but paused; do not build them without
    approval.
-   Moderation (user decision, 2026-11-05): signed-in users can report
    a job post (category + note). The admin can dismiss, resolve,
    remove the post (status `removed`, reason shown to the owner) or
    suspend the owner. Suspended users cannot sign in and their open
    jobs are hidden; the admin can unsuspend. Every decision is
    audited.
-   Ratings/reviews are in the MVP (user decision, 2026-11-03): only the
    farm owner of a completed job may leave one 1–5 star rating and
    written review for the assigned operator. Reviews go live
    immediately; the operator can report one and an admin can hide it.
    Job completion is two-step: operator marks complete, farm owner
    confirms.
-   This is a native Expo client for the approved MVP. The TUT guide
    recommends PWA first and Expo as stretch; document the user's
    explicit Expo choice as a project-specific deviation. Do not add a
    PWA unless approved.

## 2. Mandatory plan-first workflow

1.  Inspect the repository, existing docs, scripts, tests, migrations
    and git status before changing files.
2.  Read this file and the TUT WIL Full-Stack Programme Student Guide
    v1.0 if available.
3.  Read the current design system (section 4). The original Figma
    prototype was replaced by the AgricDrone Hub design on 2026-11-06
    and is no longer the reference.
4.  Before implementation, write `docs/prompts/00-project-plan.md`. It
    must include repository findings, requirements, assumptions,
    architecture, file-level changes, API/data proposals,
    privacy/security risks, test plan, staged work and measurable
    acceptance criteria.
5.  Wait for explicit user approval before coding. A generated plan is
    not approval.
6.  For every stage, write/update `docs/prompts/<stage>-plan.md`, state
    the exact scope and verification commands, and wait for approval
    before implementation. Never expand an approved stage silently.
7.  Do not run destructive commands, production migrations, create cloud
    resources, deploy, or change production data without explicit
    approval.
8.  After each stage, report files changed, decisions, commands run,
    actual test outcomes, unresolved defects and the next approval gate.
9.  Never invent successful test results, inspected files, deployed
    services, credentials, regulatory approvals or certification status.

## 3. Source discipline and academic practice

-   Treat the TUT WIL Full-Stack Programme Student Guide v1.0 as the
    academic engineering baseline when it is available. Follow its
    first-principles approach, scope/success-test definition, reviewed
    plans, API contracts, testing, secure coding, POPIA-aware data
    handling, Git workflow, logbook and responsible AI requirements.
-   Keep implementation explainable. Use the simplest architecture that
    meets requirements; do not add microservices or unnecessary
    libraries.
-   Make small, understandable Git commits with clear messages; do not
    commit unless requested by the user or the established workflow
    requires it.
-   Use synthetic data for development, tests, screenshots and demos.
    Never put real people's data or secrets in the repository.
-   The student remains responsible for understanding and verifying
    AI-generated code. Document AI assistance in the project
    logbook/submission where required.
-   If a source does not support a claim, label it as an assumption or
    obtain an authoritative source; do not present assumptions as
    source-derived facts.

## 4. Design system

-   Since 2026-11-06 the visual reference is the **AgricDrone Hub**
    design (modelled on the clean calculator style of
    hellochoice.co.za, chosen by the user). The tokens live in
    `mobile/tailwind.config.js`; use them instead of raw colours:
    teal `#1dafa1` (primary), teal-ink `#0e7c72` (teal text),
    teal-light `#7fe0d6`, ink `#22262a` (text), muted `#66737f`, page
    `#fafafa`, white forms, line `#e0e6eb`, 6px corners, Inter font.
    Pink `#ec4899` only for alerts/unread badges; yellow `#eab308`
    only for on-hold status and stars.
-   White headers, generous spacing, sentence-case labels, flat
    surfaces (no gloss, glow or heavy shadows). The AgriSETA logo
    (used with permission) is the main logo on the welcome screen.
-   Import `Text` from `mobile/src/components/Text.tsx`, not from
    `react-native`, so the Inter font weights apply.
-   NativeWind `className` is not applied to `Animated.View` /
    `Animated.Text`; style animated views with the `style` prop.
-   `docs/design/figma-inventory.md` documents the old Figma
    prototype and is kept for history only.
-   If a mockup conflicts with security, accessibility or a confirmed
    requirement, document the conflict and propose the smallest
    necessary change for approval.
-   Provide accessible labels, readable contrast, scalable text, clear
    status labels, sensible touch targets and
    loading/empty/error/offline states.
-   Keep animations and assets light. Compress images and avoid
    unnecessary network traffic for users with limited data or weaker
    devices.

## 5. Architecture and coding conventions

-   Use strict TypeScript. Avoid `any`; explain any unavoidable use.
-   Keep API, domain/business rules, database access and UI presentation
    separated.
-   Use a typed API client with a single API base URL and consistent
    error handling.
-   Version endpoints under `/api/v1`. Document the contract in OpenAPI
    before or alongside implementation.
-   Validate all external input on the server (Zod or an equivalent
    maintained schema library). Client validation improves UX but never
    replaces server validation.
-   Use parameterized SQL for all user-controlled values. Do not
    concatenate user input into SQL.
-   Use migrations for schema changes. Do not edit an already-applied
    migration; add a new migration. Never apply production migrations
    without explicit approval.
-   Use UTC timestamps and explicit database constraints/indexes. Use
    transactions for multi-step selection/review operations.
-   Centralize errors and return safe, consistent JSON errors. Never
    send stack traces, SQL details, secrets or internal provider errors
    to clients.
-   Add comments for non-obvious safety/business rules, not for every
    line.
-   Do not install a dependency without a reason. Check package
    compatibility and document major choices.

## 6. Authentication and authorization

-   Hash passwords with a maintained password-hashing library; plaintext
    storage is forbidden.
-   JWT signing secrets belong in environment variables and must be high
    entropy. Validate signature, expiry and expected claims.
-   Use short-lived access tokens; if refresh tokens are proposed,
    design rotation/revocation and storage explicitly in the plan.
-   Store mobile auth tokens in `expo-secure-store`. Never place them in
    AsyncStorage, source code, logs or analytics.
-   Derive the authenticated actor from the verified token. Never trust
    client-supplied user ID, role, admin flag, credential status or
    audit actor.
-   Enforce authentication, role and resource ownership on every
    protected server route. Hiding UI buttons is not access control.
-   Rate-limit login, registration, password reset and upload
    authorization routes. Use generic authentication error messages that
    do not reveal whether an account exists.
-   Do not implement public admin registration. Provision admins through
    a documented, controlled process with audit logging.
-   Logout semantics must be documented. Do not claim stateless JWTs are
    revoked unless a real revocation strategy exists.

## 7. Cloudinary and upload safety

-   Treat licence documents as sensitive private evidence, not public
    media.
-   Never expose Cloudinary API secrets to the mobile app. Use
    server-authorized, short-lived signed upload flows or another
    approved private upload mechanism.
-   A non-obvious URL is not private. Verify the chosen Cloudinary
    resource type, delivery/access mode, signed retrieval behaviour and
    plan support. If adequate privacy cannot be guaranteed, stop and ask
    the user before choosing alternative storage.
-   Record consent before generating an upload intent. Scope each upload
    to the authenticated user, purpose, file type and size.
-   Validate allowed MIME types/extensions and size; verify file
    properties server-side where feasible. Never trust client-provided
    MIME or file name.
-   Keep private asset identifiers and metadata server-side. Never
    return permanent private-document URLs in public API responses or
    logs.
-   Authorize document viewing on the server and issue only short-lived
    retrieval access. Audit administrator review access/decisions where
    feasible.
-   Support deletion of provider assets and database references with
    safe retry handling. Prevent cross-user access and upload-intent
    replay.
-   Separate licence documents from public job photos. Do not cache
    licence documents offline or in shared-device caches.

## 8. POPIA, consent and data minimisation

-   Design for South Africa's Protection of Personal Information Act
    (POPIA); this is not a substitute for legal advice.
-   Present the privacy notice and Terms & Conditions before
    registration and record the accepted version and timestamp.
-   Require separate, explicit, purpose-specific consent before
    licence-document upload. Record the notice/consent version, time and
    user. Do not issue upload authorization without this record.
-   Explain why the document is collected, who can review it,
    access/storage approach, retention/deletion approach, and how to
    request access/correction/deletion.
-   Collect only information necessary for the MVP. Do not add ID
    numbers, biometrics, health data or children's data without a
    documented need and explicit legal review.
-   Document data purpose, access, retention, deletion, data-subject
    requests and incident response under `docs/privacy/`.
-   Avoid collecting precise location unless the feature needs it; ask
    permission contextually and offer manual location entry where
    possible. No background tracking.
-   Never log passwords, JWTs, upload signatures, full document contents
    or unnecessary personal information.
-   Use synthetic test/demo data. Provide a documented deletion process
    and explain lawful retention exceptions rather than keeping data
    indefinitely by default.

## 9. South African aviation compliance

-   Treat licensing and operational compliance as safety-critical.
    Research current authoritative SACAA sources and record
    citations/access dates in
    `docs/compliance/south-african-aviation.md` before writing
    definitive compliance rules.
-   An AgriDrone admin verification status is an internal platform
    review, not government certification or proof that every flight/job
    is lawful.
-   Distinguish credential review from permission for a specific
    service, aircraft, location, airspace or operation.
-   Agricultural spraying/dispensing and other restricted/high-risk
    services must display a prominent warning and remain disabled or on
    a compliance hold until an approved policy and necessary
    evidence/review exist. Never imply such work is automatically
    permitted.
-   Do not build features that facilitate bypassing licences, airspace
    limits or aviation rules. Include a reporting/escalation process for
    suspected unlawful jobs.
-   Keep rules configurable and document uncertainties for human/legal
    review. Do not present AI output as legal advice.

## 10. Job workflow and business invariants

-   Only eligible, sufficiently verified operators can bid or
    be assigned to jobs that require verified credentials.
-   Only `open` jobs accept bids. Spraying jobs are created `on_hold`
    and the database blocks them from ever being assigned.
-   Job status flow: `open` → `assigned` (owner selects a bid) →
    `pending_confirmation` (pilot marks complete) → `completed` (owner
    confirms) → owner may rate. `open`/`on_hold` jobs can be
    `cancelled` by the owner or `removed` by an admin after a report.
-   The farm owner who owns the job must select/confirm the candidate.
    Other farms and operators cannot change that decision.
-   Enforce valid job status transitions on the server and database
    where practical. Reject actions against closed/cancelled jobs.
-   Use a transaction/constraint to prevent multiple active assignments
    for one job, including concurrent requests.
-   Never trust client-supplied job owner, selected operator,
    verification status or compliance status.
-   Restricted service/compliance hold blocks assignment until
    explicitly cleared by authorized review.
-   Create in-app notifications for material state changes without
    exposing private licence details.
-   MVP has no payments, wallet, escrow or payout functionality. Any
    agreed price is informational only.

## 11. Testing and definition of done

A task is not done because it compiles. Before marking complete: - run
the relevant formatter/linter, TypeScript checks, unit tests, API
integration tests and production build; - report exact commands and
actual results; do not hide failing tests; - add tests for the changed
behaviour, including access denial and invalid input; - verify loading,
empty, error, offline and permission-denied UI states where relevant; -
update OpenAPI, README and relevant docs; - check `git diff` for
secrets, generated junk, unrelated changes and accidental data; - ensure
no critical/high-severity defects remain in the approved scope; -
confirm a user can explain the implementation and the logbook records AI
assistance where required.

Required golden journey: 1. Operator registers and accepts Terms &
Conditions. 2. Operator completes profile and provides separate consent
before uploading licence evidence. 3. Admin reviews and records
approve/reject/resubmission-required with a reason. 4. Farm owner posts
a compliant job. 5. Verified operator submits a bid on an open
job. 6. Farm owner reviews candidates and
selects/confirms one operator. 7. Both parties see the correct state and
in-app notifications. 8. Tests prove that unverified operators,
unauthorized users and non-admins are denied protected actions.

Also test consent bypass, public licence-document retrieval, forged
role/status, cross-user access, invalid/oversized uploads,
rejected/expired credentials, restricted-service bypass, closed-job
submissions and concurrent double selection.

## 12. Environment, deployment and secrets

-   Use `.env.example` files containing placeholders only. Add real
    `.env` files, keys, tokens, certificates and keystores to
    `.gitignore`.
-   User configures Render, Neon, Cloudinary and Brevo accounts/secrets.
    Never ask them to paste secrets into chat.
-   The Android signing key lives only in `mobile/credentials/` and
    `mobile/credentials.json` (both gitignored). Never commit or print
    them. Every app update must be signed with the same key, and
    `android.versionCode` in `mobile/app.json` must go up for each new
    APK. Build APKs with EAS (`eas build -p android --profile
    preview`); local Gradle builds fail on the lab PC (Windows path
    length limit).
-   The live API only accepts browser requests from the origins in
    `CORS_ORIGINS` (currently `http://localhost:8081` for the web
    preview). Phone apps are not affected.
-   Server secrets must exist only in server-side environment variables.
    `EXPO_PUBLIC_*` values are visible to users and must contain no
    secrets.
-   Use HTTPS in production and strict CORS allowlists. Avoid verbose
    production errors.
-   Document Neon migrations, Render build/start/health configuration,
    Cloudinary private uploads, Expo app configuration, smoke tests,
    rollback and incident response.
-   Do not create cloud resources, deploy, alter production data or run
    destructive commands without approval.
-   Do not claim a service is configured until verified.

## 13. Git, documentation and communication

-   Keep root folders `mobile/`, `server/`, `docs/` intact. Do not
    create alternate competing folders without approval.
-   Before each stage, write a plan in `docs/prompts/` with exact scope,
    files, risks, tests and acceptance criteria; wait for approval.
-   After each stage, summarize changed files, commands and real test
    results, unresolved issues and the next decision needed.
-   Maintain requirements, design inventory, architecture decisions,
    data dictionary, migrations, OpenAPI, privacy/compliance docs, test
    plan, deployment runbook and logbook.
-   Never auto-commit, push, publish, or deploy unless explicitly
    requested.
-   Branches: new feature work goes to `dev`. Merge `dev` into `main`
    (and `master`) only when the user approves: Render redeploys the
    live API automatically whenever `main` changes.
-   Keep AI-generated code understandable and explain meaningful
    decisions. Do not claim ownership of work the user has not reviewed.

## 14. Current system snapshot (10 November 2026)

-   **Live API:** https://agridrone-api-olnv.onrender.com/api/v1 (Render
    free plan, Ohio; sleeps when idle, so the first request can take up
    to a minute and the app shows a loading cover). 47 endpoints; see
    `server/README.md` and the API documentation PDF.
-   **Database:** Neon PostgreSQL (us-east-2), migrations
    `001_core` to `006_avatars`, all applied in production.
-   **Services:** Cloudinary (licences private, portfolio and profile
    pictures public), Brevo (password-reset emails).
-   **Tests:** 40 API tests (Vitest + Supertest + PGlite), all passing.
    Mobile: `npx tsc --noEmit` and `npx expo lint` pass.
-   **App:** 18 screens, including welcome, sign in/up, password reset,
    job marketplace, post a job, job details and bidding, review bids,
    rate a pilot, pilot and farm-owner profiles, edit details, change
    password, notifications, report a job post and the admin console
    (Pilots | Reports | Notify).
-   **Android:** APK v1.0.0 (versionCode 1) built with EAS on
    2026-11-09; it does not yet include the work on `dev`.
-   **Paused (user-approved plan, not started):** animations, sound
    effects (on by default, switch in Profile), haptics, phone push
    notifications, delete account (anonymise), privacy policy draft,
    Help page with FAQs and email support, offline banner. Ask before
    starting any of them.
-   **Still missing from the rules above:** an OpenAPI file (section 5).
    Flag it rather than claiming it exists.
-   **Drafts awaiting legal review (13 November 2026):**
    `docs/privacy/privacy-policy.md`, `docs/legal/terms-of-service.md`,
    `docs/compliance/south-african-aviation.md` and
    `docs/compliance/launch-checklist.md`. The privacy and terms text is
    edited in `mobile/src/content/*.json` and copied by
    `mobile/scripts/sync-legal.mjs`.

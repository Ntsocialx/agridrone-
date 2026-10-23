# AgriDrone --- Coding Agent Rules

These rules apply to all work in this repository. If any instruction
conflicts with a user-approved decision, stop and ask rather than
silently changing scope.

## 1. Product and repository boundaries

-   Product: **AgriDrone**, a marketplace connecting farms with drone
    operators for lawful surveying, mapping, monitoring and inspection.
-   Preserve the existing root folders: `mobile/`, `server/`, `docs/`.
    Inspect before editing; do not replace working files or scaffold
    over existing code without approval.
-   `mobile/`: Expo + React Native + TypeScript + NativeWind.
-   `server/`: Node.js + Express + TypeScript REST API.
-   Database: Neon PostgreSQL. Upload provider: Cloudinary. Deployment
    target: Render for API.
-   Roles: `operator`, `farm_owner`, `admin`. Public registration must
    never grant `admin`.
-   Auth: JWT; store mobile tokens in `expo-secure-store`, never plain
    AsyncStorage.
-   Job participation supports bidding and direct interest where the job
    mode allows it; the farm owner makes final selection/confirmation.
-   MVP excludes payments, payouts, push notifications and
    ratings/reviews. In-app notifications only.
-   This is a native Expo client for the approved MVP. The TUT guide
    recommends PWA first and Expo as stretch; document the user's
    explicit Expo choice as a project-specific deviation. Do not add a
    PWA unless approved.

## 2. Mandatory plan-first workflow

1.  Inspect the repository, existing docs, scripts, tests, migrations
    and git status before changing files.
2.  Read this file and the TUT WIL Full-Stack Programme Student Guide
    v1.0 if available.
3.  Inspect the AgriDrone Figma prototype:
    https://www.figma.com/make/ZW17DSdkpWRKGq0wWrny3w/AgriDrone-Mobile-MVP-Redesign?t=MzOBXo6hj94YSum8-1
    . Do not claim it was inspected unless it was. If inaccessible, ask
    for exported screenshots/PDF and do not invent UI details.
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

## 4. Design and Figma fidelity

-   The Figma prototype is the primary visual reference. Before UI
    implementation, document its screens, navigation, design tokens,
    spacing, typography, components, interaction states and
    responsive/device behaviour in `docs/design/figma-inventory.md`.
-   Reproduce the intended design rather than replacing it with a
    generic template. If Figma cannot be accessed, stop UI
    implementation and ask for exported frames/screenshots or a PDF.
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

-   Only eligible, sufficiently verified operators can bid/express
    interest or be assigned to jobs that require verified credentials.
-   Job participation must respect `service_mode`: `bid`,
    `direct_interest`, or `both`.
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
a compliant job. 5. Verified operator submits a bid or direct interest
allowed by that job. 6. Farm owner reviews candidates and
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
-   User configures Render, Neon and Cloudinary accounts/secrets. Never
    ask them to paste secrets into chat.
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
-   Keep AI-generated code understandable and explain meaningful
    decisions. Do not claim ownership of work the user has not reviewed.

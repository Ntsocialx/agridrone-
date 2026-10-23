# AgriDrone MVP Project Plan

**Status:** Approved for staged work on 2026-10-23 — implementation still requires stage-specific approval
**Prepared:** 2026-10-23
**Scope:** Plan the AgriDrone mobile app and REST API against the repository's current agent instructions and product brief.

## 1. Repository findings

- The repository has the required `mobile/`, `server/` and `docs/` folders. `mobile/` and `server/` currently contain no files.
- `docs/AGENTS.md` and `docs/AgriDrone_Master_Coding_Agent_Prompt.md` define the product, security, design and approval requirements. This plan follows them.
- `docs/prompts/00-project-plan.md` and `docs/prompts/stage-1-plan.md` existed as empty, untracked files before this plan was written.
- There is no root `AGENTS.md`, application code, package manifest, API contract, database migration, test suite or deployment configuration to preserve in `mobile/` or `server/`.
- `README.md` has pre-existing uncommitted changes. It will not be overwritten as part of this plan.
- The Figma Make prototype was initially inaccessible. After the user signed in to Figma in the open browser, the “AgriDrone Mobile MVP Redesign” preview became inspectable. Welcome, registration, operator profile/licence upload, operator job marketplace, job details/bid form, farm-owner job posting/bid review, and admin verification views were observed. A separate farm-owner dashboard was not located; record this as a design gap rather than inventing a screen.
- The TUT WIL Full-Stack Programme Student Guide v1.0 was not found in the workspace. Its contents have not been reviewed.

## 2. Product requirements and boundaries

### Problem and users

AgriDrone connects farms needing lawful surveying, mapping, monitoring and inspection with suitably credentialed drone operators. Its primary users are operators, farm owners and administrators.

### In scope for the proposed MVP

- Native Expo + React Native + TypeScript mobile app; this is the project's explicit deviation from the guide's PWA-first recommendation.
- Express + TypeScript REST API, versioned at `/api/v1`, with Neon PostgreSQL.
- Operator and farm-owner registration/login; public registration cannot create an administrator.
- Operator profile and licence evidence submission, separate upload consent, and admin review with a recorded decision and reason.
- Farm profiles and job posts with service type, location, schedule, and a participation mode (bid, direct interest, or both).
- Eligible operator bids/interests, farm-owner review and final selection/confirmation, and in-app notifications.
- Compliance warning and a configurable hold for restricted/high-risk services. Internal verification is not government certification or permission to conduct a particular operation.
- Cloudinary only for private evidence if the chosen account plan and delivery/access behaviour meet the documented privacy requirements. Render is the intended API host.
- Accessible states, validation, tests, setup/deployment documentation and a documented synthetic-data development workflow.

### Out of scope unless separately approved

- Payments, wallets, escrow, invoices and payouts.
- Push notifications, PWA delivery, ratings/reviews, advanced analytics, route planning and enterprise tooling.
- Background location tracking, public licence-document URLs, public admin registration, production migrations, cloud-resource creation and deployment.
- Enabling restricted services based solely on an AgriDrone admin review.

## 3. Assumptions and unresolved decisions

- Expo Router is the default navigation choice unless implementation discovery identifies a reason to choose another established pattern.
- Use strict TypeScript, Zod validation, parameterized PostgreSQL queries, JWT access tokens and `expo-secure-store`; no authentication tokens in AsyncStorage.
- Use SQL migrations with explicit constraints and UTC `timestamptz` fields. Do not run production migrations without explicit approval.
- The job owner makes final operator selection. Participation and assignment are blocked for ineligible operators, closed jobs and unresolved compliance holds.
- The exact credential fields, job fields, screens, navigation, colours, typography, component variants and visual states remain subject to the Figma export and requirements review.
- Before designing private licence upload, verify Cloudinary's current private/authenticated delivery, signed access, resource-type behaviour and account-plan limits. If the needed protection is unavailable, stop and request a storage decision.
- Confirm the desired farm/operator contact fields, credential retention/deletion policy, and whether email verification is required during requirements review.
- Obtain the TUT guide if the user expects its requirements to be applied beyond the project brief already present in `README.md`.

## 4. Proposed architecture

- **Mobile:** Expo, React Native, TypeScript, NativeWind, Expo Router, typed API client, Zod-backed form validation, role-aware navigation, and SecureStore-backed sessions. Request location/photo permissions only when needed and provide manual alternatives where practical.
- **API:** Node.js LTS, Express, TypeScript, `/api/v1`, Zod boundary validation, centralized safe error responses, authentication/role/ownership middleware, rate-limited authentication and upload-intent routes, security headers, restricted CORS, health/readiness endpoints and structured non-sensitive logs.
- **Persistence:** Neon PostgreSQL accessed through `pg` and parameterized SQL; reviewed SQL migrations, foreign keys, uniqueness/check constraints and indexes. Transactions protect credential decisions and one-active-assignment selection.
- **Uploads:** Mobile requests a scoped, short-lived upload intent from the API only after recording separate consent. Provider credentials stay on the server. Licence identifiers and review access remain private; no permanent document URLs in API payloads, logs or notifications.
- **Hosting:** Render for the API, Neon for PostgreSQL and Cloudinary for approved private uploads. The user configures accounts and secrets; no cloud resource or deployment is part of this plan's approval.
- **Trust boundaries:** Treat all client input as untrusted. Derive identity and role only from a verified token; enforce resource ownership and credential/compliance eligibility on the server.

## 5. Draft data model and API surface

### Candidate data entities

`users`, `terms_acceptances`, `operator_profiles`, `operator_licences`, upload-consent records, `farms`, `jobs`, `job_bids`/interest submissions, `job_assignments`, `notifications`, and `admin_audit_events`. Use UUID identifiers, explicit deletion/retention behaviour, unique normalized email, constrained role/status values and indexes for listing/review paths. Final schema is subject to review before migrations are created or applied.

### Candidate API routes

- `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`
- `GET/PATCH /api/v1/operators/me`; consent and upload-intent endpoints for licence evidence
- Admin-only licence queue, authorized evidence access and review-decision endpoints
- Farm-owner farm/profile and job create/update/cancel routes; public/eligible job listing and detail routes
- Job bid/direct-interest routes gated by service mode and operator eligibility
- Owner-only candidate list and transactional selection/confirmation routes
- In-app notification list/read routes; admin-only audit-event listing
- `/api/v1/health` and `/api/v1/ready`, with no secret/configuration disclosure

The final OpenAPI contract will define request/response schemas, authorization, status transitions, pagination and safe error shape before or alongside endpoint implementation.

## 6. Privacy, security and compliance risks

- **Credential exposure:** private-by-design storage, authorized short-lived upload/retrieval, consent before upload authorization, size/type validation and cross-user access-denial tests.
- **Account privilege escalation:** no public admin role, secure password hashing, signed/expiring JWTs, server-derived actor identity, role and ownership checks.
- **Marketplace abuse/races:** eligibility and job-mode checks on the server, closed-job rejection, audit of decisions, database/transaction protection against double assignment.
- **Restricted/unlawful operation:** authoritative SACAA sources must be researched and cited before definitive legal rules are documented. Warnings and configurable compliance holds must not imply legal authorization; provide a reporting/escalation route.
- **POPIA/data minimization:** versioned terms acceptance, separate upload consent, purpose/retention/deletion documentation, minimal profile/location data, synthetic test data, no secrets or sensitive evidence in logs.
- **Third-party/provider risk:** no secrets in mobile configuration; verify Cloudinary privacy features and Render/Neon configuration before claiming readiness.

## 7. Staged work and approval gates

Each stage requires its own exact-scope plan and explicit approval before implementation.

1. **Requirements and design evidence:** obtain Figma screenshots/PDF and, if available, the TUT guide; complete requirements and the Figma inventory. No UI implementation until the actual visual reference is inspectable.
2. **Technical foundation:** create the approved Expo/TypeScript/NativeWind and Express/TypeScript boilerplates, scripts, environment examples and minimal health/readiness checks. No generic replacement UI.
3. **Contracts and persistence:** finalize requirements, architecture, OpenAPI and reviewed schema/migrations; add synthetic development data and migration tests. No production database changes.
4. **Authentication and credential review:** implement registration/login, role/ownership controls, terms acceptance, operator profiles, consent-gated private uploads and audited admin decisions, subject to verified upload privacy.
5. **Marketplace workflow:** implement farms/jobs, mode-limited bids/interests, eligibility and compliance holds, owner selection, valid state transitions and in-app notifications.
6. **Figma-led mobile experience:** implement reviewed screens and interaction states from the supplied Figma evidence; connect approved API flows and verify accessibility, permissions and offline/error handling.
7. **Integration and release readiness:** run the golden journey and security/negative tests, finalize docs and deployment instructions, and prepare non-production smoke/rollback steps. Deploy only after a separate explicit approval.

Stage ordering can be adjusted in a reviewed stage plan if design/API dependencies require it. Scope, data handling, schema, legal policy or security posture changes require renewed approval.

## 8. Verification plan

- **Foundation:** install from lockfiles; run formatter/linter, TypeScript checks, focused unit tests and production builds for each workspace.
- **API/domain:** test input validation, authentication, expiry/invalid tokens, role and ownership denials, safe errors, job modes/transitions, eligibility and consent gates.
- **Database:** test clean migration and constraints against a non-production/test database; test transactional selection and duplicate/concurrency prevention.
- **Uploads:** test consent bypass, invalid/oversized content, expired/replayed intents, unauthenticated retrieval and cross-user/admin authorization. Do not use real licence documents.
- **Mobile:** test session storage, route guards, forms, loading/empty/error/offline/permission-denied states and the approved visual reference on target device sizes.
- **Golden journey:** operator registration and terms → separate licence consent/submission → admin decision → farm job post → eligible operator bid/interest → farm selection → correct status/in-app notifications.
- Record exact commands and observed results per approved stage. No test, provider setup or deployment is assumed successful in advance.

## 9. Measurable acceptance criteria

- No implementation begins until the project plan and the applicable stage plan receive explicit approval.
- No Figma-dependent UI is implemented until screens can be reviewed and recorded in `docs/design/figma-inventory.md`.
- Both workspaces use strict TypeScript and expose reproducible setup, lint, typecheck, test and build commands.
- All protected API actions enforce verified actor identity, role, ownership, eligibility and valid state transitions server-side.
- Admin cannot be granted via public registration; unverified operators cannot participate where verification is required.
- Licence upload requires recorded, versioned consent and does not expose permanent public document URLs or provider secrets.
- A restricted/compliance-held service cannot be assigned unless a separately reviewed policy permits it.
- Tests cover the golden journey and the negative security/business cases listed in `docs/AGENTS.md`; failures and unimplemented cases are reported explicitly.
- No production migration, external cloud resource, deployment or production-data change occurs without separate explicit approval.

## 10. Immediate blockers and requested review

1. Complete a screen-by-screen inventory from the now-accessible Figma preview before UI implementation. Clarify the expected farm-owner dashboard because the observed farm-owner entry opens the job-posting flow and its bid-review state.
2. The TUT WIL Full-Stack Programme Student Guide v1.0 is not present in the current `docs/` listing. Its exact path remains unprovided; the latest clarification confirmed Figma access, not guide availability. Provide the guide or its exact path before guide-specific requirements are claimed.
3. This project plan was approved by the user on 2026-10-23. Approval of this plan alone does not approve implementation; the stage-specific plan must also be approved.
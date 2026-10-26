# Stage 2 Plan — Figma Design Evidence

**Status:** Implemented on 2026-10-23 — inventory documented; farm-owner dashboard and TUT guide remain unresolved  
**Depends on:** Approved project plan and completed Stage 1 technical foundation  
**Scope:** Inspect and document the accessible Figma prototype and outstanding design/requirements gaps. No application-code changes.
**Approval:** The user approved this exact documentation-only scope on 2026-10-23.

## Goal

Record an accurate, reviewable UI specification from the AgriDrone Figma Make prototype before implementing product screens. Keep facts visible in the prototype separate from unresolved assumptions, and do not copy personal-looking sample data into the repository.

## Proposed changes

### `docs/design/figma-inventory.md`

- Document the prototype identity, access date, preview/device presentation and the observed user paths.
- Inventory the named screens: Welcome, Registration, Operator Profile and Licence Upload, Operator Home and Job Marketplace, Job Details, Farm Dashboard and Post Job, Review Bids, and Admin Verification.
- Record each screen's purpose, hierarchy, visible components, interactions, data shown, and available/loading/error/empty states where the prototype demonstrates them.
- Describe the visual system (colour, typography, spacing, surfaces, imagery, radii, buttons, inputs, navigation and status treatments). Record exact values only when inspectable; label visual estimates as estimates.
- Identify design inconsistencies, inaccessible or unimplemented states, and any views that could not be reached in the preview.
- State that the separate farm-owner dashboard was not found: the observed farm-owner entry opens the job-posting flow and its bid-review state. Do not create a dashboard design by inference.
- Note that the TUT WIL Full-Stack Programme Student Guide v1.0 remains unavailable; no requirements will be attributed to it until its file or exact location is provided.

### `docs/prompts/00-project-plan.md`

- Update the Figma access finding and replace the stale inaccessible-prototype blocker with the remaining inventory and farm-dashboard questions.
- Preserve the outstanding TUT guide limitation and other project decisions.

## Explicit exclusions

- No mobile or server source-code changes, product screens, navigation implementation, APIs, schemas, migrations, auth, uploads, or deployment.
- No exports or repository storage of Figma assets unless separately reviewed and approved.
- No copying of personal-looking example identities, contact details, licence numbers, or document identifiers from the prototype.
- No definitive aviation-compliance rules or claims based only on prototype text. Applicable authoritative sources and citations require a later scoped plan.
- No dependency changes, commits, staging, or changes to production resources/data.

## Verification

- Manually inspect the accessible Figma preview and compare every reachable screen/interaction with the inventory.
- Confirm the inventory distinguishes observed details from estimates, assumptions, and inaccessible/missing screens.
- Review the documentation diff for accidental personal data and unrelated edits.
- Run `git diff --check`; any pre-existing whitespace in the user-modified root `README.md` is outside this scope and must remain untouched.

## Acceptance criteria

- The inventory covers all eight screen areas named in the Figma Make prompt and explicitly marks which were and were not reachable.
- Screen hierarchy, interactions, visual patterns, device presentation, and design gaps are recorded sufficiently to plan the later UI stage without guessing.
- The missing farm-owner dashboard is recorded as an unresolved design question, not filled in with invented UI.
- Synthetic-data and privacy constraints are observed; personal-looking example data from the Figma preview is not copied.
- The unavailable TUT guide is explicitly acknowledged without claiming its requirements were reviewed.
- The project plan no longer states that the Figma prototype is inaccessible.
- No application code or runtime behavior changes.

## Execution record

- Added `docs/design/figma-inventory.md` with the eight named screen areas, observed paths, visual tokens, prototype limitations, privacy constraints and conflicts with existing product/safety rules.
- Updated the project plan to record successful Figma access and the remaining farm-dashboard and study-guide questions.
- No application code, dependencies, assets, APIs, or runtime behavior changed.
- Manually inspected the welcome, registration, operator profile, operator home, job detail/bid sheet, farm-owner post form, review-bids view and admin verification queue. Did not submit a bid, approve/reject an application, or select an operator.
- Recorded actual CSS tokens from the accessible preview and labeled unmeasured spacing/layout details as estimates or unspecified.
- `git diff --check` reports the pre-existing trailing whitespace/blank line in the already-modified root `README.md` at lines 62–63. That file was not changed. The untracked documentation files were reviewed directly; no application files were edited.

## Approval record

The user approved the documentation-only requirements/design-evidence stage. This approval does not authorize mobile UI implementation or server/API work; those require a separate stage plan and approval.

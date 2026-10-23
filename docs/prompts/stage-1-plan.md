# Stage 1 Plan — Technical Foundation

**Status:** Implemented on 2026-10-23 — local quality gates pass; mobile dependency advisories remain unresolved
**Depends on:** Approval of `docs/prompts/00-project-plan.md` (received)
**Scope:** Establish local mobile and API scaffolding only. No database, authentication, marketplace, upload, or production setup.

## Goal

Create reproducible Expo and Express TypeScript foundations in the existing `mobile/` and `server/` folders. Keep the app runnable without inventing AgriDrone product screens while the Figma design is unavailable.

## Proposed changes

### `mobile/`

- Add a local npm package manifest and lockfile, Expo/React Native/TypeScript setup, Expo Router and NativeWind configuration, strict TypeScript settings, and minimal Expo app metadata.
- Add only the router root and a temporary plain-text “Design pending Figma review” screen, with no AgriDrone layout, branding, navigation flows, design tokens or guessed product controls. Replace this temporary screen only after the Figma can be inspected.
- Add a mobile README with prerequisites and the exact local start, typecheck and export commands.

### `server/`

- Add a local npm package manifest and lockfile, strict TypeScript settings, Express application entry points, development/build scripts, and a placeholder-only `.env.example`.
- Add `/api/v1/health` for process liveness and `/api/v1/ready` that returns a non-ready response until the database readiness check is implemented in a later stage. Do not report a dependency as ready when it has not been checked.
- Add safe 404/error handling and focused tests for health and readiness responses. Do not expose stack traces, secrets or internal configuration.
- Add a server README with prerequisites and exact local start, typecheck, test and build commands.

### Repository-level

- Add a root `.gitignore` for dependency folders, build output, local environment files and platform-generated artifacts, after checking that no existing ignore rules need preservation.
- Keep the existing three root folders. Do not add a root package workspace or change the existing README in this stage.
- Pin compatible dependency versions in each package lockfile; verify current Expo/NativeWind compatibility when implementing.

## Explicit exclusions

- No Figma-dependent screens beyond the plainly labelled temporary technical placeholder.
- No registration/login, JWT issuance, password storage, roles, credential forms or document upload.
- No database schema, migration, seed data or external connection to Neon.
- No Cloudinary integration, Render service creation, secrets, deployment or production changes.
- No jobs, bids, assignments, notifications, compliance policy or definitive legal/regulatory copy.
- No modification of existing user-authored `README.md` content.

## Risks and controls

- **Figma remains inaccessible:** do not infer its screens or styling. The temporary screen is explicitly non-product scaffolding and must not be presented as the finished mobile experience.
- **Study guide is not visible in the current `docs/` directory:** the user reports that it is there, but the inspected directory currently contains only `AGENTS.md`, `AgriDrone_Master_Coding_Agent_Prompt.md`, and two prompt files. Confirm its exact filename/path or have it added before guide-specific requirements are claimed.
- **Dependency compatibility:** choose mutually compatible Expo, React Native, Expo Router and NativeWind releases and record the resolved versions in package manifests/lockfiles.
- **Readiness semantics:** health can succeed while readiness is 503 until database integration is approved and configured; this distinction must be documented and tested.
- Preserve all existing worktree changes. Do not stage or commit files.

## Verification commands

Run in `server/`:

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Run in `mobile/`:

```powershell
npm ci
npm run lint
npm run typecheck
npx expo config --type public
npx expo export --platform android
```

Record actual command outcomes. If the selected Expo/NativeWind versions require different documented commands, update this plan before implementation and request approval for the changed scope.

## Acceptance criteria

- `mobile/` has a reproducible strict-TypeScript Expo/NativeWind foundation and exports a development Android bundle without adding guessed product screens.
- The temporary app route clearly states that the Figma-led design is pending; it contains no fabricated workflow or product styling.
- `server/` builds and tests successfully; liveness returns success and readiness accurately returns not-ready before a database check exists.
- `.env.example` contains placeholders only; no real secrets, cloud resources, migrations or production changes are introduced.
- README/setup instructions match the scripts that were actually verified.
- Existing worktree changes are preserved and no files are staged or committed.

## Approval requested

The user approved this exact technical-foundation scope, including the temporary plain-text mobile placeholder. No work outside this scope was implemented.

## Execution record

### Delivered

- `mobile/`: Expo SDK 58 + TypeScript, Expo Router, NativeWind v4, strict TypeScript, lint configuration, setup instructions and a temporary Figma-pending route. No product screens or guessed branding were added.
- `server/`: Express + TypeScript API shell, validated environment settings, Helmet, allow-listed CORS, safe 404/error handling, liveness/readiness routes, and focused route tests.
- Root `.gitignore`, separate lockfiles, server `.env.example`, and workspace READMEs.
- `/api/v1/ready` correctly remains HTTP 503 until a database readiness check exists.

### Verification results

| Workspace | Command | Result |
| --- | --- | --- |
| `server/` | `npm ci` | Passed; 234 packages installed, zero audit findings reported |
| `server/` | `npm run lint` | Passed |
| `server/` | `npm run typecheck` | Passed |
| `server/` | `npm test` | Passed; 1 file, 3 tests |
| `server/` | `npm run build` | Passed |
| `mobile/` | `npm ci` | Passed; clean lockfile install |
| `mobile/` | `npm approve-scripts --allow-scripts-pending` | Passed; no unreviewed install scripts |
| `mobile/` | `npm run lint` | Passed |
| `mobile/` | `npm run typecheck` | Passed |
| `mobile/` | `npx expo install --check` | Passed; dependencies match SDK 58 |
| `mobile/` | `npx expo config --type public` | Passed |
| `mobile/` | `npx expo export --platform android` | Passed; Android JS bundle exported |

The first mobile export exposed a missing direct `babel-preset-expo` dependency; it was added at the SDK-matched version and the clean install, typecheck and Android export then passed. The Expo installer selected compatible package versions but its nested `npm install` was blocked by the machine's script-approval policy; dependencies were installed with scripts disabled, the required native resolver script was inspected and approved at its pinned version, and a subsequent clean `npm ci` passed.

### Unresolved blockers and risks

- `npm audit` reports 26 mobile dependency advisories (22 high, 4 moderate). The current stable compatible dependency line includes `braces@3.0.3` and `node-forge@1.4.0`, which are within reported affected ranges; the registry currently offers no patched release for those versions. The Tailwind 3 selector advisory's suggested Tailwind 4 upgrade conflicts with NativeWind v4's Tailwind 3 peer requirement. No forced downgrade or unapproved major-version migration was made. Treat this as development scaffolding, not release-ready software, until the dependency owners publish compatible fixes or a separately approved migration is planned.
- Figma remains inaccessible behind its sign-up prompt. Only the user-approved temporary text route is present; the product UI and `docs/design/figma-inventory.md` remain blocked.
- The TUT guide still is not in the inspected `docs/` folder. The user supplied the Figma URL instead of the guide's exact path; do not claim guide-specific review.
- The pre-existing modified `README.md` was preserved. `git diff --check` reports whitespace at its existing lines 62–63; this stage did not modify that file.

### Next approval gate

Supply the Figma exports and exact TUT guide path, then prepare and approve the next stage-specific plan before implementation. Do not treat the foundation as a completed marketplace app or deploy it.
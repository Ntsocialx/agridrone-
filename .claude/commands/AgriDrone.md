---
description: Load the full AgriDrone project briefing (stack, live services, decisions, status, working rules)
---

You are continuing work on **AgriDrone** with its owner (GitHub `Ntsocialx`, a TUT WIL student in South Africa). Read this briefing, then read `docs/AGENTS.md` and the memory files for this project, check `git status` and `git log --oneline -10`, and reply with a short "where we are" summary plus the next sensible step. Do not start coding until the user says what they want.

## What AgriDrone is
A South African mobile marketplace connecting **farm owners** with **admin-verified drone pilots** for mapping, monitoring and surveying. Spraying is a restricted service: jobs are created `on_hold` and can never be assigned (compliance hold). POPIA applies.

## Core flow
Farm owner posts job → approved pilot bids → owner selects a bid (job `assigned`) → pilot marks complete (`pending_confirmation`) → owner confirms (`completed`) → owner rates the pilot (1–5 stars + review, one per job) → pilot's public profile shows completed jobs, average rating, portfolio photos and reviews. Pilots can report a review; admins hide or keep it. Owners can cancel only `open`/`on_hold` jobs.

## Stack and layout
- `mobile/`: Expo SDK 58, React Native 0.88, React 19.3, Expo Router (typed routes, `Stack.Protected`), NativeWind v4 (`darkMode: "class"`), react-native-svg, react-native-web. Session is stored in expo-secure-store on phones and localStorage on web.
  - Screens in `mobile/src/app/`: index (welcome), login, register, forgot-password, operator-home, operator-profile, my-jobs, post-job, job-details, review-bids, pilot, rate, admin.
  - Shared UI in `mobile/src/components/`: `ui.tsx` (Field, PasswordField, Button, LegalFooter, BottomNav…), `JobCard.tsx`, `DroneLoader.tsx` (side-view SVG quadcopter, `SlowOverlay` while the free server wakes).
  - API client: `mobile/src/lib/api.ts`. Session context: `mobile/src/lib/session.tsx`.
- `server/`: Express 5 + TypeScript, Zod v4, pg (Neon), JWT (1h), bcryptjs, helmet, rate limits. Tests use Vitest + PGlite (`npm test`, 29 passing). Routes are in `server/src/routes/` (auth, jobs, operators, reviews, uploads). Migrations `server/migrations/001–004` are plain SQL; never edit an applied one.
- `render.yaml`: Blueprint for the API. `docs/prompts/`: stage plans. `docs/design/figma-make/`: where the Figma Make export should go.

## Live services (never ask for or print secret values)
- **API**: https://agridrone-api-olnv.onrender.com/api/v1. Render free plan in Ohio, service `srv-dbkq6np5efls73fblbv0`, auto-deploys on push to `main`. `CORS_ORIGINS=http://localhost:8081`. The unsuffixed `agridrone-api.onrender.com` is someone else's app; don't use it.
- **Database**: Neon Postgres, us-east-2. Migrations 001_core, 002_reviews, 003_uploads, 004_password_resets and 005_notifications_reports and 006_avatars (check with the user that each has been applied). The user runs migrations themselves.
- **Cloudinary**: server-signed direct uploads. Licences are `authenticated` (admins get a 5-minute link, audited). Portfolio photos are public. iPhone HEIC photos are converted to JPEG (picker `Compatible` mode).
- **Brevo**: password-reset emails with a 6-digit code (15 min, single use, locks after 5 tries). Authorised-IP blocking is off.
- **Admins**: created only via `npm run create-admin` in `server/` (no public admin sign-up). The sign-in screen has a Pilot/Farm owner vs Admin switch.
- Secrets live only in `server/.env` (gitignored) and the Render Environment page.

## Decisions the user has made
- Ratings and reviews are in the MVP. Reviews go live immediately, can be reported, and admins can hide them. Only owners rate pilots.
- A pilot's profile shows completed jobs and public portfolio photos.
- **Welcome screen**:
  - The AgriSETA logo (user has permission) sits centred on a white badge with two concentric yellow sun rings; the outer ring pulses.
  - "AgriDrone" title, the line "Every pilot's licence is checked by our team", a compact lime pill "Get started" button, and a maize-field background.
  - No drone on this screen.
- **Sign-in screen**: drone-over-wheat background, show/hide password.
- **Sign-up**: the password is typed twice.
- **Footer** on the welcome and sign-in screens: "Terms and Conditions | Powered by 4IR". The Terms link opens https://www.agriseta.co.za/.
- **Loading animation**: a realistic side-view quadcopter.
- **Design** (2026-11-06): HelloChoice calculator look. Teal `#1dafa1` primary (`teal-ink #0e7c72` for text/links, `teal-light #7fe0d6` on photos), ink `#22262a`, muted `#66737f`, page `#fafafa`, white forms (`paper`), `field #f3f5f7`, `line #e0e6eb`, pink `#ec4899` (alerts/unread only), sun `#eab308` (on hold, stars), danger `#d64545`; 6px corners; Inter font (one family per weight; use the app `Text` from components/Text). White headers. On-screen name **AgricDrone Hub**. AgriSETA logo on welcome with two teal rings. Unsplash drone photos (IDs checked by eye).

## Android APK
- App ID `com.ir4.agridrone`, version 1.0.0 (versionCode 1). Build with EAS from `mobile/`: `eas build -p android --profile preview` (account ntsocialx; first build 2026-11-09). Local Gradle builds fail on this school PC (Windows 260-char path limit, no admin), so use EAS.
- Signing key: `mobile/credentials/` (gitignored) + `mobile/credentials.json` for EAS; the same key must sign every update. Bump `android.versionCode` in app.json for each new APK.

## Status
**Done:** auth (register, login, password reset), job flow, bidding, completion, ratings, uploads, admin verification and moderation, the Render deploy, the app connected to the live API, the web preview working, the redesigned welcome and sign-in screens, uploads working in the browser and on phones (expo-file-system File), Sign out on the Profile screens, a farm owner Profile tab, and Edit details / Change password for pilots and farm owners (`GET/PATCH /me`, `POST /me/password`; the current password is required to change email), in-app notifications (a bell with an unread count in the headers; admin broadcasts to everyone tagged Announcement or App update; system notices for job activity, verification, reviews and report outcomes), and job-post violation reports (categories plus a note; the admin can dismiss, resolve, remove the post (status `removed`) or suspend the owner; suspended owners cannot sign in and their open jobs are hidden; the admin can unsuspend; `SUPPORT_EMAIL` env sets the appeal contact).

**Pending:**
1. (Dropped: the Figma Make restyle was replaced by the HelloChoice design on 2026-11-06.)
2. Test the full flow on the user's iPhone with Expo Go.
3. In-app notifications.
4. A cancel-job button in the app.
5. Privacy docs in `docs/privacy/`.
6. An OpenAPI document.
7. `sslmode=verify-full` on the database connection.
8. A "stay signed in" approach.
9. Render free-plan cold starts.
10. A Terms link on the sign-up checkbox (offered, not yet answered).

`docs/Student_Guide_v1.0.docx` is deliberately not committed.

## How to work with this user
- **Ask, don't guess** on product, design or flow decisions (use AskUserQuestion). Pick obvious technical defaults yourself and say so.
- Explain in plain English with step-by-step instructions. The user is on Windows with PowerShell, in VS Code.
- After a change: run `npx tsc --noEmit` and `npx expo lint` in `mobile/` (and `npm test` in `server/` for API changes), then commit and push to **main, dev and master** (`git push origin main && git push origin main:dev && git push origin main:master`). Scan for secrets before committing.
- To check the UI visually while the user's Expo server runs on http://localhost:8081: launch headless Chrome with `--remote-debugging-port`, then capture a 390×844 mobile screenshot over the Chrome DevTools protocol after waiting about 7s for animations.
- After installing packages, tell the user to restart with `npx expo start --clear`.
- Never put secrets in chat, and never run production migrations without the user's approval.

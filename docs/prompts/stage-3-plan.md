# Stage 3 Plan — Mobile Application Core & Figma-Led Interactive Experience

**Status:** Proposed — Awaiting user approval  
**Depends on:** Stage 1 (Technical Foundation) & Stage 2 (Figma Design Evidence)  
**Scope:** Implement the complete runnable mobile application in `mobile/` reflecting the 8 Figma screens documented in `docs/design/figma-inventory.md`, using Expo SDK 58, Expo Router, TypeScript, and NativeWind v4, so the user can immediately test and run the app on their iPhone with Expo Go.

---

## 1. Goal

Transform the technical placeholder in `mobile/` into a fully interactive, beautifully styled, offline-capable mobile MVP matching the Figma prototype design tokens and screens. 

The app will allow testing the end-to-end user journeys directly on an iPhone via Expo Go:
1. **Welcome Screen** with role-based demo shortcuts.
2. **Registration & Onboarding** (Operator & Farm Owner flows with POPIA notice).
3. **Operator Profile & Licence Upload** with mock document pickers and safety notice.
4. **Operator Home & Marketplace** with service category filters, search, and featured job cards.
5. **Job Details & Bid Sheet** with compliance hold warnings on high-risk services (e.g. agricultural spraying) and interactive bid submission.
6. **Farm Owner Post Job** form with service type, location, area, and ZAR budget.
7. **Review Bids** view with candidate cards, flight hours, distance, and operator selection.
8. **Admin Verification Queue** with mock document review, and Approve/Reject status actions.

---

## 2. Proposed Changes

### `mobile/tailwind.config.js` & `mobile/global.css`
- Configure design tokens from `docs/design/figma-inventory.md`:
  - `forest`: `950` (`#06261c`), `900` (`#0a3326`), `800` (`#124635`), `700` (`#1d5c45`)
  - `lime`: `DEFAULT` (`#b8f13e`), `soft` (`#e8f9bd`)
  - `cream`: `#f7f5ed`
  - `paper`: `#fffef9`
  - `muted`: `#64706a`
  - `danger`: `#c84b42`
  - Border radii: `12px` (sm), `18px` (md), `26px` (lg).

### `mobile/src/lib/mock-data.ts`
- Clean, realistic synthetic data for development and testing (jobs, candidate bids, operator profiles, admin queue).
- Zero real personal information, real licence numbers, or sensitive data (100% compliant with POPIA and Rule 8).

### `mobile/src/app/` (Expo Router Routes)
- `src/app/index.tsx`: **Welcome Screen** — Hero banner, "DRONE SERVICES, SIMPLIFIED", value statement, "Get Started" CTA, and quick demo role switchers (Operator, Farm Owner, Admin).
- `src/app/(auth)/register.tsx`: **Registration** — Role selection cards (Operator vs Farm Owner), name, phone, email, password, and explicit Terms & POPIA checkbox.
- `src/app/(auth)/operator-profile.tsx`: **Profile & Licence Upload** — Step 2 of 2: Operating base, service radius, service chips, RPL licence & ID document rows with file picking, and privacy reassurance.
- `src/app/(tabs)/_layout.tsx`: **Tab Layout** — Bottom tab bar with Home, Jobs, Post a Job, and Profile.
- `src/app/(tabs)/index.tsx`: **Operator Home & Marketplace** — Evergreen header panel, greeting, verification pill, search bar, service category chips, and job listing cards with area, date, and ZAR budget.
- `src/app/job/[id].tsx`: **Job Details Screen** — Service label, farm location, area, budget, brief, poster info, and compliance hold warning banner on high-risk jobs (e.g. spraying), with a sticky "Place a Bid" CTA opening the Offer Sheet.
- `src/app/(tabs)/post-job.tsx`: **Farm Owner Post a Job** — Service selector, farm location, area, date, ZAR budget, "verified operators only" toggle, and publish action.
- `src/app/job/[id]/bids.tsx`: **Review Bids Screen** — Bid count, operator candidate cards with avatar, rating, bid amount, flight hours, distance, and "Select Operator" action.
- `src/app/admin/index.tsx`: **Admin Verification Queue** — Status metric cards (Pending, Approved, Flagged), applicant cards with licence/ID previews, and Approve / Reject decision actions.

---

## 3. Explicit Exclusions

- No live cloud backend or production database connection (Neon/Render/Cloudinary live credentials) in this stage.
- No real personal information, real licence numbers, or real phone numbers in code or mock fixtures.
- Restricted services (such as agricultural spraying) display the mandatory compliance warning and hold indicator rather than allowing unverified assignment, in strict compliance with `AGENTS.md` Rules 9 & 10.
- No payment processing, escrow, or push notifications (MVP exclusions).

---

## 4. Verification Commands

Run in `mobile/`:

```powershell
npm run lint
npm run typecheck
npx expo config --type public
npx expo export --platform ios
npx expo start
```

---

## 5. Acceptance Criteria

1. The temporary placeholder in `mobile/src/app/index.tsx` is replaced by the authentic Figma Welcome screen and complete route structure.
2. All 8 screens documented in `docs/design/figma-inventory.md` are accessible and interactive via Expo Router.
3. The app builds cleanly, and `npm run lint` and `npm run typecheck` pass with zero errors.
4. The user can run `npx expo start` and scan the QR code to use the app immediately on an iPhone in Expo Go.
5. All synthetic data is safe, privacy-compliant, and contains no real personal identifiers.
6. High-risk services feature prominent compliance warnings per aviation safety rules.

---

## 6. Approval Gate

Per `docs/AGENTS.md` Rule 2.5: **Wait for explicit user approval before coding.**  
Once approved, implementation of Stage 3 will begin immediately.


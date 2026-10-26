# AgriDrone Figma Design Inventory

**Prototype:** AgriDrone Mobile MVP Redesign (Figma Make)  
**Inspected:** 2026-10-23, after the user signed in to Figma in the open browser  
**Reference:** [Figma Make prototype](https://www.figma.com/make/ZW17DSdkpWRKGq0wWrny3w/AgriDrone-Mobile-MVP-Redesign)  
**Status:** Primary mobile flows inspected; the separate farm-owner dashboard and several interaction/error states are not present or remain unverified.

## Source and scope

The Figma Make prompt describes eight mobile screen areas: Welcome, Registration, Operator Profile & Licence Upload, Operator Home & Job Marketplace, Job Details, Farm Dashboard & Post Job, Review Bids, and Admin Verification. The Make preview identifies its canvas as an iPhone 17 (Lavender). It presents a narrow, vertically scrolling mobile layout; no tablet, desktop, or landscape variants were available for review.

The preview is an interactive demonstration, not an API-backed or authenticated product. Its shortcuts, default field values, statuses and sample records are not requirements or evidence of real users, regulatory approval, or production behavior.

## Screen inventory

| Screen area | Observed structure and controls | Observed navigation/state | Gaps and implementation constraints |
| --- | --- | --- | --- |
| **1. Welcome** | AgriDrone mark; aerial farmland hero with a dark overlay; “DRONE SERVICES, SIMPLIFIED” eyebrow; large headline and short value statement; lime **Get started** CTA; existing-account action; shortcuts to farm-owner and administrator experiences. | **Get started** opens operator registration. The farm-owner shortcut opens job posting directly; the administrator shortcut opens the verification queue directly. The existing-account action opens the operator home without credential entry. | Direct role shortcuts are demo-only. Production must authenticate users, must not grant admin through public registration, and must follow role authorization rules. |
| **2. Registration** | Two-step progress header; operator and farm-owner role cards; full name, mobile number, email and password inputs; Terms of Service/Privacy Policy checkbox; **Continue** action. | Choosing the operator role and continuing opens the operator profile step. In the preview, continuing with blank fields still advanced. Choosing farm owner instead navigated directly to the job-posting form. | Validation and a farm-owner registration/profile flow are not demonstrated. The terms checkbox is pre-checked; production consent must be deliberate and recorded as required by the project rules. |
| **3. Operator Profile & Licence Upload** | Step 2 of 2; avatar/photo action; profile-strength indicator; operating base and service-radius fields; service chips; remote-pilot-licence upload row with file-type/size guidance; identity-document row; privacy reassurance; **Submit for verification** CTA. | Submitting shows a confirmation toast and opens the operator home with a “Verification in review” status. The preview includes prefilled values and an already-present identity document. | Do not copy names, locations, masked identifiers, licence numbers or document names from the preview. Licence/identity documents are sensitive evidence: real consent, private upload/retrieval, retention and access controls must be designed and approved separately. |
| **4. Operator Home & Job Marketplace** | Dark evergreen header panel with greeting, prominent headline and verification status; search/filter control; service-category tiles; featured job cards with aerial imagery, category, location/date and budget; bottom navigation for Home, Jobs, Post and Profile. | Selecting a featured job opens Job Details. The Post tab opens the farm-owner job-posting form; Profile returns to the operator-profile flow. The notification control showed an empty-notifications toast. | The preview exposes marketplace actions while the operator status says “Verification in review.” Eligibility must be enforced by the API, and the UI must not imply an in-review operator is eligible for restricted work. Search/filter and empty/offline/error states were not fully explored. |
| **5. Job Details** | Aerial crop/drone image; open-for-bids status; service label and title; location/distance; compact area/date/budget summary; job brief; farm-location card; poster summary and verification badge; sticky budget footer with **Place a bid**. | **Place a bid** opens an offer sheet with price, estimated completion, message and **Submit bid**. The sheet was inspected but not submitted. | The observed job is agricultural spraying. The design presents it as open for bids and permits opening the bid form without a prominent compliance warning/hold. This conflicts with the repository requirement to keep restricted/high-risk services disabled or held pending approved policy and necessary evidence. Do not implement an active bid/assignment path for such work based only on this prototype. |
| **6. Farm Dashboard & Post Job** | The reachable screen is titled **Post a job** and has a farm-owner hero, service-type selector, farm-location, area/date, description, ZAR budget range, a checked “verified operators only” option, and **Publish job**. A **Bids** link appears in the header. | The welcome farm-owner shortcut opens this form directly. Publishing opens Review Bids and shows a “job is now live” toast. The header link also opens Review Bids. | A separate farm-owner dashboard was not found. The demo contains prefilled form values and no demonstrated dashboard/job-listing/home navigation. Clarify the intended dashboard before implementing that screen. |
| **7. Review Bids** | Job summary banner and bid count; “Compare your options” section; “Best match” sort control; operator cards with avatar initials, name, displayed rating/job count, bid total, verification label, flight-hour and distance metadata, message, and profile/select actions. | **View profile**, **Select operator**, and **Select** actions are present. Their resulting state was not committed during inspection. | The displayed rating/review metrics conflict with the approved MVP exclusion of ratings/reviews. Selection must remain farm-owner-controlled and server-authorized, with eligibility/compliance checks and an unambiguous confirmation step. No payment/escrow behavior is specified or permitted by the MVP. |
| **8. Admin Verification** | Admin-console header with pending/approved/flagged counts; search and sort controls; application cards with status, submission details, licence/identity-document rows, and Reject/Approve buttons. | The welcome administrator shortcut opens the queue directly. The visible approve/reject actions were not activated. | This is a demo-only route, not admin authentication. The view handles sensitive documents; production access must be restricted and audited. The prototype does not show a decision reason, resubmission flow, audit trail, or authorization boundary. Internal review must not be described as government certification or permission to fly. |

## Observed paths and prototype behavior

1. Welcome → **Get started** → operator registration → operator profile → **Submit for verification** → operator home.
2. Welcome → farm-owner shortcut → **Post a job** → **Publish job** or **Bids** → Review Bids.
3. Operator home → featured job → Job Details → **Place a bid** → offer sheet.
4. Welcome → administrator shortcut → Admin Verification queue.

These paths were exercised in the preview without submitting a bid, approving/rejecting an application, or selecting an operator. Registration advanced with blank fields, so the preview does not establish validation requirements. Beyond the verification status and submission/job-live toasts, no loading, network-error, offline, permission-denied, form-error, empty-marketplace, or resubmission states were demonstrated.

## Visual system

The preview exposes these CSS custom properties. Values are recorded as shown by the prototype, not as an endorsement of contrast or accessibility:

| Token | Value | Observed use |
| --- | --- | --- |
| `--forest-950` | `#06261c` | Deep evergreen panels and high-emphasis surfaces |
| `--forest-900` | `#0a3326` | Evergreen header surfaces |
| `--forest-800` | `#124635` | Secondary evergreen controls/surfaces |
| `--forest-700` | `#1d5c45` | Green accents and icon/text treatment |
| `--lime` | `#b8f13e` | Primary actions and active/highlight states |
| `--lime-soft` | `#e8f9bd` | Soft highlight/status backgrounds |
| `--cream` | `#f7f5ed` | Main warm background |
| `--paper` | `#fffef9` | Cards and input surfaces |
| `--muted` | `#64706a` | Secondary text |
| `--danger` | `#c84b42` | Destructive/reject treatment |
| `--radius-sm` / `md` / `lg` | `12px` / `18px` / `26px` | Small, medium and large rounded surfaces |

- **Typography:** DM Sans is used for body text and Manrope for headings. An inspected admin headline is 34px, weight 700, with a 34.68px line height; other sizes vary by hierarchy.
- **Hierarchy:** bold, large sentence-case headlines; small uppercase, letter-spaced section labels; compact metadata; short status pills.
- **Components:** rounded cards and fields, subtle borders, generous whitespace, outlined secondary controls, and strong lime primary actions. The operator home/admin header uses dark-green surfaces; content is warm cream/paper.
- **Imagery and icons:** aerial fields and agricultural-drone imagery establish the hero/job-card visual language; simple line icons support service and metadata labels. No assets were exported or copied.
- **Spacing:** the preview uses consistent mobile gutters and card spacing. No numeric spacing scale was exposed; any spacing values inferred from screenshots must be treated as estimates, not source tokens.
- **Responsive behavior:** only the iPhone 17 mobile canvas was inspected. Breakpoints, larger-device layouts, and orientation changes remain unspecified.
- **Accessibility:** the browser accessibility tree exposes names for many controls and text fields. No formal contrast, screen-reader, dynamic type, keyboard, or touch-target audit was performed; accessibility compliance is not established by this inventory.

## Conflicts, open questions, and guardrails

1. **Farm-owner dashboard:** no separate dashboard is reachable; the owner shortcut opens Post a Job. Confirm the intended dashboard scope or approve a later design proposal.
2. **Restricted service safety:** the prototype’s spraying example is open for bids and presents an active bid CTA. The project rules require a compliance hold for restricted/high-risk services until authoritative policy/evidence review; the rules in `docs/AGENTS.md` take precedence.
3. **Verification eligibility:** an operator marked “Verification in review” can reach a bid form in the preview. Future APIs must enforce eligibility server-side, regardless of hidden/disabled UI controls.
4. **Consent and documents:** the terms checkbox starts checked, and the profile shows identity/licence evidence plus an encryption assurance. Production requires explicit, versioned terms acceptance; separate upload consent; private, authorized document handling; and documented retention/deletion. No security guarantee should be copied from decorative mock text.
5. **Ratings:** bid cards show ratings/review counts, while the approved project plan excludes ratings/reviews. Omit these unless the product scope is separately reviewed and approved.
6. **Admin decisions:** approve/reject controls have no visible reason/audit workflow. Do not implement public admin access; decisions need restricted authorization, audit logging and an appropriate reason/resubmission flow.
7. **Preview data:** the prototype contains personal-looking names, locations, contact-field examples, licence/identity references and document labels. None are reproduced here. Treat all examples as unverified and use fresh synthetic data in implementation.
8. **Study guide:** the TUT WIL Full-Stack Programme Student Guide v1.0 has not been located or reviewed. Guide-specific claims remain out of scope until the user supplies its exact path or file.

## Implementation boundary

This inventory records design evidence and constraints; it does not approve product implementation. The next implementation stage needs its own reviewed plan and explicit user approval. It must define form validation, accessibility, empty/loading/error/offline behavior, role-appropriate navigation, synthetic data, and server-authoritative eligibility. No demo shortcut, legal/compliance claim, consent default, sensitive document behavior, rating feature, or missing dashboard should be copied without a separate decision.

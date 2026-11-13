# Stage 5 Plan — From training to earning (compliance, services, training records, impact report)

**Status:** Approved 13 November 2026 ("yes"). Phase 1 built on `dev` (13 Nov): server + 48 tests, app, admin site, legal drafts. Not live until migration 007 is run on Neon and `dev` is merged. Phases 2–4 not started.
**Source:** Concept brief §5.15 "AgriDrone Hub — from training to earning" (AgriSETA 4IR skills priorities), and the decisions below.
**Depends on:** Stage 4 system (live API on Render, Neon migrations 001–006, mobile app v2.0.0, admin website on Vercel).

## Why this stage

The brief's point is that drone training too often ends at the licence, with no route to work. AgriSETA's interest is
closing the loop between the training it funds and the earning that training should produce, and reporting that
outcome through AgriImpact. The marketplace already works; what's missing is (1) the compliance the brief calls
**mandatory**, (2) the brief's service list, (3) a record of each pilot's training, and (4) outcome reporting.

## Gap analysis (brief vs the system on 13 November 2026)

| Brief requirement | Status | Today |
| --- | --- | --- |
| Marketplace linking certified operators with farms | Done | Post → bid → select → complete → confirm → rate |
| Crop surveying, mapping | Done | "Surveying", "Mapping" |
| Livestock monitoring | Partly | Generic "Monitoring" only |
| Multispectral imaging, infrastructure inspection | Missing | Not offered |
| Spraying only where legally permissible | Partly | Always on hold; no lawful route (kept, by decision) |
| Verify Remote Pilot Licence (RPL) | Partly | Admin checks an uploaded licence; no number or expiry; approval never lapses |
| Operation under a Remote Operating Certificate (ROC) | Missing | Not captured or checked |
| Must not facilitate unlawful operation | Partly | Reports, removal, suspension, spraying hold |
| Legal review before launch | Not done | Draft privacy policy; "Terms and Conditions" links to AgriSETA's homepage; no `docs/compliance/` |
| Training → earning link | Missing | Training not recorded |
| Outcome reporting (AgriImpact) | Missing | No reports or exports |

## Decisions recorded (13 November 2026)

| Topic | Decision |
| --- | --- |
| ROC | Pilot enters ROC holder name, ROC number and expiry, and uploads the certificate or a letter from the ROC holder. Admin checks it together with the RPL |
| RPL | Pilot enters licence number and expiry date alongside the uploaded licence |
| Expiry | In-app reminders 30 and 7 days before an RPL or ROC expires. On expiry the pilot can't bid or be selected until they upload a renewed document and an admin re-approves |
| Training record | Training provider, programme and completion date, plus a training certificate upload. **Required** for verification. Not shown publicly (admin and reporting only) |
| Services | Crop surveying, Mapping, Crop monitoring, Livestock monitoring, Multispectral imaging, Infrastructure inspection, Spraying (held). Existing "Surveying" → Crop surveying, "Monitoring" → Crop monitoring |
| Spraying | Stays on compliance hold until legal review; the compliance notes list what the review must confirm |
| Province | Province picker (9 provinces) on the pilot profile and when posting a job. Existing records show "Not set" until edited |
| Impact report | Starter report on the admin website: totals only (no names), by period, province, service and training programme, with CSV export |
| Earnings | Measured as the accepted bid amount of completed jobs, reported as "agreed value" (the app doesn't handle payments) |
| Legal | I draft Terms of Service, aviation compliance notes with sources, and a launch checklist; mentor/AgriSETA legal review them. All marked Draft until approved |

## Phases (each ends with something you can check)

### Phase 1 — Compliance foundation (launch blocker)

**Database (migration `007_credentials.sql`, run on Neon only with your approval):**
- `operator_profiles`: `rpl_number`, `rpl_expires_on`, `roc_holder_name`, `roc_number`, `roc_expires_on`, `province`, `training_provider`, `training_programme`, `training_completed_on`.
- `uploads.kind` adds `roc` and `training_certificate`, both **private** like the licence (one of each per pilot).
- `jobs.province` (nullable for existing jobs).

**Server:**
- Pilot profile accepts the new fields (dates must be in the future when submitted; province from the fixed list).
- Submitting for verification requires: RPL number + expiry + licence file, ROC details + ROC file, training provider + programme + date + certificate, province.
- The separate licence-upload consent becomes a consent for "verification documents" (licence, ROC proof, training certificate) with a new version number, so existing pilots are asked again before uploading.
- **Eligibility check** on bidding and on being selected: approved **and** RPL and ROC not expired (checked on the server and enforced in one place).
- Renewal: an expired or soon-expiring pilot can update the expiry and upload the new document; the profile goes back to *in review* for re-approval.
- Reminders: created once per threshold (30 days, 7 days, expired) when the pilot's profile or the marketplace is loaded. No scheduler needed on the free plan. Admin site also lists "expiring soon".
- Admin: new private 5-minute links for ROC proof and training certificate (audited like the licence).

**Mobile app:** new fields on the pilot profile (RPL, ROC, training, province), the two extra uploads, expiry warnings on the pilot home, and a clear "Your licence/ROC has expired" message instead of the bid button. Province picker on Post a job.

**Admin website:** Pilots tab shows RPL/ROC/training details with buttons to open each document; an "Expiring soon" filter.

**Legal documents (drafts, for review):**
- `docs/compliance/south-african-aviation.md`: what SACAA requires for commercial RPAS work, with sources and access dates, every point marked *confirmed by source* or *to confirm in legal review* (no invented rules).
- `docs/compliance/launch-checklist.md`: what legal review must sign off before launch (including the spraying question).
- Terms of Service: in-app screen and public page `/terms` (same single-source approach as the privacy policy). The "Terms and Conditions" links (sign-up, sign-in, welcome, admin site) point to it instead of AgriSETA's homepage.

**Tests (server):** expired RPL or ROC can't bid or be selected; submission is refused without ROC/training/province; documents can't be uploaded without the new consent; only admins get document links; renewal returns the profile to review; reminders aren't duplicated.

**Check:** a test pilot with an expiry date in the past is blocked from bidding in the app, and the admin site shows them under "Expiring soon/expired".

### Phase 2 — Service list

- Migration `008_services.sql`: rename existing values (Surveying → Crop surveying, Monitoring → Crop monitoring) in jobs and pilot profiles, and allow the new list. Spraying rule unchanged.
- **Compatibility:** phones still on APK v2 send the old names, so the server accepts "Surveying"/"Monitoring" and maps them to the new names until v3 is everywhere.
- App and admin site show the new services; each needs a photo (see *Open items*).

**Check:** post a "Livestock monitoring" job; a pilot offering it can bid; an old-name request from v2 still works.

### Phase 3 — Impact report (admin website)

- `GET /admin/impact?from=&to=` (admin only) returns totals: pilots registered, profiles submitted, verified and current, with a first job, with a completed job; jobs posted and completed; agreed value of completed jobs; median days from verification to first job. Broken down by province, service and training programme.
- `GET /admin/impact.csv` with the same totals.
- New **Impact** tab on the admin website with the numbers, a period picker and "Download CSV".
- No names or contact details in the report.

**Tests:** totals match a seeded data set; non-admins get 403; CSV has the expected columns.

**Check:** the Impact tab shows sensible numbers for the test data and the CSV opens in Excel.

### Phase 4 — Release

- Update the privacy policy (new data: licence/ROC numbers and expiries, training record, province) and help FAQs.
- APK **v3.0.0** (versionCode 3) after phases 1–3, merged to main with your approval.
- Then the remaining items: delete account, push notifications.

## You will need to do

- Approve each Neon migration (007, 008) before I run it.
- Ask your mentor / AgriSETA who does the legal review, and send them the drafts.
- Later, confirm the AgriImpact indicators so the starter report can be adjusted.

## Added after approval (13 November 2026)

- **Class 3 medical certificate:** required for verification, with its expiry date; like the RPL and ROC, its expiry stops bidding (30/7-day reminders). Health information: explicit consent, private, admin-only (compliance gap G7).
- **Flight log:** required; one file (PDF, photo, Excel or CSV) plus total flight hours. Spreadsheets are stored as Cloudinary "raw" files (checked live).
- **"RPC licence number":** the user meant the RPL number, which was already collected.
- **Go-live:** migration 007, the merge to `main` and APK v3 are released together, so the 30-day grace period starts when pilots can actually add the new details.

## Further decisions (13 November 2026)

1. **Existing approved pilots:** notified when the rules go live and can keep bidding for **30 days** while they add the ROC, expiry dates, training record and province; after that they're blocked until they complete them and an admin re-approves.
2. **Photos for the three new services:** reuse the existing verified drone photos for now.
3. **Training providers:** free text (provider and programme names); admins check them against the certificate; the report groups by the typed names.

## Risks

- Legal facts: the compliance notes must come from authoritative SACAA sources; anything not confirmed stays marked *to confirm* and the app keeps restrictive behaviour (spraying held, unverified pilots can't bid).
- Data minimisation: new fields are licence/certificate details, not ID numbers; documents stay private; the report has no names.
- Old app versions: handled by accepting old service names on the server.

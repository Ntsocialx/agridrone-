# Stage 4 Plan — Figma Redesign, End-to-End Flow, Backend, Uploads, Ratings

**Status:** Approved 2026-11-03 ("start with the work"). Phases 2–6 done on the server (24 tests passing; migrations 001–003). Phase 5 live check pending Cloudinary keys. Phase 1 blocked on the Figma Make export.
**Depends on:** Stage 3 demo app (`mobile/`), Figma Make code export in `docs/design/figma-make/`

## Decisions recorded (2026-11-03)

| Topic | Decision |
| --- | --- |
| Figma source | Downloaded Make code in `docs/design/figma-make/` is the source of truth for layout, fonts and images |
| Ratings | In MVP. Farm owner gives 1–5 stars + written review once per completed job. Overrides the AGENTS.md §1 exclusion, which must be updated |
| Pilot "work" | Completed-jobs list + public portfolio photos |
| Completion | Pilot marks complete → farm owner confirms |
| Login | Email + password, hashed on server, token in `expo-secure-store` |
| Licences | Cloudinary `authenticated` delivery; admin-only short-lived signed URLs |
| Portfolio | Cloudinary public folder, separate from licences |
| Reviews | Live immediately; pilot can report; admin can hide |
| Hosting | API on Render, Postgres on Neon, repo on GitHub |

## The flow (one job, start to finish)

```
Farm owner                      Pilot                          Admin
----------                      -----                          -----
Register (consent)              Register (consent)
                                Profile + upload licence  ───► Review licence
                                                          ◄─── Approve / reject (reason)
Post job ───────────────────►   Sees job in marketplace
                                Places bid (approved only)
Reviews bids ◄──────────────
Selects pilot (confirm) ────►   Job appears in "My jobs"
                                Does the work, marks complete
Confirms completion ◄───────
Rates pilot (stars + review) ►  Completed count + review on profile
                                Uploads portfolio photos
                                Reports unfair review ────────► Hide / keep review
```

Job status: `open → assigned → pending_confirmation → completed` (or `cancelled`).
Restricted services (spraying) stay `on_hold` and never reach `assigned`.

## Phases (each ends with a check you can see)

1. **Redesign to Figma** — copy tokens, fonts (DM Sans, Manrope), images and layout from the Make export into the existing screens; add the missing screens the flow needs: role-based home, My jobs, Pilot public profile, Rate pilot.
   *Check:* side-by-side screenshots match; lint + typecheck pass.
2. **Database (Neon)** — migrations for users, operator_profiles, documents, jobs, bids, reviews, review_reports, portfolio_items, consents, audit_log.
   *Check:* migrations run on a Neon dev branch.
3. **Auth API** — register/login, bcrypt/argon2 hashing, short-lived JWT, role checks on every route, rate limits.
   *Check:* vitest + supertest for each role boundary.
4. **Jobs, bids, completion API** — server enforces: approved pilots only, no bids on restricted jobs, owner-only selection in a transaction, two-step completion.
   *Check:* tests for every illegal transition.
5. **Cloudinary uploads** — server issues signed upload params after consent is recorded; licences `authenticated`, portfolio public; admin gets 5-minute signed view URLs.
   *Check:* a licence URL fails without a signature.
6. **Ratings** — one review per completed job by its owner; average + count on the pilot profile; report/hide.
   *Check:* tests reject duplicate, non-owner and not-completed reviews.
7. **Connect mobile to API** — replace the in-memory store with a typed API client; loading/error/empty states.
8. **Deploy** — `render.yaml`, health check `/api/v1/health`, env vars set by you in the Render dashboard.
   *Check:* the phone app works against the Render URL.

## You will need to do (secrets never go in chat or git)

- Put `DATABASE_URL` (Neon), `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` and `JWT_SECRET` in `server/.env` locally and in Render's Environment tab.
- Download the Figma Make code into `docs/design/figma-make/`.

## Answered questions (2026-11-03)

1. Reviews show on the pilot's public profile — **yes**.
2. Pilots rate farm owners — **no**, ratings are one-way (owner → pilot).
3. Pilots reply publicly to reviews — **no** (they can still report a review).

# Launch checklist — legal review (AgricDrone Hub)

**Status: Draft, 13 November 2026.** The concept brief makes legal review a precondition of launch. Nothing here is
signed off yet. Reviewer(s): *to be named by the mentor / AgriSETA*.

## Documents to review

- [ ] Terms of Service (draft) — in the app (Sign-up → "Read the Terms of Service") and at `/terms` on the admin website; source `mobile/src/content/terms.json`
- [ ] Privacy policy (draft) — in the app and at `/privacy`; source `mobile/src/content/privacy.json`
- [ ] Aviation compliance notes — `docs/compliance/south-african-aviation.md`

## Aviation (SACAA, Part 101)

- [ ] Confirm the operator certificate's current name (ROC or UASOC) and whether pilots may fly under an employer's certificate
- [ ] Confirm the Remote Pilot Licence validity and renewal rules (for expiry reminders)
- [ ] Decide whether aircraft registration and the UAS Letter of Authority/Approval must be checked per pilot (gap G1)
- [ ] Confirm whether an Air Services Licence is needed, and by whom (gap G2)
- [ ] Decide what jobs must declare about aerodromes and controlled/restricted airspace (gap G3)
- [ ] Approve the wording that verification is an internal check, not SACAA approval

## Agricultural spraying

- [ ] Confirm the requirements under Part 101 and Act 36 of 1947 (PCO aerial-application registration, agricultural rating, remedy registered for aerial use, SANS 10118)
- [ ] Decide whether the platform will ever allow spraying, and with what evidence — until then it stays on compliance hold

## Data protection (POPIA)

- [ ] Responsible party wording ("AgricDrone Hub") and contact address
- [ ] Information Officer registration with the Information Regulator — needed or not?
- [ ] Cross-border storage (Render and Neon in the USA, Cloudinary, Brevo, Vercel) — adequate safeguards
- [ ] Retention periods, and the account-deletion process (in-app deletion is planned)
- [ ] Impact report contains totals only (no names)

## Platform terms

- [ ] AgricDrone Hub is not a party to agreements between farm owners and pilots, and doesn't handle payment
- [ ] Liability wording and the Consumer Protection Act
- [ ] Suspension and appeal process
- [ ] Governing law and dispute resolution

## Sign-off

| Area | Reviewer | Date | Outcome |
| --- | --- | --- | --- |
| Aviation | | | |
| Agricultural spraying | | | |
| POPIA | | | |
| Terms of Service | | | |

# South African aviation compliance notes (AgricDrone Hub)

**Status: Draft for legal review — not legal advice.** Prepared 13 November 2026 for Stage 5
(docs/prompts/stage-5-plan.md). AGENTS.md §9 requires these notes before definitive compliance rules are written.

Every point is marked:

- **Confirmed (SACAA)** — read on the SACAA's own website on 13 November 2026.
- **Reported (secondary)** — from web-search summaries of industry or law-firm sources; the pages themselves could not be opened from the project network (DNS / connection failures). Treat as *to confirm*.
- **To confirm** — open question for legal review.

## Sources

| # | Source | Accessed | How |
| --- | --- | --- | --- |
| S1 | SACAA, *Unmanned Aircraft Systems* — https://www.caa.co.za/industry-information/uas/ | 13 Nov 2026 | Read directly (first ~40 000 characters verbatim; the requirements table at the end only as a summary) |
| S2 | Caderco, *Commercial Drone Regulation: Part 101 RPAS Operator Certificates, Pilot Licences, and BVLOS Operations* — https://www.caderco.co.za/articles/remotely-piloted-aircraft-systems-rpas-drones-part-101 | 13 Nov 2026 | Search summary only |
| S3 | Cliffe Dekker Hofmeyr, *Drone operations in South Africa: an overview of the legal landscape* (19 June 2024) — https://www.cliffedekkerhofmeyr.com/en/news/publications/2024/Practice/Corporate/corporate-commercial-alert-19-June-2024-drone-operations-in-south-africa-an-overview-of-the-legal-landscape | 13 Nov 2026 | Search summary only (page unreachable) |
| S4 | CropLife SA, *Regulatory Requirements for the Use of Drones for Aerial Application of Agricultural Remedies* — https://croplife.co.za/Article/NewsArticle?pv=regulatory-requirements-for-the-use-of-drones-for-aerial-application-of-agricultural-remedies | 13 Nov 2026 | Search summary only (page unreachable) |
| S5 | Department of Agriculture, *Registration as a pest control operator in terms of section 10 of Act 36 of 1947* — https://www.nda.agric.za/doaDev/sideMenu/ActNo36_1947/PCOs/General.htm | 13 Nov 2026 | Search summary only (connection refused) |
| S6 | Government Gazette No. 34020, R. 98, 18 February 2011 (pest control operator regulations under Act 36 of 1947) — https://sapca.org.za/wp-content/uploads/2021/11/Act-36-of-1947.DALRRD.-Pest-Control-Operator-Regulation.pdf | 13 Nov 2026 | Search summary only |

## 1. Legal basis

- **Confirmed (SACAA, S1):** Remotely piloted aircraft are regulated under **Part 101 of the Civil Aviation Regulations, 2011**. "The amendment which contains Part 101: Remotely Piloted Aircraft Systems came into operation on the 1st of July 2015."
- **Reported (S3):** The SACAA has acknowledged that Part 101 needs modernisation. **To confirm:** whether any amendment after 2015 changes the points below.

## 2. What commercial operation requires

| Requirement | Finding | AgricDrone Hub today |
| --- | --- | --- |
| Operator certificate | **Confirmed (S1):** "the operator shall hold a Unmanned Aircraft Systems Operating Certificate (UASOC)". The concept brief and other sources call this the **ROC** (Remote/RPAS Operator Certificate). **To confirm:** the current official name, and whether a pilot may fly under an employer's certificate. | Pilot gives certificate holder, number, expiry and proof; admin checks it. The app says "Remote Operating Certificate (ROC)". |
| Pilot licence | **Confirmed (S1):** a training provider (approved training organisation) applies to the SACAA for a **Remote Pilot Licence (RPL)** after the course. Applicants: at least 18, current medical assessment, pass the RPL practical assessment, English Language Proficiency level 4 or higher. **To confirm:** validity period and renewal rules (not stated on S1). | Licence number, expiry date and document; admin checks; bidding stops at expiry. |
| Aircraft approval | **Confirmed (S1):** "the UA must first be approved by the South African Civil Aviation Authority for use by way of an UAS Letter of Authority" (the S1 requirements table reportedly calls it an RLA — RPAS Letter of Approval). | **Not captured.** See gap G1. |
| Aircraft registration | **Confirmed (S1):** "No remotely UAS shall be operated within the Republic of South Africa, unless such UAS has been issued with a certificate of registration by the Commissioner" (Part 101.02.4(1); forms CA-47R1 to CA-47R5). | **Not captured.** See gap G1. |
| Air Services Licence | **Reported (S1 summary, S2):** an Air Service Licence is listed as required for commercial operations. **To confirm** with the Department of Transport / Air Service Licensing Council. | Not captured. See gap G2. |
| Insurance | **Reported (S3):** proof of third-party liability insurance is part of the operator-certificate application. **To confirm.** | Not captured. |
| Maintenance | **Reported (S1 summary):** maintenance programme approved by the Commissioner; RMT required for class 3 and higher. | Not in scope. |

## 3. Operating limits (relevant to which jobs the platform should accept)

**Confirmed (S1)** — unless approved by the SACAA, do not operate:

- 10 km or closer to an aerodrome (airport, helipad, airfield);
- in controlled, restricted or prohibited airspace;
- higher than 150 ft above ground (unless approved by the Commissioner);
- 50 m or closer to people or property without permission;
- next to or above a nuclear power plant, prison, police station, crime scene, court, national key point or strategic installation;
- outside visual line of sight, at night or in poor weather ("should remain within the visual line of sight at all times"; "Fly/operate RPA in daylight and clear weather conditions").

**Reported (S1 summary):** UAS operations are currently limited to radio line-of-sight; beyond radio line-of-sight is "reserved for future use".

**To confirm:** which of these limits are relaxed for an operator whose certificate and operations manual allow it (S1 says "unless approved by the SACAA"), and whether the platform should ask farm owners about aerodromes/airspace near the farm (gap G3).

## 4. Agricultural spraying (why it stays on hold)

All points in this section are **Reported (secondary)** and **to confirm** — no primary source could be opened.

- **Confirmed (S1), private operations only:** "Do not release dispense, drop, deliver or deploy any object or substance from a UAS". S1 does not state the commercial rule for dispensing.
- **Reported (S4, S5, S6):** spraying agricultural remedies by drone also falls under the **Fertilizers, Farm Feeds, Agricultural Remedies and Stock Remedies Act 36 of 1947**: an operator spraying for hire needs **pest control operator (PCO) registration** with aerial application as the field of operation, issued by the Registrar of Act 36 of 1947.
- **Reported (S4):** before applying for aerial-application PCO registration, RPA operators must be licensed as commercial pilots with an **agricultural rating**; the aerial field has required an AVCASA aerial crop sprayer course.
- **Reported (S4):** the remedy must be **registered for aerial application** and carry SANS 10118 clauses and aerial-application directions on its label.
- **Reported (S4):** farmers or their direct employees spraying their own crops by drone must hold the aviation licences but may not need Act 36 registration, while still following SANS 10118.

**Platform position (decision 13 Nov 2026):** spraying jobs stay on compliance hold (visible, never biddable or assignable — enforced in the database) until legal review confirms the requirements and an evidence check is designed (likely: PCO aerial-application registration, agricultural rating, remedy registered for aerial use).

## 5. What the platform's verification is (and isn't)

- An AgricDrone Hub approval is an **internal check** that the uploaded documents look valid and current. It is not SACAA approval and does not make any particular flight lawful (AGENTS.md §9; shown to pilots and admins).
- Pilots remain responsible for operating within their licence, certificate, aircraft approval and Part 101.

## Gaps for legal review

| # | Gap | Suggested direction (for approval) |
| --- | --- | --- |
| G1 | Aircraft Letter of Authority/Approval and registration certificate are not captured | Add per-aircraft details (registration number, LoA/RLA number, expiry) and documents, checked like the ROC |
| G2 | Air Services Licence not captured | Confirm whether it applies to every pilot or only to the certificate holder; capture if required |
| G3 | Jobs near aerodromes or restricted airspace | Ask farm owners to confirm whether the farm is within 10 km of an aerodrome or in controlled/restricted airspace, and show pilots a warning |
| G4 | Terminology: ROC vs UASOC | Confirm the current official name and update the app wording |
| G5 | RPL validity/renewal | Confirm so expiry reminders match the real renewal cycle |
| G6 | Spraying | Keep on hold; define the evidence check after review (section 4) |

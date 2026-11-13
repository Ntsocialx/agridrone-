import { Router } from "express";
import { z } from "zod";
import { currentUser, requireRole } from "../auth";
import { ELIGIBLE_SQL, PROVINCES, sendExpiryReminders } from "../credentials";
import type { Db } from "../db";
import { HttpError, conflict, idParam, notFound, parse } from "../http";
import { notify } from "../notify";
import { BIDDABLE_SERVICES } from "./jobs";

const date = (column: string) => `to_char(${column}, 'YYYY-MM-DD')`;
const attached = (kind: string) => `EXISTS (SELECT 1 FROM uploads u WHERE u.user_id = p.user_id AND u.kind = '${kind}')`;

const PROFILE_FIELDS = `
  p.base, p.radius_km AS "radiusKm", p.services, p.province,
  p.verification_status AS "verificationStatus", p.rejection_reason AS "rejectionReason",
  p.rpl_number AS "rplNumber", ${date("p.rpl_expires_on")} AS "rplExpiresOn",
  p.roc_holder_name AS "rocHolderName", p.roc_number AS "rocNumber", ${date("p.roc_expires_on")} AS "rocExpiresOn",
  p.training_provider AS "trainingProvider", p.training_programme AS "trainingProgramme",
  ${date("p.training_completed_on")} AS "trainingCompletedOn",
  ${date("p.medical_expires_on")} AS "medicalExpiresOn", p.flight_hours::float8 AS "flightHours",
  ${date("p.eligible_until")} AS "eligibleUntil", ${ELIGIBLE_SQL} AS "canBid",
  ${attached("licence")} AS "licenceAttached", ${attached("roc")} AS "rocAttached",
  ${attached("medical_certificate")} AS "medicalCertificateAttached",
  ${attached("training_certificate")} AS "trainingCertificateAttached", ${attached("flight_log")} AS "flightLogAttached"`;

/** Statuses in which the pilot can change their details and documents (uploads.ts locks the rest). */
const editable = `p.verification_status IN ('not_submitted', 'rejected', 'updating')`;

const isoDate = z.iso.date();
// Optional fields: leave out to keep the saved value, send null to clear it.
const optional = <T extends z.ZodType>(schema: T) => schema.nullable().optional();
const profileSchema = z.object({
  base: z.string().trim().min(2).max(100),
  radiusKm: z.number().int().min(1).max(500),
  // Restricted services can't be offered until a compliance policy exists.
  services: z.array(z.enum(BIDDABLE_SERVICES)).min(1).max(BIDDABLE_SERVICES.length),
  province: optional(z.enum(PROVINCES)),
  rplNumber: optional(z.string().trim().min(3).max(40)),
  rplExpiresOn: optional(isoDate),
  rocHolderName: optional(z.string().trim().min(2).max(120)),
  rocNumber: optional(z.string().trim().min(3).max(40)),
  rocExpiresOn: optional(isoDate),
  trainingProvider: optional(z.string().trim().min(2).max(120)),
  trainingProgramme: optional(z.string().trim().min(2).max(120)),
  trainingCompletedOn: optional(isoDate),
  medicalExpiresOn: optional(isoDate),
  flightHours: optional(z.number().min(0).max(100_000)),
});

const OPTIONAL_COLUMNS = {
  province: "province",
  rplNumber: "rpl_number",
  rplExpiresOn: "rpl_expires_on",
  rocHolderName: "roc_holder_name",
  rocNumber: "roc_number",
  rocExpiresOn: "roc_expires_on",
  trainingProvider: "training_provider",
  trainingProgramme: "training_programme",
  trainingCompletedOn: "training_completed_on",
  medicalExpiresOn: "medical_expires_on",
  flightHours: "flight_hours",
} as const;

type Profile = {
  base: string;
  services: string[];
  province: string | null;
  rplNumber: string | null;
  rplExpiresOn: string | null;
  rocHolderName: string | null;
  rocNumber: string | null;
  rocExpiresOn: string | null;
  trainingProvider: string | null;
  trainingProgramme: string | null;
  trainingCompletedOn: string | null;
  medicalExpiresOn: string | null;
  flightHours: number | null;
  licenceAttached: boolean;
  rocAttached: boolean;
  medicalCertificateAttached: boolean;
  trainingCertificateAttached: boolean;
  flightLogAttached: boolean;
};

/** What still stops this profile being submitted, in the words the pilot sees. */
function missingForSubmit(p: Profile, today: string) {
  const missing: string[] = [];
  if (!p.base) missing.push("operating base");
  if (!p.services.length) missing.push("at least one service");
  if (!p.province) missing.push("province");
  if (!p.rplNumber) missing.push("licence number");
  if (!p.rplExpiresOn || p.rplExpiresOn <= today) missing.push("a licence expiry date in the future");
  if (!p.licenceAttached) missing.push("licence document");
  if (!p.rocHolderName || !p.rocNumber) missing.push("ROC holder and ROC number");
  if (!p.rocExpiresOn || p.rocExpiresOn <= today) missing.push("an ROC expiry date in the future");
  if (!p.rocAttached) missing.push("ROC proof");
  if (!p.medicalExpiresOn || p.medicalExpiresOn <= today) missing.push("a medical certificate expiry date in the future");
  if (!p.medicalCertificateAttached) missing.push("Class 3 medical certificate");
  if (p.flightHours === null) missing.push("total flight hours");
  if (!p.flightLogAttached) missing.push("flight log");
  if (!p.trainingProvider || !p.trainingProgramme) missing.push("training provider and programme");
  if (!p.trainingCompletedOn || p.trainingCompletedOn > today) missing.push("training completion date");
  if (!p.trainingCertificateAttached) missing.push("training certificate");
  return missing;
}

export function operatorsRouter(db: Db) {
  const router = Router();
  router.use(requireRole("operator"));

  const load = async (userId: string) => {
    const { rows } = await db.query<Profile & Record<string, unknown>>(
      `SELECT ${PROFILE_FIELDS} FROM operator_profiles p WHERE p.user_id = $1`,
      [userId],
    );
    if (!rows[0]) throw notFound("Profile");
    return rows[0];
  };

  router.get("/me", async (request, response) => {
    const user = currentUser(request);
    await sendExpiryReminders(db, user.id);
    response.json(await load(user.id));
  });

  router.put("/me", async (request, response) => {
    const input = parse(profileSchema, request.body);
    const user = currentUser(request);
    // Only the fields that were sent are changed (older app versions send just the first three).
    const sets = ["base = $2", "radius_km = $3", "services = $4", "updated_at = now()"];
    const params: unknown[] = [user.id, input.base, input.radiusKm, [...new Set(input.services)]];
    for (const [key, column] of Object.entries(OPTIONAL_COLUMNS)) {
      const value = input[key as keyof typeof OPTIONAL_COLUMNS];
      if (value === undefined) continue;
      params.push(value);
      sets.push(`${column} = $${params.length}`);
    }
    // Approved/in-review details are what the admin checked, so they're locked.
    const { rows } = await db.query(
      `UPDATE operator_profiles p SET ${sets.join(", ")} WHERE p.user_id = $1 AND ${editable} RETURNING p.user_id`,
      params,
    );
    if (!rows[0]) throw conflict("Your profile is locked while it is in review or approved. Tap Update my details to change it.");
    response.json(await load(user.id));
  });

  // An approved pilot starts updating (e.g. a renewed licence). They keep bidding until
  // their verified expiry while they edit, then resubmit for review.
  router.post("/me/update", async (request, response) => {
    const user = currentUser(request);
    const { rows } = await db.query(
      `UPDATE operator_profiles SET verification_status = 'updating', updated_at = now()
       WHERE user_id = $1 AND verification_status = 'approved' RETURNING user_id`,
      [user.id],
    );
    if (!rows[0]) throw conflict("Only an approved profile can be updated this way.");
    response.json(await load(user.id));
  });

  router.post("/me/submit", async (request, response) => {
    const user = currentUser(request);
    const profile = await load(user.id);
    const { rows: today } = await db.query<{ today: string }>("SELECT to_char(CURRENT_DATE, 'YYYY-MM-DD') AS today");
    const missing = missingForSubmit(profile, today[0].today);
    if (missing.length) throw new HttpError(409, "PROFILE_INCOMPLETE", `Add these before submitting: ${missing.join(", ")}.`);

    const { rows } = await db.query(
      `UPDATE operator_profiles p SET verification_status = 'in_review', rejection_reason = NULL,
         submitted_at = now(), updated_at = now()
       WHERE p.user_id = $1 AND ${editable} RETURNING p.user_id`,
      [user.id],
    );
    if (!rows[0]) throw conflict("Your profile is already in review or approved.");
    response.json(await load(user.id));
  });

  return router;
}

const decisionSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("approved") }),
  // A reason is required so the operator knows what to fix before resubmitting.
  z.object({ decision: z.literal("rejected"), reason: z.string().trim().min(5).max(500) }),
]);

const LIST_FILTERS = ["in_review", "approved", "rejected", "updating", "expiring"] as const;

export function adminRouter(db: Db) {
  const router = Router();
  router.use(requireRole("admin"));

  router.get("/operators", async (request, response) => {
    const filter = parse(z.enum(LIST_FILTERS).default("in_review"), request.query.status);
    // "expiring": can bid now but stops within 30 days (or already stopped), soonest first.
    const where =
      filter === "expiring"
        ? `p.eligible_until IS NOT NULL AND p.eligible_until <= CURRENT_DATE + 30
           AND p.verification_status IN ('approved', 'updating', 'in_review')`
        : "p.verification_status = $1";
    const { rows } = await db.query(
      `SELECT u.id, u.full_name AS "fullName", p.submitted_at AS "submittedAt", ${PROFILE_FIELDS}
       FROM operator_profiles p JOIN users u ON u.id = p.user_id
       WHERE ${where}
       ORDER BY ${filter === "expiring" ? "p.eligible_until" : "p.submitted_at"}`,
      filter === "expiring" ? [] : [filter],
    );
    response.json(rows);
  });

  router.post("/operators/:id/decision", async (request, response) => {
    const input = parse(decisionSchema, request.body);
    const reason = input.decision === "rejected" ? input.reason : null;
    const admin = currentUser(request);
    const operatorId = idParam(request.params.id, "Application in review");

    const profile = await db.transaction(async (tx) => {
      // Approval makes the pilot eligible until the earliest expiry; rejection ends eligibility.
      const { rows } = await tx.query(
        `UPDATE operator_profiles p SET verification_status = $2, rejection_reason = $3, updated_at = now(),
           eligible_until = CASE WHEN $2 = 'approved' THEN LEAST(p.rpl_expires_on, p.roc_expires_on, p.medical_expires_on) ELSE NULL END,
           reminders_sent = '{}'
         WHERE p.user_id = $1 AND p.verification_status = 'in_review'
           AND ($2 = 'rejected' OR LEAST(p.rpl_expires_on, p.roc_expires_on, p.medical_expires_on) >= CURRENT_DATE)
         RETURNING ${PROFILE_FIELDS}`,
        [operatorId, input.decision, reason],
      );
      if (!rows[0]) {
        const { rows: inReview } = await tx.query("SELECT 1 FROM operator_profiles WHERE user_id = $1 AND verification_status = 'in_review'", [operatorId]);
        if (inReview.length) throw conflict("The licence, ROC or medical expiry date has already passed. Reject it so the pilot can upload a current document.");
        throw notFound("Application in review");
      }
      await tx.query(
        "INSERT INTO audit_log (actor_id, action, target_type, target_id, detail) VALUES ($1, $2, 'operator', $3, $4)",
        [admin.id, `verification_${input.decision}`, operatorId, reason],
      );
      if (input.decision === "approved") {
        await notify(tx, operatorId, "verification", "You're verified", "Your licence, ROC, medical, flight log and training were approved. You can now bid on jobs.");
      } else {
        await notify(tx, operatorId, "verification", "Verification not approved", `Reason: ${reason}. Update your profile and submit again.`);
      }
      return rows[0];
    });
    response.json(profile);
  });

  return router;
}

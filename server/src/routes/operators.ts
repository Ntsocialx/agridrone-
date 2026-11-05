import { Router } from "express";
import { z } from "zod";
import { currentUser, requireRole } from "../auth";
import type { Db } from "../db";
import { conflict, idParam, notFound, parse } from "../http";
import { notify } from "../notify";
import { BIDDABLE_SERVICES } from "./jobs";

const PROFILE_FIELDS = `
  p.base, p.radius_km AS "radiusKm", p.services,
  p.verification_status AS "verificationStatus", p.rejection_reason AS "rejectionReason"`;

const profileSchema = z.object({
  base: z.string().trim().min(2).max(100),
  radiusKm: z.number().int().min(1).max(500),
  // Restricted services can't be offered until a compliance policy exists.
  services: z.array(z.enum(BIDDABLE_SERVICES)).min(1).max(BIDDABLE_SERVICES.length),
});

export function operatorsRouter(db: Db) {
  const router = Router();
  router.use(requireRole("operator"));

  router.get("/me", async (request, response) => {
    const { rows } = await db.query(
      `SELECT ${PROFILE_FIELDS},
         EXISTS (SELECT 1 FROM uploads u WHERE u.user_id = p.user_id AND u.kind = 'licence') AS "licenceAttached"
       FROM operator_profiles p WHERE p.user_id = $1`,
      [
      currentUser(request).id,
    ]);
    if (!rows[0]) throw notFound("Profile");
    response.json(rows[0]);
  });

  router.put("/me", async (request, response) => {
    const input = parse(profileSchema, request.body);
    // Approved/in-review details are what the admin checked, so they're locked.
    const { rows } = await db.query(
      `UPDATE operator_profiles p SET base = $2, radius_km = $3, services = $4, updated_at = now()
       WHERE p.user_id = $1 AND p.verification_status IN ('not_submitted', 'rejected')
       RETURNING ${PROFILE_FIELDS}`,
      [currentUser(request).id, input.base, input.radiusKm, [...new Set(input.services)]],
    );
    if (!rows[0]) throw conflict("Your profile is locked while it is in review or approved.");
    response.json(rows[0]);
  });

  router.post("/me/submit", async (request, response) => {
    const { rows } = await db.query(
      `UPDATE operator_profiles p SET verification_status = 'in_review', rejection_reason = NULL,
         submitted_at = now(), updated_at = now()
       WHERE p.user_id = $1 AND p.verification_status IN ('not_submitted', 'rejected')
         AND p.base <> '' AND cardinality(p.services) > 0
         AND EXISTS (SELECT 1 FROM uploads u WHERE u.user_id = p.user_id AND u.kind = 'licence')
       RETURNING ${PROFILE_FIELDS}`,
      [currentUser(request).id],
    );
    if (!rows[0]) throw conflict("Complete your profile and upload your licence first, or wait for the current review.");
    response.json(rows[0]);
  });

  return router;
}

const decisionSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("approved") }),
  // A reason is required so the operator knows what to fix before resubmitting.
  z.object({ decision: z.literal("rejected"), reason: z.string().trim().min(5).max(500) }),
]);

export function adminRouter(db: Db) {
  const router = Router();
  router.use(requireRole("admin"));

  router.get("/operators", async (request, response) => {
    const status = parse(z.enum(["in_review", "approved", "rejected"]).default("in_review"), request.query.status);
    const { rows } = await db.query(
      `SELECT u.id, u.full_name AS "fullName", p.submitted_at AS "submittedAt", ${PROFILE_FIELDS}
       FROM operator_profiles p JOIN users u ON u.id = p.user_id
       WHERE p.verification_status = $1 ORDER BY p.submitted_at`,
      [status],
    );
    response.json(rows);
  });

  router.post("/operators/:id/decision", async (request, response) => {
    const input = parse(decisionSchema, request.body);
    const reason = input.decision === "rejected" ? input.reason : null;
    const admin = currentUser(request);
    const operatorId = idParam(request.params.id, "Application in review");

    const profile = await db.transaction(async (tx) => {
      const { rows } = await tx.query(
        `UPDATE operator_profiles p SET verification_status = $2, rejection_reason = $3, updated_at = now()
         WHERE p.user_id = $1 AND p.verification_status = 'in_review'
         RETURNING ${PROFILE_FIELDS}`,
        [operatorId, input.decision, reason],
      );
      if (!rows[0]) throw notFound("Application in review");
      await tx.query(
        "INSERT INTO audit_log (actor_id, action, target_type, target_id, detail) VALUES ($1, $2, 'operator', $3, $4)",
        [admin.id, `verification_${input.decision}`, operatorId, reason],
      );
      if (input.decision === "approved") {
        await notify(tx, operatorId, "verification", "You're verified", "Your licence was approved. You can now bid on jobs.");
      } else {
        await notify(tx, operatorId, "verification", "Verification not approved", `Reason: ${reason}. Update your profile and submit again.`);
      }
      return rows[0];
    });
    response.json(profile);
  });

  return router;
}

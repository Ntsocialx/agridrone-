import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { currentUser, requireRole } from "../auth";
import type { Db } from "../db";
import { HttpError, conflict, forbidden, idParam, notFound, parse } from "../http";
import type { DeliveryType, Storage } from "../storage";

// Bump when the licence-upload notice text changes; the accepted version is stored.
export const LICENCE_CONSENT_VERSION = "2026-11-03";
export const MAX_BYTES = 5 * 1024 * 1024;
const PRIVATE_LINK_SECONDS = 5 * 60;

export const KINDS = {
  licence: { type: "authenticated", formats: ["pdf", "jpg", "png"], folder: "agridrone/licences" },
  portfolio: { type: "upload", formats: ["jpg", "png", "webp"], folder: "agridrone/portfolio" },
  avatar: { type: "upload", formats: ["jpg", "png", "webp"], folder: "agridrone/avatars" },
} as const satisfies Record<string, { type: DeliveryType; formats: readonly string[]; folder: string }>;
export type Kind = keyof typeof KINDS;

export const ownFolder = (kind: Kind, userId: string) => `${KINDS[kind].folder}/${userId}/`;

/**
 * Confirms the client really uploaded this file to this user's folder, and that
 * Cloudinary's own record of it passes our type/size rules. Bad files are deleted.
 */
export async function verifyUpload(storage: Storage, kind: Kind, userId: string, publicId: string) {
  const { type, formats } = KINDS[kind];
  if (!publicId.startsWith(ownFolder(kind, userId))) throw forbidden("That file does not belong to you.");

  const file = await storage.find(publicId, type);
  if (!file) throw notFound("Uploaded file");
  if (!(formats as readonly string[]).includes(file.format) || file.bytes > MAX_BYTES) {
    await storage.remove(publicId, type);
    throw new HttpError(400, "INVALID_FILE", `Upload a ${formats.join("/")} file of 5 MB or less.`);
  }
  return file;
}

const lockedStatuses = "('in_review', 'approved')";

export function uploadsRouter(db: Db, storage: Storage) {
  const router = Router();
  router.use(requireRole("operator"));

  const hasLicenceConsent = async (userId: string) =>
    (
      await db.query("SELECT 1 FROM consents WHERE user_id = $1 AND kind = 'licence_upload' AND version = $2", [
        userId,
        LICENCE_CONSENT_VERSION,
      ])
    ).rows.length > 0;

  // Separate, purpose-specific consent before any licence upload (AGENTS.md §8).
  router.post("/me/licence/consent", async (request, response) => {
    parse(z.object({ accept: z.literal(true) }), request.body);
    const user = currentUser(request);
    if (!(await hasLicenceConsent(user.id))) {
      await db.query("INSERT INTO consents (user_id, kind, version) VALUES ($1, 'licence_upload', $2)", [
        user.id,
        LICENCE_CONSENT_VERSION,
      ]);
    }
    response.status(201).json({ kind: "licence_upload", version: LICENCE_CONSENT_VERSION });
  });

  router.post("/me/:kind/upload-signature", async (request, response) => {
    const kind = parse(z.enum(["licence", "portfolio"]), request.params.kind);
    const user = currentUser(request);
    if (kind === "licence" && !(await hasLicenceConsent(user.id))) {
      throw forbidden("Please accept the licence upload notice first.");
    }
    const { type, formats } = KINDS[kind];
    const signed = storage.signUpload({ publicId: ownFolder(kind, user.id) + randomUUID(), type, allowedFormats: [...formats] });
    response.json({ ...signed, maxBytes: MAX_BYTES });
  });

  router.post("/me/licence", async (request, response) => {
    const { publicId } = parse(z.object({ publicId: z.string().max(200) }), request.body);
    const user = currentUser(request);
    const file = await verifyUpload(storage, "licence", user.id, publicId);

    const replaced = await db.transaction(async (tx) => {
      // The licence the admin is checking (or has approved) must not change underneath them.
      const { rows: locked } = await tx.query(
        `SELECT 1 FROM operator_profiles WHERE user_id = $1 AND verification_status IN ${lockedStatuses}`,
        [user.id],
      );
      if (locked.length) throw conflict("Your licence is locked while it is in review or approved.");

      const { rows: old } = await tx.query<{ publicId: string }>(
        `DELETE FROM uploads WHERE user_id = $1 AND kind = 'licence' RETURNING public_id AS "publicId"`,
        [user.id],
      );
      await tx.query("INSERT INTO uploads (user_id, kind, public_id, format, bytes) VALUES ($1, 'licence', $2, $3, $4)", [
        user.id,
        publicId,
        file.format,
        file.bytes,
      ]);
      return old[0]?.publicId;
    }).catch(async (error) => {
      await storage.remove(publicId, "authenticated");
      throw error;
    });

    if (replaced) await storage.remove(replaced, "authenticated");
    // The private public_id is deliberately not returned.
    response.status(201).json({ attached: true, format: file.format, bytes: file.bytes });
  });

  router.post("/me/portfolio", async (request, response) => {
    const input = parse(z.object({ publicId: z.string().max(200), caption: z.string().trim().max(200).default("") }), request.body);
    const user = currentUser(request);
    const file = await verifyUpload(storage, "portfolio", user.id, input.publicId);

    const { rows } = await db.query(
      `INSERT INTO uploads (user_id, kind, public_id, format, bytes, url, caption)
       VALUES ($1, 'portfolio', $2, $3, $4, $5, $6)
       ON CONFLICT (public_id) DO NOTHING
       RETURNING id, url, caption, created_at AS "createdAt"`,
      [user.id, input.publicId, file.format, file.bytes, file.secureUrl, input.caption],
    );
    if (!rows[0]) throw conflict("That photo is already in your portfolio.");
    response.status(201).json(rows[0]);
  });

  router.delete("/me/portfolio/:id", async (request, response) => {
    const { rows } = await db.query<{ publicId: string }>(
      `DELETE FROM uploads WHERE id = $1 AND user_id = $2 AND kind = 'portfolio' RETURNING public_id AS "publicId"`,
      [idParam(request.params.id, "Photo"), currentUser(request).id],
    );
    if (!rows[0]) throw notFound("Photo");
    await storage.remove(rows[0].publicId, "upload");
    response.status(204).end();
  });

  return router;
}

export function licenceAdminRouter(db: Db, storage: Storage) {
  const router = Router();
  router.use(requireRole("admin"));

  // Issues a 5-minute download link and records who looked (AGENTS.md §7).
  router.get("/operators/:id/licence", async (request, response) => {
    const operatorId = idParam(request.params.id, "Licence");
    const { rows } = await db.query<{ publicId: string; format: string }>(
      `SELECT public_id AS "publicId", format FROM uploads WHERE user_id = $1 AND kind = 'licence'`,
      [operatorId],
    );
    if (!rows[0]) throw notFound("Licence");

    const expiresAt = Math.floor(Date.now() / 1000) + PRIVATE_LINK_SECONDS;
    await db.query(
      "INSERT INTO audit_log (actor_id, action, target_type, target_id) VALUES ($1, 'licence_viewed', 'operator', $2)",
      [currentUser(request).id, operatorId],
    );
    response.set("Cache-Control", "no-store");
    response.json({ url: storage.privateUrl(rows[0].publicId, rows[0].format, expiresAt), format: rows[0].format, expiresAt });
  });

  return router;
}

import type { Queryable } from "./db";
import { notify } from "./notify";

export const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
] as const;

/**
 * The one rule for who may bid and be selected (operator_profiles aliased `p`):
 * an admin has verified their credentials and the verified validity hasn't run out.
 * `eligible_until` is the earliest of the RPL, ROC and medical expiry dates at approval (or a
 * grace-period deadline), so pilots who are updating or renewing keep bidding until then.
 */
export const ELIGIBLE_SQL = `(p.verification_status IN ('approved', 'updating', 'in_review') AND p.eligible_until >= CURRENT_DATE)`;

export async function isEligible(db: Queryable, userId: string) {
  const { rows } = await db.query(`SELECT 1 FROM operator_profiles p WHERE p.user_id = $1 AND ${ELIGIBLE_SQL}`, [userId]);
  return rows.length > 0;
}

type ReminderRow = {
  until: string;
  untilText: string;
  daysLeft: number;
  reason: "rpl" | "roc" | "medical" | "deadline";
};

const COPY = {
  rpl: { thing: "remote pilot licence", soon: "Licence expiring soon", over: "Licence expired" },
  roc: { thing: "Remote Operating Certificate", soon: "ROC expiring soon", over: "ROC expired" },
  medical: { thing: "Class 3 medical certificate", soon: "Medical expiring soon", over: "Medical expired" },
  deadline: { thing: "", soon: "Update your pilot details", over: "Pilot details overdue" },
} as const;

/**
 * Sends the 30-day, 7-day and expired reminders for the date this pilot stops being able
 * to bid. Called when the pilot loads their profile or the marketplace (no scheduler on the
 * free plan); each reminder is recorded so it's sent once, even with concurrent requests.
 */
export async function sendExpiryReminders(db: Queryable, userId: string) {
  const { rows } = await db.query<ReminderRow>(
    `SELECT to_char(eligible_until, 'YYYY-MM-DD') AS until, to_char(eligible_until, 'FMDD Mon YYYY') AS "untilText",
       (eligible_until - CURRENT_DATE) AS "daysLeft",
       CASE WHEN eligible_until = rpl_expires_on THEN 'rpl' WHEN eligible_until = roc_expires_on THEN 'roc'
         WHEN eligible_until = medical_expires_on THEN 'medical' ELSE 'deadline' END AS reason
     FROM operator_profiles
     WHERE user_id = $1 AND eligible_until IS NOT NULL AND verification_status IN ('approved', 'updating', 'in_review')`,
    [userId],
  );
  const row = rows[0];
  if (!row) return;
  const stage = row.daysLeft < 0 ? "expired" : row.daysLeft <= 7 ? "7" : row.daysLeft <= 30 ? "30" : null;
  if (!stage) return;

  const key = `${row.reason}:${stage}:${row.until}`;
  const { rows: claimed } = await db.query(
    `UPDATE operator_profiles SET reminders_sent = array_append(reminders_sent, $2)
     WHERE user_id = $1 AND NOT ($2 = ANY(reminders_sent)) RETURNING 1`,
    [userId, key],
  );
  if (!claimed.length) return;

  const copy = COPY[row.reason];
  if (stage === "expired") {
    const body =
      row.reason === "deadline"
        ? "The deadline to add your ROC, licence expiry, medical, flight log and training details has passed. Update them in Profile; you can bid again once an admin approves them."
        : `Your ${copy.thing} expired on ${row.untilText}. Upload the renewed document in Profile; you can bid again once an admin approves it.`;
    await notify(db, userId, "verification", copy.over, body);
  } else {
    const body =
      row.reason === "deadline"
        ? `Add your ROC, licence expiry, medical, flight log and training details in Profile by ${row.untilText} to keep bidding.`
        : `Your ${copy.thing} expires on ${row.untilText}. Renew it and update your details in Profile so you can keep bidding.`;
    await notify(db, userId, "verification", copy.soon, body);
  }
}

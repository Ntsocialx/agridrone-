import { formatDate, type OperatorProfile } from "./api";

export type Standing = { pill: string; title: string; body: string; tone: "ok" | "warn" | "danger" };

const daysUntil = (isoDate: string) => Math.floor((Date.parse(isoDate) - Date.parse(new Date().toISOString().slice(0, 10))) / 86_400_000);

/** Which document sets the pilot's bidding deadline, in words. */
const expiringThing = (p: OperatorProfile) =>
  p.eligibleUntil === p.rplExpiresOn
    ? "remote pilot licence"
    : p.eligibleUntil === p.rocExpiresOn
      ? "Remote Operating Certificate"
      : p.eligibleUntil === p.medicalExpiresOn
        ? "Class 3 medical certificate"
        : null;

/**
 * Where a pilot stands: can they bid, and what should they do next. Mirrors the server's
 * rule (approved, updating or in review, and the verified expiry hasn't passed).
 */
export function pilotStanding(p: OperatorProfile | null): Standing {
  if (!p || p.verificationStatus === "not_submitted") {
    return { pill: "Not verified", title: "Finish your profile", body: "Add your licence, ROC, medical, flight log and training details to start bidding.", tone: "warn" };
  }
  if (p.verificationStatus === "rejected") {
    return { pill: "Changes needed", title: "Update your profile", body: "Your verification needs changes before you can bid.", tone: "danger" };
  }
  if (!p.eligibleUntil) {
    return { pill: "In review", title: "Almost ready to fly", body: "The admin team is checking your licence, ROC, medical, flight log and training.", tone: "ok" };
  }
  const until = formatDate(p.eligibleUntil);
  if (!p.canBid) {
    return {
      pill: "Bidding paused",
      title: "Update your details",
      body: "Your licence, ROC or medical has expired, or your update deadline has passed. Update your details in Profile; you can bid again once an admin approves them.",
      tone: "danger",
    };
  }
  // Approved before the new rules: no ROC on file yet, working to a deadline.
  if (!p.rocNumber && p.verificationStatus === "approved") {
    return { pill: "Update needed", title: "Add your new details", body: `Add your ROC, licence expiry, medical, flight log and training in Profile by ${until} to keep bidding.`, tone: "warn" };
  }
  if (p.verificationStatus === "updating") {
    return { pill: "Updating", title: "Finish your update", body: `Submit your updated details for review. You can keep bidding until ${until}.`, tone: "warn" };
  }
  if (p.verificationStatus === "in_review") {
    return { pill: "In review", title: "Update in review", body: `You can keep bidding until ${until} while the admin team checks your update.`, tone: "ok" };
  }
  const thing = expiringThing(p);
  if (thing && daysUntil(p.eligibleUntil) <= 30) {
    return { pill: "Expires soon", title: "Renew soon", body: `Your ${thing} expires on ${until}. Once renewed, tap Update my details in Profile.`, tone: "warn" };
  }
  return { pill: "Verified", title: "Ready to fly?", body: "Browse open jobs near you and place a bid.", tone: "ok" };
}

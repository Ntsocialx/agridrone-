import { useState } from "react";
import { api, errorText, formatDate, useApi } from "./api";
import { Button, Card, Chip, Field, ListState } from "./ui";

type Application = {
  id: string;
  fullName: string;
  submittedAt: string | null;
  base: string;
  province: string | null;
  services: string[];
  verificationStatus: "in_review" | "approved" | "rejected" | "updating";
  rejectionReason: string | null;
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
  eligibleUntil: string | null;
  canBid: boolean;
  licenceAttached: boolean;
  rocAttached: boolean;
  medicalCertificateAttached: boolean;
  trainingCertificateAttached: boolean;
  flightLogAttached: boolean;
};

type Filter = "in_review" | "updating" | "approved" | "expiring" | "rejected";
const FILTERS: { value: Filter; label: string; empty: string }[] = [
  { value: "in_review", label: "Pending", empty: "No pilots are waiting for review." },
  { value: "updating", label: "Updating", empty: "No approved pilots are updating their details." },
  { value: "approved", label: "Approved", empty: "No approved pilots yet." },
  { value: "expiring", label: "Expiring", empty: "No pilot's licence, ROC, medical or update deadline runs out in the next 30 days." },
  { value: "rejected", label: "Rejected", empty: "No rejected applications." },
];

type DocumentKind = "licence" | "roc" | "medical_certificate" | "training_certificate" | "flight_log";
const DOCUMENTS: { kind: DocumentKind; label: string; attached: (a: Application) => boolean }[] = [
  { kind: "licence", label: "Remote pilot licence", attached: (a) => a.licenceAttached },
  { kind: "roc", label: "ROC proof", attached: (a) => a.rocAttached },
  { kind: "medical_certificate", label: "Class 3 medical certificate", attached: (a) => a.medicalCertificateAttached },
  { kind: "training_certificate", label: "Training certificate", attached: (a) => a.trainingCertificateAttached },
  { kind: "flight_log", label: "Flight log", attached: (a) => a.flightLogAttached },
];

const STATUS_LABEL: Record<Application["verificationStatus"], string> = {
  in_review: "In review",
  approved: "Approved",
  rejected: "Rejected",
  updating: "Updating details",
};

const daysUntil = (iso: string) => Math.floor((Date.parse(iso) - Date.parse(new Date().toISOString().slice(0, 10))) / 86_400_000);
const dateOrDash = (iso: string | null) => (iso ? formatDate(iso) : "—");

export function PilotsTab() {
  const [filter, setFilter] = useState<Filter>("in_review");
  const applications = useApi<Application[]>(`/admin/operators?status=${filter}`);
  const current = FILTERS.find((f) => f.value === filter)!;

  return (
    <section>
      <div className="section-head">
        <h2>Pilot verification</h2>
        <div className="chips">
          {FILTERS.map((f) => (
            <Chip key={f.value} label={f.label} active={filter === f.value} onClick={() => setFilter(f.value)} />
          ))}
          <Button variant="outline" className="btn-sm" onClick={applications.reload}>Refresh</Button>
        </div>
      </div>
      <p className="muted small" style={{ marginBottom: 14 }}>
        Check that the licence and ROC numbers and the licence, ROC and medical expiry dates match the documents, that the ROC holder is who the pilot flies for, and that the flight log supports the hours given.
      </p>
      <ListState list={applications} empty={{ title: "Nothing here", body: current.empty }}>
        {(items) => (
          <div className="grid">
            {items.map((app) => (
              <ApplicationCard key={app.id} app={app} onDecided={applications.reload} />
            ))}
          </div>
        )}
      </ListState>
    </section>
  );
}

function ApplicationCard({ app, onDecided }: { app: Application; onDecided: () => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<null | DocumentKind | "approve" | "reject">(null);
  const [error, setError] = useState<string | null>(null);

  const openDocument = async (kind: DocumentKind) => {
    // Open the tab now (while the click still counts) so pop-up blockers allow it, then load the link.
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null; // the document page must not be able to reach back into the admin tab
    setBusy(kind);
    setError(null);
    try {
      // A fresh 5-minute link each time; the server records who viewed it.
      const { url } = await api<{ url: string }>(`/admin/operators/${app.id}/documents/${kind}`);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
    } catch (e) {
      tab?.close();
      setError(`Couldn't open the document: ${errorText(e)}`);
    } finally {
      setBusy(null);
    }
  };

  const decide = async (decision: "approved" | "rejected") => {
    if (decision === "rejected" && reason.trim().length < 5) return setError("Add a reason the pilot can act on (5+ characters).");
    setBusy(decision === "approved" ? "approve" : "reject");
    setError(null);
    try {
      await api(`/admin/operators/${app.id}/decision`, { body: decision === "approved" ? { decision } : { decision, reason: reason.trim() } });
      onDecided();
    } catch (e) {
      setError(`Couldn't save the decision: ${errorText(e)}`);
    } finally {
      setBusy(null);
    }
  };

  const days = app.eligibleUntil ? daysUntil(app.eligibleUntil) : null;
  // Approved before the new rules (no ROC on file): bidding until a deadline.
  const grandfathered = app.eligibleUntil && !app.rocNumber;

  return (
    <Card>
      <div className="card-head">
        <h3>{app.fullName}</h3>
        <span className={`pill pill-${app.verificationStatus}`}>{STATUS_LABEL[app.verificationStatus]}</span>
      </div>
      <p className="muted small">
        {app.base || "Base not set"}, {app.province ?? "province not set"}
        {app.submittedAt ? ` · Submitted ${formatDate(app.submittedAt)}` : ""}
      </p>
      <p className="small">Services: {app.services.join(", ") || "—"}</p>

      {app.eligibleUntil ? (
        <p className={`small ${days !== null && days < 0 ? "danger" : days !== null && days <= 30 ? "warn" : "muted"}`}>
          {days !== null && days < 0
            ? `Can't bid: ${grandfathered ? "update deadline" : "licence/ROC/medical"} passed on ${formatDate(app.eligibleUntil)}`
            : grandfathered
              ? `Approved before the new rules: must update by ${formatDate(app.eligibleUntil)}`
              : `Can bid until ${formatDate(app.eligibleUntil)}${days !== null && days <= 30 ? ` (${days} day${days === 1 ? "" : "s"} left)` : ""}`}
        </p>
      ) : null}

      <dl className="details">
        <dt>RPL number</dt><dd>{app.rplNumber ?? "—"}</dd>
        <dt>RPL expires</dt><dd>{dateOrDash(app.rplExpiresOn)}</dd>
        <dt>ROC holder</dt><dd>{app.rocHolderName ?? "—"}</dd>
        <dt>ROC number</dt><dd>{app.rocNumber ?? "—"}</dd>
        <dt>ROC expires</dt><dd>{dateOrDash(app.rocExpiresOn)}</dd>
        <dt>Medical expires</dt><dd>{dateOrDash(app.medicalExpiresOn)}</dd>
        <dt>Flight hours</dt><dd>{app.flightHours ?? "—"}</dd>
        <dt>Training</dt><dd>{app.trainingProvider ? `${app.trainingProgramme ?? ""}, ${app.trainingProvider}` : "—"}</dd>
        <dt>Completed</dt><dd>{dateOrDash(app.trainingCompletedOn)}</dd>
      </dl>

      <div className="docs">
        {DOCUMENTS.map(({ kind, label, attached }) =>
          attached(app) ? (
            <button key={kind} type="button" className="doc" onClick={() => openDocument(kind)} disabled={busy !== null}>
              <span className="doc-icon">PDF</span>
              <span>
                <strong>{label}</strong>
                <span className="muted small">{busy === kind ? "Opening secure link…" : "New tab · link expires in 5 min"}</span>
              </span>
            </button>
          ) : (
            <div key={kind} className="doc doc-missing">
              <span className="doc-icon">—</span>
              <span>
                <strong>{label}</strong>
                <span className="muted small">Not uploaded</span>
              </span>
            </div>
          ),
        )}
      </div>

      {app.rejectionReason ? <p className="danger small">Reason: {app.rejectionReason}</p> : null}
      {error ? <div className="alert" role="alert">{error}</div> : null}

      {app.verificationStatus === "in_review" ? (
        rejecting ? (
          <div className="stack">
            <Field label="Reason for rejection" placeholder="What should the pilot fix?" value={reason} onChange={setReason} multiline autoFocus />
            <div className="row">
              <Button variant="outline" onClick={() => setRejecting(false)} disabled={busy !== null}>Cancel</Button>
              <Button variant="danger" busy={busy === "reject"} onClick={() => decide("rejected")}>Confirm reject</Button>
            </div>
          </div>
        ) : (
          <div className="row">
            <Button variant="danger" disabled={busy !== null} onClick={() => setRejecting(true)}>Reject</Button>
            <Button busy={busy === "approve"} disabled={busy !== null && busy !== "approve"} onClick={() => decide("approved")}>Approve</Button>
          </div>
        )
      ) : null}
    </Card>
  );
}

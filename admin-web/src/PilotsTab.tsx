import { useState } from "react";
import { api, errorText, formatDate, useApi } from "./api";
import { Button, Card, Chip, Field, ListState } from "./ui";

type Application = {
  id: string;
  fullName: string;
  submittedAt: string | null;
  base: string;
  services: string[];
  verificationStatus: "in_review" | "approved" | "rejected";
  rejectionReason: string | null;
};

type Filter = Application["verificationStatus"];
const FILTERS: { value: Filter; label: string }[] = [
  { value: "in_review", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export function PilotsTab() {
  const [filter, setFilter] = useState<Filter>("in_review");
  const applications = useApi<Application[]>(`/admin/operators?status=${filter}`);

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
      <ListState
        list={applications}
        empty={{ title: "Nothing here", body: filter === "in_review" ? "No pilots are waiting for review." : "No pilots in this list yet." }}
      >
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
  const [busy, setBusy] = useState<null | "licence" | "approve" | "reject">(null);
  const [error, setError] = useState<string | null>(null);

  const openLicence = async () => {
    // Open the tab now (while the click still counts) so pop-up blockers allow it, then load the link.
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null; // the licence page must not be able to reach back into the admin tab
    setBusy("licence");
    setError(null);
    try {
      // A fresh 5-minute link each time; the server records who viewed it.
      const { url } = await api<{ url: string }>(`/admin/operators/${app.id}/licence`);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
    } catch (e) {
      tab?.close();
      setError(`Couldn't open the licence: ${errorText(e)}`);
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

  return (
    <Card>
      <h3>{app.fullName}</h3>
      <p className="muted small">
        {app.base || "Base not set"}
        {app.submittedAt ? ` · Submitted ${formatDate(app.submittedAt)}` : ""}
      </p>
      <p className="small">Services: {app.services.join(", ") || "—"}</p>

      <button type="button" className="doc" onClick={openLicence} disabled={busy !== null}>
        <span className="doc-icon">PDF</span>
        <span>
          <strong>Remote pilot licence</strong>
          <span className="muted small">{busy === "licence" ? "Opening secure link…" : "Opens in a new tab · link expires in 5 min"}</span>
        </span>
      </button>

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

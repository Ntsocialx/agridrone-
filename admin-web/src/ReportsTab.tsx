import { useState } from "react";
import { api, errorText, formatDate, useApi } from "./api";
import { Button, Card, Field, ListState, Stars } from "./ui";

export type ReviewReport = {
  id: string;
  reason: string;
  rating: number;
  comment: string;
  reviewerFirstName: string;
  operatorName: string;
  jobTitle: string;
};

export type JobReport = {
  id: string;
  category: "fraud" | "fake_listing" | "unsafe_flying" | "harassment" | "other";
  note: string;
  createdAt: string;
  jobId: string;
  jobTitle: string;
  jobStatus: string;
  ownerName: string;
  ownerSuspended: boolean;
  reporterName: string;
};

type SuspendedUser = { id: string; fullName: string; email: string; role: string; suspendedAt: string; reason: string | null };
type JobDetails = { service: string; location: string; areaHa: number; preferredDate: string; budgetZar: number; brief: string; status: string };
type Loaded<T> = { data: T[] | null; error: string | null; reload: () => Promise<void> };

const CATEGORY_LABELS: Record<JobReport["category"], string> = {
  fraud: "Fraud or scam",
  fake_listing: "Fake or misleading listing",
  unsafe_flying: "Unsafe or illegal flying",
  harassment: "Harassment or abuse",
  other: "Something else",
};

export function ReportsTab({ reviewReports, jobReports }: { reviewReports: Loaded<ReviewReport>; jobReports: Loaded<JobReport> }) {
  const suspended = useApi<SuspendedUser[]>("/admin/users/suspended");

  return (
    <>
      <section>
        <div className="section-head">
          <h2>Reported job posts</h2>
          <Button variant="outline" className="btn-sm" onClick={() => void Promise.all([jobReports.reload(), reviewReports.reload(), suspended.reload()])}>Refresh</Button>
        </div>
        <ListState list={jobReports} empty={{ title: "No reported job posts", body: "When someone reports a job post, it shows up here." }}>
          {(items) => (
            <div className="grid">
              {items.map((r) => (
                <JobReportCard key={r.id} report={r} onDecided={() => Promise.all([jobReports.reload(), suspended.reload()])} />
              ))}
            </div>
          )}
        </ListState>
      </section>

      <section>
        <div className="section-head"><h2>Reported reviews</h2></div>
        <ListState list={reviewReports} empty={{ title: "No reported reviews", body: "When a pilot reports a review, it shows up here." }}>
          {(items) => (
            <div className="grid">
              {items.map((r) => (
                <ReviewReportCard key={r.id} report={r} onDecided={reviewReports.reload} />
              ))}
            </div>
          )}
        </ListState>
      </section>

      <section>
        <div className="section-head"><h2>Suspended accounts</h2></div>
        <ListState list={suspended} empty={{ title: "No suspended accounts", body: "Accounts you suspend from a report are listed here so you can restore them." }}>
          {(items) => (
            <div className="grid">
              {items.map((u) => (
                <SuspendedCard key={u.id} account={u} onRestored={suspended.reload} />
              ))}
            </div>
          )}
        </ListState>
      </section>
    </>
  );
}

type ReportAction = "dismiss" | "resolve" | "remove_job" | "suspend_owner";

function JobReportCard({ report, onDecided }: { report: JobReport; onDecided: () => Promise<unknown> }) {
  // Removal and suspension need a reason the owner will see, so they open a small form first.
  const [pending, setPending] = useState<null | "remove_job" | "suspend_owner">(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<ReportAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<JobDetails | null>(null);
  const [showJob, setShowJob] = useState(false);
  const canRemove = report.jobStatus === "open" || report.jobStatus === "on_hold";

  const toggleJob = async () => {
    setShowJob((s) => !s);
    if (job) return;
    try {
      setJob(await api<JobDetails>(`/jobs/${report.jobId}`));
    } catch (e) {
      setError(`Couldn't load the job: ${errorText(e)}`);
    }
  };

  const decide = async (action: ReportAction) => {
    if ((action === "remove_job" || action === "suspend_owner") && note.trim().length < 5) {
      return setError("Add a reason the job owner will see (5+ characters).");
    }
    setBusy(action);
    setError(null);
    try {
      await api(`/admin/job-reports/${report.id}/decision`, { body: { action, note: note.trim() } });
      await onDecided();
    } catch (e) {
      setError(`Couldn't save the decision: ${errorText(e)}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <p className="tag-danger">{CATEGORY_LABELS[report.category]}</p>
      <h3>{report.jobTitle}</h3>
      <p className="muted small">
        Posted by {report.ownerName}
        {report.ownerSuspended ? " (suspended)" : ""}, reported by {report.reporterName} on {formatDate(report.createdAt)}
      </p>
      <div className="quote">{report.note}</div>

      <button type="button" className="link" onClick={toggleJob}>{showJob ? "Hide job post" : "View job post"}</button>
      {showJob && job ? (
        <dl className="details">
          <dt>Service</dt><dd>{job.service}</dd>
          <dt>Location</dt><dd>{job.location}</dd>
          <dt>Area</dt><dd>{job.areaHa} ha</dd>
          <dt>Date</dt><dd>{job.preferredDate}</dd>
          <dt>Budget</dt><dd>R {job.budgetZar.toLocaleString("en-ZA")}</dd>
          <dt>Status</dt><dd>{job.status.replace("_", " ")}</dd>
          <dt>Brief</dt><dd>{job.brief}</dd>
        </dl>
      ) : null}

      {error ? <div className="alert" role="alert">{error}</div> : null}

      {pending ? (
        <div className="stack">
          <Field
            label={pending === "remove_job" ? "Why is the post being removed?" : "Why is the owner being suspended?"}
            placeholder="Shown to the job owner"
            value={note}
            onChange={setNote}
            multiline
            autoFocus
          />
          <div className="row">
            <Button variant="outline" disabled={busy !== null} onClick={() => setPending(null)}>Cancel</Button>
            <Button variant="danger" busy={busy === pending} onClick={() => decide(pending)}>
              {pending === "remove_job" ? "Remove post" : "Suspend owner"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="stack">
          <div className="row">
            <Button variant="outline" busy={busy === "dismiss"} disabled={busy !== null} onClick={() => decide("dismiss")}>Dismiss</Button>
            <Button variant="outline" busy={busy === "resolve"} disabled={busy !== null} onClick={() => decide("resolve")}>Mark resolved</Button>
          </div>
          <div className="row">
            {canRemove ? <Button variant="danger" disabled={busy !== null} onClick={() => setPending("remove_job")}>Remove post</Button> : null}
            {report.ownerSuspended ? null : <Button variant="danger" disabled={busy !== null} onClick={() => setPending("suspend_owner")}>Suspend owner</Button>}
          </div>
        </div>
      )}
    </Card>
  );
}

function ReviewReportCard({ report, onDecided }: { report: ReviewReport; onDecided: () => Promise<void> }) {
  const [busy, setBusy] = useState<null | "hide" | "keep">(null);
  const [error, setError] = useState<string | null>(null);

  const moderate = async (action: "hide" | "keep") => {
    setBusy(action);
    setError(null);
    try {
      await api(`/admin/reviews/${report.id}/moderation`, { body: { action } });
      await onDecided();
    } catch (e) {
      setError(`Couldn't save the decision: ${errorText(e)}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <p className="muted small">Review of {report.operatorName}</p>
      <Stars value={report.rating} />
      <p>{report.comment}</p>
      <p className="muted small">{report.reviewerFirstName} · {report.jobTitle}</p>
      <div className="quote">
        <strong className="danger small">Pilot's report</strong>
        <span>{report.reason}</span>
      </div>
      {error ? <div className="alert" role="alert">{error}</div> : null}
      <div className="row">
        <Button variant="outline" busy={busy === "keep"} disabled={busy !== null} onClick={() => moderate("keep")}>Keep review</Button>
        <Button variant="danger" busy={busy === "hide"} disabled={busy !== null} onClick={() => moderate("hide")}>Hide review</Button>
      </div>
    </Card>
  );
}

function SuspendedCard({ account, onRestored }: { account: SuspendedUser; onRestored: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const restore = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/users/${account.id}/unsuspend`, { method: "POST" });
      await onRestored();
    } catch (e) {
      setError(`Couldn't restore the account: ${errorText(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <h3>{account.fullName}</h3>
      <p className="muted small">{account.email}, suspended {formatDate(account.suspendedAt)}</p>
      {account.reason ? <p className="small">Reason: {account.reason}</p> : null}
      {error ? <div className="alert" role="alert">{error}</div> : null}
      <Button variant="outline" busy={busy} onClick={restore}>Unsuspend</Button>
    </Card>
  );
}

import { useState } from "react";
import { router } from "expo-router";
import { Alert, Linking, View, ScrollView, Pressable, RefreshControl } from "react-native";
import { Text } from "../components/Text";
import { StatusBar } from "expo-status-bar";
import { Button, Chip, EmptyState, ErrorState, Field, HeroHeader, Loading, Stars } from "../components/ui";
import { ApiError, api, formatDate, type Service, type VerificationStatus } from "../lib/api";
import { useApi, useSession } from "../lib/session";

type Application = {
  id: string;
  fullName: string;
  submittedAt: string | null;
  base: string;
  services: Service[];
  verificationStatus: VerificationStatus;
  rejectionReason: string | null;
};

type Report = {
  id: string;
  reason: string;
  rating: number;
  comment: string;
  reviewerFirstName: string;
  operatorName: string;
  jobTitle: string;
};

type JobReport = {
  id: string;
  category: "fraud" | "fake_listing" | "unsafe_flying" | "harassment" | "other";
  note: string;
  createdAt: string;
  jobId: string;
  jobTitle: string;
  jobStatus: string;
  ownerId: string;
  ownerName: string;
  ownerSuspended: boolean;
  reporterName: string;
};

type SuspendedUser = { id: string; fullName: string; email: string; role: string; suspendedAt: string; reason: string | null };
type Broadcast = { id: string; kind: "announcement" | "update"; title: string; body: string; createdAt: string };

const CATEGORY_LABELS: Record<JobReport["category"], string> = {
  fraud: "Fraud or scam",
  fake_listing: "Fake or misleading listing",
  unsafe_flying: "Unsafe or illegal flying",
  harassment: "Harassment or abuse",
  other: "Something else",
};

type Tab = "pilots" | "reports" | "notify";

type Filter = "in_review" | "approved" | "rejected";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "in_review", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const errorText = (e: unknown) => (e instanceof ApiError ? e.message : "Please try again.");

export default function AdminScreen() {
  const { user, signOut } = useSession();
  const [tab, setTab] = useState<Tab>("pilots");
  const [filter, setFilter] = useState<Filter>("in_review");
  const applications = useApi<Application[]>(tab === "pilots" ? `/admin/operators?status=${filter}` : null);
  const reports = useApi<Report[]>("/admin/reviews/reports");
  const jobReports = useApi<JobReport[]>("/admin/job-reports");
  const suspended = useApi<SuspendedUser[]>(tab === "reports" ? "/admin/users/suspended" : null);
  const openReports = (reports.data?.length ?? 0) + (jobReports.data?.length ?? 0);

  return (
    <View className="flex-1 bg-page">
      <StatusBar style="dark" />
      <HeroHeader eyebrow="Admin console" title={user?.fullName.split(" ")[0] ?? "Admin"}>
        <View className="flex-row items-center justify-between mt-4">
          <Text className="text-muted text-sm flex-1 mr-3">Internal checks only, not aviation authority approval.</Text>
          <Pressable onPress={signOut} accessibilityRole="button" className="py-1">
            <Text className="text-danger font-semibold text-sm">Sign out</Text>
          </Pressable>
        </View>
      </HeroHeader>

      <View className="flex-row mx-6 mt-6 mb-4 bg-paper rounded-full p-1 border border-line">
        {(["pilots", "reports", "notify"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
            className={`flex-1 py-2 rounded-full items-center ${tab === t ? "bg-teal" : ""}`}
          >
            <Text className={`font-semibold text-sm ${tab === t ? "text-white" : "text-muted"}`}>
              {t === "pilots" ? "Pilots" : t === "notify" ? "Notify" : `Reports${openReports ? ` (${openReports})` : ""}`}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "pilots" ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pb-10"
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={false} onRefresh={applications.reload} />}
        >
          <View className="flex-row gap-2 mb-4">
            {FILTERS.map((f) => (
              <Chip key={f.value} label={f.label} active={filter === f.value} onPress={() => setFilter(f.value)} />
            ))}
          </View>
          {applications.error ? (
            <ErrorState message={applications.error} onRetry={applications.reload} />
          ) : !applications.data ? (
            <Loading />
          ) : applications.data.length === 0 ? (
            <EmptyState title="Nothing here" body={filter === "in_review" ? "No pilots are waiting for review." : "No pilots in this list yet."} />
          ) : (
            <View className="gap-y-5">
              {applications.data.map((app) => (
                <ApplicationCard key={app.id} app={app} onDecided={applications.reload} />
              ))}
            </View>
          )}
        </ScrollView>
      ) : tab === "reports" ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pb-10"
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => void Promise.all([reports.reload(), jobReports.reload()])} />}
        >
          <Text className="text-ink font-bold text-lg mb-3">Job posts</Text>
          {jobReports.error ? (
            <ErrorState message={jobReports.error} onRetry={jobReports.reload} />
          ) : !jobReports.data ? (
            <Loading />
          ) : jobReports.data.length === 0 ? (
            <EmptyState title="No reported job posts" body="When someone reports a job post, it shows up here." />
          ) : (
            <View className="gap-y-5">
              {jobReports.data.map((report) => (
                <JobReportCard key={report.id} report={report} onDecided={() => Promise.all([jobReports.reload(), suspended.reload()])} />
              ))}
            </View>
          )}

          <Text className="text-ink font-bold text-lg mt-8 mb-3">Reviews</Text>
          {reports.error ? (
            <ErrorState message={reports.error} onRetry={reports.reload} />
          ) : !reports.data ? (
            <Loading />
          ) : reports.data.length === 0 ? (
            <EmptyState title="No reported reviews" body="When a pilot reports a review, it shows up here." />
          ) : (
            <View className="gap-y-5">
              {reports.data.map((report) => (
                <ReportCard key={report.id} report={report} onDecided={reports.reload} />
              ))}
            </View>
          )}

          <Text className="text-ink font-bold text-lg mt-8 mb-3">Suspended accounts</Text>
          {suspended.error ? (
            <ErrorState message={suspended.error} onRetry={suspended.reload} />
          ) : !suspended.data ? (
            <Loading />
          ) : suspended.data.length === 0 ? (
            <EmptyState title="No suspended accounts" body="Accounts you suspend from a report are listed here so you can restore them." />
          ) : (
            <View className="gap-y-5">
              {suspended.data.map((u) => (
                <SuspendedCard key={u.id} account={u} onRestored={suspended.reload} />
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <NotifyTab />
      )}
    </View>
  );
}

function ApplicationCard({ app, onDecided }: { app: Application; onDecided: () => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<null | "licence" | "approve" | "reject">(null);

  const openLicence = async () => {
    setBusy("licence");
    try {
      // A fresh 5-minute link each time; the view is audited on the server.
      const { url } = await api<{ url: string }>(`/admin/operators/${app.id}/licence`);
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert("Couldn't open the licence", errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const decide = async (decision: "approved" | "rejected") => {
    if (decision === "rejected" && reason.trim().length < 5) return Alert.alert("Add a reason", "The pilot needs to know what to fix (5+ characters).");
    setBusy(decision === "approved" ? "approve" : "reject");
    try {
      await api(`/admin/operators/${app.id}/decision`, { body: decision === "approved" ? { decision } : { decision, reason: reason.trim() } });
      onDecided();
    } catch (e) {
      Alert.alert("Couldn't save the decision", errorText(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View className="bg-paper p-4 rounded-lg border border-line">
      <Text className="text-ink font-bold text-lg">{app.fullName}</Text>
      <Text className="text-muted text-xs mb-2">
        {app.base || "Base not set"}
        {app.submittedAt ? ` • Submitted ${formatDate(app.submittedAt)}` : ""}
      </Text>
      <Text className="text-muted text-sm mb-3">Services: {app.services.join(", ") || "—"}</Text>

      <Pressable onPress={openLicence} disabled={busy !== null} accessibilityRole="button" className="flex-row items-center p-3 bg-page rounded-md mb-4 active:opacity-70">
        <View className="w-9 h-9 bg-teal-soft rounded-md items-center justify-center mr-3">
          <Text className="text-ink font-bold text-xs">PDF</Text>
        </View>
        <View className="flex-1">
          <Text className="text-ink font-bold text-sm">Remote pilot licence</Text>
          <Text className="text-muted text-xs">{busy === "licence" ? "Opening secure link…" : "Tap to view · link expires in 5 min"}</Text>
        </View>
      </Pressable>

      {app.rejectionReason ? <Text className="text-danger text-sm mb-3">Reason: {app.rejectionReason}</Text> : null}

      {app.verificationStatus === "in_review" ? (
        rejecting ? (
          <View className="gap-y-3">
            <Field label="Reason for rejection" placeholder="What should the pilot fix?" value={reason} onChangeText={setReason} multiline />
            <View className="flex-row gap-3">
              <View className="flex-1"><Button label="Cancel" variant="outline" onPress={() => setRejecting(false)} /></View>
              <View className="flex-1"><Button label="Confirm reject" variant="danger" busy={busy === "reject"} onPress={() => decide("rejected")} /></View>
            </View>
          </View>
        ) : (
          <View className="flex-row gap-3">
            <View className="flex-1"><Button label="Reject" variant="danger" disabled={busy !== null} onPress={() => setRejecting(true)} /></View>
            <View className="flex-1"><Button label="Approve" busy={busy === "approve"} disabled={busy !== null && busy !== "approve"} onPress={() => decide("approved")} /></View>
          </View>
        )
      ) : null}
    </View>
  );
}

function ReportCard({ report, onDecided }: { report: Report; onDecided: () => void }) {
  const [busy, setBusy] = useState<null | "hide" | "keep">(null);

  const moderate = async (action: "hide" | "keep") => {
    setBusy(action);
    try {
      await api(`/admin/reviews/${report.id}/moderation`, { body: { action } });
      onDecided();
    } catch (e) {
      Alert.alert("Couldn't save the decision", errorText(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View className="bg-paper p-4 rounded-lg border border-line">
      <Text className="text-muted text-xs font-medium mb-2">Review of {report.operatorName}</Text>
      <Stars value={report.rating} />
      <Text className="text-ink leading-5 my-2">{report.comment}</Text>
      <Text className="text-muted text-xs mb-3">{report.reviewerFirstName} · {report.jobTitle}</Text>
      <View className="bg-danger/10 p-3 rounded-md mb-4">
        <Text className="text-danger text-xs font-medium mb-1">Pilot&apos;s report</Text>
        <Text className="text-ink text-sm">{report.reason}</Text>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1"><Button label="Keep review" variant="outline" busy={busy === "keep"} disabled={busy !== null} onPress={() => moderate("keep")} /></View>
        <View className="flex-1"><Button label="Hide review" variant="danger" busy={busy === "hide"} disabled={busy !== null} onPress={() => moderate("hide")} /></View>
      </View>
    </View>
  );
}

type ReportAction = "dismiss" | "resolve" | "remove_job" | "suspend_owner";

function JobReportCard({ report, onDecided }: { report: JobReport; onDecided: () => Promise<unknown> }) {
  // Removal and suspension need a reason the owner will see, so they open a small form first.
  const [pending, setPending] = useState<null | "remove_job" | "suspend_owner">(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<ReportAction | null>(null);
  const canRemove = report.jobStatus === "open" || report.jobStatus === "on_hold";

  const decide = async (action: ReportAction) => {
    if ((action === "remove_job" || action === "suspend_owner") && note.trim().length < 5) {
      return Alert.alert("Add a reason", "The job owner will see this (5+ characters).");
    }
    setBusy(action);
    try {
      await api(`/admin/job-reports/${report.id}/decision`, { body: { action, note: note.trim() } });
      await onDecided();
    } catch (e) {
      Alert.alert("Couldn't save the decision", errorText(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View className="bg-paper p-4 rounded-lg border border-line">
      <Text className="text-danger text-xs font-bold mb-2">{CATEGORY_LABELS[report.category]}</Text>
      <Pressable onPress={() => router.push({ pathname: "/job-details", params: { id: report.jobId } })} accessibilityRole="link">
        <Text className="text-ink font-bold text-lg underline">{report.jobTitle}</Text>
      </Pressable>
      <Text className="text-muted text-xs mb-3">
        Posted by {report.ownerName}
        {report.ownerSuspended ? " (suspended)" : ""}, reported by {report.reporterName} on {formatDate(report.createdAt)}
      </Text>
      <View className="bg-danger/10 p-3 rounded-md mb-4">
        <Text className="text-ink text-sm">{report.note}</Text>
      </View>

      {pending ? (
        <View className="gap-y-3">
          <Field
            label={pending === "remove_job" ? "Why is the post being removed?" : "Why is the owner being suspended?"}
            placeholder="Shown to the job owner"
            value={note}
            onChangeText={setNote}
            multiline
          />
          <View className="flex-row gap-3">
            <View className="flex-1"><Button label="Cancel" variant="outline" disabled={busy !== null} onPress={() => setPending(null)} /></View>
            <View className="flex-1">
              <Button label={pending === "remove_job" ? "Remove post" : "Suspend owner"} variant="danger" busy={busy === pending} onPress={() => decide(pending)} />
            </View>
          </View>
        </View>
      ) : (
        <View className="gap-y-3">
          <View className="flex-row gap-3">
            <View className="flex-1"><Button label="Dismiss" variant="outline" busy={busy === "dismiss"} disabled={busy !== null} onPress={() => decide("dismiss")} /></View>
            <View className="flex-1"><Button label="Mark resolved" variant="outline" busy={busy === "resolve"} disabled={busy !== null} onPress={() => decide("resolve")} /></View>
          </View>
          <View className="flex-row gap-3">
            {canRemove ? (
              <View className="flex-1"><Button label="Remove post" variant="danger" disabled={busy !== null} onPress={() => setPending("remove_job")} /></View>
            ) : null}
            {report.ownerSuspended ? null : (
              <View className="flex-1"><Button label="Suspend owner" variant="danger" disabled={busy !== null} onPress={() => setPending("suspend_owner")} /></View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function SuspendedCard({ account, onRestored }: { account: SuspendedUser; onRestored: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const restore = async () => {
    setBusy(true);
    try {
      await api(`/admin/users/${account.id}/unsuspend`, { method: "POST" });
      await onRestored();
    } catch (e) {
      Alert.alert("Couldn't restore the account", errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View className="bg-paper p-4 rounded-lg border border-line">
      <Text className="text-ink font-bold text-lg">{account.fullName}</Text>
      <Text className="text-muted text-xs mb-2">
        {account.email}, suspended {formatDate(account.suspendedAt)}
      </Text>
      {account.reason ? <Text className="text-ink text-sm mb-4">Reason: {account.reason}</Text> : null}
      <Button label="Unsuspend" variant="outline" busy={busy} onPress={restore} />
    </View>
  );
}

function NotifyTab() {
  const history = useApi<Broadcast[]>("/admin/notifications");
  const [kind, setKind] = useState<Broadcast["kind"]>("announcement");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = {
    title: title.trim().length >= 3 ? undefined : "Add a short title (3+ characters)",
    body: body.trim().length >= 5 ? undefined : "Write the message (5+ characters)",
  };

  const review = () => {
    setSubmitted(true);
    if (!Object.values(errors).some(Boolean)) setConfirming(true);
  };

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/admin/notifications", { body: { kind, title: title.trim(), body: body.trim() } });
      setTitle("");
      setBody("");
      setSubmitted(false);
      setConfirming(false);
      await history.reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView className="flex-1" contentContainerClassName="px-6 pb-10" keyboardShouldPersistTaps="handled">
      <View className="bg-paper p-4 rounded-lg border border-line">
        <Text className="text-ink font-bold text-lg mb-1">Send to everyone</Text>
        <Text className="text-muted text-xs mb-4">Every pilot and farm owner sees this under the bell.</Text>
        <View className="flex-row gap-2 mb-4">
          <Chip label="Announcement" active={kind === "announcement"} onPress={() => setKind("announcement")} />
          <Chip label="App update" active={kind === "update"} onPress={() => setKind("update")} />
        </View>
        <View className="gap-y-5">
          <Field label="Title" placeholder="e.g. Planned maintenance on Sunday" value={title} onChangeText={setTitle} maxLength={120} error={submitted ? errors.title : undefined} />
          <Field label="Message" placeholder="What do people need to know?" value={body} onChangeText={setBody} multiline maxLength={1000} error={submitted ? errors.body : undefined} />
        </View>
        {error ? <Text className="text-danger text-sm mt-4">{error}</Text> : null}
        <View className="mt-5">
          {confirming ? (
            <View>
              <Text className="text-ink text-sm mb-3">
                Send this {kind === "update" ? "app update" : "announcement"} to every user? It can&apos;t be unsent.
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-1"><Button label="Edit" variant="outline" disabled={busy} onPress={() => setConfirming(false)} /></View>
                <View className="flex-1"><Button label="Send now" busy={busy} onPress={send} /></View>
              </View>
            </View>
          ) : (
            <Button label="Review and send" variant="dark" onPress={review} />
          )}
        </View>
      </View>

      <Text className="text-ink font-bold text-lg mt-8 mb-3">Sent</Text>
      {history.error ? (
        <ErrorState message={history.error} onRetry={history.reload} />
      ) : !history.data ? (
        <Loading />
      ) : history.data.length === 0 ? (
        <EmptyState title="Nothing sent yet" body="Announcements and app updates you send appear here." />
      ) : (
        <View className="gap-y-3">
          {history.data.map((b) => (
            <View key={b.id} className="bg-paper p-4 rounded-lg border border-line">
              <Text className="text-muted text-xs mb-1">
                {b.kind === "update" ? "App update" : "Announcement"}, {formatDate(b.createdAt)}
              </Text>
              <Text className="text-ink font-bold">{b.title}</Text>
              <Text className="text-muted text-sm mt-1">{b.body}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

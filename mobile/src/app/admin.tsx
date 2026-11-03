import { useState } from "react";
import { Alert, Linking, Text, View, ScrollView, Pressable, RefreshControl } from "react-native";
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

type Filter = "in_review" | "approved" | "rejected";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "in_review", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const errorText = (e: unknown) => (e instanceof ApiError ? e.message : "Please try again.");

export default function AdminScreen() {
  const { user, signOut } = useSession();
  const [tab, setTab] = useState<"pilots" | "reports">("pilots");
  const [filter, setFilter] = useState<Filter>("in_review");
  const applications = useApi<Application[]>(tab === "pilots" ? `/admin/operators?status=${filter}` : null);
  const reports = useApi<Report[]>("/admin/reviews/reports");

  return (
    <View className="flex-1 bg-cream">
      <StatusBar style="light" />
      <HeroHeader eyebrow="Admin console" title={user?.fullName.split(" ")[0] ?? "Admin"}>
        <View className="flex-row items-center justify-between mt-4">
          <Text className="text-paper/70 text-sm flex-1 mr-3">Internal checks only, not aviation authority approval.</Text>
          <Pressable onPress={signOut} accessibilityRole="button" className="py-1">
            <Text className="text-lime font-bold text-sm">Sign out</Text>
          </Pressable>
        </View>
      </HeroHeader>

      <View className="flex-row mx-6 mt-6 mb-4 bg-paper rounded-full p-1 border border-muted/10">
        {(["pilots", "reports"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
            className={`flex-1 py-2 rounded-full items-center ${tab === t ? "bg-forest-900" : ""}`}
          >
            <Text className={`font-bold text-sm ${tab === t ? "text-lime" : "text-muted"}`}>
              {t === "pilots" ? "Pilot verification" : `Reported reviews${reports.data?.length ? ` (${reports.data.length})` : ""}`}
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
            <View className="gap-y-4">
              {applications.data.map((app) => (
                <ApplicationCard key={app.id} app={app} onDecided={applications.reload} />
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="px-6 pb-10" refreshControl={<RefreshControl refreshing={false} onRefresh={reports.reload} />}>
          {reports.error ? (
            <ErrorState message={reports.error} onRetry={reports.reload} />
          ) : !reports.data ? (
            <Loading />
          ) : reports.data.length === 0 ? (
            <EmptyState title="No open reports" body="When a pilot reports a review, it shows up here." />
          ) : (
            <View className="gap-y-4">
              {reports.data.map((report) => (
                <ReportCard key={report.id} report={report} onDecided={reports.reload} />
              ))}
            </View>
          )}
        </ScrollView>
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
    <View className="bg-paper p-4 rounded-lg border border-muted/10">
      <Text className="text-forest-950 font-bold text-lg">{app.fullName}</Text>
      <Text className="text-muted text-xs mb-2">
        {app.base || "Base not set"}
        {app.submittedAt ? ` • Submitted ${formatDate(app.submittedAt)}` : ""}
      </Text>
      <Text className="text-muted text-sm mb-3">Services: {app.services.join(", ") || "—"}</Text>

      <Pressable onPress={openLicence} disabled={busy !== null} accessibilityRole="button" className="flex-row items-center p-3 bg-cream rounded-md mb-4 active:opacity-70">
        <View className="w-9 h-9 bg-lime-soft rounded-md items-center justify-center mr-3">
          <Text className="text-forest-950 font-bold text-xs">PDF</Text>
        </View>
        <View className="flex-1">
          <Text className="text-forest-950 font-bold text-sm">Remote pilot licence</Text>
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
    <View className="bg-paper p-4 rounded-lg border border-muted/10">
      <Text className="text-muted text-xs uppercase font-bold mb-2">Review of {report.operatorName}</Text>
      <Stars value={report.rating} />
      <Text className="text-forest-950 leading-5 my-2">{report.comment}</Text>
      <Text className="text-muted text-xs mb-3">{report.reviewerFirstName} · {report.jobTitle}</Text>
      <View className="bg-danger/10 p-3 rounded-md mb-4">
        <Text className="text-danger text-xs font-bold uppercase mb-1">Pilot&apos;s report</Text>
        <Text className="text-forest-950 text-sm">{report.reason}</Text>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1"><Button label="Keep review" variant="outline" busy={busy === "keep"} disabled={busy !== null} onPress={() => moderate("keep")} /></View>
        <View className="flex-1"><Button label="Hide review" variant="danger" busy={busy === "hide"} disabled={busy !== null} onPress={() => moderate("hide")} /></View>
      </View>
    </View>
  );
}

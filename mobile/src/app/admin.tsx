import { useState } from "react";
import { Text, View, ScrollView, TextInput } from "react-native";
import { BackHeader, Button, Chip, Field } from "../components/ui";
import { useStore, type Application, type VerificationStatus } from "../lib/store";

type Filter = "in_review" | "approved" | "rejected";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "in_review", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function AdminScreen() {
  const { applications } = useStore();
  const [filter, setFilter] = useState<Filter>("in_review");
  const [query, setQuery] = useState("");

  const count = (status: VerificationStatus) => applications.filter((a) => a.status === status).length;
  const q = query.trim().toLowerCase();
  const visible = applications.filter((a) => a.status === filter && (!q || a.name.toLowerCase().includes(q)));

  return (
    <View className="flex-1 bg-cream">
      <BackHeader title="Verification queue" subtitle="Demo admin console — not real admin access" />
      <ScrollView className="flex-1" contentContainerClassName="px-6 pt-4 pb-10" keyboardShouldPersistTaps="handled">
        <View className="flex-row gap-3 mb-6">
          {FILTERS.map((f) => (
            <View key={f.value} className="flex-1 bg-paper p-3 rounded-md border border-muted/10">
              <Text className="text-forest-950 text-2xl font-bold">{count(f.value)}</Text>
              <Text className="text-muted text-xs uppercase font-bold">{f.label}</Text>
            </View>
          ))}
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search applicants"
          placeholderTextColor="#64706a99"
          accessibilityLabel="Search applicants"
          className="bg-paper p-4 rounded-md border border-muted/20 text-forest-950 text-base mb-4"
        />
        <View className="flex-row gap-2 mb-6">
          {FILTERS.map((f) => (
            <Chip key={f.value} label={f.label} active={filter === f.value} onPress={() => setFilter(f.value)} />
          ))}
        </View>

        <View className="gap-y-4">
          {visible.map((app) => <ApplicationCard key={app.id} app={app} />)}
          {visible.length === 0 ? (
            <View className="bg-paper p-6 rounded-lg items-center">
              <Text className="text-muted text-sm">Nothing here.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function ApplicationCard({ app }: { app: Application }) {
  const { decide } = useStore();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  // Rejections need a reason the applicant can act on when resubmitting.
  const reasonError = reason.trim().length >= 5 ? undefined : "Give the applicant a reason (5+ characters)";

  return (
    <View className="bg-paper p-4 rounded-lg border border-muted/10">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-forest-950 font-bold text-lg">{app.name}</Text>
          <Text className="text-muted text-xs">{app.base || "Base not set"} • Submitted {app.submitted}</Text>
        </View>
        <Text className="bg-cream text-forest-900 text-[10px] font-bold px-2 py-0.5 rounded uppercase overflow-hidden">
          {app.status.replace("_", " ")}
        </Text>
      </View>
      <Text className="text-muted text-sm mb-3">Services: {app.services.join(", ") || "—"}</Text>
      <View className="flex-row items-center p-3 bg-cream rounded-md mb-4">
        <Text className="text-forest-950 font-bold text-xs mr-2">PDF</Text>
        <Text className="text-forest-950 text-sm flex-1">Remote pilot licence (demo placeholder)</Text>
      </View>
      {app.reason ? <Text className="text-danger text-sm mb-3">Reason: {app.reason}</Text> : null}

      {app.status === "in_review" ? (
        rejecting ? (
          <View className="gap-y-3">
            <Field label="Reason for rejection" value={reason} onChangeText={setReason} multiline error={submitted ? reasonError : undefined} />
            <View className="flex-row gap-3">
              <View className="flex-1"><Button label="Cancel" variant="outline" onPress={() => setRejecting(false)} /></View>
              <View className="flex-1">
                <Button
                  label="Confirm reject"
                  variant="danger"
                  onPress={() => {
                    setSubmitted(true);
                    if (!reasonError) decide(app.id, "rejected", reason.trim());
                  }}
                />
              </View>
            </View>
          </View>
        ) : (
          <View className="flex-row gap-3">
            <View className="flex-1"><Button label="Reject" variant="danger" onPress={() => setRejecting(true)} /></View>
            <View className="flex-1"><Button label="Approve" onPress={() => decide(app.id, "approved")} /></View>
          </View>
        )
      ) : null}
    </View>
  );
}

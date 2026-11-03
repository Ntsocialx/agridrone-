import { useEffect, useState } from "react";
import { Text, View, TextInput, ScrollView, RefreshControl } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { JobCard } from "../components/JobCard";
import { BottomNav, Chip, EmptyState, ErrorState, HeroHeader, Loading } from "../components/ui";
import { SERVICES, type Job, type OperatorProfile, type Service } from "../lib/api";
import { useApi, useUser } from "../lib/session";

const STATUS = {
  not_submitted: { pill: "Not verified", title: "Finish your profile", body: "Upload your licence to start bidding on jobs." },
  in_review: { pill: "In review", title: "Almost ready to fly", body: "The admin team is reviewing your licence." },
  approved: { pill: "Verified", title: "Ready to fly?", body: "Browse open jobs near you and place a bid." },
  rejected: { pill: "Changes needed", title: "Update your profile", body: "Your verification needs changes before you can bid." },
};

export default function OperatorHomeScreen() {
  const user = useUser();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [service, setService] = useState<Service | null>(null);

  // Wait for a pause in typing before asking the server.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  // Built by hand: React Native's URLSearchParams is only partly implemented.
  const search = [service && `service=${service}`, debounced && `q=${encodeURIComponent(debounced)}`].filter(Boolean).join("&");
  const jobs = useApi<Job[]>(`/jobs${search ? `?${search}` : ""}`);
  const profile = useApi<OperatorProfile>("/operators/me");
  const status = STATUS[profile.data?.verificationStatus ?? "not_submitted"];

  return (
    <View className="flex-1 bg-cream">
      <StatusBar style="light" />
      <HeroHeader eyebrow="Welcome back," title={user.fullName.split(" ")[0]}>
        <View className="bg-forest-800 p-4 rounded-md border border-forest-700 mt-5 flex-row items-center">
          <View className="flex-1 mr-3">
            <Text className="text-white font-bold text-lg mb-1">{status.title}</Text>
            <Text className="text-paper/70 text-sm">{status.body}</Text>
          </View>
          <Text
            onPress={() => router.push("/operator-profile")}
            className="bg-lime-soft text-forest-950 text-[10px] font-bold uppercase px-3 py-1 rounded-full overflow-hidden"
          >
            {status.pill}
          </Text>
        </View>
      </HeroHeader>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pt-6 pb-8"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={false} onRefresh={jobs.reload} />}
      >
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search jobs or locations"
          placeholderTextColor="#64706a99"
          accessibilityLabel="Search jobs"
          returnKeyType="search"
          clearButtonMode="while-editing"
          className="bg-paper p-4 rounded-md border border-muted/20 text-forest-950 text-base mb-4"
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 mb-6">
          <Chip label="All" active={!service} onPress={() => setService(null)} />
          {SERVICES.map((s) => (
            <Chip key={s} label={s} active={service === s} onPress={() => setService(service === s ? null : s)} />
          ))}
        </ScrollView>

        <Text className="text-forest-950 font-bold text-xl mb-4">
          {jobs.data && (service || debounced) ? `${jobs.data.length} matching job${jobs.data.length === 1 ? "" : "s"}` : "Open jobs"}
        </Text>

        {jobs.error ? (
          <ErrorState message={jobs.error} onRetry={jobs.reload} />
        ) : !jobs.data ? (
          <Loading />
        ) : jobs.data.length === 0 ? (
          <EmptyState title="No jobs found" body={service || debounced ? "Try a different search or category." : "New jobs from farm owners will show up here."} />
        ) : (
          <View className="gap-y-4">
            {jobs.data.map((job) => (
              <JobCard key={job.id} job={job} onPress={() => router.push({ pathname: "/job-details", params: { id: job.id } })} />
            ))}
          </View>
        )}
      </ScrollView>

      <BottomNav />
    </View>
  );
}

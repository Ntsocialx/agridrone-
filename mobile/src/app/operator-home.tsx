import { useState } from "react";
import { Text, View, TextInput, ScrollView } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { JobCard } from "../components/JobCard";
import { BottomNav, Chip } from "../components/ui";
import { SERVICES, useStore, type Service } from "../lib/store";

const STATUS = {
  not_submitted: { pill: "Not verified", title: "Finish your profile", body: "Submit your licence to start bidding on jobs." },
  in_review: { pill: "Verification in review", title: "Almost ready to fly", body: "The admin team is reviewing your documents." },
  approved: { pill: "Verified", title: "Ready to fly?", body: "Browse open jobs near you and place a bid." },
  rejected: { pill: "Changes needed", title: "Update your profile", body: "Your verification needs changes before you can bid." },
};

export default function OperatorHomeScreen() {
  const insets = useSafeAreaInsets();
  const { profile, jobs } = useStore();
  const [query, setQuery] = useState("");
  const [service, setService] = useState<Service | null>(null);

  const q = query.trim().toLowerCase();
  const visible = jobs.filter(
    (job) =>
      (!service || job.service === service) &&
      (!q || job.title.toLowerCase().includes(q) || job.location.toLowerCase().includes(q)),
  );
  const status = STATUS[profile.verification];

  return (
    <View className="flex-1 bg-cream">
      <StatusBar style="light" />
      <View className="bg-forest-900 pb-6 px-6 rounded-b-lg" style={{ paddingTop: insets.top + 16 }}>
        <View className="flex-row justify-between items-start mb-5">
          <View className="flex-1 mr-3">
            <Text className="text-lime text-sm font-bold mb-1">Welcome back,</Text>
            <Text className="text-white text-3xl font-bold" numberOfLines={1}>{profile.name || "Operator"}</Text>
          </View>
          <View className="bg-lime-soft px-3 py-1 rounded-full">
            <Text className="text-forest-950 text-[10px] font-bold uppercase">{status.pill}</Text>
          </View>
        </View>

        <View className="bg-forest-800 p-4 rounded-md border border-forest-700">
          <Text className="text-white font-bold text-lg mb-1">{status.title}</Text>
          <Text className="text-paper/70 text-sm">{status.body}</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-6 pt-6 pb-8" keyboardShouldPersistTaps="handled">
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
          {service || q ? `${visible.length} matching job${visible.length === 1 ? "" : "s"}` : "Open jobs"}
        </Text>

        <View className="gap-y-4">
          {visible.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onPress={() => router.push({ pathname: "/job-details", params: { id: job.id } })}
            />
          ))}
          {visible.length === 0 ? (
            <View className="bg-paper p-6 rounded-lg items-center">
              <Text className="text-forest-950 font-bold mb-1">No jobs found</Text>
              <Text className="text-muted text-sm text-center">Try a different search or category.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <BottomNav />
    </View>
  );
}

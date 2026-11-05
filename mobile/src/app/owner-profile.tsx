import { Text, View, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { BottomNav, ErrorState, HeroHeader, Loading, SignOutButton } from "../components/ui";
import type { Me } from "../lib/api";
import { useApi, useUser } from "../lib/session";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="py-4 border-b border-muted/15">
      <Text className="text-muted text-xs mb-1">{label}</Text>
      <Text className="text-forest-950 text-base">{value || "—"}</Text>
    </View>
  );
}

/** Farm owner's account details and sign out. */
export default function OwnerProfileScreen() {
  const user = useUser();
  const me = useApi<Me>("/me");

  return (
    <View className="flex-1 bg-paper">
      <StatusBar style="light" />
      <HeroHeader eyebrow="Farm owner" title={user.fullName} />
      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>
        {me.data ? (
          <View className="bg-cream rounded-lg px-4">
            <Row label="Full name" value={me.data.fullName} />
            <Row label="Email address" value={me.data.email} />
            <Row label="Phone number" value={me.data.phone} />
          </View>
        ) : me.error ? (
          <ErrorState message={me.error} onRetry={me.reload} />
        ) : (
          <Loading />
        )}
        <View className="mt-8">
          <SignOutButton />
        </View>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

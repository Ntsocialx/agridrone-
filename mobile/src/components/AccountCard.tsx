import { Text, View } from "react-native";
import { router } from "expo-router";
import type { Me } from "../lib/api";
import { useApi } from "../lib/session";
import { Button, ErrorState, Loading } from "./ui";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="py-4 border-b border-muted/15">
      <Text className="text-muted text-xs mb-1">{label}</Text>
      <Text className="text-forest-950 text-base">{value || "—"}</Text>
    </View>
  );
}

/** Name, email and phone with links to edit them or change the password; shared by both profile screens. */
export function AccountCard() {
  const me = useApi<Me>("/me");
  if (me.error) return <ErrorState message={me.error} onRetry={me.reload} />;
  if (!me.data) return <Loading />;

  return (
    <View>
      <View className="bg-cream rounded-lg px-4">
        <Row label="Full name" value={me.data.fullName} />
        <Row label="Email address" value={me.data.email} />
        <Row label="Phone number" value={me.data.phone} />
      </View>
      <View className="flex-row gap-3 mt-4">
        <View className="flex-1">
          <Button label="Edit details" variant="outline" onPress={() => router.push("/edit-details")} />
        </View>
        <View className="flex-1">
          <Button label="Change password" variant="outline" onPress={() => router.push("/change-password")} />
        </View>
      </View>
    </View>
  );
}

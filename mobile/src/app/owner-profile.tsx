import { View, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AccountCard } from "../components/AccountCard";
import { BottomNav, HeroHeader, SignOutButton } from "../components/ui";
import { useUser } from "../lib/session";

/** Farm owner's account details and sign out. */
export default function OwnerProfileScreen() {
  const user = useUser();

  return (
    <View className="flex-1 bg-paper">
      <StatusBar style="light" />
      <HeroHeader eyebrow="Farm owner" title={user.fullName} />
      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>
        <AccountCard />
        <View className="mt-8">
          <SignOutButton />
        </View>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

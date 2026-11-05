import { Text, View, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AccountCard } from "../components/AccountCard";
import { ProfilePhoto } from "../components/ProfilePhoto";
import { BottomNav, HeroHeader, SignOutButton } from "../components/ui";
import { useUser } from "../lib/session";

/** Farm owner's picture, account details and sign out. */
export default function OwnerProfileScreen() {
  const user = useUser();

  return (
    <View className="flex-1 bg-paper">
      <StatusBar style="light" />
      <HeroHeader eyebrow="Farm owner" title="Your profile" />
      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 20, paddingBottom: 32 }}>
        <View className="flex-row items-center mb-6">
          <View className="mr-4">
            <ProfilePhoto name={user.fullName} size={64} />
          </View>
          <View className="flex-1">
            <Text className="text-forest-950 font-bold text-xl">{user.fullName}</Text>
            <Text className="text-muted text-sm">Tap the photo to change it</Text>
          </View>
        </View>
        <AccountCard />
        <View className="mt-8">
          <SignOutButton />
        </View>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

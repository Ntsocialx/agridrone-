import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Text } from "./Text";

/** "Help & support" row for the Profile screens. */
export function HelpLink() {
  return (
    <Pressable
      onPress={() => router.push("/help")}
      accessibilityRole="button"
      className="flex-row items-center bg-page rounded-lg px-4 py-4 active:opacity-70"
    >
      <View className="flex-1">
        <Text className="text-ink text-base">Help & support</Text>
        <Text className="text-muted text-xs">Common questions, contact us, privacy policy</Text>
      </View>
      <Text className="text-teal-ink text-lg">→</Text>
    </Pressable>
  );
}

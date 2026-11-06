import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { useApi } from "../lib/session";
import { Text } from "./Text";

const REFRESH_MS = 60_000;

/** Bell with a pink unread count; refreshes on focus and once a minute while visible. */
export function NotificationBell() {
  const unread = useApi<{ count: number }>("/notifications/unread-count");
  const { reload } = unread;
  useEffect(() => {
    const id = setInterval(() => void reload(), REFRESH_MS);
    return () => clearInterval(id);
  }, [reload]);

  const count = unread.data?.count ?? 0;
  return (
    <Pressable
      onPress={() => router.push("/notifications")}
      accessibilityRole="button"
      accessibilityLabel={count ? `Notifications, ${count} unread` : "Notifications"}
      hitSlop={8}
      className="w-11 h-11 rounded-full items-center justify-center bg-paper border border-line"
    >
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path
          d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z M10 20.5a2 2 0 0 0 4 0"
          stroke="#0e7c72"
          strokeWidth={1.8}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      {count ? (
        <View className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-pink items-center justify-center border-2 border-paper">
          <Text className="text-white text-xs font-bold">{count > 9 ? "9+" : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

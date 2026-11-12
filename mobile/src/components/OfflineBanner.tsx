import { useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";
import { subscribeOffline } from "../lib/api";
import { Text } from "./Text";

/**
 * Wrap the app once at the root. While the phone is offline a bar shows across the top,
 * and screens are told the safe area starts below it, so headers and Back buttons move
 * down instead of being covered.
 */
export function OfflineFrame({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  const [bannerHeight, setBannerHeight] = useState(0);

  useEffect(() => subscribeOffline(setOffline), []);

  const top = offline && bannerHeight ? bannerHeight : insets.top;
  return (
    <View style={{ flex: 1 }}>
      <SafeAreaInsetsContext.Provider value={{ ...insets, top }}>{children}</SafeAreaInsetsContext.Provider>
      {offline ? (
        <View
          onLayout={(e) => setBannerHeight(e.nativeEvent.layout.height)}
          style={{ position: "absolute", top: 0, left: 0, right: 0, paddingTop: insets.top + 8 }}
          className="bg-ink px-6 pb-3"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <Text className="text-white font-bold text-sm">You&apos;re offline</Text>
          <Text className="text-white/80 text-xs mt-0.5">Connect to the internet to load jobs or send anything. Nothing is sent while you&apos;re offline.</Text>
        </View>
      ) : null}
    </View>
  );
}

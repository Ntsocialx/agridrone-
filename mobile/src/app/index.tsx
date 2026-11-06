import { useEffect, useState } from "react";
import { Animated, Easing, View, Pressable, ImageBackground, Image } from "react-native";
import { Text } from "../components/Text";
import { Redirect, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { useReduceMotion } from "../components/DroneLoader";
import { LegalFooter } from "../components/ui";
import { homeFor, useSession } from "../lib/session";

// A pilot holding a drone over a wheat field, from Unsplash (Unsplash License).
const BACKGROUND = "https://images.unsplash.com/photo-1506947411487-a56738267384?auto=format&fit=crop&w=1200&h=2000&q=80";
// AgriSETA logo, used with permission.
const LOGO = require("../../assets/logo-agriseta.png");
const TEAL = "#1dafa1";
const BADGE = 168;
const RING = 232;

export default function WelcomeScreen() {
  const { user } = useSession();
  if (user) return <Redirect href={homeFor(user.role)} />;
  return <Welcome />;
}

function Welcome() {
  const insets = useSafeAreaInsets();
  const still = useReduceMotion();
  // One opening sequence: the badge fades in, then the name, then the actions.
  const [badge, title, actions] = useState(() => Array.from({ length: 3 }, () => new Animated.Value(0)))[0];

  useEffect(() => {
    if (still) {
      [badge, title, actions].forEach((v) => v.setValue(1));
      return;
    }
    const step = (v: Animated.Value, duration: number) =>
      Animated.timing(v, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    Animated.sequence([step(badge, 600), step(title, 400), step(actions, 350)]).start();
  }, [still, badge, title, actions]);

  const rise = (v: Animated.Value, from: number) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }],
  });

  return (
    <View className="flex-1 bg-ink">
      <StatusBar style="light" />
      <ImageBackground source={{ uri: BACKGROUND }} resizeMode="cover" className="absolute inset-0" />
      {/* Flat, even tint so the text reads without a glossy fade. */}
      <View className="absolute inset-0 bg-ink/60" />

      <View className="flex-1 px-6" style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }}>
        <View className="flex-1 items-center justify-center">
          <Animated.View style={{ width: RING, height: RING, opacity: badge }}>
            {/* Two thin teal rings on one shared centre. */}
            <Svg width={RING} height={RING} style={{ position: "absolute", top: 0, left: 0 }}>
              <Circle cx={RING / 2} cy={RING / 2} r={RING / 2 - 1} stroke={TEAL} strokeWidth={1.5} fill="none" />
              <Circle cx={RING / 2} cy={RING / 2} r={(RING + BADGE) / 4} stroke={TEAL} strokeWidth={1.5} fill="none" />
            </Svg>
            <View
              className="bg-paper items-center justify-center"
              style={{
                position: "absolute",
                top: (RING - BADGE) / 2,
                left: (RING - BADGE) / 2,
                width: BADGE,
                height: BADGE,
                borderRadius: BADGE / 2,
              }}
            >
              <Image source={LOGO} style={{ width: 128, height: 65 }} resizeMode="contain" accessibilityLabel="AgriSETA logo" />
            </View>
          </Animated.View>

          <Animated.View style={[{ alignItems: "center", marginTop: 24 }, rise(title, 12)]}>
            <Text className="text-white font-bold text-center" style={{ fontSize: 40, letterSpacing: -1 }} accessibilityRole="header">
              AgricDrone Hub
            </Text>
            <Text className="text-paper/85 text-base text-center mt-3 leading-6" style={{ maxWidth: 300 }}>
              Book certified drone pilots to map, monitor and survey your farm.
            </Text>
            <View className="flex-row items-center mt-5">
              <Text className="text-teal-light text-sm font-bold mr-2">✓</Text>
              <Text className="text-paper/90 text-sm">Every pilot&apos;s licence is checked by our team</Text>
            </View>
          </Animated.View>
        </View>

        <Animated.View style={[{ alignItems: "center" }, rise(actions, 16)]}>
          <Pressable
            onPress={() => router.push("/register")}
            accessibilityRole="button"
            className="bg-teal rounded-full flex-row items-center active:opacity-80"
            style={{ paddingLeft: 28, paddingRight: 8, height: 52 }}
          >
            <Text className="text-white font-semibold text-base mr-4">Get started</Text>
            <View className="bg-paper rounded-full items-center justify-center" style={{ width: 36, height: 36 }}>
              <Svg width={16} height={16} viewBox="0 0 16 16">
                <Path d="M6 3.5 L10.5 8 L6 12.5" stroke="#0e7c72" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </Svg>
            </View>
          </Pressable>

          <Pressable className="mt-4 py-2 items-center" onPress={() => router.push("/login")} accessibilityRole="button">
            <Text className="text-white/80 text-sm">
              Already have an account? <Text className="text-teal-light font-bold">Sign in</Text>
            </Text>
          </Pressable>

          <View className="mt-4">
            <LegalFooter onDark />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

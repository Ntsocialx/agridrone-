import { useEffect, useState } from "react";
import { Animated, Easing, Text, View, Pressable, ImageBackground, Image } from "react-native";
import { Redirect, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { useReduceMotion } from "../components/DroneLoader";
import { LegalFooter } from "../components/ui";
import { homeFor, useSession } from "../lib/session";

// Young maize rows at golden hour, from Unsplash (Unsplash License).
const BACKGROUND = "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&h=2000&q=80";
// AgriSETA logo, used with permission.
const LOGO = require("../../assets/logo-agriseta.png");
const SUN = "#f5a623";
const BADGE = 168;
const RING = 240;

export default function WelcomeScreen() {
  const { user } = useSession();
  if (user) return <Redirect href={homeFor(user.role)} />;
  return <Welcome />;
}

function Welcome() {
  const insets = useSafeAreaInsets();
  const still = useReduceMotion();
  // One opening sequence: the badge grows in, then the name, then the actions.
  const [badge, title, actions, glow] = useState(() => Array.from({ length: 4 }, () => new Animated.Value(0)))[0];

  useEffect(() => {
    if (still) {
      [badge, title, actions].forEach((v) => v.setValue(1));
      return;
    }
    const step = (v: Animated.Value, duration: number) =>
      Animated.timing(v, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    Animated.sequence([step(badge, 700), step(title, 450), step(actions, 400)]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [still, badge, title, actions, glow]);

  const rise = (v: Animated.Value, from: number) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }],
  });

  return (
    <View className="flex-1 bg-forest-950">
      <StatusBar style="light" />
      <ImageBackground source={{ uri: BACKGROUND }} resizeMode="cover" className="absolute inset-0" />
      {/* Light at the top so the field shows, deep green at the bottom so the buttons read. */}
      <Svg style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%">
        <Defs>
          <LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#06261c" stopOpacity={0.4} />
            <Stop offset="0.5" stopColor="#06261c" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#06261c" stopOpacity={0.97} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#shade)" />
      </Svg>

      <View className="flex-1 px-6" style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }}>
        <View className="flex-1 items-center justify-center">
          <Animated.View
            style={{
              width: RING,
              height: RING,
              opacity: badge,
              transform: [{ scale: badge.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
            }}
          >
            {/* Two sun rings echoing the sun in the logo, drawn on one shared centre; the outer one breathes slowly. */}
            <Animated.View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
                transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.03] }) }],
              }}
            >
              <Svg width={RING} height={RING}>
                <Circle cx={RING / 2} cy={RING / 2} r={RING / 2} fill={SUN} opacity={0.22} />
              </Svg>
            </Animated.View>
            <Svg width={RING} height={RING} style={{ position: "absolute", top: 0, left: 0 }}>
              <Circle cx={RING / 2} cy={RING / 2} r={(RING + BADGE) / 4} fill={SUN} opacity={0.3} />
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
                shadowColor: "#000",
                shadowOpacity: 0.3,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 10 },
                elevation: 10,
              }}
            >
              <Image source={LOGO} style={{ width: 128, height: 65 }} resizeMode="contain" accessibilityLabel="AgriSETA logo" />
            </View>
          </Animated.View>

          <Animated.View style={[{ alignItems: "center", marginTop: 20 }, rise(title, 16)]}>
            <Text className="text-white font-bold text-center" style={{ fontSize: 46, letterSpacing: -1.2 }} accessibilityRole="header">
              AgriDrone
            </Text>
            <Text className="text-paper/85 text-base text-center mt-3 leading-6" style={{ maxWidth: 300 }}>
              Book certified drone pilots to map, monitor and survey your farm.
            </Text>
            <View className="flex-row items-center mt-5 px-4 py-2 rounded-full" style={{ backgroundColor: "rgba(184,241,62,0.12)", borderWidth: 1, borderColor: "rgba(184,241,62,0.35)" }}>
              <Text className="text-lime text-sm font-bold mr-2">✓</Text>
              <Text className="text-paper/90 text-sm">Every pilot&apos;s licence is checked by our team</Text>
            </View>
          </Animated.View>
        </View>

        <Animated.View style={[{ alignItems: "center" }, rise(actions, 24)]}>
          {/* Compact pill with a soft lime glow instead of the full-width form button. */}
          <Pressable
            onPress={() => router.push("/register")}
            accessibilityRole="button"
            className="bg-lime rounded-full flex-row items-center active:opacity-80"
            style={{ paddingLeft: 28, paddingRight: 8, height: 52, shadowColor: "#b8f13e", shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}
          >
            <Text className="text-forest-950 font-bold text-base mr-4">Get started</Text>
            <View className="bg-forest-950 rounded-full items-center justify-center" style={{ width: 36, height: 36 }}>
              <Svg width={16} height={16} viewBox="0 0 16 16">
                <Path d="M6 3.5 L10.5 8 L6 12.5" stroke="#b8f13e" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </Svg>
            </View>
          </Pressable>

          <Pressable className="mt-4 py-2 items-center" onPress={() => router.push("/login")} accessibilityRole="button">
            <Text className="text-white/80 text-sm">
              Already have an account? <Text className="text-lime font-bold">Sign in</Text>
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

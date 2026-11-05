import { useEffect, useState } from "react";
import { Animated, Easing, Text, View, Pressable, ImageBackground, Image } from "react-native";
import { Redirect, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { Drone, useReduceMotion } from "../components/DroneLoader";
import { Button, LegalFooter } from "../components/ui";
import { homeFor, useSession } from "../lib/session";

// Young maize rows at golden hour, from Unsplash (Unsplash License).
const BACKGROUND = "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&h=2000&q=80";
// AgriSETA logo, used with permission.
const LOGO = require("../../assets/logo-agriseta.png");
const SUN = "#f5a623";
const BADGE = 168;

export default function WelcomeScreen() {
  const { user } = useSession();
  if (user) return <Redirect href={homeFor(user.role)} />;
  return <Welcome />;
}

function Welcome() {
  const insets = useSafeAreaInsets();
  const still = useReduceMotion();
  // One opening sequence: the drone flies in, its scan beam lands on the badge, then the name and actions appear.
  const [drone, beam, badge, title, actions, glow] = useState(() => Array.from({ length: 6 }, () => new Animated.Value(0)))[0];

  useEffect(() => {
    if (still) {
      [drone, beam, badge, title, actions].forEach((v) => v.setValue(1));
      return;
    }
    const ease = Easing.out(Easing.cubic);
    const step = (v: Animated.Value, duration: number) => Animated.timing(v, { toValue: 1, duration, easing: ease, useNativeDriver: true });
    Animated.sequence([
      Animated.parallel([step(drone, 900), Animated.sequence([Animated.delay(250), step(badge, 650)])]),
      step(beam, 400),
      step(title, 450),
      step(actions, 400),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [still, drone, beam, badge, title, actions, glow]);

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
          <Animated.View style={rise(drone, -80)}>
            <Drone scale={0.85} still={still} />
          </Animated.View>

          {/* Camera beam from the drone onto the badge. */}
          <Animated.View style={{ opacity: beam, marginTop: -6, marginBottom: -26, zIndex: 1 }}>
            <Svg width={150} height={64}>
              <Defs>
                <LinearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#b8f13e" stopOpacity={0.45} />
                  <Stop offset="1" stopColor="#b8f13e" stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Path d="M68 0 L82 0 L150 64 L0 64 Z" fill="url(#beam)" />
            </Svg>
          </Animated.View>

          <Animated.View
            className="items-center justify-center"
            style={{
              width: 240,
              height: 240,
              opacity: badge,
              transform: [{ scale: badge.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
            }}
          >
            {/* Sun glow echoing the sun in the logo; it breathes slowly. */}
            <Animated.View
              style={{
                position: "absolute",
                width: 240,
                height: 240,
                borderRadius: 120,
                backgroundColor: SUN,
                opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.24] }),
                transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.04] }) }],
              }}
            />
            <View style={{ position: "absolute", width: 204, height: 204, borderRadius: 102, backgroundColor: SUN, opacity: 0.2 }} />
            <View
              className="bg-paper items-center justify-center"
              style={{
                width: BADGE,
                height: BADGE,
                borderRadius: BADGE / 2,
                borderWidth: 3,
                borderColor: "#b8f13e",
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

        <Animated.View style={rise(actions, 24)}>
          <Button label="Get started" onPress={() => router.push("/register")} />

          <Pressable className="mt-3 py-3 items-center" onPress={() => router.push("/login")} accessibilityRole="button">
            <Text className="text-white/80 text-sm">
              Already have an account? <Text className="text-lime font-bold">Sign in</Text>
            </Text>
          </Pressable>

          <View className="mt-3">
            <LegalFooter onDark />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

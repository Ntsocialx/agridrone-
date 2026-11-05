import { Text, View, Pressable, ImageBackground, Image } from "react-native";
import { Redirect, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { Button } from "../components/ui";
import { homeFor, useSession } from "../lib/session";

// Young maize rows at golden hour, from Unsplash (Unsplash License).
const BACKGROUND = "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&h=2000&q=80";
// AgriSETA logo, used with permission.
const LOGO = require("../../assets/logo-agriseta.png");

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  if (user) return <Redirect href={homeFor(user.role)} />;

  return (
    <View className="flex-1 bg-forest-950">
      <StatusBar style="light" />
      <ImageBackground source={{ uri: BACKGROUND }} resizeMode="cover" className="absolute inset-0" />
      {/* Light at the top so the field shows, deep green at the bottom so the buttons read. */}
      <Svg style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%">
        <Defs>
          <LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#06261c" stopOpacity={0.35} />
            <Stop offset="0.55" stopColor="#06261c" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#06261c" stopOpacity={0.95} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#shade)" />
      </Svg>

      <View className="flex-1 px-6" style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }}>
        <View className="flex-1 items-center justify-center">
          {/* Sun-coloured glow behind the badge echoes the sun in the logo. */}
          <View className="items-center justify-center" style={{ width: 236, height: 236 }}>
            <View style={{ position: "absolute", width: 236, height: 236, borderRadius: 118, backgroundColor: "#f5a623", opacity: 0.18 }} />
            <View style={{ position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: "#f5a623", opacity: 0.22 }} />
            <View
              className="bg-paper items-center justify-center"
              style={{ width: 168, height: 168, borderRadius: 84, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}
            >
              <Image source={LOGO} style={{ width: 128, height: 65 }} resizeMode="contain" accessibilityLabel="AgriSETA logo" />
            </View>
          </View>

          <Text className="text-white font-bold text-center mt-8" style={{ fontSize: 44, letterSpacing: -1 }} accessibilityRole="header">
            AgriDrone
          </Text>
          <Text className="text-paper/85 text-base text-center mt-3 leading-6" style={{ maxWidth: 300 }}>
            Book certified drone pilots to map, monitor and survey your farm.
          </Text>
        </View>

        <Button label="Get started" onPress={() => router.push("/register")} />

        <Pressable className="mt-4 py-3 items-center" onPress={() => router.push("/login")} accessibilityRole="button">
          <Text className="text-white/80 text-sm">
            Already have an account? <Text className="text-lime font-bold">Sign in</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

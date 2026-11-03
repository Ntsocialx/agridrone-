import { Text, View, Pressable, ImageBackground } from "react-native";
import { Redirect, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../components/ui";
import { homeFor, useSession } from "../lib/session";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  if (user) return <Redirect href={homeFor(user.role)} />;

  return (
    <View className="flex-1 bg-forest-950">
      <StatusBar style="light" />
      <ImageBackground
        source={{ uri: "https://images.unsplash.com/photo-1500382017468-9049fed74703?auto=format&fit=crop&w=1200&q=80" }}
        className="flex-1 justify-end px-6"
        style={{ paddingBottom: insets.bottom + 32 }}
      >
        <View className="absolute inset-0 bg-forest-950/60" />

        <Text className="text-lime text-xs font-bold tracking-widest uppercase mb-2">
          Drone Services, Simplified
        </Text>
        <Text className="text-white text-4xl font-bold leading-tight mb-4">
          Precision agriculture{"\n"}for every farm
        </Text>
        <Text className="text-paper/80 text-base mb-8">
          Connect farms with drone operators for mapping, monitoring and surveying work.
        </Text>

        <Button label="Get started" onPress={() => router.push("/register")} />

        <Pressable className="mt-4 py-3 items-center" onPress={() => router.push("/login")} accessibilityRole="button">
          <Text className="text-white/80 text-sm">
            Already have an account? <Text className="text-lime font-bold">Sign in</Text>
          </Text>
        </Pressable>
      </ImageBackground>
    </View>
  );
}

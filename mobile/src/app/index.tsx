import { Text, View, Pressable, ImageBackground } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../components/ui";
import { useStore } from "../lib/store";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { updateProfile } = useStore();

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

        <Pressable
          className="mt-4 py-2 items-center"
          onPress={() => {
            updateProfile({ role: "operator" });
            router.push("/operator-home");
          }}
        >
          <Text className="text-white/80 text-sm">Already have an account? Continue as operator</Text>
        </Pressable>

        {/* Demo-only shortcuts mirroring the Figma prototype. Not authentication. */}
        <View className="mt-6 pt-4 border-t border-white/20">
          <Text className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-3 text-center">
            Demo shortcuts
          </Text>
          <View className="flex-row gap-3">
            <Pressable
              className="flex-1 py-3 rounded-md border border-white/30 items-center active:opacity-70"
              onPress={() => {
                updateProfile({ role: "owner" });
                router.push("/post-job");
              }}
            >
              <Text className="text-white font-bold text-sm">Farm owner</Text>
            </Pressable>
            <Pressable
              className="flex-1 py-3 rounded-md border border-white/30 items-center active:opacity-70"
              onPress={() => router.push("/admin")}
            >
              <Text className="text-white font-bold text-sm">Admin queue</Text>
            </Pressable>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

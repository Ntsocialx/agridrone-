import "../../global.css";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SlowOverlay, useReduceMotion } from "../components/DroneLoader";
import { OfflineFrame } from "../components/OfflineBanner";
import { SuccessTick } from "../components/SuccessTick";
import { wakeServer } from "../lib/api";
import { SessionProvider, useSession } from "../lib/session";

function RootStack() {
  const { user, ready } = useSession();
  const reduceMotion = useReduceMotion();
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  // Keep the splash screen up until the saved session and fonts are ready (system font if Inter fails).
  if (!ready || (!fontsLoaded && !fontError)) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#fafafa" },
        // New screens slide in from the right; a simple fade if the phone asks for reduced motion.
        animation: reduceMotion ? "fade" : "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      {/* UI guard only; the API authorises every request itself. */}
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="operator-home" />
        <Stack.Screen name="operator-profile" />
        <Stack.Screen name="owner-profile" />
        <Stack.Screen name="edit-details" />
        <Stack.Screen name="change-password" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="report-job" />
        <Stack.Screen name="my-jobs" />
        <Stack.Screen name="post-job" />
        <Stack.Screen name="job-details" />
        <Stack.Screen name="review-bids" />
        <Stack.Screen name="pilot" />
        <Stack.Screen name="rate" />
      </Stack.Protected>
    </Stack>
  );
}

// Start waking the free Render server as soon as the app opens.
wakeServer();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="auto" />
        <OfflineFrame>
          <RootStack />
          <SlowOverlay />
          <SuccessTick />
        </OfflineFrame>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

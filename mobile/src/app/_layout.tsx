import "../../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider, useSession } from "../lib/session";

function RootStack() {
  const { user, ready } = useSession();
  // Keep the splash screen up until the saved session has been read.
  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#f7f5ed" } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      {/* UI guard only; the API authorises every request itself. */}
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="operator-home" />
        <Stack.Screen name="operator-profile" />
        <Stack.Screen name="my-jobs" />
        <Stack.Screen name="post-job" />
        <Stack.Screen name="job-details" />
        <Stack.Screen name="review-bids" />
        <Stack.Screen name="pilot" />
        <Stack.Screen name="rate" />
        <Stack.Screen name="admin" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="auto" />
        <RootStack />
      </SessionProvider>
    </SafeAreaProvider>
  );
}

import { useState } from "react";
import { View, ScrollView, KeyboardAvoidingView, Platform, Pressable, ImageBackground } from "react-native";
import { Text } from "../components/Text";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Field, LegalFooter, PasswordField } from "../components/ui";
import { ApiError, api, type User } from "../lib/api";
import { homeFor, useSession } from "../lib/session";

// A drone hovering over a field, from Unsplash (Unsplash License).
const BACKGROUND = "https://images.unsplash.com/photo-1521405924368-64c5b84bec60?auto=format&fit=crop&w=1200&q=80";

type Mode = "member" | "admin";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useSession();
  const [mode, setMode] = useState<Mode>("member");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isAdmin = mode === "admin";

  const onSignIn = async () => {
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setBusy(true);
    setError(null);
    try {
      const { token, user } = await api<{ token: string; user: User }>("/auth/login", { body: { email: email.trim(), password } });
      // Admin mode is a convenience, not security: the server checks the role on every admin request.
      if (isAdmin && user.role !== "admin") {
        setError("This account isn't an admin. Switch to Member to sign in.");
        return;
      }
      await signIn(token, user);
      router.replace(homeFor(user.role));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-ink">
      <StatusBar style="light" />
      <ImageBackground source={{ uri: BACKGROUND }} resizeMode="cover" className="absolute inset-0" />
      <View className="absolute inset-0 bg-ink/60" />

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "space-between" }} keyboardShouldPersistTaps="handled">
          <View className="px-6" style={{ paddingTop: insets.top + 12 }}>
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
              accessibilityRole="button"
              accessibilityLabel="Back"
              className="self-start py-1 mb-10"
            >
              <Text className="text-teal-light font-semibold">← Back</Text>
            </Pressable>
            <Text className="text-teal-light text-sm font-semibold mb-2">
              {isAdmin ? "AgricDrone Hub admin console" : "AgricDrone Hub"}
            </Text>
            <Text className="text-white text-4xl font-bold leading-tight">{isAdmin ? "Admin\nsign-in" : "Welcome\nback"}</Text>
          </View>

          <View className="bg-paper rounded-t-lg px-6 pt-8 mt-10" style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="flex-row bg-page border border-line rounded-full p-1 mb-7" accessibilityRole="tablist">
              {(["member", "admin"] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => {
                    setMode(m);
                    setError(null);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: mode === m }}
                  className={`flex-1 py-2 rounded-full items-center ${mode === m ? "bg-teal" : ""}`}
                >
                  <Text className={`font-semibold text-sm ${mode === m ? "text-white" : "text-muted"}`}>
                    {m === "member" ? "Pilot or farm owner" : "Admin"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {isAdmin ? (
              <Text className="text-muted text-sm mb-4">
                For AgricDrone Hub staff. Admin accounts are created by the system owner and can&apos;t be signed up for.
              </Text>
            ) : null}

            <View className="gap-y-5">
              <Field label="Email address" placeholder="email@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
              <PasswordField label="Password" placeholder="Your password" value={password} onChangeText={setPassword} autoComplete="current-password" onSubmitEditing={onSignIn} />
            </View>

            <Pressable
              onPress={() => router.push({ pathname: "/forgot-password", params: { email: email.trim() } })}
              accessibilityRole="button"
              className="self-end py-3"
            >
              <Text className="text-teal-ink font-bold text-sm">Forgot password?</Text>
            </Pressable>

            {error ? (
              <View className="bg-danger/10 border border-danger/30 p-3 rounded-md mb-4">
                <Text className="text-danger text-sm">{error}</Text>
              </View>
            ) : null}

            <Button label={isAdmin ? "Sign in to admin console" : "Sign in"} variant={isAdmin ? "dark" : "primary"} onPress={onSignIn} busy={busy} />

            {!isAdmin ? (
              <Pressable className="pt-5 items-center" onPress={() => router.replace("/register")} accessibilityRole="button">
                <Text className="text-muted text-sm">
                  New to AgricDrone Hub? <Text className="text-teal-ink font-bold">Create an account</Text>
                </Text>
              </Pressable>
            ) : null}

            <View className="mt-8">
              <LegalFooter />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

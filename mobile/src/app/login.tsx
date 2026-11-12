import { useState } from "react";
import { View, ScrollView, KeyboardAvoidingView, Pressable, ImageBackground, Linking } from "react-native";
import { Text } from "../components/Text";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Field, LegalFooter, PasswordField } from "../components/ui";
import { ADMIN_WEBSITE_URL, ApiError, api, type User } from "../lib/api";
import { homeFor, useSession } from "../lib/session";

// A drone hovering over a field, from Unsplash (Unsplash License).
const BACKGROUND = "https://images.unsplash.com/photo-1521405924368-64c5b84bec60?auto=format&fit=crop&w=1200&q=80";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adminAccount, setAdminAccount] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSignIn = async () => {
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setBusy(true);
    setError(null);
    setAdminAccount(false);
    try {
      const { token, user } = await api<{ token: string; user: User }>("/auth/login", { body: { email: email.trim(), password } });
      // Admins work on the website; the app doesn't keep their session.
      if (user.role === "admin") {
        setAdminAccount(true);
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

      <KeyboardAvoidingView className="flex-1" behavior="padding">
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
            <Text className="text-teal-light text-sm font-semibold mb-2">AgricDrone Hub</Text>
            <Text className="text-white text-4xl font-bold leading-tight">{"Welcome\nback"}</Text>
          </View>

          <View className="bg-paper rounded-t-lg px-6 pt-8 mt-10" style={{ paddingBottom: insets.bottom + 24 }}>
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

            {adminAccount ? (
              <View className="bg-teal-soft border border-teal/30 p-4 rounded-md mb-4">
                <Text className="text-ink font-bold mb-1">This is an admin account</Text>
                <Text className="text-ink text-sm mb-3">
                  Admins work on the AgricDrone Hub admin website, not in the app. Sign in there with the same email and password.
                </Text>
                <Button label="Open admin website" variant="dark" onPress={() => void Linking.openURL(ADMIN_WEBSITE_URL)} />
              </View>
            ) : null}

            <Button label="Sign in" onPress={onSignIn} busy={busy} />

            <Pressable className="pt-5 items-center" onPress={() => router.replace("/register")} accessibilityRole="button">
              <Text className="text-muted text-sm">
                New to AgricDrone Hub? <Text className="text-teal-ink font-bold">Create an account</Text>
              </Text>
            </Pressable>

            <View className="mt-8">
              <LegalFooter />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

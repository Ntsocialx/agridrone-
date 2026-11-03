import { useState } from "react";
import { Text, View, ScrollView, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { router } from "expo-router";
import { BackHeader, Button, Field } from "../components/ui";
import { ApiError, api, type User } from "../lib/api";
import { homeFor, useSession } from "../lib/session";

export default function LoginScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSignIn = async () => {
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setBusy(true);
    setError(null);
    try {
      const { token, user } = await api<{ token: string; user: User }>("/auth/login", { body: { email: email.trim(), password } });
      await signIn(token, user);
      router.replace(homeFor(user.role));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-paper" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackHeader title="Welcome back" subtitle="Sign in to your AgriDrone account" />
      <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
        <View className="gap-y-4 mb-4">
          <Field label="Email address" placeholder="email@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Field label="Password" placeholder="Your password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" onSubmitEditing={onSignIn} />
        </View>
        {error ? (
          <View className="bg-danger/10 border border-danger/30 p-3 rounded-md mb-4">
            <Text className="text-danger text-sm">{error}</Text>
          </View>
        ) : null}
        <View className="mt-4">
          <Button label="Sign in" onPress={onSignIn} busy={busy} />
        </View>
        <Pressable className="py-6 items-center" onPress={() => router.replace("/register")} accessibilityRole="button">
          <Text className="text-muted text-sm">
            New to AgriDrone? <Text className="text-forest-700 font-bold">Create an account</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

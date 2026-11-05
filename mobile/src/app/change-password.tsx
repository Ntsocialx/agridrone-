import { useState } from "react";
import { Text, View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { BackHeader, Button, PasswordField } from "../components/ui";
import { ApiError, api } from "../lib/api";

export default function ChangePasswordScreen() {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const errors = {
    current: current ? undefined : "Enter your current password",
    password: password.length >= 8 ? undefined : "At least 8 characters",
    confirm: confirm === password ? undefined : "Passwords don't match",
  };

  const onSave = async () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    setBusy(true);
    setError(null);
    try {
      await api("/me/password", { body: { currentPassword: current, newPassword: password } });
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-paper" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackHeader title="Change password" subtitle="Use at least 8 characters" />
      <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
        {done ? (
          <View>
            <View className="bg-lime-soft p-4 rounded-md">
              <Text className="text-forest-950 text-sm">Password changed. Use your new password next time you sign in.</Text>
            </View>
            <View className="mt-8">
              <Button label="Back to profile" onPress={() => router.back()} />
            </View>
          </View>
        ) : (
          <>
            <View className="gap-y-4">
              <PasswordField label="Current password" value={current} onChangeText={setCurrent} autoComplete="current-password" error={submitted ? errors.current : undefined} />
              <PasswordField label="New password" placeholder="At least 8 characters" value={password} onChangeText={setPassword} autoComplete="new-password" error={submitted ? errors.password : undefined} />
              <PasswordField
                label="Confirm new password"
                placeholder="Type it again"
                value={confirm}
                onChangeText={setConfirm}
                autoComplete="new-password"
                error={submitted || confirm.length >= password.length ? errors.confirm : undefined}
              />
              {!errors.confirm && confirm ? <Text className="text-forest-700 text-xs -mt-2 ml-1">✓ Passwords match</Text> : null}
            </View>

            {error ? (
              <View className="bg-danger/10 border border-danger/30 p-3 rounded-md mt-6">
                <Text className="text-danger text-sm">{error}</Text>
              </View>
            ) : null}

            <View className="mt-8 mb-12">
              <Button label="Change password" onPress={onSave} busy={busy} />
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

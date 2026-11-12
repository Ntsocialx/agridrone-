import { useState } from "react";
import { View, ScrollView, KeyboardAvoidingView, Pressable } from "react-native";
import { Text } from "../components/Text";
import { router, useLocalSearchParams } from "expo-router";
import { BackHeader, Button, Field, PasswordField } from "../components/ui";
import { ApiError, api, type User } from "../lib/api";
import { celebrate, oops } from "../lib/feedback";
import { homeFor, useSession } from "../lib/session";

/** Two steps: request an emailed 6-digit code, then enter it with a new password. */
export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { signIn } = useSession();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(params.email ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (e) {
      oops();
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const sendCode = () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      oops();
      return setError("Enter the email address you signed up with.");
    }
    void run(async () => {
      const { message } = await api<{ message: string }>("/auth/password/forgot", { body: { email: email.trim() } });
      setNotice(message);
      setStep("code");
      setSubmitted(false);
    });
  };

  const errors = {
    code: /^\d{6}$/.test(code) ? undefined : "Enter the 6-digit code from the email",
    password: password.length >= 8 ? undefined : "At least 8 characters",
    confirm: confirm === password ? undefined : "Passwords don't match",
  };

  const resetPassword = () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return oops();
    void run(async () => {
      const { token, user } = await api<{ token: string; user: User }>("/auth/password/reset", {
        body: { email: email.trim(), code, newPassword: password },
      });
      await signIn(token, user);
      celebrate("Password reset");
      router.replace(homeFor(user.role));
    });
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-paper" behavior="padding">
      <BackHeader
        title="Reset password"
        subtitle={step === "email" ? "We'll email you a 6-digit code" : `Step 2 of 2 · code sent to ${email.trim()}`}
        fallback="/login"
      />
      <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
        {step === "email" ? (
          <>
            <Field label="Email address" placeholder="email@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" onSubmitEditing={sendCode} />
            <Text className="text-muted text-xs mt-2 ml-1">The code expires after 15 minutes.</Text>
          </>
        ) : (
          <>
            {notice ? (
              <View className="bg-teal-soft p-4 rounded-md mb-6">
                <Text className="text-ink text-sm">{notice} Check your spam folder if it doesn&apos;t arrive within a minute.</Text>
              </View>
            ) : null}
            <View className="gap-y-5">
              <Field
                label="6-digit code"
                placeholder="123456"
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                error={submitted ? errors.code : undefined}
              />
              <PasswordField label="New password" placeholder="At least 8 characters" value={password} onChangeText={setPassword} autoComplete="new-password" error={submitted ? errors.password : undefined} />
              <PasswordField
                label="Confirm new password"
                placeholder="Type it again"
                value={confirm}
                onChangeText={setConfirm}
                autoComplete="new-password"
                error={submitted || confirm.length >= password.length ? errors.confirm : undefined}
              />
              {!errors.confirm && confirm ? <Text className="text-teal-ink text-xs -mt-2 ml-1">✓ Passwords match</Text> : null}
            </View>
            <Pressable onPress={sendCode} disabled={busy} accessibilityRole="button" className="self-start py-4">
              <Text className="text-teal-ink font-bold text-sm">Didn&apos;t get it? Send a new code</Text>
            </Pressable>
          </>
        )}

        {error ? (
          <View className="bg-danger/10 border border-danger/30 p-3 rounded-md mt-4">
            <Text className="text-danger text-sm">{error}</Text>
          </View>
        ) : null}

        <View className="mt-6 mb-12">
          {step === "email" ? (
            <Button label="Email me a code" onPress={sendCode} busy={busy} />
          ) : (
            <Button label="Set new password & sign in" onPress={resetPassword} busy={busy} />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

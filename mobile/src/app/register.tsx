import { useState } from "react";
import { View, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Text } from "../components/Text";
import { router } from "expo-router";
import { BackHeader, Button, Checkbox, Field, PasswordField } from "../components/ui";
import { ApiError, api, type User } from "../lib/api";
import { useSession } from "../lib/session";

type Role = "operator" | "farm_owner";
const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: "operator", label: "Drone Operator", hint: "Find and bid on farm jobs" },
  { value: "farm_owner", label: "Farm Owner", hint: "Post jobs and compare bids" },
];

export default function RegisterScreen() {
  const { signIn } = useSession();
  const [role, setRole] = useState<Role>("operator");
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", confirm: "" });
  // Consent must be a deliberate action, so it starts unchecked.
  const [accepted, setAccepted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const errors = {
    name: form.name.trim().length < 2 ? "Enter your full name" : undefined,
    phone: /^\+?\d[\d ]{8,14}$/.test(form.phone.trim()) ? undefined : "Enter a valid mobile number",
    email: /^\S+@\S+\.\S+$/.test(form.email.trim()) ? undefined : "Enter a valid email address",
    password: form.password.length < 8 ? "At least 8 characters" : undefined,
    confirm: form.confirm !== form.password ? "Passwords don't match" : undefined,
  };
  const valid = Object.values(errors).every((e) => !e) && accepted;
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const onContinue = async () => {
    setSubmitted(true);
    if (!valid) return;
    setBusy(true);
    setServerError(null);
    try {
      const { token, user } = await api<{ token: string; user: User }>("/auth/register", {
        body: { email: form.email.trim(), password: form.password, fullName: form.name.trim(), phone: form.phone.trim(), role, acceptTerms: true },
      });
      await signIn(token, user);
      router.replace(role === "operator" ? "/operator-profile" : "/post-job");
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-paper" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackHeader title="Create account" subtitle={role === "operator" ? "Step 1 of 2" : "Join the AgricDrone Hub network"} />
      <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
        <Text className="text-ink font-bold mb-3 text-base">Select your role</Text>
        <View className="flex-row gap-3 mb-8">
          {ROLES.map((r) => {
            const active = role === r.value;
            return (
              <Pressable
                key={r.value}
                onPress={() => setRole(r.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                className={`flex-1 p-4 border-2 rounded-md ${active ? "border-teal bg-teal-soft" : "border-line bg-paper"}`}
              >
                <Text className={`font-bold ${active ? "text-ink" : "text-muted"}`}>{r.label}</Text>
                <Text className="text-muted text-xs mt-1">{r.hint}</Text>
              </Pressable>
            );
          })}
        </View>

        <View className="gap-y-5 mb-6">
          <Field label="Full name" placeholder="Enter your full name" value={form.name} onChangeText={set("name")} error={show("name")} autoComplete="name" />
          <Field label="Mobile number" placeholder="+27 ..." value={form.phone} onChangeText={set("phone")} error={show("phone")} keyboardType="phone-pad" autoComplete="tel" />
          <Field label="Email address" placeholder="email@example.com" value={form.email} onChangeText={set("email")} error={show("email")} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <PasswordField label="Password" placeholder="At least 8 characters" value={form.password} onChangeText={set("password")} error={show("password")} autoComplete="new-password" />
          <PasswordField
            label="Confirm password"
            placeholder="Type it again"
            value={form.confirm}
            onChangeText={set("confirm")}
            // Show the mismatch as soon as they've typed enough to compare, not only on submit.
            error={submitted || form.confirm.length >= form.password.length ? errors.confirm : undefined}
            autoComplete="new-password"
          />
          {!errors.confirm && form.confirm ? <Text className="text-teal-ink text-xs -mt-2 ml-1">✓ Passwords match</Text> : null}
        </View>

        <Checkbox checked={accepted} onChange={setAccepted}>
          I have read and accept the Terms of Service and the Privacy Notice, including how AgricDrone Hub processes my
          personal information under POPIA.
        </Checkbox>
        {submitted && !accepted ? <Text className="text-danger text-xs mt-2 ml-9">Please accept to continue</Text> : null}

        {serverError ? (
          <View className="bg-danger/10 border border-danger/30 p-3 rounded-md mt-6">
            <Text className="text-danger text-sm">{serverError}</Text>
          </View>
        ) : null}

        <View className="mt-8 mb-12">
          <Button label="Create account" onPress={onContinue} busy={busy} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

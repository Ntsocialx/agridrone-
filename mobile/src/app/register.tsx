import { useState } from "react";
import { Text, View, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { BackHeader, Button, Checkbox, Field } from "../components/ui";
import { useStore, type Role } from "../lib/store";

const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: "operator", label: "Drone Operator", hint: "Find and bid on farm jobs" },
  { value: "owner", label: "Farm Owner", hint: "Post jobs and compare bids" },
];

export default function RegisterScreen() {
  const { updateProfile } = useStore();
  const [role, setRole] = useState<Role>("operator");
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  // Consent must be a deliberate action, so it starts unchecked.
  const [accepted, setAccepted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const errors = {
    name: form.name.trim().length < 2 ? "Enter your full name" : undefined,
    phone: /^\+?\d[\d ]{8,14}$/.test(form.phone.trim()) ? undefined : "Enter a valid mobile number",
    email: /^\S+@\S+\.\S+$/.test(form.email.trim()) ? undefined : "Enter a valid email address",
    password: form.password.length < 8 ? "At least 8 characters" : undefined,
  };
  const valid = Object.values(errors).every((e) => !e) && accepted;
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const onContinue = () => {
    setSubmitted(true);
    if (!valid) return;
    updateProfile({ role, name: form.name.trim() });
    router.push(role === "operator" ? "/operator-profile" : "/post-job");
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-paper" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackHeader title="Create account" subtitle={role === "operator" ? "Step 1 of 2" : "Join the AgriDrone network"} />
      <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
        <Text className="text-forest-950 font-bold mb-3 uppercase text-xs tracking-widest">Select your role</Text>
        <View className="flex-row gap-3 mb-8">
          {ROLES.map((r) => {
            const active = role === r.value;
            return (
              <Pressable
                key={r.value}
                onPress={() => setRole(r.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                className={`flex-1 p-4 border-2 rounded-md ${active ? "border-lime bg-lime-soft" : "border-muted/30 bg-paper"}`}
              >
                <Text className={`font-bold ${active ? "text-forest-950" : "text-muted"}`}>{r.label}</Text>
                <Text className="text-muted text-xs mt-1">{r.hint}</Text>
              </Pressable>
            );
          })}
        </View>

        <View className="gap-y-4 mb-6">
          <Field label="Full name" placeholder="Enter your full name" value={form.name} onChangeText={set("name")} error={show("name")} autoComplete="name" />
          <Field label="Mobile number" placeholder="+27 ..." value={form.phone} onChangeText={set("phone")} error={show("phone")} keyboardType="phone-pad" autoComplete="tel" />
          <Field label="Email address" placeholder="email@example.com" value={form.email} onChangeText={set("email")} error={show("email")} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Field label="Password" placeholder="At least 8 characters" value={form.password} onChangeText={set("password")} error={show("password")} secureTextEntry autoComplete="new-password" />
        </View>

        <Checkbox checked={accepted} onChange={setAccepted}>
          I have read and accept the Terms of Service and the Privacy Notice, including how AgriDrone processes my
          personal information under POPIA.
        </Checkbox>
        {submitted && !accepted ? <Text className="text-danger text-xs mt-2 ml-9">Please accept to continue</Text> : null}

        <View className="mt-8 mb-12">
          <Button label="Continue" onPress={onContinue} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

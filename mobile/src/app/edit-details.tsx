import { useState } from "react";
import { View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Text } from "../components/Text";
import { router } from "expo-router";
import { BackHeader, Button, ErrorState, Field, Loading, PasswordField } from "../components/ui";
import { ApiError, api, type Me } from "../lib/api";
import { useApi, useSession } from "../lib/session";

export default function EditDetailsScreen() {
  const me = useApi<Me>("/me");
  return (
    <KeyboardAvoidingView className="flex-1 bg-paper" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackHeader title="Edit details" subtitle="Keep your contact details up to date" />
      {me.data ? (
        <DetailsForm me={me.data} />
      ) : (
        <View className="px-6">{me.error ? <ErrorState message={me.error} onRetry={me.reload} /> : <Loading />}</View>
      )}
    </KeyboardAvoidingView>
  );
}

/** Rendered once the current details have loaded, so it can seed the form directly. */
function DetailsForm({ me }: { me: Me }) {
  const { updateUser } = useSession();
  const [form, setForm] = useState({ name: me.fullName, phone: me.phone, email: me.email, password: "" });
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailChanged = form.email.trim().toLowerCase() !== me.email;
  const errors = {
    name: form.name.trim().length >= 2 ? undefined : "Enter your full name",
    phone: /^\+?\d[\d ]{8,14}$/.test(form.phone.trim()) ? undefined : "Enter a valid mobile number",
    email: /^\S+@\S+\.\S+$/.test(form.email.trim()) ? undefined : "Enter a valid email address",
    password: !emailChanged || form.password ? undefined : "Enter your current password to change your email",
  };
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const onSave = async () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api<Me>("/me", {
        method: "PATCH",
        body: {
          fullName: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          ...(emailChanged ? { currentPassword: form.password } : {}),
        },
      });
      await updateUser({ id: updated.id, role: updated.role, fullName: updated.fullName });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
      <View className="gap-y-5">
        <Field label="Full name" value={form.name} onChangeText={set("name")} error={show("name")} autoComplete="name" />
        <Field label="Mobile number" placeholder="+27 ..." value={form.phone} onChangeText={set("phone")} error={show("phone")} keyboardType="phone-pad" autoComplete="tel" />
        <Field label="Email address" value={form.email} onChangeText={set("email")} error={show("email")} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        {emailChanged ? (
          <View>
            <PasswordField label="Current password" placeholder="Needed to change your email" value={form.password} onChangeText={set("password")} error={show("password")} autoComplete="current-password" />
            <Text className="text-muted text-xs mt-2 ml-1">You&apos;ll sign in with the new email from now on.</Text>
          </View>
        ) : null}
      </View>

      {error ? (
        <View className="bg-danger/10 border border-danger/30 p-3 rounded-md mt-6">
          <Text className="text-danger text-sm">{error}</Text>
        </View>
      ) : null}

      <View className="mt-8 mb-12">
        <Button label="Save changes" onPress={onSave} busy={busy} />
      </View>
    </ScrollView>
  );
}

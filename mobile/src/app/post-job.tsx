import { useState } from "react";
import { Text, View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { BottomNav, Button, Checkbox, Chip, Field } from "../components/ui";
import { SERVICES, isRestricted, useStore, type Service } from "../lib/store";

export default function PostJobScreen() {
  const insets = useSafeAreaInsets();
  const { profile, postJob } = useStore();
  const [service, setService] = useState<Service>("Mapping");
  const [form, setForm] = useState({ title: "", location: "", area: "", date: "", budget: "", brief: "" });
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const errors = {
    title: form.title.trim().length >= 4 ? undefined : "Give the job a short title",
    location: form.location.trim() ? undefined : "Enter the farm location",
    area: Number(form.area) > 0 ? undefined : "Enter the area in hectares",
    date: /^\d{4}-\d{2}-\d{2}$/.test(form.date.trim()) ? undefined : "Use YYYY-MM-DD",
    budget: Number(form.budget) > 0 ? undefined : "Enter a budget in rand",
    brief: form.brief.trim().length >= 10 ? undefined : "Describe the work (10+ characters)",
  };
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  const onPublish = () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    const id = postJob({
      title: form.title.trim(),
      service,
      location: form.location.trim(),
      areaHa: Number(form.area),
      date: form.date.trim(),
      budget: Number(form.budget),
      brief: form.brief.trim(),
    });
    router.replace({ pathname: "/review-bids", params: { jobId: id } });
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-cream" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="light" />
      <View className="bg-forest-900 px-6 pb-6 rounded-b-lg" style={{ paddingTop: insets.top + 16 }}>
        <Text className="text-lime text-sm font-bold mb-1">Hi {profile.name || "farm owner"},</Text>
        <Text className="text-white text-3xl font-bold">Post a job</Text>
        <Text className="text-paper/70 text-sm mt-1">Describe the work and operators will send you bids.</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-6 pt-6 pb-10" keyboardShouldPersistTaps="handled">
        <Text className="text-muted text-xs mb-2 ml-1">Service type</Text>
        <View className="flex-row flex-wrap gap-2 mb-2">
          {SERVICES.map((s) => (
            <Chip key={s} label={s} active={service === s} onPress={() => setService(s)} />
          ))}
        </View>
        {isRestricted(service) ? (
          <View className="p-3 rounded-md border border-danger bg-danger/10 mb-2">
            <Text className="text-forest-950 text-sm">
              Spraying jobs are published on compliance hold. Operators can see them but cannot bid until regulatory
              approvals are reviewed.
            </Text>
          </View>
        ) : null}

        <View className="gap-y-4 mt-4 mb-6">
          <Field label="Job title" placeholder="e.g. Citrus orchard mapping" value={form.title} onChangeText={set("title")} error={show("title")} />
          <Field label="Farm location" placeholder="Farm name, Province" value={form.location} onChangeText={set("location")} error={show("location")} />
          <View className="flex-row gap-3">
            <View className="flex-1"><Field label="Area (ha)" placeholder="50" value={form.area} onChangeText={set("area")} keyboardType="number-pad" error={show("area")} /></View>
            <View className="flex-1"><Field label="Preferred date" placeholder="2026-12-01" value={form.date} onChangeText={set("date")} error={show("date")} /></View>
          </View>
          <Field label="Budget (ZAR)" placeholder="5000" value={form.budget} onChangeText={set("budget")} keyboardType="number-pad" error={show("budget")} />
          <Field label="Description" placeholder="What do you need captured or analysed?" value={form.brief} onChangeText={set("brief")} multiline error={show("brief")} />
        </View>

        <Checkbox checked={verifiedOnly} onChange={setVerifiedOnly}>
          Only accept bids from operators verified by AgriDrone
        </Checkbox>

        <View className="mt-8">
          <Button label="Publish job" onPress={onPublish} />
        </View>
      </ScrollView>
      <BottomNav />
    </KeyboardAvoidingView>
  );
}

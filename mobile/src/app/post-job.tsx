import { useState } from "react";
import { View, ScrollView, KeyboardAvoidingView } from "react-native";
import { Text } from "../components/Text";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ProvincePicker } from "../components/ProvincePicker";
import { BottomNav, Button, Chip, Field, HeroHeader } from "../components/ui";
import { ApiError, SERVICES, api, isRestricted, type Job, type Province, type Service } from "../lib/api";
import { celebrate, oops } from "../lib/feedback";
import { useUser } from "../lib/session";

export default function PostJobScreen() {
  const user = useUser();
  const [service, setService] = useState<Service>("Mapping");
  const [province, setProvince] = useState<Province | null>(null);
  const [form, setForm] = useState({ title: "", location: "", area: "", date: "", budget: "", brief: "" });
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const errors = {
    title: form.title.trim().length >= 4 ? undefined : "Give the job a short title",
    location: form.location.trim().length >= 2 ? undefined : "Enter the farm location",
    province: province ? undefined : "Choose the province",
    area: Number(form.area) > 0 ? undefined : "Enter the area in hectares",
    date: /^\d{4}-\d{2}-\d{2}$/.test(form.date.trim()) ? undefined : "Use YYYY-MM-DD",
    budget: Number(form.budget) > 0 && Number.isInteger(Number(form.budget)) ? undefined : "Enter a budget in whole rand",
    brief: form.brief.trim().length >= 10 ? undefined : "Describe the work (10+ characters)",
  };
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  const onPublish = async () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return oops();
    setBusy(true);
    setError(null);
    try {
      const job = await api<Job>("/jobs", {
        body: {
          title: form.title.trim(),
          service,
          location: form.location.trim(),
          areaHa: Number(form.area),
          preferredDate: form.date.trim(),
          budgetZar: Number(form.budget),
          brief: form.brief.trim(),
          province,
        },
      });
      celebrate("Job posted");
      router.replace({ pathname: "/job-details", params: { id: job.id } });
    } catch (e) {
      oops();
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-page" behavior="padding">
      <StatusBar style="dark" />
      <HeroHeader eyebrow={`Hi ${user.fullName.split(" ")[0]},`} title="Post a job">
        <Text className="text-muted text-sm mt-1">Describe the work and verified operators will send you bids.</Text>
      </HeroHeader>

      <ScrollView className="flex-1" contentContainerClassName="px-6 pt-6 pb-10" keyboardShouldPersistTaps="handled">
        <Text className="text-muted text-xs mb-2 ml-1">Service type</Text>
        <View className="flex-row flex-wrap gap-2 mb-2">
          {SERVICES.map((s) => (
            <Chip key={s} label={s} active={service === s} onPress={() => setService(s)} />
          ))}
        </View>
        {isRestricted(service) ? (
          <View className="p-3 rounded-md border border-danger bg-danger/10 mb-2">
            <Text className="text-ink text-sm">
              Spraying jobs are published on compliance hold. Operators can see them but cannot bid until regulatory
              approvals are reviewed.
            </Text>
          </View>
        ) : null}

        <View className="gap-y-5 mt-4 mb-6">
          <Field label="Job title" placeholder="e.g. Citrus orchard mapping" value={form.title} onChangeText={set("title")} error={show("title")} />
          <Field label="Farm location" placeholder="Farm name and nearest town" value={form.location} onChangeText={set("location")} error={show("location")} />
          <ProvincePicker label="Province" value={province} onChange={setProvince} error={show("province")} />
          <View className="flex-row gap-3">
            <View className="flex-1"><Field label="Area (ha)" placeholder="50" value={form.area} onChangeText={set("area")} keyboardType="decimal-pad" error={show("area")} /></View>
            <View className="flex-1"><Field label="Preferred date" placeholder="2026-12-01" value={form.date} onChangeText={set("date")} error={show("date")} /></View>
          </View>
          <Field label="Budget (ZAR)" placeholder="5000" value={form.budget} onChangeText={set("budget")} keyboardType="number-pad" error={show("budget")} />
          <Field label="Description" placeholder="What do you need captured or analysed?" value={form.brief} onChangeText={set("brief")} multiline error={show("brief")} />
        </View>

        <View className="bg-teal-soft p-4 rounded-md">
          <Text className="text-ink text-sm">Only operators verified by the AgricDrone Hub admin team can bid on your job.</Text>
        </View>

        {error ? (
          <View className="bg-danger/10 border border-danger/30 p-3 rounded-md mt-6">
            <Text className="text-danger text-sm">{error}</Text>
          </View>
        ) : null}

        <View className="mt-8">
          <Button label="Publish job" onPress={onPublish} busy={busy} />
        </View>
      </ScrollView>
      <BottomNav />
    </KeyboardAvoidingView>
  );
}

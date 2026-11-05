import { useState } from "react";
import { Text, View, ScrollView, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { BackHeader, Button, Field } from "../components/ui";
import { ApiError, api } from "../lib/api";

const CATEGORIES = [
  { value: "fraud", label: "Fraud or scam", hint: "Asks for deposits, fake payments, phishing" },
  { value: "fake_listing", label: "Fake or misleading listing", hint: "The farm, work or details aren't real" },
  { value: "unsafe_flying", label: "Unsafe or illegal flying", hint: "Asks for flights that break aviation rules" },
  { value: "harassment", label: "Harassment or abuse", hint: "Threats, insults or discrimination" },
  { value: "other", label: "Something else", hint: "Tell us below" },
] as const;
type Category = (typeof CATEGORIES)[number]["value"];

export default function ReportJobScreen() {
  const { jobId, title } = useLocalSearchParams<{ jobId: string; title?: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const errors = {
    category: category ? undefined : "Choose what's wrong",
    note: note.trim().length >= 10 ? undefined : "Describe the problem (10+ characters)",
  };

  const onSubmit = async () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/jobs/${jobId}/reports`, { body: { category, note: note.trim() } });
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-paper" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackHeader title="Report job post" subtitle={title ? `“${title}”` : undefined} />
      <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
        {done ? (
          <View>
            <View className="bg-lime-soft p-4 rounded-md">
              <Text className="text-forest-950 text-sm leading-5">
                Thanks. Our team will review this post, and you&apos;ll get a notification when it&apos;s been dealt with.
              </Text>
            </View>
            <View className="mt-8">
              <Button label="Back to job" onPress={() => router.back()} />
            </View>
          </View>
        ) : (
          <>
            <Text className="text-forest-950 font-bold mb-3">What&apos;s wrong with this post?</Text>
            <View className="gap-y-2" accessibilityRole="radiogroup">
              {CATEGORIES.map((c) => {
                const active = category === c.value;
                return (
                  <Pressable
                    key={c.value}
                    onPress={() => setCategory(c.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    className={`p-4 rounded-md border-2 ${active ? "border-forest-900 bg-lime-soft" : "border-muted/20 bg-cream"}`}
                  >
                    <Text className="text-forest-950 font-bold text-sm">{c.label}</Text>
                    <Text className="text-muted text-xs mt-1">{c.hint}</Text>
                  </Pressable>
                );
              })}
            </View>
            {submitted && errors.category ? <Text className="text-danger text-xs mt-2 ml-1">{errors.category}</Text> : null}

            <View className="mt-6">
              <Field
                label="What happened?"
                placeholder="Give our team the details they need"
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={1000}
                error={submitted ? errors.note : undefined}
              />
            </View>
            <Text className="text-muted text-xs mt-2 ml-1">The person who posted the job won&apos;t see who reported it.</Text>

            {error ? (
              <View className="bg-danger/10 border border-danger/30 p-3 rounded-md mt-6">
                <Text className="text-danger text-sm">{error}</Text>
              </View>
            ) : null}

            <View className="mt-8 mb-12">
              <Button label="Send report" variant="danger" onPress={onSubmit} busy={busy} />
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

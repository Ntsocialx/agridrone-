import { useState } from "react";
import { View, ScrollView, KeyboardAvoidingView } from "react-native";
import { Text } from "../components/Text";
import { router, useLocalSearchParams } from "expo-router";
import { BackHeader, Button, ErrorState, Field, Loading, Stars } from "../components/ui";
import { ApiError, api, type Job } from "../lib/api";
import { celebrate, oops } from "../lib/feedback";
import { useApi } from "../lib/session";

const LABELS = ["", "Poor", "Below expectations", "Good", "Very good", "Excellent"];

export default function RateScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const job = useApi<Job>(`/jobs/${jobId}`);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = {
    rating: rating ? undefined : "Choose a star rating",
    comment: comment.trim().length >= 10 ? undefined : "Write at least 10 characters",
  };

  const submit = async () => {
    setSubmitted(true);
    if (errors.rating || errors.comment || !job.data) return oops();
    setBusy(true);
    setError(null);
    try {
      await api("/reviews", { body: { jobId, rating, comment: comment.trim() } });
      celebrate("Pilot rated");
      router.replace({ pathname: "/pilot", params: { id: job.data.assignedOperatorId! } });
    } catch (e) {
      oops();
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const j = job.data;
  return (
    <KeyboardAvoidingView className="flex-1 bg-paper" behavior="padding">
      <BackHeader title="Rate your pilot" subtitle={j?.assignedOperatorName ?? undefined} fallback="/my-jobs" />
      <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
        {job.error ? (
          <ErrorState message={job.error} onRetry={job.reload} />
        ) : !j ? (
          <Loading />
        ) : (
          <>
            <View className="bg-page p-4 rounded-md mb-8">
              <Text className="text-muted text-xs font-medium mb-1">Completed job</Text>
              <Text className="text-ink font-bold">{j.title}</Text>
              <Text className="text-muted text-sm">{j.service} • {j.areaHa} ha</Text>
            </View>

            <View className="items-center mb-8">
              <Text className="text-ink font-bold text-lg mb-4">How did {j.assignedOperatorName?.split(" ")[0]} do?</Text>
              <Stars value={rating} size={44} onChange={setRating} />
              <Text className={`mt-3 font-bold ${rating ? "text-teal-ink" : "text-muted"}`}>{rating ? LABELS[rating] : "Tap a star"}</Text>
              {submitted && errors.rating ? <Text className="text-danger text-xs mt-1">{errors.rating}</Text> : null}
            </View>

            <Field
              label="Your review"
              placeholder="Quality of the work, communication, punctuality…"
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={1000}
              error={submitted ? errors.comment : undefined}
            />
            <Text className="text-muted text-xs mt-2 ml-1">
              Your review is public on the pilot&apos;s profile and shows your first name only. You can review each job once.
            </Text>

            {error ? (
              <View className="bg-danger/10 border border-danger/30 p-3 rounded-md mt-6">
                <Text className="text-danger text-sm">{error}</Text>
              </View>
            ) : null}

            <View className="mt-8 mb-12">
              <Button label="Post review" onPress={submit} busy={busy} />
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

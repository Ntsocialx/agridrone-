import { useState } from "react";
import { Alert, Image, View, ScrollView, Pressable, KeyboardAvoidingView } from "react-native";
import { Text } from "../components/Text";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, EmptyState, ErrorState, Field, Loading, Stars } from "../components/ui";
import { ApiError, api, formatDate, type PilotProfile, type Review } from "../lib/api";
import { useApi, useUser } from "../lib/session";

export default function PilotProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const user = useUser();
  const pilot = useApi<PilotProfile>(`/pilots/${id}`);
  const isMe = user.id === id;
  const p = pilot.data;
  const back = () => (router.canGoBack() ? router.back() : router.replace("/my-jobs"));

  return (
    <KeyboardAvoidingView className="flex-1 bg-page" behavior="padding">
      <StatusBar style="dark" />
      <ScrollView className="flex-1" contentContainerClassName="pb-12" keyboardShouldPersistTaps="handled">
        <View className="bg-paper px-6 pb-8 border-b border-line" style={{ paddingTop: insets.top + 12 }}>
          <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Back" className="self-start py-1 mb-6">
            <Text className="text-teal-ink font-semibold">← Back</Text>
          </Pressable>

          {p ? (
            <>
              <View className="flex-row items-center">
                <View className="w-16 h-16 rounded-full bg-teal-soft items-center justify-center mr-4">
                  <Text className="text-teal-ink font-bold text-2xl">
                    {p.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-ink text-2xl font-bold">{p.fullName}</Text>
                  <Text className="text-muted text-sm">{p.base || "Drone operator"}</Text>
                </View>
              </View>
              {p.verificationStatus === "approved" ? (
                <Text className="bg-teal-soft text-ink text-xs font-bold px-3 py-1 rounded-full overflow-hidden self-start mt-4">
                  ✓ Verified by AgricDrone Hub
                </Text>
              ) : null}

              <View className="flex-row gap-3 mt-6">
                <Stat value={p.averageRating !== null ? p.averageRating.toFixed(1) : "–"} label="Rating" accent>
                  {p.averageRating !== null ? <Stars value={p.averageRating} size={12} /> : null}
                </Stat>
                <Stat value={String(p.reviewCount)} label={p.reviewCount === 1 ? "Review" : "Reviews"} />
                <Stat value={String(p.completedJobs)} label="Jobs done" />
              </View>
            </>
          ) : null}
        </View>

        <View className="px-6 pt-6">
          {pilot.error ? (
            <ErrorState message={pilot.error} onRetry={pilot.reload} />
          ) : !p ? (
            <Loading />
          ) : (
            <>
              {p.services.length ? (
                <View className="flex-row flex-wrap gap-2 mb-8">
                  {p.services.map((s) => (
                    <Text key={s} className="bg-paper border border-line text-ink text-xs font-bold px-3 py-1.5 rounded-full overflow-hidden">
                      {s}
                    </Text>
                  ))}
                </View>
              ) : null}

              <SectionTitle title="Portfolio" />
              {p.portfolio.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 mb-8">
                  {p.portfolio.map((photo) => (
                    <View key={photo.id} className="w-56">
                      <Image source={{ uri: photo.url }} className="w-56 h-40 rounded-md bg-field" resizeMode="cover" />
                      {photo.caption ? <Text className="text-muted text-xs mt-1" numberOfLines={1}>{photo.caption}</Text> : null}
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View className="mb-8">
                  <EmptyState title="No photos yet" body={isMe ? "Add photos of your work from your profile." : "This pilot hasn't added work photos yet."}>
                    {isMe ? <Button label="Add photos" variant="outline" onPress={() => router.push("/operator-profile")} /> : null}
                  </EmptyState>
                </View>
              )}

              <SectionTitle title="Completed jobs" count={p.completedJobs} />
              {p.completed.length ? (
                <View className="bg-paper rounded-lg border border-line mb-8">
                  {p.completed.map((job, i) => (
                    <View key={job.id} className={`flex-row items-center p-4 ${i ? "border-t border-line" : ""}`}>
                      <View className="w-9 h-9 rounded-md bg-teal-soft items-center justify-center mr-3">
                        <Text className="text-ink font-bold">✓</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-ink font-bold">{job.title}</Text>
                        <Text className="text-muted text-xs">{job.service} • {job.areaHa} ha • {formatDate(job.completedAt)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="mb-8">
                  <EmptyState title="No completed jobs yet" body="Jobs appear here once the farm owner confirms they're done." />
                </View>
              )}

              <SectionTitle title="Reviews" count={p.reviewCount} />
              {p.reviews.length ? (
                <View className="gap-y-3">
                  {p.reviews.map((review) => (
                    <ReviewCard key={review.id} review={review} canReport={isMe} />
                  ))}
                </View>
              ) : (
                <EmptyState title="No reviews yet" body="Farm owners can rate a pilot after confirming a completed job." />
              )}
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Stat({ value, label, accent, children }: { value: string; label: string; accent?: boolean; children?: React.ReactNode }) {
  return (
    <View className="flex-1 bg-page border border-line rounded-md p-3">
      <Text className={`text-2xl font-bold ${accent ? "text-teal-ink" : "text-ink"}`}>{value}</Text>
      {children}
      <Text className="text-muted text-xs font-medium mt-0.5">{label}</Text>
    </View>
  );
}

function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <View className="flex-row items-baseline justify-between mb-3">
      <Text className="text-ink font-bold text-base">{title}</Text>
      {count !== undefined ? <Text className="text-muted text-xs">{count}</Text> : null}
    </View>
  );
}

function ReviewCard({ review, canReport }: { review: Review; canReport: boolean }) {
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [reported, setReported] = useState(false);

  const submit = async () => {
    if (reason.trim().length < 5) return Alert.alert("Add a reason", "Tell the admin team what's wrong with this review (5+ characters).");
    setBusy(true);
    try {
      await api(`/reviews/${review.id}/report`, { body: { reason: reason.trim() } });
      setReported(true);
      setReporting(false);
    } catch (e) {
      Alert.alert("Couldn't report this review", e instanceof ApiError ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="bg-paper p-4 rounded-lg border border-line">
      <View className="flex-row items-center justify-between mb-2">
        <Stars value={review.rating} />
        <Text className="text-muted text-xs">{formatDate(review.createdAt)}</Text>
      </View>
      <Text className="text-ink leading-5 mb-2">{review.comment}</Text>
      <Text className="text-muted text-xs">
        {review.reviewerFirstName} · {review.jobTitle}
      </Text>

      {canReport && !reported && !reporting ? (
        <Pressable onPress={() => setReporting(true)} accessibilityRole="button" className="self-start mt-3 py-1">
          <Text className="text-muted text-xs font-bold">Report this review</Text>
        </Pressable>
      ) : null}
      {reported ? <Text className="text-teal-ink text-xs font-bold mt-3">Reported. The admin team will take a look.</Text> : null}
      {reporting ? (
        <View className="mt-4 gap-y-3">
          <Field label="What's wrong with this review?" value={reason} onChangeText={setReason} multiline />
          <View className="flex-row gap-3">
            <View className="flex-1"><Button label="Cancel" variant="outline" onPress={() => setReporting(false)} /></View>
            <View className="flex-1"><Button label="Send report" variant="danger" busy={busy} onPress={submit} /></View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

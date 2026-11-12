import { useState } from "react";
import { Alert, View, ScrollView, Pressable } from "react-native";
import { Text } from "../components/Text";
import { router, useLocalSearchParams } from "expo-router";
import { BackHeader, Button, EmptyState, ErrorState, Loading } from "../components/ui";
import { ApiError, api, formatZar, type Bid, type Job } from "../lib/api";
import { celebrate, oops } from "../lib/feedback";
import { useApi } from "../lib/session";

type JobDetail = Job & { bids: Bid[] };

export default function ReviewBidsScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const job = useApi<JobDetail>(`/jobs/${jobId}`);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Selection is a commitment, so ask for explicit confirmation first.
  const confirmSelect = (bid: Bid) =>
    Alert.alert("Select this operator?", `${bid.operatorName} for ${formatZar(bid.amountZar)}. The other bids will be declined.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Select",
        onPress: async () => {
          setBusyId(bid.id);
          try {
            await api(`/jobs/${jobId}/select`, { body: { bidId: bid.id } });
            celebrate("Pilot chosen");
            router.replace({ pathname: "/job-details", params: { id: jobId } });
          } catch (e) {
            oops();
            Alert.alert("Couldn't select this operator", e instanceof ApiError ? e.message : "Please try again.");
            await job.reload();
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);

  const j = job.data;
  return (
    <View className="flex-1 bg-page">
      <BackHeader title="Review bids" subtitle={j ? `${j.bids.length} bid${j.bids.length === 1 ? "" : "s"} received` : undefined} fallback="/my-jobs" />
      <ScrollView className="flex-1" contentContainerClassName="px-6 pt-4 pb-10">
        {job.error ? (
          <ErrorState message={job.error} onRetry={job.reload} />
        ) : !j ? (
          <Loading />
        ) : (
          <>
            <View className="bg-paper p-4 rounded-lg mb-6 border border-line">
              <Text className="text-teal-ink text-xs font-semibold mb-1">{j.service} • {j.areaHa} ha</Text>
              <Text className="text-ink font-bold text-lg">{j.title}</Text>
              <Text className="text-muted text-sm">{j.location} • Budget {formatZar(j.budgetZar)}</Text>
            </View>

            <Text className="text-ink font-bold text-xl mb-1">Compare your options</Text>
            <Text className="text-muted text-sm mb-4">Lowest price first. Tap a pilot to see their completed work and reviews.</Text>

            {j.bids.length === 0 ? (
              <EmptyState title="No bids yet" body="Your job is live. Verified operators will see it in their marketplace." />
            ) : null}

            <View className="gap-y-5">
              {j.bids.map((bid) => {
                const initials = bid.operatorName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <View key={bid.id} className={`bg-paper p-4 rounded-lg border ${bid.status === "accepted" ? "border-teal border-2" : "border-line"}`}>
                    <Pressable
                      onPress={() => router.push({ pathname: "/pilot", params: { id: bid.operatorId } })}
                      accessibilityRole="button"
                      accessibilityHint="Opens this pilot's profile"
                      className="flex-row items-center mb-3"
                    >
                      <View className="w-11 h-11 rounded-full bg-teal-soft items-center justify-center mr-3">
                        <Text className="text-ink font-bold">{initials}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-ink font-bold">{bid.operatorName}</Text>
                        <Text className="text-teal-ink text-xs font-bold">View profile & reviews →</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-ink font-bold text-lg">{formatZar(bid.amountZar)}</Text>
                        <Text className="text-muted text-xs">{bid.days} day{bid.days === 1 ? "" : "s"}</Text>
                      </View>
                    </Pressable>
                    <Text className="text-muted text-sm leading-5 mb-4">{bid.message}</Text>
                    {bid.status === "accepted" ? (
                      <View className="bg-teal-soft p-3 rounded-md items-center">
                        <Text className="text-ink font-bold">Selected operator</Text>
                      </View>
                    ) : j.status === "open" ? (
                      <Button label="Select operator" variant="dark" busy={busyId === bid.id} disabled={busyId !== null} onPress={() => confirmSelect(bid)} />
                    ) : (
                      <Text className="text-muted text-sm text-center">Declined</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

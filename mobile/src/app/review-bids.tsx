import { Alert, Text, View, ScrollView, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { BackHeader, BottomNav, Button } from "../components/ui";
import { formatZar, isRestricted, useStore } from "../lib/store";

export default function ReviewBidsScreen() {
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const { jobs, bids, profile, selectedBids, selectBid } = useStore();

  // Without a jobId (e.g. from the Bids tab) show the newest job that has bids.
  const job = jobs.find((j) => j.id === jobId) ?? jobs.find((j) => bids.some((b) => b.jobId === j.id)) ?? jobs[0];
  const jobBids = bids.filter((b) => b.jobId === job.id).sort((a, b) => a.amount - b.amount);
  const selectedId = selectedBids[job.id];
  const restricted = isRestricted(job.service);

  // Selection is a commitment, so ask for explicit confirmation first.
  const confirmSelect = (bidId: string, operator: string, amount: number) =>
    Alert.alert("Select this operator?", `${operator} for ${formatZar(amount)}. Other bidders will be told the job is filled.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Select", onPress: () => selectBid(job.id, bidId) },
    ]);

  return (
    <View className="flex-1 bg-cream">
      <BackHeader title="Review bids" subtitle={`${jobBids.length} bid${jobBids.length === 1 ? "" : "s"} received`} />
      <ScrollView className="flex-1" contentContainerClassName="px-6 pt-4 pb-10">
        <Pressable
          onPress={() => router.push({ pathname: "/job-details", params: { id: job.id } })}
          className="bg-forest-900 p-4 rounded-lg mb-6 active:opacity-80"
        >
          <Text className="text-lime text-[10px] font-bold uppercase mb-1">{job.service} • {job.areaHa} ha</Text>
          <Text className="text-white font-bold text-lg">{job.title}</Text>
          <Text className="text-paper/70 text-sm">{job.location} • Budget {formatZar(job.budget)}</Text>
        </Pressable>

        {jobs.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 mb-6">
            {jobs.map((j) => (
              <Pressable
                key={j.id}
                onPress={() => router.setParams({ jobId: j.id })}
                className={`px-3 py-2 rounded-full border ${j.id === job.id ? "bg-forest-900 border-forest-900" : "bg-paper border-muted/30"}`}
              >
                <Text className={`text-xs font-bold ${j.id === job.id ? "text-lime" : "text-forest-900"}`} numberOfLines={1}>{j.title}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {restricted ? (
          <View className="p-4 rounded-md border border-danger bg-danger/10 mb-6">
            <Text className="text-forest-950 text-sm">This spraying job is on compliance hold, so no bids can be accepted yet.</Text>
          </View>
        ) : null}

        <Text className="text-forest-950 font-bold text-xl mb-4">Compare your options</Text>

        {jobBids.length === 0 && !restricted ? (
          <View className="bg-paper p-6 rounded-lg items-center">
            <Text className="text-forest-950 font-bold mb-1">No bids yet</Text>
            <Text className="text-muted text-sm text-center">Your job is live. Operators nearby will see it in their marketplace.</Text>
          </View>
        ) : null}

        <View className="gap-y-4">
          {jobBids.map((bid) => {
            const selected = selectedId === bid.id;
            const initials = bid.operator.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
            return (
              <View key={bid.id} className={`bg-paper p-4 rounded-lg border ${selected ? "border-lime border-2" : "border-muted/10"}`}>
                <View className="flex-row items-center mb-3">
                  <View className="w-11 h-11 rounded-full bg-lime-soft items-center justify-center mr-3">
                    <Text className="text-forest-950 font-bold">{initials}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-forest-950 font-bold">{bid.operator}</Text>
                    <Text className="text-muted text-xs">
                      {bid.flightHours ? `${bid.flightHours} flight hrs • ${bid.distanceKm} km away` : "New operator"}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-forest-950 font-bold text-lg">{formatZar(bid.amount)}</Text>
                    <Text className="text-muted text-xs">{bid.days} day{bid.days === 1 ? "" : "s"}</Text>
                  </View>
                </View>
                <Text className="text-muted text-sm leading-5 mb-4">{bid.message}</Text>
                {selected ? (
                  <View className="bg-lime-soft p-3 rounded-md items-center">
                    <Text className="text-forest-950 font-bold">Selected operator</Text>
                  </View>
                ) : profile.role === "owner" ? (
                  <Button
                    label={selectedId ? "Another operator selected" : "Select operator"}
                    variant="dark"
                    disabled={!!selectedId || restricted}
                    onPress={() => confirmSelect(bid.id, bid.operator, bid.amount)}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

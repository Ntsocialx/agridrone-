import { useState } from "react";
import { Text, View, Pressable, ScrollView, Image, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Field } from "../components/ui";
import { formatZar, isRestricted, useStore } from "../lib/store";

export default function JobDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { jobs, bids, profile, placeBid } = useStore();
  const [sheetOpen, setSheetOpen] = useState(false);

  const job = jobs.find((j) => j.id === id);
  if (!job) {
    return (
      <View className="flex-1 bg-cream items-center justify-center px-6">
        <Text className="text-forest-950 font-bold text-lg mb-4">This job is no longer available.</Text>
        <Button label="Back to jobs" variant="dark" onPress={() => router.replace("/operator-home")} />
      </View>
    );
  }

  const restricted = isRestricted(job.service);
  const myName = profile.name || "You (demo)";
  const alreadyBid = bids.some((b) => b.jobId === job.id && b.operator === myName);
  // UI hint only; a real API must enforce eligibility server-side.
  const blocker = restricted
    ? "On compliance hold"
    : profile.role !== "operator"
      ? null
      : profile.verification !== "approved"
        ? "Verification required"
        : alreadyBid
          ? "Bid submitted"
          : null;

  return (
    <View className="flex-1 bg-cream">
      <ScrollView className="flex-1">
        <View className="h-72">
          <Image source={{ uri: job.image }} className="w-full h-full bg-forest-800" resizeMode="cover" />
          <Pressable
            className="absolute left-6 px-4 py-2 bg-paper rounded-full"
            style={{ top: insets.top + 8 }}
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/operator-home"))}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text className="text-forest-900 font-bold">← Back</Text>
          </Pressable>
        </View>

        <View className="-mt-8 bg-paper rounded-t-lg p-6 pb-10">
          <View className="flex-row gap-2 mb-2">
            <Text className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase overflow-hidden ${restricted ? "bg-danger text-white" : "bg-lime text-forest-950"}`}>
              {restricted ? "Compliance hold" : "Open for bids"}
            </Text>
            <Text className="bg-cream text-forest-900 text-[10px] font-bold px-2 py-0.5 rounded uppercase overflow-hidden">{job.service}</Text>
          </View>
          <Text className="text-forest-950 text-2xl font-bold mb-4">{job.title}</Text>

          {restricted ? (
            <View className="p-4 rounded-md border border-danger bg-danger/10 mb-6">
              <Text className="text-danger font-bold mb-1">Restricted service</Text>
              <Text className="text-forest-950 text-sm leading-5">
                Aerial spraying needs additional regulatory approvals and evidence review. AgriDrone does not accept bids
                or assign operators for spraying jobs until that policy is in place.
              </Text>
            </View>
          ) : null}

          <View className="flex-row gap-3 mb-6">
            {[
              ["Location", job.location],
              ["Area", `${job.areaHa} ha`],
              ["Date", job.date],
            ].map(([label, value]) => (
              <View key={label} className="bg-cream p-3 rounded-md border border-muted/20 flex-1">
                <Text className="text-muted text-[10px] uppercase font-bold mb-1">{label}</Text>
                <Text className="text-forest-950 font-bold text-sm">{value}</Text>
              </View>
            ))}
          </View>

          <Text className="text-forest-950 font-bold text-lg mb-2">Job brief</Text>
          <Text className="text-muted leading-6 mb-6">{job.brief}</Text>

          <View className="p-4 bg-lime-soft rounded-lg border border-lime">
            <Text className="text-muted text-xs uppercase font-bold mb-1">Posted by</Text>
            <Text className="text-forest-950 font-bold">{job.postedBy}</Text>
          </View>
        </View>
      </ScrollView>

      <View className="bg-paper border-t border-muted/20 px-6 pt-4" style={{ paddingBottom: insets.bottom + 16 }}>
        {profile.role === "operator" && !restricted && profile.verification !== "approved" ? (
          <Text className="text-muted text-xs mb-3">Bidding opens once an admin approves your verification.</Text>
        ) : null}
        <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-muted text-xs uppercase font-bold">Budget</Text>
          <Text className="text-forest-950 text-2xl font-bold">{formatZar(job.budget)}</Text>
        </View>
        <View className="min-w-[160px]">
          {profile.role === "owner" && !restricted ? (
            <Button label="View bids" variant="dark" onPress={() => router.push({ pathname: "/review-bids", params: { jobId: job.id } })} />
          ) : (
            <Button label={blocker ?? "Place a bid"} disabled={!!blocker} onPress={() => setSheetOpen(true)} />
          )}
        </View>
        </View>
      </View>

      <BidSheet
        visible={sheetOpen}
        budget={job.budget}
        onClose={() => setSheetOpen(false)}
        onSubmit={(amount, days, message) => {
          placeBid({ jobId: job.id, amount, days, message });
          setSheetOpen(false);
        }}
      />
    </View>
  );
}

function BidSheet({
  visible,
  budget,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  budget: number;
  onClose: () => void;
  onSubmit: (amount: number, days: number, message: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState(String(budget));
  const [days, setDays] = useState("3");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const errors = {
    amount: Number(amount) > 0 ? undefined : "Enter your price in rand",
    days: Number(days) >= 1 && Number(days) <= 60 ? undefined : "Enter 1–60 days",
    message: message.trim().length >= 10 ? undefined : "Add a short message (10+ characters)",
  };

  const submit = () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    onSubmit(Number(amount), Number(days), message.trim());
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView className="flex-1 justify-end bg-forest-950/50" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Close bid sheet" />
        <View className="bg-paper rounded-t-lg px-6 pt-6" style={{ paddingBottom: insets.bottom + 16 }}>
          <Text className="text-forest-950 text-2xl font-bold mb-1">Place a bid</Text>
          <Text className="text-muted text-sm mb-5">Farm owner budget: {formatZar(budget)}</Text>
          <View className="gap-y-4 mb-6">
            <Field label="Your price (ZAR)" value={amount} onChangeText={setAmount} keyboardType="number-pad" error={submitted ? errors.amount : undefined} />
            <Field label="Estimated completion (days)" value={days} onChangeText={setDays} keyboardType="number-pad" error={submitted ? errors.days : undefined} />
            <Field label="Message to farm owner" placeholder="Equipment, availability, approach..." value={message} onChangeText={setMessage} multiline error={submitted ? errors.message : undefined} />
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1"><Button label="Cancel" variant="outline" onPress={onClose} /></View>
            <View className="flex-1"><Button label="Submit bid" onPress={submit} /></View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

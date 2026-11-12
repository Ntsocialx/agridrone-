import { useState } from "react";
import { Alert, View, Pressable, ScrollView, Image, Modal, KeyboardAvoidingView } from "react-native";
import { Text } from "../components/Text";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, ErrorState, Field, Loading, StatusPill } from "../components/ui";
import { ApiError, api, formatZar, isRestricted, serviceImage, type Bid, type Job, type OperatorProfile } from "../lib/api";
import { celebrate, oops } from "../lib/feedback";
import { useApi, useUser } from "../lib/session";

type JobDetail = Job & { bids: Bid[] };

export default function JobDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const user = useUser();
  const job = useApi<JobDetail>(`/jobs/${id}`);
  const profile = useApi<OperatorProfile>(user.role === "operator" ? "/operators/me" : null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const back = () => (router.canGoBack() ? router.back() : router.replace(user.role === "operator" ? "/operator-home" : "/my-jobs"));

  if (!job.data) {
    return (
      <View className="flex-1 bg-page px-6" style={{ paddingTop: insets.top + 60 }}>
        {job.error ? <ErrorState message={job.error} onRetry={job.reload} /> : <Loading />}
        <View className="mt-4"><Button label="Go back" variant="outline" onPress={back} /></View>
      </View>
    );
  }

  const j = job.data;
  const restricted = isRestricted(j.service);
  const isOwner = j.ownerId === user.id;
  const isAssigned = j.assignedOperatorId === user.id;
  const myBid = j.bids.find((b) => b.operatorId === user.id);

  const act = (path: string, confirm: { title: string; body: string }) =>
    Alert.alert(confirm.title, confirm.body, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes",
        onPress: async () => {
          setBusy(true);
          try {
            job.setData({ ...(await api<Job>(`/jobs/${j.id}/${path}`, { method: "POST" })), bids: j.bids });
            celebrate(path === "confirm" ? "Job confirmed complete" : "Marked complete");
          } catch (e) {
            oops();
            Alert.alert("Couldn't update the job", e instanceof ApiError ? e.message : "Please try again.");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  // One primary action per (role, status), so the next step is always obvious.
  let footer: { hint?: string; button?: React.ReactNode } = {};
  if (restricted) {
    footer = { button: <Button label="On compliance hold" disabled onPress={() => {}} /> };
  } else if (isOwner) {
    if (j.status === "open") footer = { button: <Button label={`View bids (${j.bidCount})`} variant="dark" onPress={() => router.push({ pathname: "/review-bids", params: { jobId: j.id } })} /> };
    if (j.status === "assigned") footer = { hint: `${j.assignedOperatorName} is working on this job. They'll mark it complete when done.` };
    if (j.status === "pending_confirmation")
      footer = { hint: "The pilot says the work is done.", button: <Button label="Confirm complete" busy={busy} onPress={() => act("confirm", { title: "Confirm the job is complete?", body: "Only confirm once you've received the work. You can then rate the pilot." })} /> };
    if (j.status === "completed")
      footer = j.reviewed ? { hint: "Completed and reviewed. Thank you!" } : { button: <Button label="Rate your pilot" onPress={() => router.push({ pathname: "/rate", params: { jobId: j.id } })} /> };
  } else if (isAssigned) {
    if (j.status === "assigned")
      footer = { hint: "You were selected for this job.", button: <Button label="Mark complete" busy={busy} onPress={() => act("complete", { title: "Mark this job complete?", body: "The farm owner will be asked to confirm." })} /> };
    if (j.status === "pending_confirmation") footer = { hint: "Waiting for the farm owner to confirm completion." };
    if (j.status === "completed") footer = { hint: "Completed. This job now shows on your public profile." };
  } else if (user.role === "operator" && j.status === "open") {
    const verified = profile.data?.verificationStatus === "approved";
    footer = myBid
      ? { hint: `Your bid: ${formatZar(myBid.amountZar)} in ${myBid.days} day${myBid.days === 1 ? "" : "s"}.` }
      : verified
        ? { button: <Button label="Place a bid" onPress={() => setSheetOpen(true)} /> }
        : { hint: "Bidding opens once an admin approves your verification.", button: <Button label="Verification required" disabled onPress={() => {}} /> };
  }

  return (
    <View className="flex-1 bg-page">
      <ScrollView className="flex-1">
        <View className="h-72">
          <Image source={{ uri: serviceImage(j.service) }} className="w-full h-full bg-field" resizeMode="cover" />
          <Pressable className="absolute left-6 px-4 py-2 bg-paper rounded-full" style={{ top: insets.top + 8 }} onPress={back} accessibilityRole="button" accessibilityLabel="Back">
            <Text className="text-ink font-bold">← Back</Text>
          </Pressable>
        </View>

        <View className="-mt-8 bg-paper rounded-t-lg p-6 pb-10">
          <View className="flex-row gap-2 mb-2">
            <StatusPill status={j.status} />
            <Text className="bg-page text-ink text-xs font-bold px-2 py-0.5 rounded overflow-hidden">{j.service}</Text>
          </View>
          <Text className="text-ink text-2xl font-bold mb-4">{j.title}</Text>

          {restricted ? (
            <View className="p-4 rounded-md border border-danger bg-danger/10 mb-6">
              <Text className="text-danger font-bold mb-1">Restricted service</Text>
              <Text className="text-ink text-sm leading-5">
                Aerial spraying needs additional regulatory approvals and evidence review. AgricDrone Hub does not accept bids
                or assign operators for spraying jobs until that policy is in place.
              </Text>
            </View>
          ) : null}

          {j.status === "removed" ? (
            <View className="p-4 rounded-md border border-danger bg-danger/10 mb-6">
              <Text className="text-danger font-bold mb-1">Removed by AgricDrone Hub</Text>
              <Text className="text-ink text-sm leading-5">{j.removedReason}</Text>
            </View>
          ) : null}

          <View className="flex-row gap-3 mb-6">
            {[
              ["Location", j.location],
              ["Area", `${j.areaHa} ha`],
              ["Date", j.preferredDate],
            ].map(([label, value]) => (
              <View key={label} className="bg-page p-3 rounded-md border border-line flex-1">
                <Text className="text-muted text-xs font-medium mb-1">{label}</Text>
                <Text className="text-ink font-bold text-sm">{value}</Text>
              </View>
            ))}
          </View>

          <Text className="text-ink font-bold text-lg mb-2">Job brief</Text>
          <Text className="text-muted leading-6 mb-6">{j.brief}</Text>

          <View className="p-4 bg-teal-soft rounded-lg border border-teal">
            <Text className="text-muted text-xs font-medium mb-1">Posted by</Text>
            <Text className="text-ink font-bold">{isOwner ? "You" : j.postedBy}</Text>
            {j.assignedOperatorId && j.assignedOperatorName ? (
              <Pressable onPress={() => router.push({ pathname: "/pilot", params: { id: j.assignedOperatorId! } })} className="mt-3">
                <Text className="text-muted text-xs font-medium mb-1">Pilot</Text>
                <Text className="text-teal-ink font-bold">{isAssigned ? "You" : `${j.assignedOperatorName} →`}</Text>
              </Pressable>
            ) : null}
          </View>

          {!isOwner && user.role !== "admin" ? (
            <Pressable
              onPress={() => router.push({ pathname: "/report-job", params: { jobId: j.id, title: j.title } })}
              accessibilityRole="button"
              className="self-center mt-6 py-2"
            >
              <Text className="text-muted text-sm underline">Report this job post</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <View className="bg-paper border-t border-line px-6 pt-4" style={{ paddingBottom: insets.bottom + 16 }}>
        {footer.hint ? <Text className="text-muted text-sm mb-3">{footer.hint}</Text> : null}
        <View className="flex-row items-center justify-between">
          <View className="mr-4">
            <Text className="text-muted text-xs font-medium">Budget</Text>
            <Text className="text-ink text-2xl font-bold">{formatZar(j.budgetZar)}</Text>
          </View>
          {footer.button ? <View className="flex-1">{footer.button}</View> : null}
        </View>
      </View>

      <BidSheet
        visible={sheetOpen}
        budget={j.budgetZar}
        onClose={() => setSheetOpen(false)}
        onSubmit={async (amountZar, days, message) => {
          await api(`/jobs/${j.id}/bids`, { body: { amountZar, days, message } });
          setSheetOpen(false);
          celebrate("Bid sent");
          await job.reload();
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
  onSubmit: (amount: number, days: number, message: string) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState(String(budget));
  const [days, setDays] = useState("3");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = {
    amount: Number(amount) > 0 && Number.isInteger(Number(amount)) ? undefined : "Enter your price in whole rand",
    days: Number(days) >= 1 && Number(days) <= 60 ? undefined : "Enter 1–60 days",
    message: message.trim().length >= 10 ? undefined : "Add a short message (10+ characters)",
  };

  const submit = async () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return oops();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(Number(amount), Number(days), message.trim());
    } catch (e) {
      oops();
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView className="flex-1 justify-end bg-ink/50" behavior="padding">
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Close bid sheet" />
        <View className="bg-paper rounded-t-lg px-6 pt-6" style={{ paddingBottom: insets.bottom + 16 }}>
          <Text className="text-ink text-2xl font-bold mb-1">Place a bid</Text>
          <Text className="text-muted text-sm mb-5">Farm owner budget: {formatZar(budget)}</Text>
          <View className="gap-y-5 mb-6">
            <Field label="Your price (ZAR)" value={amount} onChangeText={setAmount} keyboardType="number-pad" error={submitted ? errors.amount : undefined} />
            <Field label="Estimated completion (days)" value={days} onChangeText={setDays} keyboardType="number-pad" error={submitted ? errors.days : undefined} />
            <Field label="Message to farm owner" placeholder="Equipment, availability, approach..." value={message} onChangeText={setMessage} multiline error={submitted ? errors.message : undefined} />
          </View>
          {error ? <Text className="text-danger text-sm mb-4">{error}</Text> : null}
          <View className="flex-row gap-3">
            <View className="flex-1"><Button label="Cancel" variant="outline" onPress={onClose} /></View>
            <View className="flex-1"><Button label="Submit bid" onPress={submit} busy={busy} /></View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

import { useState } from "react";
import { Text, View, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { BackHeader, BottomNav, Button, Checkbox, Chip, Field } from "../components/ui";
import { SERVICES, isRestricted, useStore, type Service } from "../lib/store";

const STATUS_COPY = {
  not_submitted: null,
  in_review: "Your documents are with the admin team for review.",
  approved: "Verified by the AgriDrone admin team. This is an internal check, not aviation authority approval.",
  rejected: "Your application needs changes. Update your details and resubmit.",
};

export default function OperatorProfileScreen() {
  const { profile, submitForVerification } = useStore();
  const [base, setBase] = useState(profile.base);
  const [radius, setRadius] = useState(profile.radiusKm);
  const [services, setServices] = useState<Service[]>(profile.services);
  // Upload consent is separate from registration consent (docs/AGENTS.md §8).
  const [uploadConsent, setUploadConsent] = useState(profile.verification !== "not_submitted");
  const [licenceAttached, setLicenceAttached] = useState(profile.verification !== "not_submitted");
  const [submitted, setSubmitted] = useState(false);

  const locked = profile.verification === "in_review" || profile.verification === "approved";
  const errors = {
    base: base.trim() ? undefined : "Enter your operating base",
    radius: Number(radius) > 0 && Number(radius) <= 500 ? undefined : "Enter 1–500 km",
    services: services.length ? undefined : "Choose at least one service",
    licence: licenceAttached ? undefined : "Attach your remote pilot licence",
  };
  const valid = Object.values(errors).every((e) => !e);

  const toggle = (s: Service) => setServices((list) => (list.includes(s) ? list.filter((x) => x !== s) : [...list, s]));

  const onSubmit = () => {
    setSubmitted(true);
    if (!valid) return;
    submitForVerification({ base: base.trim(), radiusKm: radius, services });
    router.replace("/operator-home");
  };

  const initials = (profile.name || "You").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const statusCopy = STATUS_COPY[profile.verification];

  return (
    <KeyboardAvoidingView className="flex-1 bg-paper" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackHeader title={locked ? "Your profile" : "Complete profile"} subtitle={locked ? profile.name : "Step 2 of 2"} />
      <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center mb-6">
          <View className="w-14 h-14 rounded-full bg-lime-soft items-center justify-center mr-4">
            <Text className="text-forest-950 font-bold text-xl">{initials}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-forest-950 font-bold text-lg">{profile.name || "Demo operator"}</Text>
            <Text className="text-muted text-xs uppercase font-bold">{profile.verification.replace("_", " ")}</Text>
          </View>
        </View>

        {statusCopy ? (
          <View className={`p-4 rounded-md mb-6 ${profile.verification === "rejected" ? "bg-danger/10" : "bg-lime-soft"}`}>
            <Text className="text-forest-950 text-sm">{statusCopy}</Text>
          </View>
        ) : null}

        <Text className="text-forest-950 font-bold mb-3 uppercase text-xs tracking-widest">Service details</Text>
        <View className="gap-y-4 mb-6">
          <Field label="Operating base" placeholder="Town, Province" value={base} onChangeText={setBase} editable={!locked} error={submitted ? errors.base : undefined} />
          <Field label="Service radius (km)" placeholder="50" value={radius} onChangeText={setRadius} editable={!locked} keyboardType="number-pad" error={submitted ? errors.radius : undefined} />
        </View>

        <Text className="text-muted text-xs mb-2 ml-1">Services offered</Text>
        <View className="flex-row flex-wrap gap-2 mb-2">
          {SERVICES.filter((s) => !isRestricted(s)).map((s) => (
            <Chip key={s} label={s} active={services.includes(s)} onPress={() => !locked && toggle(s)} />
          ))}
        </View>
        <Text className="text-muted text-xs ml-1 mb-1">Spraying is on compliance hold and cannot be offered yet.</Text>
        {submitted && errors.services ? <Text className="text-danger text-xs ml-1">{errors.services}</Text> : null}

        <Text className="text-forest-950 font-bold mt-6 mb-3 uppercase text-xs tracking-widest">Verification document</Text>
        <View className="bg-cream p-4 rounded-md mb-4">
          <Text className="text-muted text-xs leading-5">
            We collect your remote pilot licence only to check you can be listed as an operator. Only authorised AgriDrone
            admins can view it. You can ask us to access, correct or delete it at any time.
          </Text>
        </View>
        {!locked ? (
          <View className="mb-4">
            <Checkbox checked={uploadConsent} onChange={setUploadConsent}>
              I consent to AgriDrone storing and reviewing my licence for operator verification.
            </Checkbox>
          </View>
        ) : null}
        <Pressable
          disabled={!uploadConsent || locked}
          onPress={() => setLicenceAttached((v) => !v)}
          accessibilityRole="button"
          className={`flex-row items-center p-4 border border-dashed rounded-md ${licenceAttached ? "border-forest-700 bg-lime-soft" : "border-muted/40 bg-cream"} ${!uploadConsent ? "opacity-40" : ""}`}
        >
          <View className="w-10 h-10 bg-paper rounded-md items-center justify-center mr-3">
            <Text className="text-forest-950 font-bold text-xs">{licenceAttached ? "✓" : "PDF"}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-forest-950 font-bold text-sm">Remote pilot licence</Text>
            <Text className="text-muted text-xs">
              {licenceAttached ? "licence-demo.pdf attached (demo)" : "Tap to attach .pdf or .jpg (max 5MB)"}
            </Text>
          </View>
        </Pressable>
        {submitted && errors.licence ? <Text className="text-danger text-xs mt-1 ml-1">{errors.licence}</Text> : null}

        <View className="mt-8 mb-12">
          {locked ? (
            <Button label="Back to jobs" variant="dark" onPress={() => router.replace("/operator-home")} />
          ) : (
            <Button label={profile.verification === "rejected" ? "Resubmit for verification" : "Submit for verification"} onPress={onSubmit} />
          )}
        </View>
      </ScrollView>
      {profile.verification !== "not_submitted" ? <BottomNav /> : null}
    </KeyboardAvoidingView>
  );
}

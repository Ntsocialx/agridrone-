import { useState } from "react";
import { Alert, Image, View, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Text } from "../components/Text";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { AccountCard } from "../components/AccountCard";
import { FeedbackSwitches } from "../components/FeedbackSwitches";
import { HelpLink } from "../components/HelpLink";
import { ProfilePhoto } from "../components/ProfilePhoto";
import { BackHeader, BottomNav, Button, Checkbox, Chip, ErrorState, Field, Loading, SignOutButton } from "../components/ui";
import { ApiError, SERVICES, api, isRestricted, uploadFile, type OperatorProfile, type PickedFile, type PilotProfile, type Service } from "../lib/api";
import { celebrate, oops } from "../lib/feedback";
import { useApi, useUser } from "../lib/session";

const STATUS_COPY = {
  not_submitted: null,
  in_review: "Your licence is with the admin team for review. You can bid once it's approved.",
  approved: "Verified by the AgricDrone Hub admin team. This is an internal check, not aviation authority approval.",
  rejected: "Your application needs changes. Update your details and resubmit.",
};

const message = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong.");
const MAX_BYTES = 5 * 1024 * 1024;
const tooBig = () => new ApiError("That file is over 5 MB. Choose a smaller one.", 400);

async function pickPhoto(): Promise<PickedFile | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
    // iPhones store photos as HEIC; "compatible" makes iOS hand us a JPEG instead.
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (result.canceled) return null;
  const photo = result.assets[0];
  if (photo.fileSize && photo.fileSize > MAX_BYTES) throw tooBig();
  const mimeType = photo.mimeType === "image/png" ? "image/png" : "image/jpeg";
  return { uri: photo.uri, name: mimeType === "image/png" ? "photo.png" : "photo.jpg", mimeType };
}

async function pickPdf(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
  if (result.canceled) return null;
  const file = result.assets[0];
  if (file.size && file.size > MAX_BYTES) throw tooBig();
  return { uri: file.uri, name: file.name, mimeType: "application/pdf" };
}

/** Web has no action sheet, so the browser's file chooser offers PDF and photos together. */
async function pickLicenceOnWeb(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/jpeg", "image/png"] });
  if (result.canceled) return null;
  const file = result.assets[0];
  if (file.size && file.size > MAX_BYTES) throw tooBig();
  return { uri: file.uri, name: file.name, mimeType: file.mimeType ?? "application/pdf" };
}

export default function OperatorProfileScreen() {
  const profile = useApi<OperatorProfile>("/operators/me");
  if (!profile.data) {
    return (
      <View className="flex-1 bg-paper">
        <BackHeader title="Your profile" fallback="/operator-home" />
        <View className="px-6">{profile.error ? <ErrorState message={profile.error} onRetry={profile.reload} /> : <Loading />}</View>
      </View>
    );
  }
  return <ProfileForm p={profile.data} reload={profile.reload} />;
}

/** Rendered once the saved profile has loaded, so it can seed the form directly. */
function ProfileForm({ p, reload }: { p: OperatorProfile; reload: () => Promise<void> }) {
  const user = useUser();
  const pilot = useApi<PilotProfile>(`/pilots/${user.id}`);
  const [base, setBase] = useState(p.base);
  const [radius, setRadius] = useState(String(p.radiusKm));
  const [services, setServices] = useState<Service[]>(p.services);
  const [uploadConsent, setUploadConsent] = useState(p.licenceAttached);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState<null | "licence" | "photo" | "submit">(null);
  const [error, setError] = useState<string | null>(null);

  const locked = p.verificationStatus === "in_review" || p.verificationStatus === "approved";
  const errors = {
    base: base.trim().length >= 2 ? undefined : "Enter your operating base",
    radius: Number(radius) >= 1 && Number(radius) <= 500 ? undefined : "Enter 1–500 km",
    services: services.length ? undefined : "Choose at least one service",
    licence: p.licenceAttached ? undefined : "Upload your remote pilot licence",
  };
  const toggle = (s: Service) => setServices((list) => (list.includes(s) ? list.filter((x) => x !== s) : [...list, s]));

  const run = async (kind: NonNullable<typeof busy>, work: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await work();
    } catch (e) {
      oops();
      setError(message(e));
    } finally {
      setBusy(null);
    }
  };

  const uploadLicence = (pick: () => Promise<PickedFile | null>) =>
    run("licence", async () => {
      const file = await pick();
      if (!file) return;
      await api("/operators/me/licence/consent", { body: { accept: true } });
      const publicId = await uploadFile("licence", file);
      await api("/operators/me/licence", { body: { publicId } });
      await reload();
      celebrate("Licence uploaded");
    });

  // Most people keep a licence photo in their camera roll, not in Files.
  const pickLicence = () =>
    Platform.OS === "web" ? uploadLicence(pickLicenceOnWeb) : Alert.alert("Upload your licence", "Choose a photo of it, or a PDF copy.", [
      { text: "Photo from library", onPress: () => uploadLicence(pickPhoto) },
      { text: "PDF file", onPress: () => uploadLicence(pickPdf) },
      { text: "Cancel", style: "cancel" },
    ]);

  const addPhoto = () =>
    run("photo", async () => {
      const photo = await pickPhoto();
      if (!photo) return;
      const publicId = await uploadFile("portfolio", photo);
      await api("/operators/me/portfolio", { body: { publicId, caption: "" } });
      await pilot.reload();
      celebrate("Photo added");
    });

  const deletePhoto = (id: string) =>
    run("photo", async () => {
      await api(`/operators/me/portfolio/${id}`, { method: "DELETE" });
      await pilot.reload();
    });
  // Alert buttons do nothing on web, so the browser uses its own confirm dialog.
  const removePhoto = (id: string) =>
    Platform.OS === "web"
      ? window.confirm("Remove this photo? It will be deleted from your public profile.") && deletePhoto(id)
      : Alert.alert("Remove this photo?", "It will be deleted from your public profile.", [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", style: "destructive", onPress: () => deletePhoto(id) },
        ]);

  const onSubmit = () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return oops();
    void run("submit", async () => {
      await api("/operators/me", { method: "PUT", body: { base: base.trim(), radiusKm: Number(radius), services } });
      await api("/operators/me/submit", { method: "POST" });
      celebrate("Sent for verification");
      router.replace("/operator-home");
    });
  };

  const statusCopy = STATUS_COPY[p.verificationStatus];

  return (
    <KeyboardAvoidingView className="flex-1 bg-paper" behavior="padding">
      <BackHeader
        title={p.verificationStatus === "not_submitted" ? "Complete profile" : "Your profile"}
        subtitle={p.verificationStatus === "not_submitted" ? "Step 2 of 2" : undefined}
        fallback="/operator-home"
        bell
      />
      <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center mb-6">
          <View className="mr-4">
            <ProfilePhoto name={user.fullName} size={56} />
          </View>
          <View className="flex-1">
            <Text className="text-ink font-bold text-lg">{user.fullName}</Text>
            <Text className="text-muted text-xs font-medium">{p.verificationStatus.replace("_", " ")}</Text>
          </View>
          <Pressable onPress={() => router.push({ pathname: "/pilot", params: { id: user.id } })} accessibilityRole="button" className="py-2">
            <Text className="text-teal-ink font-bold text-sm">Public profile →</Text>
          </Pressable>
        </View>

        {statusCopy ? (
          <View className={`p-4 rounded-md mb-6 ${p.verificationStatus === "rejected" ? "bg-danger/10" : "bg-teal-soft"}`}>
            <Text className="text-ink text-sm">{statusCopy}</Text>
            {p.rejectionReason ? <Text className="text-danger text-sm mt-2">Reason: {p.rejectionReason}</Text> : null}
          </View>
        ) : null}

        <Text className="text-ink font-bold mb-3 text-base">Service details</Text>
        <View className="gap-y-5 mb-6">
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

        <Text className="text-ink font-bold mt-6 mb-3 text-base">Verification document</Text>
        <View className="bg-page p-4 rounded-md mb-4">
          <Text className="text-muted text-xs leading-5">
            We collect your remote pilot licence only to check you can be listed as an operator. It is stored privately
            and only authorised AgricDrone Hub admins can view it, through links that expire after 5 minutes. You can ask us to
            access, correct or delete it at any time.
          </Text>
        </View>
        {!locked && !p.licenceAttached ? (
          <View className="mb-4">
            <Checkbox checked={uploadConsent} onChange={setUploadConsent}>
              I consent to AgricDrone Hub storing and reviewing my licence for operator verification.
            </Checkbox>
          </View>
        ) : null}
        <Pressable
          disabled={!uploadConsent || locked || busy !== null}
          onPress={pickLicence}
          accessibilityRole="button"
          className={`flex-row items-center p-4 border border-dashed rounded-md ${p.licenceAttached ? "border-teal bg-teal-soft" : "border-line bg-page"} ${!uploadConsent ? "opacity-40" : ""}`}
        >
          <View className="w-10 h-10 bg-paper rounded-md items-center justify-center mr-3">
            <Text className="text-ink font-bold text-xs">{p.licenceAttached ? "✓" : "PDF"}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-ink font-bold text-sm">Remote pilot licence</Text>
            <Text className="text-muted text-xs">
              {busy === "licence"
                ? "Uploading securely…"
                : p.licenceAttached
                  ? locked ? "Uploaded and locked during review" : "Uploaded · tap to replace"
                  : "Tap to upload .pdf, .jpg or .png (max 5 MB)"}
            </Text>
          </View>
        </Pressable>
        {submitted && errors.licence ? <Text className="text-danger text-xs mt-1 ml-1">{errors.licence}</Text> : null}

        <Text className="text-ink font-bold mt-8 mb-1 text-base">Portfolio</Text>
        <Text className="text-muted text-xs mb-3">Public photos of your work, shown on your profile to farm owners.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
          {pilot.data?.portfolio.map((photo) => (
            <Pressable key={photo.id} onLongPress={() => removePhoto(photo.id)} accessibilityHint="Long press to remove">
              <Image source={{ uri: photo.url }} className="w-28 h-28 rounded-md bg-page" />
            </Pressable>
          ))}
          <Pressable
            onPress={addPhoto}
            disabled={busy !== null}
            accessibilityRole="button"
            className="w-28 h-28 rounded-md border border-dashed border-line bg-page items-center justify-center"
          >
            <Text className="text-teal-ink text-2xl">{busy === "photo" ? "…" : "+"}</Text>
            <Text className="text-muted text-xs">Add photo</Text>
          </Pressable>
        </ScrollView>
        {pilot.data?.portfolio.length ? <Text className="text-muted text-xs mt-2">Long-press a photo to remove it.</Text> : null}

        {error ? (
          <View className="bg-danger/10 border border-danger/30 p-3 rounded-md mt-6">
            <Text className="text-danger text-sm">{error}</Text>
          </View>
        ) : null}

        <View className="mt-8 mb-12">
          {locked ? null : (
            <Button
              label={p.verificationStatus === "rejected" ? "Resubmit for verification" : "Submit for verification"}
              onPress={onSubmit}
              busy={busy === "submit"}
              disabled={busy !== null && busy !== "submit"}
            />
          )}
          <Text className={`text-ink font-bold mb-3 text-base ${locked ? "" : "mt-10"}`}>Account</Text>
          <AccountCard />
          <Text className="text-ink font-bold mt-8 mb-3 text-base">Sounds and vibration</Text>
          <FeedbackSwitches />
          <View className="mt-4">
            <HelpLink />
          </View>
          <View className="mt-8">
            <SignOutButton />
          </View>
        </View>
      </ScrollView>
      {p.verificationStatus !== "not_submitted" ? <BottomNav /> : null}
    </KeyboardAvoidingView>
  );
}

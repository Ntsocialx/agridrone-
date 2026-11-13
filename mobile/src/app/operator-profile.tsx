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
import { ProvincePicker } from "../components/ProvincePicker";
import { BackHeader, BottomNav, Button, Checkbox, Chip, ErrorState, Field, Loading, SignOutButton } from "../components/ui";
import {
  ApiError,
  SERVICES,
  api,
  formatDate,
  isRestricted,
  uploadFile,
  type OperatorProfile,
  type PickedFile,
  type PilotProfile,
  type Province,
  type Service,
} from "../lib/api";
import { celebrate, oops } from "../lib/feedback";
import { useApi, useUser } from "../lib/session";
import { pilotStanding } from "../lib/standing";

const message = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong.");
const MAX_BYTES = 5 * 1024 * 1024;
const tooBig = () => new ApiError("That file is over 5 MB. Choose a smaller one.", 400);

const TONE = { ok: "bg-teal-soft", warn: "bg-sun/15", danger: "bg-danger/10" };

type DocumentKind = "licence" | "roc" | "medical_certificate" | "training_certificate" | "flight_log";
const DOCUMENT_COPY: Record<DocumentKind, { title: string; hint: string; done: string; spreadsheets?: boolean }> = {
  licence: { title: "Remote pilot licence", hint: "Your SACAA RPL", done: "Licence uploaded" },
  roc: { title: "ROC proof", hint: "The ROC certificate, or a letter from the ROC holder you fly for", done: "ROC proof uploaded" },
  medical_certificate: { title: "Class 3 medical certificate", hint: "Your current Class 3 medical", done: "Medical certificate uploaded" },
  training_certificate: { title: "Training certificate", hint: "Your course completion certificate", done: "Certificate uploaded" },
  flight_log: { title: "Flight log", hint: "Your logbook", done: "Flight log uploaded", spreadsheets: true },
};

const PDF_TYPES = ["application/pdf"];
const PHOTO_TYPES = ["image/jpeg", "image/png"];
const SPREADSHEET_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "text/comma-separated-values",
];

/** Dates are typed as YYYY-MM-DD (the same as Post a job). */
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const today = () => new Date().toISOString().slice(0, 10);

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

/** Picks a file of the given types from Files (on web: the browser's file chooser). */
async function pickFile(types: string[]): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true });
  if (result.canceled) return null;
  const file = result.assets[0];
  if (file.size && file.size > MAX_BYTES) throw tooBig();
  return { uri: file.uri, name: file.name, mimeType: file.mimeType ?? types[0] };
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
  const [form, setForm] = useState({
    base: p.base,
    radius: String(p.radiusKm),
    rplNumber: p.rplNumber ?? "",
    rplExpiresOn: p.rplExpiresOn ?? "",
    rocHolderName: p.rocHolderName ?? "",
    rocNumber: p.rocNumber ?? "",
    rocExpiresOn: p.rocExpiresOn ?? "",
    trainingProvider: p.trainingProvider ?? "",
    trainingProgramme: p.trainingProgramme ?? "",
    trainingCompletedOn: p.trainingCompletedOn ?? "",
    medicalExpiresOn: p.medicalExpiresOn ?? "",
    flightHours: p.flightHours === null ? "" : String(p.flightHours),
  });
  const [services, setServices] = useState<Service[]>(p.services);
  const [province, setProvince] = useState<Province | null>(p.province);
  const [uploadConsent, setUploadConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState<null | DocumentKind | "photo" | "submit" | "save" | "update">(null);
  const [error, setError] = useState<string | null>(null);

  const status = p.verificationStatus;
  const locked = status === "in_review" || status === "approved";
  const standing = pilotStanding(p);
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const toggle = (s: Service) => setServices((list) => (list.includes(s) ? list.filter((x) => x !== s) : [...list, s]));

  const futureDate = (s: string, what: string) => (isDate(s) && s > today() ? undefined : `Enter the ${what} as YYYY-MM-DD (a future date)`);
  // The service details are enough to save; everything is needed to submit.
  const basicErrors = {
    base: form.base.trim().length >= 2 ? undefined : "Enter your operating base",
    radius: Number(form.radius) >= 1 && Number(form.radius) <= 500 ? undefined : "Enter 1–500 km",
    services: services.length ? undefined : "Choose at least one service",
  };
  const errors = {
    ...basicErrors,
    province: province ? undefined : "Choose your province",
    rplNumber: form.rplNumber.trim().length >= 3 ? undefined : "Enter your licence number",
    rplExpiresOn: futureDate(form.rplExpiresOn, "licence expiry date"),
    licence: p.licenceAttached ? undefined : "Upload your remote pilot licence",
    rocHolderName: form.rocHolderName.trim().length >= 2 ? undefined : "Enter the ROC holder's name",
    rocNumber: form.rocNumber.trim().length >= 3 ? undefined : "Enter the ROC number",
    rocExpiresOn: futureDate(form.rocExpiresOn, "ROC expiry date"),
    roc: p.rocAttached ? undefined : "Upload proof of the ROC",
    trainingProvider: form.trainingProvider.trim().length >= 2 ? undefined : "Enter your training provider",
    trainingProgramme: form.trainingProgramme.trim().length >= 2 ? undefined : "Enter the programme or course",
    trainingCompletedOn:
      isDate(form.trainingCompletedOn) && form.trainingCompletedOn <= today() ? undefined : "Enter the completion date as YYYY-MM-DD",
    training_certificate: p.trainingCertificateAttached ? undefined : "Upload your training certificate",
    medicalExpiresOn: futureDate(form.medicalExpiresOn, "medical expiry date"),
    medical_certificate: p.medicalCertificateAttached ? undefined : "Upload your Class 3 medical certificate",
    flightHours:
      form.flightHours.trim() !== "" && Number(form.flightHours) >= 0 && Number(form.flightHours) <= 100_000
        ? undefined
        : "Enter your total flight hours (e.g. 52.5)",
    flight_log: p.flightLogAttached ? undefined : "Upload your flight log",
  };
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

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

  const save = () => {
    const optional = (value: string) => value.trim() || null;
    return api("/operators/me", {
      method: "PUT",
      body: {
        base: form.base.trim(),
        radiusKm: Number(form.radius),
        services,
        province,
        rplNumber: optional(form.rplNumber),
        rplExpiresOn: isDate(form.rplExpiresOn) ? form.rplExpiresOn : null,
        rocHolderName: optional(form.rocHolderName),
        rocNumber: optional(form.rocNumber),
        rocExpiresOn: isDate(form.rocExpiresOn) ? form.rocExpiresOn : null,
        trainingProvider: optional(form.trainingProvider),
        trainingProgramme: optional(form.trainingProgramme),
        trainingCompletedOn: isDate(form.trainingCompletedOn) ? form.trainingCompletedOn : null,
        medicalExpiresOn: isDate(form.medicalExpiresOn) ? form.medicalExpiresOn : null,
        flightHours: form.flightHours.trim() !== "" && !Number.isNaN(Number(form.flightHours)) ? Number(form.flightHours) : null,
      },
    });
  };

  const uploadDocument = (kind: DocumentKind, pick: () => Promise<PickedFile | null>) =>
    run(kind, async () => {
      const file = await pick();
      if (!file) return;
      await api("/operators/me/licence/consent", { body: { accept: true } });
      const publicId = await uploadFile(kind, file);
      await api(`/operators/me/${kind}`, { body: { publicId } });
      await reload();
      celebrate(DOCUMENT_COPY[kind].done);
    });

  // Most people keep document photos in their camera roll, not in Files. Flight logs may also be spreadsheets.
  const pickDocument = (kind: DocumentKind) => {
    const fileTypes = DOCUMENT_COPY[kind].spreadsheets ? [...PDF_TYPES, ...SPREADSHEET_TYPES] : PDF_TYPES;
    if (Platform.OS === "web") return uploadDocument(kind, () => pickFile([...fileTypes, ...PHOTO_TYPES]));
    Alert.alert(
      `Upload your ${DOCUMENT_COPY[kind].title.toLowerCase()}`,
      DOCUMENT_COPY[kind].spreadsheets ? "Choose a photo, a PDF, or an Excel/CSV file." : "Choose a photo of it, or a PDF copy.",
      [
        { text: "Photo from library", onPress: () => uploadDocument(kind, pickPhoto) },
        { text: DOCUMENT_COPY[kind].spreadsheets ? "PDF or spreadsheet" : "PDF file", onPress: () => uploadDocument(kind, () => pickFile(fileTypes)) },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

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

  const onSave = () => {
    setSubmitted(true);
    if (Object.values(basicErrors).some(Boolean)) return oops();
    void run("save", async () => {
      await save();
      await reload();
      celebrate("Details saved");
    });
  };

  const onSubmit = () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return oops();
    void run("submit", async () => {
      await save();
      await api("/operators/me/submit", { method: "POST" });
      celebrate("Sent for verification");
      router.replace("/operator-home");
    });
  };

  const startUpdate = () =>
    run("update", async () => {
      await api("/operators/me/update", { method: "POST" });
      await reload();
    });

  const documentRow = (kind: DocumentKind, attached: boolean) => (
    <View>
      <Pressable
        disabled={!uploadConsent || locked || busy !== null}
        onPress={() => pickDocument(kind)}
        accessibilityRole="button"
        accessibilityLabel={`Upload ${DOCUMENT_COPY[kind].title}`}
        className={`flex-row items-center p-4 border border-dashed rounded-md ${attached ? "border-teal bg-teal-soft" : "border-line bg-page"} ${!uploadConsent && !locked ? "opacity-40" : ""}`}
      >
        <View className="w-10 h-10 bg-paper rounded-md items-center justify-center mr-3">
          <Text className="text-ink font-bold text-xs">{attached ? "✓" : "PDF"}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-ink font-bold text-sm">{DOCUMENT_COPY[kind].title}</Text>
          <Text className="text-muted text-xs">
            {busy === kind
              ? "Uploading securely…"
              : attached
                ? locked ? "Uploaded and locked" : "Uploaded · tap to replace"
                : `${DOCUMENT_COPY[kind].hint}. ${DOCUMENT_COPY[kind].spreadsheets ? ".pdf, .jpg, .png, .xlsx or .csv" : ".pdf, .jpg or .png"} (max 5 MB)`}
          </Text>
        </View>
      </Pressable>
      {show(kind) ? <Text className="text-danger text-xs mt-1 ml-1">{show(kind)}</Text> : null}
    </View>
  );

  return (
    <KeyboardAvoidingView className="flex-1 bg-paper" behavior="padding">
      <BackHeader
        title={status === "not_submitted" ? "Complete profile" : "Your profile"}
        subtitle={status === "not_submitted" ? "Step 2 of 2" : undefined}
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
            <Text className="text-muted text-xs font-medium">{standing.pill}</Text>
          </View>
          <Pressable onPress={() => router.push({ pathname: "/pilot", params: { id: user.id } })} accessibilityRole="button" className="py-2">
            <Text className="text-teal-ink font-bold text-sm">Public profile →</Text>
          </Pressable>
        </View>

        {status !== "not_submitted" ? (
          <View className={`p-4 rounded-md mb-6 ${TONE[standing.tone]}`}>
            <Text className="text-ink font-bold mb-1">{standing.title}</Text>
            <Text className="text-ink text-sm">{standing.body}</Text>
            {status === "approved" && p.canBid && p.rocNumber && p.eligibleUntil ? (
              <Text className="text-muted text-xs mt-2">
                Verified until {formatDate(p.eligibleUntil)}. This is an AgricDrone Hub check, not aviation authority approval.
              </Text>
            ) : null}
            {p.rejectionReason ? <Text className="text-danger text-sm mt-2">Reason: {p.rejectionReason}</Text> : null}
            {status === "approved" ? (
              <View className="mt-4">
                <Button label="Update my details" variant="outline" busy={busy === "update"} disabled={busy !== null && busy !== "update"} onPress={startUpdate} />
                <Text className="text-muted text-xs mt-2">
                  For a renewed licence or ROC, or new training. {p.canBid ? "You can keep bidding while an admin checks the update." : ""}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <Text className="text-ink font-bold mb-3 text-base">Service details</Text>
        <View className="gap-y-5 mb-6">
          <Field label="Operating base" placeholder="Town" value={form.base} onChangeText={set("base")} editable={!locked} error={show("base")} />
          <Field label="Service radius (km)" placeholder="50" value={form.radius} onChangeText={set("radius")} editable={!locked} keyboardType="number-pad" error={show("radius")} />
          <ProvincePicker label="Province" value={province} onChange={setProvince} disabled={locked} error={show("province")} />
        </View>

        <Text className="text-ink text-sm font-medium mb-2">Services offered</Text>
        <View className="flex-row flex-wrap gap-2 mb-2">
          {SERVICES.filter((s) => !isRestricted(s)).map((s) => (
            <Chip key={s} label={s} active={services.includes(s)} onPress={() => !locked && toggle(s)} />
          ))}
        </View>
        <Text className="text-muted text-xs ml-1 mb-1">Spraying is on compliance hold and cannot be offered yet.</Text>
        {show("services") ? <Text className="text-danger text-xs ml-1">{show("services")}</Text> : null}

        <Text className="text-ink font-bold mt-8 mb-3 text-base">Verification documents</Text>
        <View className="bg-page p-4 rounded-md mb-4">
          <Text className="text-muted text-xs leading-5">
            Commercial drone work in South Africa needs a SACAA Remote Pilot Licence, a current Class 3 medical and operation
            under a Remote Operating Certificate (ROC). We collect your licence, ROC proof, medical certificate, training
            certificate and flight log only to check you can be listed as an operator. Your medical certificate is health
            information: we only use it to confirm it is current. All of them are stored privately and only authorised
            AgricDrone Hub admins can view them, through links that expire after 5 minutes. You can ask us to access, correct
            or delete them at any time.
          </Text>
        </View>
        {!locked ? (
          <View className="mb-6">
            <Checkbox checked={uploadConsent} onChange={setUploadConsent}>
              I consent to AgricDrone Hub storing and reviewing my licence, ROC proof, Class 3 medical certificate, training
              certificate and flight log for operator verification.
            </Checkbox>
          </View>
        ) : null}

        <Text className="text-ink font-bold mb-3">Remote Pilot Licence (RPL)</Text>
        <View className="gap-y-5 mb-4">
          <Field label="Licence number" placeholder="As printed on your licence" value={form.rplNumber} onChangeText={set("rplNumber")} editable={!locked} autoCapitalize="characters" error={show("rplNumber")} />
          <Field label="Licence expiry date" placeholder="YYYY-MM-DD" value={form.rplExpiresOn} onChangeText={set("rplExpiresOn")} editable={!locked} keyboardType="numbers-and-punctuation" error={show("rplExpiresOn")} />
        </View>
        {documentRow("licence", p.licenceAttached)}

        <Text className="text-ink font-bold mt-8 mb-1">Remote Operating Certificate (ROC)</Text>
        <Text className="text-muted text-xs mb-3">Your own ROC, or that of the company you fly for.</Text>
        <View className="gap-y-5 mb-4">
          <Field label="ROC holder" placeholder="Company or person named on the ROC" value={form.rocHolderName} onChangeText={set("rocHolderName")} editable={!locked} error={show("rocHolderName")} />
          <Field label="ROC number" placeholder="As printed on the ROC" value={form.rocNumber} onChangeText={set("rocNumber")} editable={!locked} autoCapitalize="characters" error={show("rocNumber")} />
          <Field label="ROC expiry date" placeholder="YYYY-MM-DD" value={form.rocExpiresOn} onChangeText={set("rocExpiresOn")} editable={!locked} keyboardType="numbers-and-punctuation" error={show("rocExpiresOn")} />
        </View>
        {documentRow("roc", p.rocAttached)}

        <Text className="text-ink font-bold mt-8 mb-1">Class 3 medical certificate</Text>
        <Text className="text-muted text-xs mb-3">Needed for your licence. Only admins see it.</Text>
        <View className="gap-y-5 mb-4">
          <Field label="Medical expiry date" placeholder="YYYY-MM-DD" value={form.medicalExpiresOn} onChangeText={set("medicalExpiresOn")} editable={!locked} keyboardType="numbers-and-punctuation" error={show("medicalExpiresOn")} />
        </View>
        {documentRow("medical_certificate", p.medicalCertificateAttached)}

        <Text className="text-ink font-bold mt-8 mb-1">Training</Text>
        <Text className="text-muted text-xs mb-3">Where you trained as a drone pilot. Only admins see this.</Text>
        <View className="gap-y-5 mb-4">
          <Field label="Training provider" placeholder="e.g. the flight school's name" value={form.trainingProvider} onChangeText={set("trainingProvider")} editable={!locked} error={show("trainingProvider")} />
          <Field label="Programme or course" placeholder="e.g. RPL multirotor course" value={form.trainingProgramme} onChangeText={set("trainingProgramme")} editable={!locked} error={show("trainingProgramme")} />
          <Field label="Completion date" placeholder="YYYY-MM-DD" value={form.trainingCompletedOn} onChangeText={set("trainingCompletedOn")} editable={!locked} keyboardType="numbers-and-punctuation" error={show("trainingCompletedOn")} />
        </View>
        {documentRow("training_certificate", p.trainingCertificateAttached)}

        <Text className="text-ink font-bold mt-8 mb-1">Flight experience</Text>
        <Text className="text-muted text-xs mb-3">Your total flying time and logbook. Only admins see them.</Text>
        <View className="gap-y-5 mb-4">
          <Field label="Total flight hours" placeholder="e.g. 52.5" value={form.flightHours} onChangeText={set("flightHours")} editable={!locked} keyboardType="decimal-pad" error={show("flightHours")} />
        </View>
        {documentRow("flight_log", p.flightLogAttached)}

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
            <View className="gap-y-3">
              <Button
                label={status === "rejected" || status === "updating" ? "Resubmit for verification" : "Submit for verification"}
                onPress={onSubmit}
                busy={busy === "submit"}
                disabled={busy !== null && busy !== "submit"}
              />
              <Button label="Save without submitting" variant="outline" onPress={onSave} busy={busy === "save"} disabled={busy !== null && busy !== "save"} />
            </View>
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
      {status !== "not_submitted" ? <BottomNav /> : null}
    </KeyboardAvoidingView>
  );
}

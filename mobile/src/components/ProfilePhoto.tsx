import { useState } from "react";
import { ActivityIndicator, Alert, Image, Platform, Pressable, View } from "react-native";
import { Text } from "./Text";
import * as ImagePicker from "expo-image-picker";
import Svg, { Circle, Path } from "react-native-svg";
import { ApiError, api, uploadFile, type Me, type PickedFile } from "../lib/api";
import { celebrate, oops } from "../lib/feedback";
import { useApi } from "../lib/session";

const MAX_BYTES = 5 * 1024 * 1024;
const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
  // iPhones store HEIC; "compatible" hands us a JPEG instead.
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

async function pick(source: "camera" | "library"): Promise<PickedFile | null> {
  if (source === "camera") {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) throw new ApiError("Allow camera access in your phone's Settings to take a photo.", 0);
  }
  const result = source === "camera" ? await ImagePicker.launchCameraAsync(OPTIONS) : await ImagePicker.launchImageLibraryAsync(OPTIONS);
  if (result.canceled) return null;
  const photo = result.assets[0];
  if (photo.fileSize && photo.fileSize > MAX_BYTES) throw new ApiError("That photo is over 5 MB. Choose a smaller one.", 400);
  const png = photo.mimeType === "image/png";
  return { uri: photo.uri, name: png ? "avatar.png" : "avatar.jpg", mimeType: png ? "image/png" : "image/jpeg" };
}

const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** Round profile picture (initials until one is added); tap to take, choose or remove a photo. */
export function ProfilePhoto({ name, size = 64 }: { name: string; size?: number }) {
  const me = useApi<Me>("/me");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = me.data?.avatarUrl ?? null;

  const run = async (work: () => Promise<boolean | void>, done?: string) => {
    setBusy(true);
    setError(null);
    try {
      // `work` returns false when the person cancelled the picker: nothing to celebrate.
      const changed = (await work()) !== false;
      await me.reload();
      if (changed && done) celebrate(done);
    } catch (e) {
      oops();
      setError(e instanceof ApiError ? e.message : "Couldn't update your photo. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const upload = (source: "camera" | "library") =>
    run(async () => {
      const file = await pick(source);
      if (!file) return false;
      const publicId = await uploadFile("avatar", file);
      await api("/me/avatar", { method: "PUT", body: { publicId } });
    }, "Profile picture updated");
  const remove = () => run(() => api("/me/avatar", { method: "DELETE" }), "Profile picture removed");

  const choose = () => {
    // Web has no action sheet; the browser's file chooser is the natural fit there.
    if (Platform.OS === "web") return void upload("library");
    Alert.alert("Profile picture", undefined, [
      { text: "Take photo", onPress: () => void upload("camera") },
      { text: "Choose from library", onPress: () => void upload("library") },
      ...(url ? [{ text: "Remove photo", style: "destructive" as const, onPress: () => void remove() }] : []),
      { text: "Cancel", style: "cancel" as const },
    ]);
  };

  const badge = Math.round(size * 0.36);
  return (
    <View className="items-center">
      <Pressable
        onPress={choose}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={url ? "Change profile picture" : "Add profile picture"}
        style={{ width: size, height: size }}
      >
        <View className="bg-teal-soft items-center justify-center overflow-hidden" style={{ width: size, height: size, borderRadius: size / 2 }}>
          {url ? (
            <Image source={{ uri: url }} style={{ width: size, height: size }} accessibilityIgnoresInvertColors />
          ) : (
            <Text className="text-ink font-bold" style={{ fontSize: size * 0.34 }}>
              {initialsOf(name)}
            </Text>
          )}
          {busy ? (
            <View className="absolute inset-0 bg-ink/50 items-center justify-center">
              <ActivityIndicator color="#ffffff" />
            </View>
          ) : null}
        </View>
        {/* Camera badge shows the photo can be changed. */}
        <View
          className="absolute bg-teal items-center justify-center border-2 border-paper"
          style={{ width: badge, height: badge, borderRadius: badge / 2, right: -2, bottom: -2 }}
        >
          <Svg width={badge * 0.55} height={badge * 0.55} viewBox="0 0 24 24">
            <Path d="M4 8h3l1.5-2h7L17 8h3v11H4Z" stroke="#ffffff" strokeWidth={2} strokeLinejoin="round" fill="none" />
            <Circle cx={12} cy={13} r={3.2} stroke="#ffffff" strokeWidth={2} fill="none" />
          </Svg>
        </View>
      </Pressable>
      {error ? <Text className="text-danger text-xs mt-2 text-center" style={{ maxWidth: 220 }}>{error}</Text> : null}
    </View>
  );
}

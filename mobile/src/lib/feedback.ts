import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { store } from "./api";

/**
 * Success and error feedback: a sound, a vibration and (for success) the tick overlay.
 * Sounds and vibration each have an on/off switch in Profile; both start on.
 */
export type FeedbackSettings = { sounds: boolean; vibration: boolean };

const SETTINGS_KEY = "agridrone_feedback";
let settings: FeedbackSettings = { sounds: true, vibration: true };
const settingsListeners = new Set<(s: FeedbackSettings) => void>();

store
  .getItemAsync(SETTINGS_KEY)
  .then((raw) => {
    if (raw) setSettings({ ...settings, ...(JSON.parse(raw) as Partial<FeedbackSettings>) }, false);
  })
  .catch(() => {});

function setSettings(next: FeedbackSettings, save = true) {
  settings = next;
  settingsListeners.forEach((l) => l(settings));
  if (save) store.setItemAsync(SETTINGS_KEY, JSON.stringify(settings)).catch(() => {});
}

export function useFeedbackSettings() {
  const [value, setValue] = useState(settings);
  useEffect(() => {
    settingsListeners.add(setValue);
    return () => {
      settingsListeners.delete(setValue);
    };
  }, []);
  return [value, (change: Partial<FeedbackSettings>) => setSettings({ ...settings, ...change })] as const;
}

// Players are created on first use. Sounds mix with music the user is playing and stay
// quiet when the phone is on silent.
let players: { success: AudioPlayer; error: AudioPlayer } | null = null;
function play(kind: "success" | "error") {
  if (!settings.sounds) return;
  try {
    if (!players) {
      setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers" }).catch(() => {});
      players = {
        success: createAudioPlayer(require("../../assets/sounds/success.wav")),
        error: createAudioPlayer(require("../../assets/sounds/error.wav")),
      };
    }
    const player = players[kind];
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // A sound that can't play must never break the action it decorates.
  }
}

function buzz(kind: "success" | "error") {
  if (!settings.vibration) return;
  Haptics.notificationAsync(kind === "success" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
}

// The tick overlay (SuccessTick) listens here.
const tickListeners = new Set<(label: string) => void>();
export function subscribeTick(listener: (label: string) => void) {
  tickListeners.add(listener);
  return () => {
    tickListeners.delete(listener);
  };
}

/** A completed action: tick with `label`, soft chime, light buzz. */
export function celebrate(label: string) {
  tickListeners.forEach((l) => l(label));
  play("success");
  buzz("success");
  AccessibilityInfo.announceForAccessibility(label);
}

/** A failed action or an invalid form: low blip and a firmer buzz (the screen shows the message). */
export function oops() {
  play("error");
  buzz("error");
}

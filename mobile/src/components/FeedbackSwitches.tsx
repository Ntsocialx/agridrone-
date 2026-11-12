import { Switch, View } from "react-native";
import { useFeedbackSettings } from "../lib/feedback";
import { Text } from "./Text";

function Row({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View className="flex-row items-center py-4 border-b border-line">
      <View className="flex-1 mr-3">
        <Text className="text-ink text-base">{label}</Text>
        <Text className="text-muted text-xs">{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ false: "#e0e6eb", true: "#1dafa1" }}
        thumbColor="#ffffff"
        ios_backgroundColor="#e0e6eb"
      />
    </View>
  );
}

/** Profile switches for the success/error sounds and vibration (both on by default). */
export function FeedbackSwitches() {
  const [settings, update] = useFeedbackSettings();
  return (
    <View className="bg-page rounded-lg px-4">
      <Row label="Sounds" hint="A soft chime when something works, a low tone when it doesn't" value={settings.sounds} onChange={(sounds) => update({ sounds })} />
      <Row label="Vibration" hint="A light buzz on success, a firmer one on errors" value={settings.vibration} onChange={(vibration) => update({ vibration })} />
    </View>
  );
}

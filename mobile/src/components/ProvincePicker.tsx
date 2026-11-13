import { View } from "react-native";
import { PROVINCES, type Province } from "../lib/api";
import { Text } from "./Text";
import { Chip } from "./ui";

/** The nine provinces as chips (used for reporting by province). */
export function ProvincePicker({
  label,
  value,
  onChange,
  disabled,
  error,
}: {
  label: string;
  value: Province | null;
  onChange: (province: Province) => void;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text className="text-ink text-sm font-medium mb-2">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {PROVINCES.map((p) => (
          <Chip key={p} label={p} active={value === p} onPress={() => !disabled && onChange(p)} />
        ))}
      </View>
      {error ? <Text className="text-danger text-xs mt-2 ml-1">{error}</Text> : null}
    </View>
  );
}

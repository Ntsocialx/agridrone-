import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import { router, usePathname, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../lib/store";

export function Field({ label, error, ...input }: TextInputProps & { label: string; error?: string }) {
  return (
    <View>
      <Text className="text-muted text-xs mb-1 ml-1">{label}</Text>
      <TextInput
        placeholderTextColor="#64706a99"
        className={`bg-cream border p-4 rounded-md text-forest-950 text-base ${error ? "border-danger" : "border-muted/20"} ${input.multiline ? "min-h-[96px]" : ""}`}
        accessibilityLabel={label}
        textAlignVertical={input.multiline ? "top" : undefined}
        {...input}
      />
      {error ? <Text className="text-danger text-xs mt-1 ml-1">{error}</Text> : null}
    </View>
  );
}

type ButtonProps = { label: string; onPress: () => void; variant?: "primary" | "dark" | "outline" | "danger"; disabled?: boolean };

export function Button({ label, onPress, variant = "primary", disabled }: ButtonProps) {
  const styles = {
    primary: ["bg-lime", "text-forest-950"],
    dark: ["bg-forest-900", "text-white"],
    outline: ["bg-paper border border-forest-900", "text-forest-900"],
    danger: ["bg-paper border border-danger", "text-danger"],
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={`py-4 px-5 rounded-md items-center active:opacity-80 ${styles[0]} ${disabled ? "opacity-40" : ""}`}
    >
      <Text className={`font-bold text-base ${styles[1]}`}>{label}</Text>
    </Pressable>
  );
}

export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      className="flex-row items-start"
    >
      <View className={`w-6 h-6 rounded border-2 items-center justify-center mr-3 mt-0.5 ${checked ? "bg-forest-900 border-forest-900" : "border-muted bg-paper"}`}>
        {checked ? <Text className="text-lime font-bold text-xs">✓</Text> : null}
      </View>
      <Text className="flex-1 text-muted text-sm leading-5">{children}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`px-4 py-2 rounded-full border ${active ? "bg-forest-900 border-forest-900" : "bg-paper border-muted/30"}`}
    >
      <Text className={`text-sm font-bold ${active ? "text-lime" : "text-forest-900"}`}>{label}</Text>
    </Pressable>
  );
}

export function BackHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="px-6 pb-4 bg-paper" style={{ paddingTop: insets.top + 12 }}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        accessibilityRole="button"
        accessibilityLabel="Back"
        className="mb-4 self-start py-1"
      >
        <Text className="text-forest-700 font-bold">← Back</Text>
      </Pressable>
      <Text className="text-forest-950 text-3xl font-bold">{title}</Text>
      {subtitle ? <Text className="text-muted text-base mt-1">{subtitle}</Text> : null}
    </View>
  );
}

const TABS: Record<"operator" | "owner", { label: string; href: Href; path: string }[]> = {
  operator: [
    { label: "Jobs", href: "/operator-home", path: "/operator-home" },
    { label: "Profile", href: "/operator-profile", path: "/operator-profile" },
  ],
  owner: [
    { label: "Post a job", href: "/post-job", path: "/post-job" },
    { label: "Bids", href: "/review-bids", path: "/review-bids" },
  ],
};

export function BottomNav() {
  const { profile } = useStore();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  return (
    <View className="bg-paper border-t border-muted/20 flex-row" style={{ paddingBottom: insets.bottom }}>
      {TABS[profile.role].map((tab) => {
        const active = pathname === tab.path;
        return (
          <Pressable
            key={tab.label}
            onPress={() => !active && router.replace(tab.href)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className="flex-1 items-center py-4"
          >
            <Text className={`text-sm ${active ? "text-forest-900 font-bold" : "text-muted"}`}>{tab.label}</Text>
          </Pressable>
        );
      })}
      <Pressable onPress={() => router.replace("/")} accessibilityRole="tab" className="flex-1 items-center py-4">
        <Text className="text-sm text-muted">Exit demo</Text>
      </Pressable>
    </View>
  );
}

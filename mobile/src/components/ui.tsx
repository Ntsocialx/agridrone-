import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import { router, usePathname, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { JobStatus } from "../lib/api";
import { useSession } from "../lib/session";
import { DroneSpinner } from "./DroneLoader";
import { NotificationBell } from "./NotificationBell";

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

/** Password input with a Show/Hide toggle so people can check what they typed. */
export function PasswordField({ label, error, dark, ...input }: Omit<TextInputProps, "secureTextEntry"> & { label: string; error?: string; dark?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <View>
      <Text className={`text-xs mb-1 ml-1 ${dark ? "text-paper/80" : "text-muted"}`}>{label}</Text>
      <View className={`flex-row items-center bg-cream border rounded-md ${error ? "border-danger" : "border-muted/20"}`}>
        <TextInput
          placeholderTextColor="#64706a99"
          className="flex-1 p-4 text-forest-950 text-base"
          accessibilityLabel={label}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          {...input}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="px-4 py-4"
          hitSlop={8}
        >
          <Text className="text-forest-700 font-bold text-sm">{visible ? "Hide" : "Show"}</Text>
        </Pressable>
      </View>
      {error ? <Text className="text-danger text-xs mt-1 ml-1">{error}</Text> : null}
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "dark" | "outline" | "danger";
  disabled?: boolean;
  busy?: boolean;
};

export function Button({ label, onPress, variant = "primary", disabled, busy }: ButtonProps) {
  const styles = {
    primary: ["bg-lime", "text-forest-950", "#06261c"],
    dark: ["bg-forest-900", "text-white", "#ffffff"],
    outline: ["bg-paper border border-forest-900", "text-forest-900", "#0a3326"],
    danger: ["bg-paper border border-danger", "text-danger", "#c84b42"],
  }[variant];
  const inactive = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy }}
      className={`py-4 px-5 rounded-md items-center active:opacity-80 ${styles[0]} ${disabled ? "opacity-40" : ""}`}
    >
      {busy ? <ActivityIndicator color={styles[2]} /> : <Text className={`font-bold text-base ${styles[1]}`}>{label}</Text>}
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

export function BackHeader({ title, subtitle, fallback = "/", bell }: { title: string; subtitle?: string; fallback?: Href; bell?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="px-6 pb-4 bg-paper" style={{ paddingTop: insets.top + 12 }}>
      <View className="flex-row items-center justify-between mb-4">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="py-1"
        >
          <Text className="text-forest-700 font-bold">← Back</Text>
        </Pressable>
        {bell ? <NotificationBell onDark={false} /> : null}
      </View>
      <Text className="text-forest-950 text-3xl font-bold">{title}</Text>
      {subtitle ? <Text className="text-muted text-base mt-1">{subtitle}</Text> : null}
    </View>
  );
}

/** Dark evergreen header used on each role's home screens. */
export function HeroHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  return (
    <View className="bg-forest-900 pb-6 px-6 rounded-b-lg" style={{ paddingTop: insets.top + 16 }}>
      <View className="flex-row items-start">
        <View className="flex-1 mr-3">
          <Text className="text-lime text-sm font-bold mb-1">{eyebrow}</Text>
          <Text className="text-white text-3xl font-bold" numberOfLines={1}>{title}</Text>
        </View>
        {/* Admins send notifications from their console rather than receive them. */}
        {user && user.role !== "admin" ? <NotificationBell /> : null}
      </View>
      {children}
    </View>
  );
}

const STATUS_LABELS: Record<JobStatus, [string, string]> = {
  open: ["Open for bids", "bg-lime text-forest-950"],
  on_hold: ["Compliance hold", "bg-danger text-white"],
  assigned: ["In progress", "bg-forest-900 text-lime"],
  pending_confirmation: ["Awaiting confirmation", "bg-lime-soft text-forest-950"],
  completed: ["Completed", "bg-cream text-forest-900"],
  cancelled: ["Cancelled", "bg-cream text-muted"],
  removed: ["Removed", "bg-danger text-white"],
};

export function StatusPill({ status }: { status: JobStatus }) {
  const [label, style] = STATUS_LABELS[status];
  return (
    <Text className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase overflow-hidden self-start ${style}`}>{label}</Text>
  );
}

/** Read-only stars, or a 1–5 picker when onChange is given. */
export function Stars({ value, size = 16, onChange }: { value: number; size?: number; onChange?: (v: number) => void }) {
  return (
    <View className="flex-row" accessibilityLabel={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const star = (
          <Text style={{ fontSize: size, lineHeight: size * 1.2 }} className={n <= Math.round(value) ? "text-forest-700" : "text-muted/30"}>
            ★
          </Text>
        );
        return onChange ? (
          <Pressable key={n} onPress={() => onChange(n)} accessibilityRole="button" accessibilityLabel={`${n} star${n === 1 ? "" : "s"}`} className="px-1">
            {star}
          </Pressable>
        ) : (
          <View key={n}>{star}</View>
        );
      })}
    </View>
  );
}

export function Loading() {
  return <DroneSpinner />;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View className="bg-paper p-6 rounded-lg items-center border border-danger/30">
      <Text className="text-forest-950 font-bold mb-1">Couldn&apos;t load this</Text>
      <Text className="text-muted text-sm text-center mb-4">{message}</Text>
      {onRetry ? <Button label="Try again" variant="outline" onPress={onRetry} /> : null}
    </View>
  );
}

export function EmptyState({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <View className="bg-paper p-6 rounded-lg items-center">
      <Text className="text-forest-950 font-bold mb-1">{title}</Text>
      <Text className="text-muted text-sm text-center">{body}</Text>
      {children ? <View className="mt-4 self-stretch">{children}</View> : null}
    </View>
  );
}

const TABS: Record<"operator" | "farm_owner", { label: string; href: Href; path: string }[]> = {
  operator: [
    { label: "Find jobs", href: "/operator-home", path: "/operator-home" },
    { label: "My jobs", href: "/my-jobs", path: "/my-jobs" },
    { label: "Profile", href: "/operator-profile", path: "/operator-profile" },
  ],
  farm_owner: [
    { label: "My jobs", href: "/my-jobs", path: "/my-jobs" },
    { label: "Post a job", href: "/post-job", path: "/post-job" },
    { label: "Profile", href: "/owner-profile", path: "/owner-profile" },
  ],
};

export function BottomNav() {
  const { user } = useSession();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  if (!user || user.role === "admin") return null;

  return (
    <View className="bg-paper border-t border-muted/20 flex-row" style={{ paddingBottom: insets.bottom }}>
      {TABS[user.role].map((tab) => {
        const active = pathname === tab.path;
        return (
          <Pressable
            key={tab.label}
            onPress={() => !active && router.replace(tab.href)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className="flex-1 items-center py-4"
          >
            <View className={`h-1 w-8 rounded-full mb-2 ${active ? "bg-lime" : "bg-transparent"}`} />
            <Text className={`text-sm ${active ? "text-forest-900 font-bold" : "text-muted"}`}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const TERMS_URL = "https://www.agriseta.co.za/";

/** "Terms and Conditions | Powered by 4IR" line for the welcome and sign-in screens. */
export function LegalFooter({ onDark }: { onDark?: boolean }) {
  const tone = onDark ? "text-paper/60" : "text-muted";
  return (
    <View className="flex-row justify-center items-center">
      <Pressable onPress={() => Linking.openURL(TERMS_URL)} accessibilityRole="link" hitSlop={8}>
        <Text className={`${tone} text-xs underline`}>Terms and Conditions</Text>
      </Pressable>
      <Text className={`${tone} text-xs mx-2`}>|</Text>
      <Text className={`${tone} text-xs`}>Powered by 4IR</Text>
    </View>
  );
}

/** Sits at the bottom of each profile screen. */
export function SignOutButton() {
  const { signOut } = useSession();
  return <Button label="Sign out" variant="danger" onPress={signOut} />;
}

import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, TextInput, View, type TextInputProps } from "react-native";
import { router, usePathname, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { JobStatus } from "../lib/api";
import { useSession } from "../lib/session";
import { DroneSpinner } from "./DroneLoader";
import { NotificationBell } from "./NotificationBell";
import { Text } from "./Text";

const PLACEHOLDER = "#66737f99";

/** White input with a thin grey border and its label above, like the HelloChoice form. */
export function Field({ label, error, ...input }: TextInputProps & { label: string; error?: string }) {
  return (
    <View>
      <Text className="text-ink text-sm font-medium mb-2">{label}</Text>
      <TextInput
        placeholderTextColor={PLACEHOLDER}
        className={`bg-paper border px-4 py-3.5 rounded-md text-ink text-base font-normal ${error ? "border-danger" : "border-line"} ${input.multiline ? "min-h-[110px]" : ""}`}
        accessibilityLabel={label}
        textAlignVertical={input.multiline ? "top" : undefined}
        {...input}
      />
      {error ? <Text className="text-danger text-xs mt-1.5">{error}</Text> : null}
    </View>
  );
}

/** Password input with a Show/Hide toggle so people can check what they typed. */
export function PasswordField({ label, error, dark, ...input }: Omit<TextInputProps, "secureTextEntry"> & { label: string; error?: string; dark?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <View>
      <Text className={`text-sm font-medium mb-2 ${dark ? "text-paper/80" : "text-ink"}`}>{label}</Text>
      <View className={`flex-row items-center bg-paper border rounded-md ${error ? "border-danger" : "border-line"}`}>
        <TextInput
          placeholderTextColor={PLACEHOLDER}
          className="flex-1 px-4 py-3.5 text-ink text-base font-normal"
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
          className="px-4 py-3.5"
          hitSlop={8}
        >
          <Text className="text-teal-ink font-semibold text-sm">{visible ? "Hide" : "Show"}</Text>
        </Pressable>
      </View>
      {error ? <Text className="text-danger text-xs mt-1.5">{error}</Text> : null}
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
  // Primary is solid teal; outline is the site's white "Cancel" button.
  const styles = {
    primary: ["bg-teal", "text-white", "#ffffff"],
    dark: ["bg-teal-ink", "text-white", "#ffffff"],
    outline: ["bg-paper border border-line", "text-ink", "#22262a"],
    danger: ["bg-paper border border-danger", "text-danger", "#d64545"],
  }[variant];
  const inactive = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy }}
      className={`py-3.5 px-5 rounded-md items-center active:opacity-80 ${styles[0]} ${disabled ? "opacity-40" : ""}`}
    >
      {busy ? <ActivityIndicator color={styles[2]} /> : <Text className={`font-semibold text-base ${styles[1]}`}>{label}</Text>}
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
      <View className={`w-6 h-6 rounded-sm border-2 items-center justify-center mr-3 mt-0.5 ${checked ? "bg-teal border-teal" : "border-line bg-paper"}`}>
        {checked ? <Text className="text-white font-bold text-xs">✓</Text> : null}
      </View>
      <Text className="flex-1 text-muted text-sm leading-5">{children}</Text>
    </Pressable>
  );
}

/** Filled teal pill when selected, teal outline otherwise (the site's tab pills). */
export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`px-4 py-2 rounded-full border ${active ? "bg-teal border-teal" : "bg-paper border-teal"}`}
    >
      <Text className={`text-sm font-medium ${active ? "text-white" : "text-teal-ink"}`}>{label}</Text>
    </Pressable>
  );
}

export function BackHeader({ title, subtitle, fallback = "/", bell }: { title: string; subtitle?: string; fallback?: Href; bell?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="px-6 pb-5 mb-5 bg-paper border-b border-line" style={{ paddingTop: insets.top + 12 }}>
      <View className="flex-row items-center justify-between mb-4">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="py-1"
        >
          <Text className="text-teal-ink font-semibold">← Back</Text>
        </Pressable>
        {bell ? <NotificationBell /> : null}
      </View>
      <Text className="text-ink text-3xl font-bold">{title}</Text>
      {subtitle ? <Text className="text-muted text-base mt-1">{subtitle}</Text> : null}
    </View>
  );
}

/** White header with a teal eyebrow and a thin divider, used on each role's home screens. */
export function HeroHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  return (
    <View className="bg-paper pb-5 px-6 border-b border-line" style={{ paddingTop: insets.top + 16 }}>
      <View className="flex-row items-start">
        <View className="flex-1 mr-3">
          <Text className="text-teal-ink text-sm font-semibold mb-1">{eyebrow}</Text>
          <Text className="text-ink text-3xl font-bold" numberOfLines={1}>{title}</Text>
        </View>
        {/* Admins send notifications from their console rather than receive them. */}
        {user && user.role !== "admin" ? <NotificationBell /> : null}
      </View>
      {children}
    </View>
  );
}

const STATUS_LABELS: Record<JobStatus, [string, string]> = {
  open: ["Open for bids", "bg-teal text-white"],
  on_hold: ["Compliance hold", "bg-sun text-ink"],
  assigned: ["In progress", "bg-teal-ink text-white"],
  pending_confirmation: ["Awaiting confirmation", "bg-teal-soft text-teal-ink"],
  completed: ["Completed", "bg-field text-ink"],
  cancelled: ["Cancelled", "bg-field text-muted"],
  removed: ["Removed", "bg-danger text-white"],
};

export function StatusPill({ status }: { status: JobStatus }) {
  const [label, style] = STATUS_LABELS[status];
  return (
    <Text className={`text-xs font-bold px-2 py-0.5 rounded-sm overflow-hidden self-start ${style}`}>{label}</Text>
  );
}

/** Read-only stars, or a 1–5 picker when onChange is given. */
export function Stars({ value, size = 16, onChange }: { value: number; size?: number; onChange?: (v: number) => void }) {
  return (
    <View className="flex-row" accessibilityLabel={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const star = (
          <Text style={{ fontSize: size, lineHeight: size * 1.2 }} className={n <= Math.round(value) ? "text-sun" : "text-line"}>
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
      <Text className="text-ink font-bold mb-1">Couldn&apos;t load this</Text>
      <Text className="text-muted text-sm text-center mb-4">{message}</Text>
      {onRetry ? <Button label="Try again" variant="outline" onPress={onRetry} /> : null}
    </View>
  );
}

export function EmptyState({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <View className="bg-paper p-6 rounded-lg items-center border border-line">
      <Text className="text-ink font-bold mb-1">{title}</Text>
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
    <View className="bg-paper border-t border-line flex-row" style={{ paddingBottom: insets.bottom }}>
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
            <View className={`h-1 w-8 rounded-full mb-2 ${active ? "bg-teal" : "bg-transparent"}`} />
            <Text className={`text-sm ${active ? "text-teal-ink font-semibold" : "text-muted font-medium"}`}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const TERMS_URL = "https://www.agriseta.co.za/";

/** "Terms and Conditions | Powered by 4IR" line for the welcome and sign-in screens. */
export function LegalFooter({ onDark }: { onDark?: boolean }) {
  const tone = onDark ? "text-paper/70" : "text-muted";
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

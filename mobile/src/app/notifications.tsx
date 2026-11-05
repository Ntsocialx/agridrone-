import { useEffect } from "react";
import { Text, View, ScrollView, Pressable, RefreshControl } from "react-native";
import { router, type Href } from "expo-router";
import { BackHeader, EmptyState, ErrorState, Loading } from "../components/ui";
import { api, formatDate, type AppNotification, type NotificationKind, type Role } from "../lib/api";
import { useApi, useUser } from "../lib/session";

const LABELS: Record<NotificationKind, [string, string]> = {
  announcement: ["Announcement", "bg-forest-900 text-lime"],
  update: ["App update", "bg-lime text-forest-950"],
  job: ["Job", "bg-cream text-forest-900"],
  verification: ["Verification", "bg-lime-soft text-forest-950"],
  review: ["Review", "bg-lime-soft text-forest-950"],
  report: ["Report", "bg-danger/15 text-danger"],
};

/** Where tapping a notification takes you, if anywhere. */
function destination(n: AppNotification, role: Role, userId: string): Href | null {
  if (n.jobId && n.kind !== "report") return { pathname: "/job-details", params: { id: n.jobId } };
  if (n.kind === "verification" && role === "operator") return "/operator-profile";
  if (n.kind === "review" && role === "operator") return { pathname: "/pilot", params: { id: userId } };
  return null;
}

export default function NotificationsScreen() {
  const user = useUser();
  const list = useApi<AppNotification[]>("/notifications");
  // The loaded list keeps its "new" markers; the server marks everything read for next time.
  const loaded = !!list.data;
  useEffect(() => {
    if (loaded) void api("/notifications/read-all", { method: "POST" }).catch(() => {});
  }, [loaded]);

  return (
    <View className="flex-1 bg-paper">
      <BackHeader title="Notifications" subtitle="Job updates, results and news from AgriDrone" />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-10"
        refreshControl={<RefreshControl refreshing={false} onRefresh={list.reload} />}
      >
        {list.error ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : !list.data ? (
          <Loading />
        ) : list.data.length === 0 ? (
          <EmptyState title="You're all caught up" body="Bids, job updates and news from AgriDrone will show up here." />
        ) : (
          <View className="gap-y-3">
            {list.data.map((n) => {
              const [label, style] = LABELS[n.kind];
              const isNew = !n.read;
              const to = destination(n, user.role, user.id);
              return (
                <Pressable
                  key={n.id}
                  disabled={!to}
                  onPress={() => to && router.push(to)}
                  accessibilityRole={to ? "button" : undefined}
                  className={`p-4 rounded-lg border ${isNew ? "bg-lime-soft/40 border-lime" : "bg-cream border-muted/15"}`}
                >
                  <View className="flex-row items-center mb-2">
                    <Text className={`text-[10px] font-bold px-2 py-0.5 rounded overflow-hidden ${style}`}>{label}</Text>
                    {isNew ? <View className="w-2 h-2 rounded-full bg-danger ml-2" accessibilityLabel="New" /> : null}
                    <Text className="text-muted text-xs ml-auto">{formatDate(n.createdAt)}</Text>
                  </View>
                  <Text className="text-forest-950 font-bold text-base mb-1">{n.title}</Text>
                  <Text className="text-muted text-sm leading-5">{n.body}</Text>
                  {to ? <Text className="text-forest-700 font-bold text-sm mt-2">View</Text> : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

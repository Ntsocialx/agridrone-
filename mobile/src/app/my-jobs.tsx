import { useState } from "react";
import { View, ScrollView, Pressable, RefreshControl } from "react-native";
import { Text } from "../components/Text";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { JobCard } from "../components/JobCard";
import { BottomNav, Button, EmptyState, ErrorState, HeroHeader, Loading } from "../components/ui";
import type { Job, Role } from "../lib/api";
import { useApi, useUser } from "../lib/session";

const DONE: Job["status"][] = ["completed", "cancelled"];

/** The one thing this user should do next on this job, if anything. */
function nextStep(job: Job, role: Role): string | undefined {
  if (role === "farm_owner") {
    if (job.status === "open") return job.bidCount ? `Review ${job.bidCount} bid${job.bidCount === 1 ? "" : "s"}` : undefined;
    if (job.status === "pending_confirmation") return "Confirm the work is complete";
    if (job.status === "completed" && !job.reviewed) return "Rate your pilot";
  } else {
    if (job.status === "assigned") return "Mark complete when done";
  }
  return undefined;
}

function statusLine(job: Job, role: Role): string {
  if (role === "farm_owner") {
    if (job.status === "open") return job.bidCount ? "Bids are coming in" : "Waiting for bids";
    if (job.status === "on_hold") return "On compliance hold";
    if (job.status === "assigned") return `${job.assignedOperatorName} is on it`;
    if (job.status === "pending_confirmation") return `${job.assignedOperatorName} finished`;
    if (job.status === "removed") return "Removed by AgricDrone Hub";
  } else if (job.status === "pending_confirmation") return "Waiting for the owner";
  return "";
}

export default function MyJobsScreen() {
  const user = useUser();
  const isOwner = user.role === "farm_owner";
  const jobs = useApi<Job[]>("/jobs/mine");
  const [tab, setTab] = useState<"active" | "done">("active");

  const all = jobs.data ?? [];
  const shown = all.filter((j) => (tab === "done") === DONE.includes(j.status));
  const actionCount = all.filter((j) => nextStep(j, user.role)).length;
  const activeCount = all.filter((j) => !DONE.includes(j.status)).length;

  return (
    <View className="flex-1 bg-page">
      <StatusBar style="dark" />
      <HeroHeader eyebrow={isOwner ? "Your farm jobs" : "Your flights"} title="My jobs">
        <View className="flex-row gap-3 mt-5">
          {[
            [String(activeCount), "Active"],
            [String(actionCount), "Need you"],
            [String(all.length - activeCount), "Done"],
          ].map(([value, label]) => (
            <View key={label} className="flex-1 bg-page border border-line rounded-md p-3">
              <Text className={`text-2xl font-bold ${label === "Need you" && actionCount ? "text-teal-ink" : "text-ink"}`}>{jobs.data ? value : "–"}</Text>
              <Text className="text-muted text-xs font-medium">{label}</Text>
            </View>
          ))}
        </View>
      </HeroHeader>

      <View className="flex-row mx-6 mt-6 mb-4 bg-paper rounded-full p-1 border border-line">
        {(["active", "done"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
            className={`flex-1 py-2 rounded-full items-center ${tab === t ? "bg-teal" : ""}`}
          >
            <Text className={`font-semibold text-sm ${tab === t ? "text-white" : "text-muted"}`}>{t === "active" ? "Active" : "Completed"}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-6 pb-8" refreshControl={<RefreshControl refreshing={false} onRefresh={jobs.reload} />}>
        {jobs.error ? (
          <ErrorState message={jobs.error} onRetry={jobs.reload} />
        ) : !jobs.data ? (
          <Loading />
        ) : shown.length === 0 ? (
          tab === "active" ? (
            <EmptyState
              title={isOwner ? "No active jobs" : "No jobs yet"}
              body={isOwner ? "Post a job and verified drone operators will send you bids." : "When a farm owner selects your bid, the job shows up here."}
            >
              <Button label={isOwner ? "Post a job" : "Find jobs"} onPress={() => router.replace(isOwner ? "/post-job" : "/operator-home")} />
            </EmptyState>
          ) : (
            <EmptyState title="Nothing completed yet" body={isOwner ? "Finished jobs and your reviews will appear here." : "Completed jobs build your public profile."} />
          )
        ) : (
          <View className="gap-y-5">
            {shown.map((job) => {
              const line = statusLine(job, user.role);
              return (
                <View key={job.id}>
                  {line ? <Text className="text-muted text-xs font-medium mb-2 ml-1">{line}</Text> : null}
                  <JobCard
                    job={job}
                    hint={nextStep(job, user.role)}
                    onPress={() =>
                      isOwner && job.status === "open" && job.bidCount
                        ? router.push({ pathname: "/review-bids", params: { jobId: job.id } })
                        : isOwner && job.status === "completed" && !job.reviewed
                          ? router.push({ pathname: "/rate", params: { jobId: job.id } })
                          : router.push({ pathname: "/job-details", params: { id: job.id } })
                    }
                  />
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <BottomNav />
    </View>
  );
}

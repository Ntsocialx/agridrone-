import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { formatZar, serviceImage, type Job } from '../lib/api';
import { StatusPill } from './ui';

interface JobCardProps {
  job: Job;
  onPress: () => void;
  /** Optional line under the title, e.g. the next step for this job. */
  hint?: string;
}

export const JobCard = ({ job, onPress, hint }: JobCardProps) => {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${job.title}, ${formatZar(job.budgetZar)}`}
      className="bg-paper rounded-lg overflow-hidden border border-muted/10 active:opacity-80"
    >
      <View className="h-36">
        <Image
          source={{ uri: serviceImage(job.service) }}
          className="w-full h-full bg-forest-800"
          resizeMode="cover"
        />
        <View className="absolute top-3 left-3 flex-row gap-2">
          <Text className="bg-lime-soft text-forest-950 text-[10px] font-bold px-2 py-0.5 rounded uppercase overflow-hidden">
            {job.service}
          </Text>
          <StatusPill status={job.status} />
        </View>
        <View className="absolute bottom-3 right-3">
          <Text className="bg-forest-900/80 text-white text-xs font-bold px-2 py-1 rounded-md overflow-hidden">
            {formatZar(job.budgetZar)}
          </Text>
        </View>
      </View>
      <View className="p-4">
        <Text className="text-forest-950 font-bold text-lg mb-1">{job.title}</Text>
        <Text className="text-muted text-sm">{job.location} • {job.areaHa} ha • {job.preferredDate}</Text>
        {hint ? <Text className="text-forest-700 text-sm font-bold mt-2">{hint} →</Text> : null}
      </View>
    </Pressable>
  );
};

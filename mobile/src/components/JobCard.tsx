import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { formatZar, isRestricted, type Job } from '../lib/store';

interface JobCardProps {
  job: Job;
  onPress: () => void;
}

export const JobCard = ({ job, onPress }: JobCardProps) => {
  const restricted = isRestricted(job.service);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${job.title}, ${formatZar(job.budget)}`}
      className="bg-paper rounded-lg overflow-hidden border border-muted/10 active:opacity-80"
    >
      <View className="h-40">
        <Image
          source={{ uri: job.image }}
          className="w-full h-full bg-forest-800"
          resizeMode="cover"
        />
        <View className="absolute top-3 left-3 flex-row gap-2">
          <Text className="bg-lime-soft text-forest-950 text-[10px] font-bold px-2 py-0.5 rounded uppercase overflow-hidden">
            {job.service}
          </Text>
          {restricted ? (
            <Text className="bg-danger text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase overflow-hidden">
              Compliance hold
            </Text>
          ) : null}
        </View>
        <View className="absolute bottom-3 right-3">
          <Text className="bg-forest-900/80 text-white text-xs font-bold px-2 py-1 rounded-md overflow-hidden">
            {formatZar(job.budget)}
          </Text>
        </View>
      </View>
      <View className="p-4">
        <Text className="text-forest-950 font-bold text-lg mb-1">{job.title}</Text>
        <Text className="text-muted text-sm">{job.location} • {job.areaHa} ha • {job.date}</Text>
      </View>
    </Pressable>
  );
};

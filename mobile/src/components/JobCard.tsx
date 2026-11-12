import React, { useEffect, useState } from 'react';
import { Animated, Easing, View, Text, Image, Pressable } from 'react-native';
import { formatZar, serviceImage, type Job } from '../lib/api';
import { useReduceMotion } from './DroneLoader';
import { StatusPill } from './ui';

interface JobCardProps {
  job: Job;
  onPress: () => void;
  /** Optional line under the title, e.g. the next step for this job. */
  hint?: string;
}

export const JobCard = ({ job, onPress, hint }: JobCardProps) => {
  // Fades and slides up a little when it first appears.
  const still = useReduceMotion();
  const appear = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: still ? 0 : 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [appear, still]);

  return (
    <Animated.View style={{ opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${job.title}, ${formatZar(job.budgetZar)}`}
      className="bg-paper rounded-lg overflow-hidden border border-line active:opacity-80"
    >
      <View className="h-36">
        <Image
          source={{ uri: serviceImage(job.service) }}
          className="w-full h-full bg-field"
          resizeMode="cover"
        />
        <View className="absolute top-3 left-3 flex-row gap-2">
          <Text className="bg-teal-soft text-ink text-xs font-bold px-2 py-0.5 rounded overflow-hidden">
            {job.service}
          </Text>
          <StatusPill status={job.status} />
        </View>
        <View className="absolute bottom-3 right-3">
          <Text className="bg-ink/70 text-white text-xs font-bold px-2 py-1 rounded-md overflow-hidden">
            {formatZar(job.budgetZar)}
          </Text>
        </View>
      </View>
      <View className="p-4">
        <Text className="text-ink font-bold text-lg mb-1">{job.title}</Text>
        <Text className="text-muted text-sm">{job.location} • {job.areaHa} ha • {job.preferredDate}</Text>
        {hint ? <Text className="text-teal-ink text-sm font-bold mt-2">{hint} →</Text> : null}
      </View>
    </Pressable>
    </Animated.View>
  );
};

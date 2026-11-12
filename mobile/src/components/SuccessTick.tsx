import { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import Svg, { Path } from "react-native-svg";
import { subscribeTick } from "../lib/feedback";
import { useReduceMotion } from "./DroneLoader";

const SHOW_MS = 1100;

/** Mount once at the root: a teal tick that pops in over the screen after a successful action. */
export function SuccessTick() {
  const still = useReduceMotion();
  const [label, setLabel] = useState<string | null>(null);
  const progress = useState(() => new Animated.Value(0))[0];
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () =>
      subscribeTick((text) => {
        setLabel(text);
        if (timer.current) clearTimeout(timer.current);
        progress.setValue(0);
        Animated.timing(progress, {
          toValue: 1,
          duration: still ? 150 : 380,
          easing: Easing.out(Easing.back(1.6)),
          useNativeDriver: true,
        }).start();
        timer.current = setTimeout(() => {
          Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setLabel(null));
        }, SHOW_MS);
      }),
    [progress, still],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (!label) return null;
  const scale = still ? 1 : progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  // Plain styles: NativeWind className isn't applied to Animated views.
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", opacity: progress }}
    >
      <Animated.View
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#e0e6eb",
          paddingVertical: 24,
          paddingHorizontal: 28,
          alignItems: "center",
          minWidth: 200,
          maxWidth: 280,
          transform: [{ scale }],
        }}
      >
        <Svg width={64} height={64} viewBox="0 0 64 64">
          <Path d="M32 2a30 30 0 1 1 0 60a30 30 0 1 1 0-60z" fill="#1dafa1" />
          <Path d="M19 33l9 9l17-19" stroke="#ffffff" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
        <Animated.Text style={{ marginTop: 14, color: "#22262a", fontFamily: "Inter_700Bold", fontSize: 16, textAlign: "center" }}>
          {label}
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

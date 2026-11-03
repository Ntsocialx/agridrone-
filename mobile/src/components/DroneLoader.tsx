import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Text, View } from "react-native";
import { subscribeSlow } from "../lib/api";

const MESSAGES = [
  "Warming up the rotors…",
  "Checking wind over your fields…",
  "Calibrating the multispectral camera…",
  "Plotting the flight path…",
  "Scanning crop rows…",
  "Almost airborne…",
];

const ROW_GAP = 22;

/** Starts `anim` as an endless loop unless the user prefers reduced motion. */
function useLoop(make: () => Animated.CompositeAnimation, still: boolean) {
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(make());
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still]);
}

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
  }, []);
  return reduce;
}

/** The drone itself: hovering body with spinning rotors. */
function Drone({ scale = 1, still }: { scale?: number; still: boolean }) {
  const hover = useState(() => new Animated.Value(0))[0];
  const spin = useState(() => new Animated.Value(0))[0];

  useLoop(
    () =>
      Animated.sequence([
        Animated.timing(hover, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(hover, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    still,
  );
  useLoop(() => Animated.timing(spin, { toValue: 1, duration: 140, easing: Easing.linear, useNativeDriver: true }), still);

  // A rotor squashing to a sliver and back reads as a fast spin.
  const rotorScale = spin.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.15, 1] });
  const translateY = hover.interpolate({ inputRange: [0, 1], outputRange: [0, -10 * scale] });

  const rotor = (left: number) => (
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        left: left * scale,
        width: 34 * scale,
        height: 6 * scale,
        borderRadius: 3 * scale,
        backgroundColor: "#b8f13e",
        opacity: 0.9,
        transform: [{ scaleX: rotorScale }],
      }}
    />
  );

  return (
    <Animated.View style={{ width: 120 * scale, height: 44 * scale, transform: [{ translateY }] }}>
      {rotor(0)}
      {rotor(86)}
      {/* arms */}
      <View style={{ position: "absolute", top: 3 * scale, left: 16 * scale, width: 88 * scale, height: 4 * scale, borderRadius: 2 * scale, backgroundColor: "#1d5c45" }} />
      <View style={{ position: "absolute", top: 3 * scale, left: 15 * scale, width: 4 * scale, height: 14 * scale, backgroundColor: "#1d5c45" }} />
      <View style={{ position: "absolute", top: 3 * scale, left: 101 * scale, width: 4 * scale, height: 14 * scale, backgroundColor: "#1d5c45" }} />
      {/* body + camera */}
      <View
        style={{
          position: "absolute",
          top: 10 * scale,
          left: 32 * scale,
          width: 56 * scale,
          height: 22 * scale,
          borderRadius: 10 * scale,
          backgroundColor: "#0a3326",
          borderWidth: 2 * scale,
          borderColor: "#b8f13e",
        }}
      />
      <View style={{ position: "absolute", top: 30 * scale, left: 55 * scale, width: 10 * scale, height: 10 * scale, borderRadius: 5 * scale, backgroundColor: "#b8f13e" }} />
    </Animated.View>
  );
}

/** Small inline version for loading sections inside a screen. */
export function DroneSpinner({ label = "Loading…" }: { label?: string }) {
  const still = useReduceMotion();
  return (
    <View className="py-12 items-center" accessibilityRole="progressbar" accessibilityLabel={label}>
      <Drone scale={0.6} still={still} />
      <Text className="text-muted text-sm mt-4">{label}</Text>
    </View>
  );
}

/** Full-screen "drone surveying a field" scene shown while the server is slow. */
function DroneScene() {
  const still = useReduceMotion();
  const rows = useState(() => new Animated.Value(0))[0];
  const sweep = useState(() => new Animated.Value(0))[0];
  const beam = useState(() => new Animated.Value(0))[0];
  const bar = useState(() => new Animated.Value(0))[0];
  const fade = useState(() => new Animated.Value(1))[0];
  const [message, setMessage] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useLoop(() => Animated.timing(rows, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }), still);
  useLoop(
    () =>
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    still,
  );
  useLoop(
    () =>
      Animated.sequence([
        Animated.timing(beam, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(beam, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    still,
  );
  useLoop(() => Animated.timing(bar, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }), still);

  // Rotate the status line, cross-fading between messages.
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed((s) => s + 2.4);
      Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setMessage((m) => (m + 1) % MESSAGES.length);
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      });
    }, 2400);
    return () => clearInterval(id);
  }, [fade]);

  return (
    <View className="items-center px-8" accessibilityRole="progressbar" accessibilityLabel="Loading" accessibilityLiveRegion="polite">
      <View style={{ width: 260, height: 220 }} className="items-center">
        <Drone scale={1.2} still={still} />

        {/* camera beam */}
        <Animated.View
          style={{
            marginTop: 2,
            width: 0,
            height: 0,
            borderLeftWidth: 70,
            borderRightWidth: 70,
            borderTopWidth: 92,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderTopColor: "rgba(184,241,62,0.16)",
            opacity: beam.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
          }}
        />

        {/* field: crop rows scrolling underneath, with a sweeping scan line */}
        <View style={{ width: 260, height: 70, overflow: "hidden", borderRadius: 14 }} className="bg-forest-800">
          <Animated.View
            style={{
              flexDirection: "row",
              height: "100%",
              transform: [{ translateX: rows.interpolate({ inputRange: [0, 1], outputRange: [0, -ROW_GAP] }) }],
            }}
          >
            {Array.from({ length: 16 }, (_, i) => (
              <View key={i} style={{ width: ROW_GAP, height: "100%", alignItems: "center" }}>
                <View style={{ width: 8, height: "100%", backgroundColor: i % 3 === 0 ? "#b8f13e33" : "#1d5c45" }} />
              </View>
            ))}
          </Animated.View>
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: 3,
              backgroundColor: "#b8f13e",
              transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [8, 249] }) }],
            }}
          />
        </View>
      </View>

      <Animated.Text style={{ opacity: fade }} className="text-white font-bold text-lg mt-6 text-center">
        {MESSAGES[message]}
      </Animated.Text>

      <View style={{ width: 200, height: 4, borderRadius: 2, overflow: "hidden" }} className="bg-forest-800 mt-5">
        <Animated.View
          style={{
            width: 70,
            height: 4,
            borderRadius: 2,
            backgroundColor: "#b8f13e",
            transform: [{ translateX: bar.interpolate({ inputRange: [0, 1], outputRange: [-70, 200] }) }],
          }}
        />
      </View>

      {elapsed >= 15 ? (
        <Text className="text-paper/60 text-sm mt-6 text-center leading-5">
          Our server takes a short nap when nobody&apos;s flying. The first load can take up to a minute. Thanks for waiting!
        </Text>
      ) : null}
    </View>
  );
}

/** Mount once at the root: covers the app whenever any request is slow. */
export function SlowOverlay() {
  const [slow, setSlow] = useState(false);
  const opacity = useState(() => new Animated.Value(0))[0];

  useEffect(() => subscribeSlow(setSlow), []);
  useEffect(() => {
    Animated.timing(opacity, { toValue: slow ? 1 : 0, duration: 250, useNativeDriver: true }).start();
  }, [slow, opacity]);

  if (!slow) return null;
  return (
    <Animated.View
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity }}
      className="bg-forest-950/95 items-center justify-center"
    >
      <DroneScene />
    </Animated.View>
  );
}

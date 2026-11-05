import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Text, View } from "react-native";
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from "react-native-svg";
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

/** Side view of a quadcopter: body, arms, landing gear, camera gimbal, blurred props and nav lights. */
const DRONE_W = 160;
const DRONE_H = 72;
// Rotor hubs as [centre x, y, blade length]; the far pair sits higher and smaller to read as depth.
const FAR_ROTORS = [[46, 5, 26], [114, 5, 26]] as const;
const NEAR_ROTORS = [[22, 9, 36], [138, 9, 36]] as const;

function Drone({ scale = 1, still }: { scale?: number; still: boolean }) {
  const hover = useState(() => new Animated.Value(0))[0];
  const spin = useState(() => new Animated.Value(0))[0];
  const blink = useState(() => new Animated.Value(0))[0];

  useLoop(
    () =>
      Animated.sequence([
        Animated.timing(hover, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(hover, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    still,
  );
  useLoop(() => Animated.timing(spin, { toValue: 1, duration: 120, easing: Easing.linear, useNativeDriver: true }), still);
  useLoop(
    () =>
      Animated.sequence([
        Animated.timing(blink, { toValue: 1, duration: 90, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 0, duration: 90, useNativeDriver: true }),
        Animated.delay(900),
      ]),
    still,
  );

  // A blade squashing to a sliver and back reads as a fast spin.
  const bladeScale = spin.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.1, 1] });
  const translateY = hover.interpolate({ inputRange: [0, 1], outputRange: [0, -8 * scale] });
  const rotate = hover.interpolate({ inputRange: [0, 1], outputRange: ["-1.5deg", "1.5deg"] });
  const lightOpacity = blink.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });

  const blade = ([x, y, len]: readonly [number, number, number], color: string) => (
    <Animated.View
      key={`${x}`}
      style={{
        position: "absolute",
        left: (x - len / 2) * scale,
        top: (y - 1.5) * scale,
        width: len * scale,
        height: 3 * scale,
        borderRadius: 1.5 * scale,
        backgroundColor: color,
        transform: [{ scaleX: bladeScale }],
      }}
    />
  );
  const light = (left: number, color: string) => (
    <Animated.View
      style={{
        position: "absolute",
        left: left * scale,
        top: 15 * scale,
        width: 4 * scale,
        height: 4 * scale,
        borderRadius: 2 * scale,
        backgroundColor: color,
        opacity: lightOpacity,
      }}
    />
  );

  return (
    <Animated.View style={{ width: DRONE_W * scale, height: DRONE_H * scale, transform: [{ translateY }, { rotate }] }}>
      <Svg width={DRONE_W * scale} height={DRONE_H * scale} viewBox={`0 0 ${DRONE_W} ${DRONE_H}`}>
        {/* far arms, motors and prop blur */}
        <Line x1={62} y1={22} x2={46} y2={10} stroke="#124635" strokeWidth={3} strokeLinecap="round" />
        <Line x1={98} y1={22} x2={114} y2={10} stroke="#124635" strokeWidth={3} strokeLinecap="round" />
        {FAR_ROTORS.map(([x, y, len]) => (
          <G key={x}>
            <Ellipse cx={x} cy={y} rx={len / 2 + 2} ry={2} fill="#b8f13e" opacity={0.12} />
            <Rect x={x - 1} y={y} width={2} height={4} fill="#124635" />
            <Rect x={x - 3.5} y={y + 4} width={7} height={5} rx={1.5} fill="#124635" />
          </G>
        ))}

        {/* landing gear */}
        <Path d="M64 36 L56 60 M96 36 L104 60" stroke="#1d5c45" strokeWidth={3} strokeLinecap="round" />
        <Path d="M46 61 H68 M92 61 H114" stroke="#1d5c45" strokeWidth={3.5} strokeLinecap="round" />

        {/* near arms */}
        <Path d="M56 24 L26 17" stroke="#1d5c45" strokeWidth={4.5} strokeLinecap="round" />
        <Path d="M104 24 L134 17" stroke="#1d5c45" strokeWidth={4.5} strokeLinecap="round" />

        {/* body: dark hull, lighter canopy, lime trim */}
        <Rect x={50} y={17} width={60} height={20} rx={9} fill="#0a3326" />
        <Path d="M58 18 Q80 8 102 18 Z" fill="#1d5c45" />
        <Rect x={54} y={27} width={52} height={2} rx={1} fill="#b8f13e" />
        <Rect x={92} y={21} width={8} height={3} rx={1.5} fill="#b8f13e" opacity={0.6} />

        {/* camera gimbal */}
        <Rect x={76} y={37} width={8} height={4} fill="#124635" />
        <Circle cx={80} cy={46} r={6} fill="#0a3326" stroke="#b8f13e" strokeWidth={1.5} />
        <Circle cx={80} cy={46} r={2.5} fill="#b8f13e" opacity={0.85} />

        {/* near motors and prop blur */}
        {NEAR_ROTORS.map(([x, y, len]) => (
          <G key={x}>
            <Ellipse cx={x} cy={y} rx={len / 2 + 3} ry={2.5} fill="#b8f13e" opacity={0.22} />
            <Rect x={x - 1.5} y={y} width={3} height={5} fill="#0a3326" />
            <Rect x={x - 5} y={y + 5} width={10} height={7} rx={2} fill="#0a3326" stroke="#1d5c45" strokeWidth={1} />
          </G>
        ))}
      </Svg>

      {FAR_ROTORS.map((r) => blade(r, "#8fbf2e"))}
      {NEAR_ROTORS.map((r) => blade(r, "#b8f13e"))}
      {/* navigation lights: red port, green starboard */}
      {light(15, "#ff5a4e")}
      {light(141, "#4ade80")}
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
            marginTop: -8,
            width: 0,
            height: 0,
            borderLeftWidth: 70,
            borderRightWidth: 70,
            borderTopWidth: 72,
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

import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";
import { Text } from "./Text";
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

/**
 * Three see-through circles drifting around each other (from the Load.svg design, 800×600 canvas).
 * `path` is the centre's keyframes, one every 0.1 s over a 2 s linear loop; `offset` is the
 * circle's fixed offset from that point (the SVG's rotate(-43.065) translate(...), pre-computed).
 */
const ORBS = [
  {
    r: 75.067,
    color: "#1dafa1",
    offset: [0, 0],
    path: "263.776 342.564; 270.01 342.849; 280.187 343.314; 297.721 344.115; 333.098 345.731; 433.679 350.327; 491.988 352.991; 516.776 354.124; 530.866 354.768; 540.04 355.187; 545.716 355.446; 544.214 362.109; 538.316 371.198; 522.404 380.387; 485.342 385.582; 379.19 372.582; 318.71 358.27; 293.306 351.334; 278.841 347.148; 269.613 344.375; 263.776 342.564",
  },
  {
    r: 118,
    color: "#0e7c72",
    offset: [93.99, 3.18],
    path: "361.777 165.918; 358.527 171.245; 353.221 179.941; 344.079 194.924; 325.635 225.154; 273.196 311.101; 242.796 360.927; 229.872 382.108; 222.526 394.149; 217.743 401.987; 214.784 406.838; 208.444 403.484; 200.669 395.581; 196.823 377.253; 209.195 340.931; 275.126 252.813; 319.213 206.544; 338.613 187.571; 349.823 176.941; 357.177 170.112; 361.777 165.918",
  },
  {
    r: 105.46,
    color: "#7fe0d6",
    offset: [34.63, 1.17],
    path: "456.419 423.252; 449.227 420.796; 437.977 416.626; 419.094 408.557; 383.323 387.989; 327.673 289.427; 341.707 222.981; 354.038 196.852; 362.316 182.299; 367.923 173.287; 371.703 167.513; 373.576 173.167; 376.634 182.399; 381.903 198.303; 392.533 230.393; 422.755 321.627; 440.275 374.517; 447.723 397.001; 451.957 409.782; 454.713 418.103; 456.419 423.252",
  },
].map(({ path, ...orb }) => ({ ...orb, points: path.split("; ").map((p) => p.split(" ").map(Number)) }));

const ORB_KEYTIMES = ORBS[0].points.map((_, i) => i / (ORBS[0].points.length - 1));
// Area the circles ever cover on the 800×600 canvas, scaled down to fit the loader.
const ORB_AREA = { x: 170, y: 48, w: 456, h: 484 };
const ORB_SCALE = 0.45;

function Orbs({ still }: { still: boolean }) {
  const t = useState(() => new Animated.Value(0))[0];
  useLoop(() => Animated.timing(t, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true }), still);

  return (
    <View style={{ width: ORB_AREA.w * ORB_SCALE, height: ORB_AREA.h * ORB_SCALE }}>
      {ORBS.map(({ r, color, offset, points }) => {
        const size = r * 2 * ORB_SCALE;
        const along = (axis: 0 | 1, start: number) =>
          t.interpolate({
            inputRange: ORB_KEYTIMES,
            outputRange: points.map((p) => (p[axis] + offset[axis] - r - start) * ORB_SCALE),
          });
        return (
          <Animated.View
            key={color}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
              opacity: 0.55,
              transform: [{ translateX: along(0, ORB_AREA.x) }, { translateY: along(1, ORB_AREA.y) }],
            }}
          />
        );
      })}
    </View>
  );
}

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

export function useReduceMotion() {
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
        <Line x1={62} y1={22} x2={46} y2={10} stroke="#3a4148" strokeWidth={3} strokeLinecap="round" />
        <Line x1={98} y1={22} x2={114} y2={10} stroke="#3a4148" strokeWidth={3} strokeLinecap="round" />
        {FAR_ROTORS.map(([x, y, len]) => (
          <G key={x}>
            <Ellipse cx={x} cy={y} rx={len / 2 + 2} ry={2} fill="#7fe0d6" opacity={0.12} />
            <Rect x={x - 1} y={y} width={2} height={4} fill="#3a4148" />
            <Rect x={x - 3.5} y={y + 4} width={7} height={5} rx={1.5} fill="#3a4148" />
          </G>
        ))}

        {/* landing gear */}
        <Path d="M64 36 L56 60 M96 36 L104 60" stroke="#0e7c72" strokeWidth={3} strokeLinecap="round" />
        <Path d="M46 61 H68 M92 61 H114" stroke="#0e7c72" strokeWidth={3.5} strokeLinecap="round" />

        {/* near arms */}
        <Path d="M56 24 L26 17" stroke="#0e7c72" strokeWidth={4.5} strokeLinecap="round" />
        <Path d="M104 24 L134 17" stroke="#0e7c72" strokeWidth={4.5} strokeLinecap="round" />

        {/* body: dark hull, lighter canopy, teal trim */}
        <Rect x={50} y={17} width={60} height={20} rx={9} fill="#22262a" />
        <Path d="M58 18 Q80 8 102 18 Z" fill="#0e7c72" />
        <Rect x={54} y={27} width={52} height={2} rx={1} fill="#7fe0d6" />
        <Rect x={92} y={21} width={8} height={3} rx={1.5} fill="#7fe0d6" opacity={0.6} />

        {/* camera gimbal */}
        <Rect x={76} y={37} width={8} height={4} fill="#3a4148" />
        <Circle cx={80} cy={46} r={6} fill="#22262a" stroke="#7fe0d6" strokeWidth={1.5} />
        <Circle cx={80} cy={46} r={2.5} fill="#7fe0d6" opacity={0.85} />

        {/* near motors and prop blur */}
        {NEAR_ROTORS.map(([x, y, len]) => (
          <G key={x}>
            <Ellipse cx={x} cy={y} rx={len / 2 + 3} ry={2.5} fill="#7fe0d6" opacity={0.22} />
            <Rect x={x - 1.5} y={y} width={3} height={5} fill="#22262a" />
            <Rect x={x - 5} y={y + 5} width={10} height={7} rx={2} fill="#22262a" stroke="#0e7c72" strokeWidth={1} />
          </G>
        ))}
      </Svg>

      {FAR_ROTORS.map((r) => blade(r, "#4fc9bc"))}
      {NEAR_ROTORS.map((r) => blade(r, "#7fe0d6"))}
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

/** Full-screen loading scene (drifting circles, status messages, progress bar) shown while the server is slow. */
function LoadingScene() {
  const still = useReduceMotion();
  const bar = useState(() => new Animated.Value(0))[0];
  const fade = useState(() => new Animated.Value(1))[0];
  const [message, setMessage] = useState(0);
  const [elapsed, setElapsed] = useState(0);

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
      <Orbs still={still} />

      <Animated.Text
        style={{
          opacity: fade,
          color: "#22262a",
          fontFamily: "Inter_700Bold",
          fontSize: 18,
          lineHeight: 28,
          marginTop: 24,
          textAlign: "center",
        }}
      >
        {MESSAGES[message]}
      </Animated.Text>

      <View style={{ width: 200, height: 4, borderRadius: 2, overflow: "hidden" }} className="bg-field mt-5">
        <Animated.View
          style={{
            width: 70,
            height: 4,
            borderRadius: 2,
            backgroundColor: "#7fe0d6",
            transform: [{ translateX: bar.interpolate({ inputRange: [0, 1], outputRange: [-70, 200] }) }],
          }}
        />
      </View>

      {elapsed >= 15 ? (
        <Text className="text-muted text-sm mt-6 text-center leading-5">
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
      // Plain styles: NativeWind className isn't applied to Animated.View.
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity,
        backgroundColor: "rgba(250,250,250,0.95)", // page colour
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <LoadingScene />
    </Animated.View>
  );
}

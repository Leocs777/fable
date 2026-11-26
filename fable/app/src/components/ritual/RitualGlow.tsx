import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { RITUAL_COLORS } from "./theme";

const PARTICLES = Array.from({ length: 24 }, (_, index) => ({
  left: 18 + ((index * 37) % 300),
  top: 18 + ((index * 61) % 340),
  size: 2 + (index % 3),
  delay: index * 95,
}));

type Props = {
  coinRunId: number;
};

export function RitualGlow({ coinRunId }: Props) {
  const glow = useSharedValue(0);

  useEffect(() => {
    if (coinRunId <= 0) return;
    glow.value = 0;
    glow.value = withDelay(
      620,
      withSequence(
        withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) }),
        withTiming(0.18, { duration: 940, easing: Easing.inOut(Easing.ease) }),
      ),
    );
  }, [coinRunId, glow]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.55, 1.25]) }],
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />
      <View style={styles.smokeOne} />
      <View style={styles.smokeTwo} />
      <Animated.View style={[styles.radialGlow, glowStyle]} />
      {PARTICLES.map((particle, index) => (
        <Particle key={index} {...particle} />
      ))}
    </View>
  );
}

function Particle({ left, top, size, delay }: { left: number; top: number; size: number; delay: number }) {
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = withDelay(delay, withRepeat(withTiming(1, { duration: 5200, easing: Easing.linear }), -1, false));
  }, [delay, drift]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(drift.value, [0, 0.18, 0.8, 1], [0, 0.65, 0.55, 0]),
    transform: [{ translateY: interpolate(drift.value, [0, 1], [60, -120]) }],
  }));

  return <Animated.View style={[styles.particle, { left, top, width: size, height: size, borderRadius: size / 2 }, style]} />;
}

const styles = StyleSheet.create({
  bgTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: RITUAL_COLORS.bgTop,
  },
  bgBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: RITUAL_COLORS.bgBottom,
    opacity: 0.72,
  },
  smokeOne: {
    position: "absolute",
    left: -42,
    top: 48,
    width: 250,
    height: 118,
    borderRadius: 118,
    backgroundColor: RITUAL_COLORS.smoke,
    transform: [{ rotate: "-14deg" }],
  },
  smokeTwo: {
    position: "absolute",
    right: -54,
    bottom: 52,
    width: 260,
    height: 120,
    borderRadius: 120,
    backgroundColor: "rgba(202, 163, 74, 0.12)",
    transform: [{ rotate: "11deg" }],
  },
  radialGlow: {
    position: "absolute",
    alignSelf: "center",
    top: 84,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(243, 216, 138, 0.42)",
    shadowColor: RITUAL_COLORS.goldSoft,
    shadowOpacity: 0.85,
    shadowRadius: 42,
    shadowOffset: { width: 0, height: 0 },
  },
  particle: {
    position: "absolute",
    backgroundColor: RITUAL_COLORS.goldSoft,
    shadowColor: RITUAL_COLORS.goldSoft,
    shadowOpacity: 0.9,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
});

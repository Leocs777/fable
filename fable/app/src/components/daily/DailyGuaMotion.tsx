import { useEffect, type ReactNode } from "react";
import { Image, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { l } from "@/lib/i18n";
import type { LineValue } from "@/lib/liuyao";
import { mystic } from "@/theme/mystic";

const AnimatedImage = Animated.createAnimatedComponent(Image);

const petalOne = require("../../../assets/images/plum-petal-botanical-1.png");
const petalTwo = require("../../../assets/images/plum-petal-botanical-3.png");
const petalThree = require("../../../assets/images/plum-petal-botanical-5.png");
const blossom = require("../../../assets/images/plum-blossom-soft.png");

const IDLE_LOOP_MS = 3600;
const LOADING_LOOP_MS = 4600;
const REVEAL_MS = 720;
const DAILY_LINE_PATTERN: LineValue[] = [1, 0, 1, 1, 0, 1];

export const DAILY_GUA_ANIMATION = {
  idleLoopMs: IDLE_LOOP_MS,
  loadingLoopMs: LOADING_LOOP_MS,
  resultRevealMs: REVEAL_MS,
  rippleScale: [1, 1.08, 1],
  rippleOpacity: [0.18, 0.32, 0.18],
};

export function DailyGuaIdleMotion({ compact = false }: { compact?: boolean }) {
  const loop = useSharedValue(0);

  useEffect(() => {
    loop.value = 0;
    loop.value = withRepeat(withTiming(1, { duration: IDLE_LOOP_MS, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [loop]);

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(loop.value, [0, 0.5, 1], DAILY_GUA_ANIMATION.rippleOpacity),
    transform: [{ scale: interpolate(loop.value, [0, 0.5, 1], DAILY_GUA_ANIMATION.rippleScale) }],
  }));
  const blossomStyle = useAnimatedStyle(() => ({
    opacity: interpolate(loop.value, [0, 0.5, 1], [0.74, 1, 0.74]),
    transform: [
      { translateY: interpolate(loop.value, [0, 1], [-4, 5]) },
      { rotate: `${interpolate(loop.value, [0, 1], [-8, 9])}deg` },
    ],
  }));
  const lineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(loop.value, [0, 0.5, 1], [0.22, 0.66, 0.22]),
  }));

  return (
    <View pointerEvents="none" style={[styles.idleWrap, compact && styles.idleWrapCompact]}>
      <Animated.View style={[styles.ripple, compact && styles.rippleCompact, rippleStyle]} />
      <Animated.View style={[styles.ripple, styles.rippleWide, compact && styles.rippleWideCompact, rippleStyle]} />
      <AnimatedImage source={petalOne} resizeMode="contain" style={[styles.idlePetal, styles.idlePetalOne, blossomStyle]} />
      <AnimatedImage source={petalTwo} resizeMode="contain" style={[styles.idlePetal, styles.idlePetalTwo, blossomStyle]} />
      <AnimatedImage source={blossom} resizeMode="contain" style={[styles.idleBlossom, compact && styles.idleBlossomCompact, blossomStyle]} />
      <View style={styles.idleLines}>
        {DAILY_LINE_PATTERN.map((line, index) => (
          <AnimatedHexLine key={index} value={line} index={index} progress={loop} compact={compact} sharedStyle={lineStyle} />
        ))}
      </View>
    </View>
  );
}

export function DailyGuaLoadingMotion({ lines = DAILY_LINE_PATTERN, movingIndex = 3 }: { lines?: LineValue[]; movingIndex?: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withRepeat(withTiming(1, { duration: LOADING_LOOP_MS, easing: Easing.inOut(Easing.cubic) }), -1, false);
  }, [progress]);

  const lightStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.18, 0.45, 1], [0.18, 0.76, 0.42, 0.18]),
    transform: [{ scale: interpolate(progress.value, [0, 0.25, 1], [0.62, 1.18, 1.02]) }],
  }));
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.22, 0.52, 0.86, 1], [0, 0.72, 0.24, 0], Extrapolation.CLAMP),
    transform: [{ scaleX: interpolate(progress.value, [0.24, 0.86], [0.72, 1.76], Extrapolation.CLAMP) }, { scaleY: interpolate(progress.value, [0.24, 0.86], [0.34, 0.82], Extrapolation.CLAMP) }],
  }));

  return (
    <View pointerEvents="none" style={styles.loadingWrap}>
      <Animated.View style={[styles.centerLight, lightStyle]} />
      <Animated.View style={[styles.loadingRipple, rippleStyle]} />
      <FallingPetal source={petalOne} progress={progress} start={0.08} end={0.42} fromX={-84} toX={-18} size={52} rotate={62} />
      <FallingPetal source={petalTwo} progress={progress} start={0.16} end={0.5} fromX={76} toX={22} size={48} rotate={-54} />
      <FallingPetal source={petalThree} progress={progress} start={0.24} end={0.58} fromX={4} toX={2} size={44} rotate={24} />
      <View style={styles.loadingHexagram}>
        {lines.map((line, index) => (
          <LoadingHexLine key={index} value={line} index={index} progress={progress} moving={index === movingIndex} />
        ))}
      </View>
      <Text style={styles.loadingText}>{l({ zh: "今日取象中…", en: "Reading today..." })}</Text>
    </View>
  );
}

export function DailyGuaReveal({ children }: { children: ReactNode }) {
  const reveal = useSharedValue(0);

  useEffect(() => {
    reveal.value = 0;
    reveal.value = withDelay(80, withTiming(1, { duration: REVEAL_MS, easing: Easing.out(Easing.cubic) }));
  }, [reveal]);

  const style = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [
      { translateY: interpolate(reveal.value, [0, 1], [18, 0]) },
      { scale: interpolate(reveal.value, [0, 1], [0.97, 1]) },
    ],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

function FallingPetal({
  source,
  progress,
  start,
  end,
  fromX,
  toX,
  size,
  rotate,
}: {
  source: ImageSourcePropType;
  progress: SharedValue<number>;
  start: number;
  end: number;
  fromX: number;
  toX: number;
  size: number;
  rotate: number;
}) {
  const style = useAnimatedStyle(() => {
    const phase = interpolate(progress.value, [start, end], [0, 1], Extrapolation.CLAMP);
    const fall = phase * phase * (1.58 - 0.58 * phase);
    return {
      opacity: interpolate(phase, [0, 0.12, 0.78, 1], [0, 0.95, 0.82, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: fromX + (toX - fromX) * phase + Math.sin(phase * Math.PI * 2) * 12 },
        { translateY: -92 + 160 * fall },
        { rotate: `${rotate * phase}deg` },
        { scale: interpolate(phase, [0, 0.72, 1], [0.78, 1, 0.6]) },
      ],
    };
  });

  return <AnimatedImage source={source} resizeMode="contain" style={[styles.loadingPetal, { height: size, width: size }, style]} />;
}

function AnimatedHexLine({
  value,
  index,
  progress,
  compact,
  sharedStyle,
}: {
  value: LineValue;
  index: number;
  progress: SharedValue<number>;
  compact: boolean;
  sharedStyle: object;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [index % 2 === 0 ? -2 : 2, 0]) }],
  }));
  return <HexLine value={value} moving={false} style={[sharedStyle, style]} compact={compact} />;
}

function LoadingHexLine({ value, index, progress, moving }: { value: LineValue; index: number; progress: SharedValue<number>; moving: boolean }) {
  const style = useAnimatedStyle(() => {
    const start = 0.5 + index * 0.055;
    const end = start + 0.11;
    return {
      opacity: interpolate(progress.value, [start, end], [0, 1], Extrapolation.CLAMP),
      transform: [{ translateX: interpolate(progress.value, [start, end], [-14, 0], Extrapolation.CLAMP) }],
    };
  });
  return <HexLine value={value} moving={moving} style={style} />;
}

function HexLine({ value, moving, compact = false, style }: { value: LineValue; moving: boolean; compact?: boolean; style?: object }) {
  const lineColor = moving ? mystic.gold : "rgba(255,247,223,0.82)";
  return (
    <Animated.View style={[styles.hexLine, compact && styles.hexLineCompact, style]}>
      {value === 1 ? (
        <View style={[styles.yangLine, compact && styles.yangLineCompact, { backgroundColor: lineColor }]} />
      ) : (
        <View style={styles.yinLine}>
          <View style={[styles.yinHalf, compact && styles.yinHalfCompact, { backgroundColor: lineColor }]} />
          <View style={[styles.yinHalf, compact && styles.yinHalfCompact, { backgroundColor: lineColor }]} />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  idleWrap: {
    alignItems: "center",
    height: 104,
    justifyContent: "center",
    position: "relative",
    width: 128,
  },
  idleWrapCompact: {
    height: 82,
    width: 102,
  },
  ripple: {
    borderColor: "rgba(242,213,138,0.5)",
    borderRadius: 999,
    borderWidth: 1,
    height: 52,
    position: "absolute",
    top: 48,
    width: 92,
  },
  rippleCompact: {
    height: 40,
    top: 39,
    width: 72,
  },
  rippleWide: {
    borderColor: "rgba(122,212,181,0.28)",
    height: 72,
    top: 38,
    width: 120,
  },
  rippleWideCompact: {
    height: 54,
    top: 32,
    width: 92,
  },
  idlePetal: {
    height: 38,
    position: "absolute",
    width: 38,
  },
  idlePetalOne: {
    left: 15,
    top: 10,
  },
  idlePetalTwo: {
    right: 14,
    top: 22,
  },
  idleBlossom: {
    height: 48,
    position: "absolute",
    top: 18,
    width: 48,
  },
  idleBlossomCompact: {
    height: 38,
    width: 38,
  },
  idleLines: {
    gap: 3,
    position: "absolute",
    right: 10,
    top: 46,
  },
  loadingWrap: {
    alignItems: "center",
    height: 286,
    justifyContent: "center",
    position: "relative",
  },
  centerLight: {
    backgroundColor: "rgba(242,213,138,0.2)",
    borderColor: "rgba(242,213,138,0.56)",
    borderRadius: 999,
    borderWidth: 1,
    height: 128,
    position: "absolute",
    shadowColor: mystic.gold,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    width: 128,
  },
  loadingRipple: {
    borderColor: "rgba(122,212,181,0.42)",
    borderRadius: 999,
    borderWidth: 1,
    height: 82,
    position: "absolute",
    top: 150,
    width: 142,
  },
  loadingPetal: {
    position: "absolute",
    top: 54,
  },
  loadingHexagram: {
    gap: 6,
    marginTop: 82,
  },
  loadingText: {
    color: mystic.goldSoft,
    fontFamily: "Songti SC",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 18,
  },
  hexLine: {
    alignItems: "center",
    height: 8,
    justifyContent: "center",
    width: 72,
  },
  hexLineCompact: {
    height: 5,
    width: 46,
  },
  yangLine: {
    borderRadius: 999,
    height: 5,
    width: 68,
  },
  yangLineCompact: {
    height: 3,
    width: 42,
  },
  yinLine: {
    flexDirection: "row",
    gap: 12,
  },
  yinHalf: {
    borderRadius: 999,
    height: 5,
    width: 28,
  },
  yinHalfCompact: {
    height: 3,
    width: 16,
  },
});

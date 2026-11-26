import { useEffect } from "react";
import { Image, StyleSheet, type ImageSourcePropType, type ImageStyle } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const AnimatedImage = Animated.createAnimatedComponent(Image);

const COINS = [
  { startX: -84, landX: -55, landY: 16, spin: -520, delay: 0, size: 58 },
  { startX: 60, landX: 14, landY: -46, spin: 640, delay: 100, size: 54 },
  { startX: 24, landX: 58, landY: 48, spin: -430, delay: 200, size: 56 },
];

type Props = {
  coinRunId: number;
  source: ImageSourcePropType;
};

export function CoinDropLayer({ coinRunId, source }: Props) {
  return (
    <>
      {COINS.map((coin, index) => (
        <Coin key={index} coinRunId={coinRunId} source={source} {...coin} />
      ))}
    </>
  );
}

function Coin({
  coinRunId,
  source,
  startX,
  landX,
  landY,
  spin,
  delay,
  size,
}: {
  coinRunId: number;
  source: ImageSourcePropType;
  startX: number;
  landX: number;
  landY: number;
  spin: number;
  delay: number;
  size: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (coinRunId <= 0) return;
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withSequence(
        withTiming(0.78, { duration: 590, easing: Easing.in(Easing.quad) }),
        withSpring(1, { damping: 7, stiffness: 190, mass: 0.65 }),
      ),
    );
  }, [coinRunId, delay, progress]);

  const coinStyle = useAnimatedStyle(() => {
    const runOffsetX = (((coinRunId + delay / 100) % 5) - 2) * 3;
    const runOffsetY = (((coinRunId + delay / 100) % 3) - 1) * 2;
    const translateX = interpolate(progress.value, [0, 1], [startX + runOffsetX * 0.35, landX + runOffsetX]);
    const translateY = interpolate(progress.value, [0, 0.72, 0.84, 1], [-300, landY + 22 + runOffsetY, landY - 12 + runOffsetY, landY + runOffsetY]);
    const scale = interpolate(progress.value, [0, 0.72, 0.84, 1], [0.68, 1.14, 0.96, 1]);
    const opacity = interpolate(progress.value, [0, 0.08, 1], [0, 1, 1]);
    return {
      opacity,
      transform: [{ translateX }, { translateY }, { rotate: `${spin * progress.value}deg` }, { scale }],
    };
  });

  const shadowStyle = useAnimatedStyle(() => {
    const runOffsetX = (((coinRunId + delay / 100) % 5) - 2) * 3;
    const runOffsetY = (((coinRunId + delay / 100) % 3) - 1) * 2;
    const opacity = interpolate(progress.value, [0, 0.55, 0.78, 1], [0, 0.08, 0.32, 0.26]);
    const scale = interpolate(progress.value, [0, 0.78, 1], [0.15, 1, 0.86]);
    return {
      opacity,
      transform: [{ translateX: landX + runOffsetX }, { translateY: landY + size * 0.48 + runOffsetY }, { scaleX: scale }, { scaleY: scale * 0.32 }],
    };
  });

  return (
    <>
      <Animated.View style={[styles.shadow, { width: size, height: size }, shadowStyle]} />
      <AnimatedImage source={source} resizeMode="contain" style={[styles.coin, { width: size, height: size } as ImageStyle, coinStyle]} />
    </>
  );
}

const styles = StyleSheet.create({
  coin: {
    position: "absolute",
    zIndex: 4,
  },
  shadow: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    zIndex: 3,
  },
});

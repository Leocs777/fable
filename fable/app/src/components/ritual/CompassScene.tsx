import { useEffect } from "react";
import { Image, StyleSheet, View, type ImageSourcePropType, type ImageStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const AnimatedImage = Animated.createAnimatedComponent(Image);

type Props = {
  sessionId: number;
  source: ImageSourcePropType;
  size: number;
};

export function CompassScene({ sessionId, source, size }: Props) {
  const breath = useSharedValue(0);
  const spin = useSharedValue(0);
  const innerSpin = useSharedValue(0);
  const shake = useSharedValue(0);

  useEffect(() => {
    breath.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [breath]);

  useEffect(() => {
    if (sessionId <= 0) return;
    spin.value = withSequence(
      withTiming(1260, { duration: 1350, easing: Easing.in(Easing.cubic) }),
      withTiming(3960, { duration: 5200, easing: Easing.out(Easing.cubic) }),
    );
    innerSpin.value = withSequence(
      withTiming(-820, { duration: 1200, easing: Easing.in(Easing.cubic) }),
      withTiming(-2460, { duration: 5400, easing: Easing.out(Easing.cubic) }),
    );
    shake.value = withDelay(
      1580,
      withSequence(
        withTiming(1, { duration: 55 }),
        withTiming(-0.75, { duration: 65 }),
        withTiming(0.45, { duration: 70 }),
        withTiming(0, { duration: 120 }),
      ),
    );
  }, [innerSpin, sessionId, shake, spin]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shake.value * 7 },
      { translateY: Math.abs(shake.value) * 2 },
      { rotate: `${spin.value}deg` },
      { scale: 1 + breath.value * 0.024 },
    ],
  }));
  const innerStyle = useAnimatedStyle(() => ({
    opacity: sessionId > 0 ? 0.28 : 0.14,
    transform: [
      { rotate: `${innerSpin.value}deg` },
      { scale: 1 + breath.value * 0.012 },
    ],
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <AnimatedImage
        source={source}
        resizeMode="cover"
        style={[styles.compass, { width: size, height: size, borderRadius: size / 2 } as ImageStyle, animatedStyle]}
      />
      <AnimatedImage
        source={source}
        resizeMode="cover"
        style={[styles.innerCompass, { width: size * 0.54, height: size * 0.54, borderRadius: (size * 0.54) / 2 } as ImageStyle, innerStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  compass: {
    position: "absolute",
    shadowColor: "#000",
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
  },
  innerCompass: {
    position: "absolute",
  },
});

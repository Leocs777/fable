import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { l } from "@/lib/i18n";

import { RITUAL_COLORS } from "./theme";

type Props = {
  runId: number;
  title: string;
  body: string;
  visible: boolean;
};

export function ResultReveal({ runId, title, body, visible }: Props) {
  const reveal = useSharedValue(0);

  useEffect(() => {
    if (runId > 0 && visible) {
      reveal.value = withDelay(180, withTiming(1, { duration: 780, easing: Easing.out(Easing.cubic) }));
    } else {
      reveal.value = 0;
    }
  }, [reveal, runId, visible]);

  const style = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [
      { translateY: interpolate(reveal.value, [0, 1], [22, 0]) },
      { scale: interpolate(reveal.value, [0, 1], [0.96, 1]) },
    ],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, style]}>
      <View style={styles.card}>
        <Text style={styles.kicker}>{l({ zh: "卦象已成", en: "Hexagram formed" })}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 14,
  },
  card: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: RITUAL_COLORS.cardBg,
    borderWidth: 1,
    borderColor: RITUAL_COLORS.cardBorder,
  },
  kicker: {
    color: RITUAL_COLORS.goldSoft,
    fontSize: 11,
    fontWeight: "800",
  },
  title: {
    color: RITUAL_COLORS.ink,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 4,
  },
  body: {
    color: RITUAL_COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
});

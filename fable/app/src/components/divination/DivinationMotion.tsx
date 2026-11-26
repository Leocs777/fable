import { useEffect, type ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { divinationMotionTrigger, type DivinationMotionMethod, type DivinationMotionState } from "@/lib/divinationAnimation";
import { mystic } from "@/theme/mystic";

type DivinationMotionProps = {
  method: DivinationMotionMethod;
  motionState: DivinationMotionState;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  fallback?: ReactNode;
  generatingStartMs?: number;
  generatingCompleteMs?: number;
  onGeneratingStartEnd?: () => void;
  onGeneratingCompleteEnd?: () => void;
};

export function DivinationMotion({
  method,
  motionState,
  style,
  children,
  fallback,
  generatingStartMs = 2400,
  generatingCompleteMs = 2400,
  onGeneratingStartEnd,
  onGeneratingCompleteEnd,
}: DivinationMotionProps) {
  const triggerName = divinationMotionTrigger(method, motionState);

  useEffect(() => {
    if (motionState !== "generating_start") return;
    const timer = setTimeout(() => onGeneratingStartEnd?.(), generatingStartMs);
    return () => clearTimeout(timer);
  }, [generatingStartMs, motionState, onGeneratingStartEnd]);

  useEffect(() => {
    if (motionState !== "generating_complete") return;
    const timer = setTimeout(() => onGeneratingCompleteEnd?.(), generatingCompleteMs);
    return () => clearTimeout(timer);
  }, [generatingCompleteMs, motionState, onGeneratingCompleteEnd]);

  return (
    <View style={[styles.container, style]}>
      {children ?? fallback ?? <FallbackMotionLabel label={triggerName} />}
    </View>
  );
}

function FallbackMotionLabel({ label }: { label: string }) {
  return (
    <View style={styles.fallback}>
      <Text style={styles.fallbackText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 1,
    overflow: "hidden",
  },
  fallback: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  fallbackText: {
    color: mystic.gold,
    fontFamily: "PingFang SC",
    fontSize: 11,
    fontWeight: "900",
  },
});

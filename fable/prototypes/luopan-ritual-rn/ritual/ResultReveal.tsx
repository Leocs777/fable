// 结果卡揭晓：由 reveal（0..1）驱动的柔和淡入——透明度 + 上移 + 轻微放大。
//
// 关于 "blur-to-clear"：RN 没有可直接动画的原生模糊。两种做法：
//  1) 本文件的纯透明度/位移淡入（最稳，任何机型都顺滑）——默认。
//  2) 真模糊渐清：用 Skia 把卡片渲染进 <Canvas> 并对其加 <Blur blur={derived}>，
//     blur 从 ~12 降到 0。性能可接受但要把卡片内容画进 Skia。需要时再换。
import React, { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  type SharedValue,
} from "react-native-reanimated";
import { RITUAL_COLORS } from "./theme";

type Props = {
  reveal: SharedValue<number>;
  children: ReactNode;
};

export function ResultReveal({ reveal, children }: Props) {
  const style = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [
      { translateY: interpolate(reveal.value, [0, 1], [26, 0], Extrapolation.CLAMP) },
      { scale: interpolate(reveal.value, [0, 1], [0.96, 1], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, style]}>
      <View style={styles.card}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 48,
  },
  card: {
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 22,
    backgroundColor: RITUAL_COLORS.cardBg,
    borderWidth: 1,
    borderColor: RITUAL_COLORS.cardBorder,
    // 柔和投影，强化“浮现”
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
  },
});

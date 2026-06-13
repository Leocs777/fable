// 罗盘层：一张罗盘图，叠加 呼吸（缓慢缩放）+ 旋转（起卦）+ 震动（落地）。
// 用 Reanimated 在 UI 线程驱动，不经过 JS 线程。
//
// 若改用 Rive 罗盘资产（带 idle/spin 状态机）：把 Animated.Image 换成 <Rive>，
// 用 spin / shake 的 useAnimatedReaction 去 setNumber/fireState 驱动状态机即可。
import React from "react";
import { Image, StyleSheet, type ImageSourcePropType } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";

const AnimatedImage = Animated.createAnimatedComponent(Image);

type Props = {
  spin: SharedValue<number>;
  breathing: SharedValue<number>;
  shake: SharedValue<number>;
  source: ImageSourcePropType;
  size: number;
};

export function CompassScene({ spin, breathing, shake, source, size }: Props) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: shake.value * 4 }, // 落地横向轻颤
      { rotate: `${spin.value}deg` },
      { scale: 1 + breathing.value * 0.02 }, // 呼吸：±2%
    ],
  }));

  return (
    <AnimatedImage
      source={source}
      resizeMode="contain"
      style={[{ width: size, height: size }, styles.shadow, style]}
    />
  );
}

const styles = StyleSheet.create({
  shadow: {
    // 给铜盘一点沉底阴影，强化质感
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
  },
});

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
      { perspective: 900 }, // 2.5D：透视
      { rotateX: "18deg" }, // 盘面后仰，呈桌上俯视的立体感
      { translateX: shake.value * 7 }, // 落地横向震颤（加大）
      { rotate: `${spin.value}deg` }, // 绕盘心旋转
      { scale: 1 + breathing.value * 0.025 }, // 呼吸
    ],
  }));

  return (
    <AnimatedImage
      source={source}
      resizeMode="cover"
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2, // 裁成圆：去掉方形纸背景，旋转时不再带框
        },
        styles.shadow,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  shadow: {
    // 给铜盘一点沉底阴影，强化“悬浮在暗处”的质感
    shadowColor: "#000",
    shadowOpacity: 0.55,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
  },
});

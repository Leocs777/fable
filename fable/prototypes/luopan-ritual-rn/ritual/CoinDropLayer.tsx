// 三枚铜钱下落层。每枚由一个进度 shared value（0..1）驱动：
//   下落（缓入）→ 0.82 处接近盘面 → 弹簧落定（自带回弹）。
// 物理“自然但确定”：落点 / 旋向 / 起始横移都是预设参数，不用随机。
import React from "react";
import { Image, StyleSheet, useWindowDimensions, type ImageSourcePropType } from "react-native";
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  type SharedValue,
} from "react-native-reanimated";

const AnimatedImage = Animated.createAnimatedComponent(Image);

// 三枚的落点（相对盘心）、起始横移、旋向、落地微沉量——错落，不同步。
const COIN_SPECS = [
  { startX: -34, landX: -42, spin: -1, settleDip: 16 },
  { startX: 30, landX: 46, spin: 1, settleDip: 18 },
  { startX: -6, landX: 4, spin: -1, settleDip: 14 },
];

type Props = {
  coins: SharedValue<number>[];
  source: ImageSourcePropType;
  coinSize?: number;
  landY?: number; // 盘面落点的纵向位置（相对容器中心）
};

function Coin({
  progress,
  spec,
  source,
  size,
  landY,
  fallFrom,
}: {
  progress: SharedValue<number>;
  spec: (typeof COIN_SPECS)[number];
  source: ImageSourcePropType;
  size: number;
  landY: number;
  fallFrom: number;
}) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    // 纵向：从屏幕上方落到盘面；0.82 处略高于落点，弹簧段沉到位
    const translateY = interpolate(
      p,
      [0, 0.82, 1],
      [-fallFrom, landY - spec.settleDip, landY],
      Extrapolation.CLAMP,
    );
    const translateX = interpolate(p, [0, 1], [spec.startX, spec.landX]);
    // 空中绕 X 轴翻滚（落地停在 720°=360 倍数 → 正面朝上），配 perspective 出 3D 翻转感
    const flipX = interpolate(p, [0, 1], [0, spec.spin * 720]);
    const spinZ = interpolate(p, [0, 1], [0, spec.spin * 160]); // 轻微平面自转
    // 落地压扁再回弹的体积感
    const scale = interpolate(p, [0, 0.82, 0.9, 1], [0.7, 1.06, 0.95, 1], Extrapolation.CLAMP);
    const opacity = interpolate(p, [0, 0.08, 1], [0, 1, 1], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [
        { perspective: 600 },
        { translateX },
        { translateY },
        { rotateX: `${flipX}deg` },
        { rotateZ: `${spinZ}deg` },
        { scale },
      ],
    };
  });

  return (
    <AnimatedImage
      source={source}
      resizeMode="contain"
      style={[styles.coin, { width: size, height: size }, style]}
    />
  );
}

export function CoinDropLayer({ coins, source, coinSize = 56, landY = 8 }: Props) {
  const { height } = useWindowDimensions();
  const fallFrom = height * 0.55; // 从屏幕上方足够远处落下
  return (
    <>
      {coins.map((progress, i) => (
        <Coin
          key={i}
          progress={progress}
          spec={COIN_SPECS[i]}
          source={source}
          size={coinSize}
          landY={landY}
          fallFrom={fallFrom}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  coin: {
    position: "absolute",
    // 容器需用 alignItems/justifyContent: center，使 translate 以盘心为原点
  },
});

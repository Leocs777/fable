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
  // 铜钱本体：下落 + 平面旋转（rotateZ，不翻面，避免单面 PNG 在侧面消失）+ 落地压扁回弹。
  const coinStyle = useAnimatedStyle(() => {
    const p = progress.value;
    // 下落 + 两段递减回弹：0.68 砸地 → 0.8 弹起 → 0.89 落 → 0.95 小弹 → 1 定
    const translateY = interpolate(
      p,
      [0, 0.68, 0.8, 0.89, 0.95, 1],
      [-fallFrom, landY, landY - spec.settleDip, landY, landY - spec.settleDip * 0.4, landY],
      Extrapolation.CLAMP,
    );
    const translateX = interpolate(p, [0, 1], [spec.startX, spec.landX]);
    const rotateZ = interpolate(p, [0, 1], [0, spec.spin * 400]); // 平面自转约一圈多
    // 砸地瞬间微胀（压扁观感），回弹时收一点
    const scale = interpolate(p, [0, 0.62, 0.68, 0.8, 1], [0.7, 1.0, 1.08, 0.96, 1], Extrapolation.CLAMP);
    const opacity = interpolate(p, [0, 0.08, 1], [0, 1, 1], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ translateX }, { translateY }, { rotateZ: `${rotateZ}deg` }, { scale }],
    };
  });

  // 落地阴影：随铜钱接近地面变大变深 —— 立体感来自“落到盘面”的阴影，而非翻面。
  const shadowStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const opacity = interpolate(p, [0, 0.5, 0.68, 1], [0, 0.12, 0.3, 0.3], Extrapolation.CLAMP);
    const s = interpolate(p, [0, 0.68, 1], [0.2, 1, 1], Extrapolation.CLAMP); // 0.68 落地时阴影最大
    const translateX = interpolate(p, [0, 1], [spec.startX, spec.landX]);
    return {
      opacity,
      transform: [
        { translateX },
        { translateY: landY + size * 0.42 },
        { scaleX: s },
        { scaleY: s * 0.32 }, // 压扁成椭圆地面阴影
      ],
    };
  });

  return (
    <>
      <Animated.View style={[styles.shadow, { width: size, height: size }, shadowStyle]} />
      <AnimatedImage
        source={source}
        resizeMode="contain"
        style={[styles.coin, { width: size, height: size }, coinStyle]}
      />
    </>
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
  shadow: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
});

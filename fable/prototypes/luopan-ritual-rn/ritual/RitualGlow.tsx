// 氛围层（Expo Go 兼容版，不依赖 Skia）：
//   暗夜渐变底（expo-linear-gradient）+ 两层缓动柔烟 + 上浮金粒子（reanimated View）
//   + 落地放射金光（react-native-svg RadialGradient）。
// 这些库在 Expo Go 中原生可用，无需 development build。
// 高保真 Skia 版（真模糊/更细腻粒子）见 git 历史，迁到 dev build 后可换回。
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, RadialGradient, Stop, Circle } from "react-native-svg";
import Animated, {
  useAnimatedStyle,
  useAnimatedProps,
  interpolate,
  Extrapolation,
  type SharedValue,
} from "react-native-reanimated";
import { RITUAL_COLORS } from "./theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const PARTICLE_COUNT = 26; // 低端机可降到 ~16

// 确定性散布（黄金角），不用随机。
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  x: ((i * 137.5) % 100) / 100,
  y0: ((i * 53) % 100) / 100,
  speed: 0.35 + ((i * 31) % 50) / 100,
  size: 2 + (i % 3),
}));

function Particle({
  clock,
  x,
  y0,
  speed,
  size,
  width,
  height,
}: {
  clock: SharedValue<number>;
  x: number;
  y0: number;
  speed: number;
  size: number;
  width: number;
  height: number;
}) {
  const style = useAnimatedStyle(() => {
    const prog = ((y0 - clock.value * speed) % 1 + 1) % 1; // 上浮循环
    // 上下边缘淡入淡出，避免突现/突灭
    const opacity = interpolate(prog, [0, 0.12, 0.85, 1], [0, 0.6, 0.6, 0], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ translateX: x * width }, { translateY: prog * height }],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: RITUAL_COLORS.goldSoft,
        },
        style,
      ]}
    />
  );
}

type Props = {
  glow: SharedValue<number>;
  clock: SharedValue<number>;
  width: number;
  height: number;
  center: { x: number; y: number };
};

export function RitualGlow({ glow, clock, width, height, center }: Props) {
  const glowRadius = useMemo(() => Math.min(width, height) * 0.55, [width, height]);

  // 两层柔烟缓慢反向平移
  const smokeA = useAnimatedStyle(() => ({
    transform: [{ translateX: clock.value * 40 - 20 }, { translateY: clock.value * 16 }],
  }));
  const smokeB = useAnimatedStyle(() => ({
    transform: [{ translateX: -clock.value * 30 + 15 }, { translateY: -clock.value * 12 }],
  }));

  // 落地金光透明度
  const glowProps = useAnimatedProps(() => ({ opacity: glow.value }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 暗夜底 */}
      <LinearGradient
        colors={[RITUAL_COLORS.bgTop, RITUAL_COLORS.bgBottom]}
        style={StyleSheet.absoluteFill}
      />

      {/* 柔烟（两层大半透明圆缓动） */}
      <Animated.View style={[styles.smoke, { left: width * 0.05, top: height * 0.18 }, smokeA]} />
      <Animated.View style={[styles.smoke, { left: width * 0.42, top: height * 0.46 }, smokeB]} />

      {/* 上浮金粒子 */}
      {PARTICLES.map((p, i) => (
        <Particle key={i} clock={clock} {...p} width={width} height={height} />
      ))}

      {/* 落地放射金光 */}
      <Svg style={StyleSheet.absoluteFill} width={width} height={height}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={RITUAL_COLORS.glow} stopOpacity={0.85} />
            <Stop offset="60%" stopColor={RITUAL_COLORS.glow} stopOpacity={0.25} />
            <Stop offset="100%" stopColor={RITUAL_COLORS.glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <AnimatedCircle
          cx={center.x}
          cy={center.y}
          r={glowRadius}
          fill="url(#glow)"
          animatedProps={glowProps}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  smoke: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: RITUAL_COLORS.smoke,
  },
});

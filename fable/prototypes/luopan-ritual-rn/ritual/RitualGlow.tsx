// Skia 氛围层：暗色渐变底 + 两层缓动柔烟 + 上浮金粒子 + 落地放射金光。
// 性能要点：粒子用单个 <Points> 一次绘制（不是 N 个组件）；烟雾只用 2 层 blurred 圆；
// 全部动画值来自 reanimated（UI 线程）。低端机把 PARTICLE_COUNT 调小、可去掉 Blur。
import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import {
  Canvas,
  Fill,
  Group,
  Circle,
  Points,
  Blur,
  RadialGradient,
  LinearGradient,
  vec,
} from "@shopify/react-native-skia";
import { useDerivedValue, type SharedValue } from "react-native-reanimated";
import { RITUAL_COLORS } from "./theme";

const PARTICLE_COUNT = 28; // 低端机可降到 ~16

// 确定性散布（黄金角），不用随机，避免每次 reload 变化。
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  x: ((i * 137.5) % 100) / 100,
  y0: ((i * 53) % 100) / 100,
  speed: 0.35 + ((i * 31) % 50) / 100,
}));

type Props = {
  glow: SharedValue<number>;
  clock: SharedValue<number>;
  width: number;
  height: number;
  center: { x: number; y: number }; // 金光中心（罗盘中心）
};

export function RitualGlow({ glow, clock, width, height, center }: Props) {
  const glowRadius = useMemo(() => Math.min(width, height) * 0.55, [width, height]);

  // 金粒子上浮，循环
  const particlePoints = useDerivedValue(() => {
    const t = clock.value;
    return PARTICLES.map((p) => {
      const y = ((p.y0 - t * p.speed) % 1 + 1) % 1;
      return vec(p.x * width, y * height);
    });
  }, [width, height]);

  // 两层柔烟缓慢反向平移
  const smokeA = useDerivedValue(() => clock.value * 36 - 18);
  const smokeB = useDerivedValue(() => -clock.value * 28 + 14);

  // 落地金光透明度
  const glowOpacity = useDerivedValue(() => glow.value);

  return (
    <Canvas style={[StyleSheet.absoluteFill, { width, height }]}>
      {/* 暗夜底 */}
      <Fill>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={[RITUAL_COLORS.bgTop, RITUAL_COLORS.bgBottom]}
        />
      </Fill>

      {/* 柔烟（两层低透明 blurred 圆，缓动） */}
      <Group opacity={0.5}>
        <Group transform={[{ translateX: smokeA }]}>
          <Circle cx={width * 0.32} cy={height * 0.4} r={width * 0.5} color={RITUAL_COLORS.smoke}>
            <Blur blur={48} />
          </Circle>
        </Group>
        <Group transform={[{ translateX: smokeB }]}>
          <Circle cx={width * 0.7} cy={height * 0.62} r={width * 0.46} color={RITUAL_COLORS.smoke}>
            <Blur blur={56} />
          </Circle>
        </Group>
      </Group>

      {/* 上浮金粒子（一次绘制） */}
      <Points
        points={particlePoints}
        mode="points"
        color={RITUAL_COLORS.goldSoft}
        style="stroke"
        strokeWidth={2.4}
        strokeCap="round"
        opacity={0.55}
      />

      {/* 落地放射金光 */}
      <Group opacity={glowOpacity}>
        <Circle cx={center.x} cy={center.y} r={glowRadius}>
          <RadialGradient
            c={vec(center.x, center.y)}
            r={glowRadius}
            colors={[RITUAL_COLORS.glow, "rgba(244,207,118,0.0)"]}
          />
        </Circle>
      </Group>
    </Canvas>
  );
}

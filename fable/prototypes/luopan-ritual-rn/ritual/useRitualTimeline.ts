// 统一的仪式时间轴：一处编排所有阶段，各层只消费 shared value。
// 这样 Rive/Skia/Reanimated 三套系统的时序对齐在一个地方，而不是散在各自回调里。
//
// 阶段（确定性时序）：
//   呼吸（常驻） → 起卦：罗盘加速旋转 → 减速 → 三枚铜钱错落下落 →
//   最后一枚落地：金光闪起 + 罗盘震动 → 留白 → 结果卡揭晓。
import { useCallback, useEffect } from "react";
import {
  useSharedValue,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  withRepeat,
  cancelAnimation,
  Easing,
  type SharedValue,
} from "react-native-reanimated";
import { RITUAL_TIMING, SPIN_ACCEL_DEG, SPIN_TOTAL_DEG } from "./theme";

export type RitualTimeline = {
  breathing: SharedValue<number>; // 0..1 常驻呼吸
  spin: SharedValue<number>; // 罗盘累计角度（度）
  shake: SharedValue<number>; // -1..1 落地震动
  glow: SharedValue<number>; // 0..1 落地金光
  coins: SharedValue<number>[]; // 每枚铜钱下落进度 0..1
  reveal: SharedValue<number>; // 0..1 结果揭晓
  clock: SharedValue<number>; // 0..1 常驻时钟（烟雾/粒子）
  start: () => void;
  reset: () => void;
};

export function useRitualTimeline(): RitualTimeline {
  const breathing = useSharedValue(0);
  const spin = useSharedValue(0);
  const shake = useSharedValue(0);
  const glow = useSharedValue(0);
  const coin0 = useSharedValue(0);
  const coin1 = useSharedValue(0);
  const coin2 = useSharedValue(0);
  const reveal = useSharedValue(0);
  const clock = useSharedValue(0);
  const coins = [coin0, coin1, coin2];

  // 常驻动画：呼吸 + 时钟（粒子/烟雾），挂载即开始，卸载取消。
  useEffect(() => {
    breathing.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    clock.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.linear }), -1, false);
    return () => {
      cancelAnimation(breathing);
      cancelAnimation(clock);
    };
  }, [breathing, clock]);

  const start = useCallback(() => {
    const T = RITUAL_TIMING;

    // 罗盘：加速（缓入）→ 减速（缓出），固定角度，确定性。
    spin.value = 0;
    spin.value = withSequence(
      withTiming(SPIN_ACCEL_DEG, { duration: T.spinAccel, easing: Easing.in(Easing.cubic) }),
      withTiming(SPIN_TOTAL_DEG, { duration: T.spinDecel, easing: Easing.out(Easing.cubic) }),
    );

    // 三枚铜钱错落下落：下落缓入到 0.82，再用弹簧落定（自带回弹）。
    coins.forEach((c, i) => {
      c.value = 0;
      const delay = T.dropStart + i * T.coinStagger;
      c.value = withDelay(
        delay,
        withSequence(
          withTiming(0.82, { duration: T.coinFall, easing: Easing.in(Easing.quad) }),
          withSpring(1, { damping: 7, stiffness: 200, mass: 0.7 }),
        ),
      );
    });

    // 最后一枚落地时刻：金光闪起后缓回，罗盘细微震动。
    const lastLand = T.dropStart + 2 * T.coinStagger + T.coinFall;
    glow.value = 0;
    glow.value = withDelay(
      lastLand,
      withSequence(
        withTiming(1, { duration: T.glowFlash, easing: Easing.out(Easing.quad) }),
        withTiming(0.22, { duration: T.glowFade, easing: Easing.inOut(Easing.ease) }),
      ),
    );
    shake.value = withDelay(
      lastLand,
      withSequence(
        withTiming(1, { duration: 60 }),
        withTiming(-0.7, { duration: 70 }),
        withTiming(0.4, { duration: 70 }),
        withTiming(0, { duration: 90 }),
      ),
    );

    // 结果卡：落定后留白，再柔和揭晓。
    reveal.value = 0;
    reveal.value = withDelay(
      lastLand + T.revealDelay,
      withTiming(1, { duration: T.revealDuration, easing: Easing.out(Easing.cubic) }),
    );
  }, [coins, glow, reveal, shake, spin]);

  const reset = useCallback(() => {
    [spin, shake, glow, reveal, coin0, coin1, coin2].forEach((sv) => {
      cancelAnimation(sv);
      sv.value = 0;
    });
  }, [coin0, coin1, coin2, glow, reveal, shake, spin]);

  return { breathing, spin, shake, glow, coins, reveal, clock, start, reset };
}

// 组合：氛围层(Skia) → 罗盘 + 铜钱(Reanimated) → 结果卡 → 起卦按钮。
// 所有动画由一条 useRitualTimeline 时间轴编排。
//
// 资产：传入 compassSource（罗盘 PNG，建议正方形透明底）与 coinSource（铜钱 PNG）。
// result：规则引擎产出的结构化结果，动画只负责“揭晓”，不参与起卦计算。
import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  type ImageSourcePropType,
} from "react-native";
import { useRitualTimeline } from "./useRitualTimeline";
import { RitualGlow } from "./RitualGlow";
import { CompassScene } from "./CompassScene";
import { CoinDropLayer } from "./CoinDropLayer";
import { ResultReveal } from "./ResultReveal";
import { RITUAL_COLORS } from "./theme";

export type RitualResult = {
  title: string; // 一句话结论
  hexagram?: string; // 卦名/盘名
  interpretation: string; // 白话解读
};

type Props = {
  compassSource: ImageSourcePropType;
  coinSource: ImageSourcePropType;
  result: RitualResult; // 起卦前由规则引擎+解读后端准备好
  compassSize?: number;
  onStart?: () => void; // 可在此触发真正的起卦/请求解读
};

export function LuopanRitual({
  compassSource,
  coinSource,
  result,
  compassSize = 260,
  onStart,
}: Props) {
  const { width, height } = useWindowDimensions();
  const t = useRitualTimeline();
  const [casting, setCasting] = useState(false);

  // 罗盘中心：屏幕水平居中，垂直略偏上（给结果卡留白）
  const center = { x: width / 2, y: height * 0.42 };

  const handleStart = () => {
    if (casting) return;
    setCasting(true);
    onStart?.();
    t.start();
  };

  const handleReset = () => {
    t.reset();
    setCasting(false);
  };

  return (
    <View style={styles.root}>
      {/* 氛围：暗底 + 柔烟 + 金粒子 + 落地金光 */}
      <RitualGlow glow={t.glow} clock={t.clock} width={width} height={height} center={center} />

      {/* 罗盘 + 铜钱，容器以 center 为原点 */}
      <View
        pointerEvents="none"
        style={[styles.stage, { top: center.y - compassSize / 2, height: compassSize }]}
      >
        <CompassScene
          spin={t.spin}
          breathing={t.breathing}
          shake={t.shake}
          source={compassSource}
          size={compassSize}
        />
        <View style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.coinCenter]}>
          <CoinDropLayer coins={t.coins} source={coinSource} coinSize={56} landY={6} />
        </View>
      </View>

      {/* 结果卡：仅在揭晓阶段浮现 */}
      <ResultReveal reveal={t.reveal}>
        {result.hexagram ? <Text style={styles.hexagram}>{result.hexagram}</Text> : null}
        <Text style={styles.title}>{result.title}</Text>
        <Text style={styles.interpretation}>{result.interpretation}</Text>
        <Pressable onPress={handleReset} style={styles.again}>
          <Text style={styles.againText}>再起一次</Text>
        </Pressable>
      </ResultReveal>

      {/* 起卦按钮：仅在未起卦时显示 */}
      {!casting ? (
        <Pressable onPress={handleStart} style={styles.castBtn}>
          <Text style={styles.castText}>掷铜钱起卦</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: RITUAL_COLORS.bgTop },
  stage: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  coinCenter: { alignItems: "center", justifyContent: "center" },
  castBtn: {
    position: "absolute",
    bottom: 64,
    alignSelf: "center",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 999,
    backgroundColor: RITUAL_COLORS.bronze,
    borderWidth: 1,
    borderColor: RITUAL_COLORS.cardBorder,
  },
  castText: { color: RITUAL_COLORS.goldSoft, fontSize: 16, fontWeight: "700", letterSpacing: 2 },
  hexagram: { color: RITUAL_COLORS.jade, fontSize: 14, marginBottom: 6, letterSpacing: 1 },
  title: { color: RITUAL_COLORS.ink, fontSize: 22, fontWeight: "700", marginBottom: 10 },
  interpretation: { color: RITUAL_COLORS.muted, fontSize: 14, lineHeight: 22 },
  again: { marginTop: 18, alignSelf: "flex-start" },
  againText: { color: RITUAL_COLORS.gold, fontSize: 14, fontWeight: "600" },
});

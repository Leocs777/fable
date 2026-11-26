import { useEffect, useRef } from "react";
import { Image, Modal, Pressable, StatusBar, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { type DivinationMethod, type DivineChart } from "@/lib/api";
import {
  DIVINATION_COMPLETION_MS,
  DIVINATION_METHOD_COPY,
  MOTION_METHOD_BY_API_METHOD,
  type DivinationMotionState,
} from "@/lib/divinationAnimation";
import { l } from "@/lib/i18n";
import { mystic } from "@/theme/mystic";

import { DivinationMotion } from "./DivinationMotion";

const AnimatedImage = Animated.createAnimatedComponent(Image);

type Props = {
  method: DivinationMethod;
  motionState: DivinationMotionState;
  chart: DivineChart | null;
  busy: boolean;
  actionLabel: string;
  hint: string;
  onPress: () => void;
  onGeneratingStartEnd: () => void;
  onGeneratingCompleteEnd: () => void;
  onDismissError: () => void;
};

const branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const gates = ["休", "生", "伤", "杜", "景", "死", "惊", "开"];
const qimenPalaceLabels = ["巽", "离", "坤", "震", "中", "兑", "艮", "坎", "乾"] as const;
const qimenPalaceNumbers = [4, 9, 2, 3, 5, 7, 8, 1, 6] as const;
const meihuaLinePattern = [1, 0, 1, 1, 0, 1] as const;
const qimenCellSequence = [4, 1, 7, 3, 5, 0, 8, 2, 6] as const;
const qimenTextSoundOffsetsMs = [790, 1600, 2410, 3220, 4030, 4840, 5650, 6460, 7270] as const;
const meihuaGuqinPluckOffsetsMs = [1970, 2390, 2910, 3390, 3950, 4710] as const;
const liurenLessonSoundOffsetsMs = [5500, 6500, 7500, 8500] as const;
const liurenThreadSoundOffsetsMs = [700, 3100, 5550] as const;
const meihuaGuqinPluckSound = require("../../../assets/sounds/meihua-guqin-pluck.wav");
const qimenGlyphOpenSound = require("../../../assets/sounds/qimen-glyph-open.wav");
const liurenCardSoftSound = require("../../../assets/sounds/liuren-card-soft.wav");
const liurenThreadRevealSound = require("../../../assets/sounds/liuren-thread-reveal.wav");
const liurenStarPoints = [
  { left: 24, top: 30, group: 0 },
  { left: 66, top: 18, group: 0 },
  { left: 96, top: 54, group: 0 },
  { left: 142, top: 26, group: 1 },
  { left: 190, top: 44, group: 1 },
  { left: 218, top: 88, group: 1 },
  { left: 52, top: 202, group: 2 },
  { left: 96, top: 178, group: 2 },
  { left: 150, top: 206, group: 2 },
  { left: 240, top: 198, group: 3 },
  { left: 214, top: 148, group: 3 },
  { left: 252, top: 118, group: 3 },
] as const;
const liurenStarLines = [
  { left: 28, top: 32, width: 45, rotate: -16, group: 0 },
  { left: 68, top: 24, width: 50, rotate: 44, group: 0 },
  { left: 144, top: 34, width: 54, rotate: 20, group: 1 },
  { left: 190, top: 58, width: 54, rotate: 55, group: 1 },
  { left: 54, top: 194, width: 50, rotate: -28, group: 2 },
  { left: 98, top: 186, width: 60, rotate: 28, group: 2 },
  { left: 214, top: 160, width: 56, rotate: 64, group: 3 },
  { left: 218, top: 132, width: 42, rotate: -38, group: 3 },
] as const;
const liurenSkyStars = [
  { left: "7%", top: "13%", group: 0 },
  { left: "18%", top: "21%", group: 0 },
  { left: "28%", top: "15%", group: 0 },
  { left: "43%", top: "9%", group: 1 },
  { left: "54%", top: "18%", group: 1 },
  { left: "66%", top: "12%", group: 1 },
  { left: "82%", top: "24%", group: 2 },
  { left: "74%", top: "36%", group: 2 },
  { left: "89%", top: "43%", group: 2 },
  { left: "10%", top: "49%", group: 3 },
  { left: "22%", top: "57%", group: 3 },
  { left: "32%", top: "50%", group: 3 },
  { left: "48%", top: "66%", group: 4 },
  { left: "60%", top: "58%", group: 4 },
  { left: "72%", top: "69%", group: 4 },
  { left: "16%", top: "82%", group: 5 },
  { left: "30%", top: "75%", group: 5 },
  { left: "38%", top: "87%", group: 5 },
] as const;
const liurenSkyLines = [
  { left: "8%", top: "16%", width: 86, rotate: 28, group: 0 },
  { left: "18%", top: "18%", width: 68, rotate: -18, group: 0 },
  { left: "44%", top: "12%", width: 78, rotate: 33, group: 1 },
  { left: "55%", top: "15%", width: 72, rotate: -18, group: 1 },
  { left: "75%", top: "31%", width: 70, rotate: 54, group: 2 },
  { left: "74%", top: "39%", width: 62, rotate: 18, group: 2 },
  { left: "12%", top: "53%", width: 78, rotate: 28, group: 3 },
  { left: "23%", top: "54%", width: 72, rotate: -18, group: 3 },
  { left: "50%", top: "62%", width: 86, rotate: -24, group: 4 },
  { left: "60%", top: "61%", width: 82, rotate: 34, group: 4 },
  { left: "18%", top: "79%", width: 92, rotate: -28, group: 5 },
  { left: "30%", top: "80%", width: 66, rotate: 56, group: 5 },
] as const;
const methodSceneImages: Record<DivinationMethod, ImageSourcePropType> = {
  meihua: require("../../../assets/images/divination-meihua-scene.png"),
  qimen: require("../../../assets/images/divination-qimen-scene.png"),
  daliuren: require("../../../assets/images/divination-daliuren-scene.png"),
};
const plumBlossomSoft = require("../../../assets/images/plum-blossom-soft.png");
const plumPetalSoft1 = require("../../../assets/images/plum-petal-botanical-1.png");
const plumPetalSoft2 = require("../../../assets/images/plum-petal-botanical-2.png");
const plumPetalSoft3 = require("../../../assets/images/plum-petal-botanical-3.png");
const plumPetalSoft4 = require("../../../assets/images/plum-petal-botanical-4.png");
const plumPetalSoft5 = require("../../../assets/images/plum-petal-botanical-5.png");
const plumPetalSoft6 = require("../../../assets/images/plum-petal-botanical-6.png");
const qimenDragonHeadLid = require("../../../assets/images/qimen-dragon-head-lid-crisp.png");

export function MethodRitualStage(props: Props) {
  const modalVisible = props.motionState === "generating_start" || props.motionState === "generating_loop" || props.motionState === "generating_complete" || props.motionState === "error";
  return (
    <>
      <MethodRitualSurface {...props} fullscreen={false} />
      <Modal visible={modalVisible} animationType="fade" presentationStyle="fullScreen" onRequestClose={props.onDismissError}>
        <MethodRitualSurface {...props} fullscreen />
      </Modal>
    </>
  );
}

export function MethodResultHeaderAnimation({ method, chart }: { method: DivinationMethod; chart: DivineChart | null }) {
  const reveal = useSharedValue(0);

  useEffect(() => {
    reveal.value = 0;
    reveal.value = withTiming(1, { duration: 780, easing: Easing.out(Easing.cubic) });
  }, [method, chart, reveal]);

  const style = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateY: interpolate(reveal.value, [0, 1], [10, 0]) }, { scale: interpolate(reveal.value, [0, 1], [0.96, 1]) }],
  }));

  return (
    <Animated.View style={[styles.headerAnim, style]}>
      <MethodGlyph method={method} motionState="result_header" compact />
      <View style={styles.headerTextBlock}>
        <Text style={styles.headerKicker}>{l({ zh: "结果盘面", en: "Result chart" })}</Text>
        <Text style={styles.headerTitle}>{DIVINATION_METHOD_COPY[method].completed}</Text>
      </View>
    </Animated.View>
  );
}

function MethodRitualSurface({
  method,
  motionState,
  chart,
  busy,
  actionLabel,
  hint,
  fullscreen,
  onPress,
  onGeneratingStartEnd,
  onGeneratingCompleteEnd,
  onDismissError,
}: Props & { fullscreen: boolean }) {
  const copy = DIVINATION_METHOD_COPY[method];
  const motionMethod = MOTION_METHOD_BY_API_METHOD[method];
  const isError = motionState === "error";
  const isCompleted = motionState === "generating_complete";
  const statusCopy = motionStatusCopy(method, motionState);
  const meihuaSoundEnabled = fullscreen && method === "meihua";
  const qimenSoundEnabled = fullscreen && method === "qimen";
  const liurenSoundEnabled = fullscreen && method === "daliuren";
  const soundEnabled = meihuaSoundEnabled || qimenSoundEnabled || liurenSoundEnabled;
  const firstMeihuaDropPlayer = useAudioPlayer(meihuaGuqinPluckSound);
  const secondMeihuaDropPlayer = useAudioPlayer(meihuaGuqinPluckSound);
  const thirdMeihuaDropPlayer = useAudioPlayer(meihuaGuqinPluckSound);
  const firstQimenLidPlayer = useAudioPlayer(qimenGlyphOpenSound);
  const secondQimenLidPlayer = useAudioPlayer(qimenGlyphOpenSound);
  const thirdQimenLidPlayer = useAudioPlayer(qimenGlyphOpenSound);
  const firstLiurenLessonPlayer = useAudioPlayer(liurenCardSoftSound);
  const secondLiurenLessonPlayer = useAudioPlayer(liurenCardSoftSound);
  const thirdLiurenLessonPlayer = useAudioPlayer(liurenCardSoftSound);
  const firstLiurenThreadPlayer = useAudioPlayer(liurenThreadRevealSound);
  const secondLiurenThreadPlayer = useAudioPlayer(liurenThreadRevealSound);
  const thirdLiurenThreadPlayer = useAudioPlayer(liurenThreadRevealSound);

  useEffect(() => {
    if (!soundEnabled) return;
    void setAudioModeAsync({ playsInSilentMode: true }).catch((error: unknown) => {
      console.warn("[MethodRitualStage] Failed to set audio mode", error);
    });
  }, [soundEnabled]);

  useEffect(() => {
    if (!soundEnabled) return;
    return () => {
      stopMotionSound(firstMeihuaDropPlayer, "meihua guqin pluck 1");
      stopMotionSound(secondMeihuaDropPlayer, "meihua guqin pluck 2");
      stopMotionSound(thirdMeihuaDropPlayer, "meihua guqin pluck 3");
      stopMotionSound(firstQimenLidPlayer, "qimen glyph open 1");
      stopMotionSound(secondQimenLidPlayer, "qimen glyph open 2");
      stopMotionSound(thirdQimenLidPlayer, "qimen glyph open 3");
      stopMotionSound(firstLiurenLessonPlayer, "liuren lesson reveal 1");
      stopMotionSound(secondLiurenLessonPlayer, "liuren lesson reveal 2");
      stopMotionSound(thirdLiurenLessonPlayer, "liuren lesson reveal 3");
      stopMotionSound(firstLiurenThreadPlayer, "liuren thread reveal 1");
      stopMotionSound(secondLiurenThreadPlayer, "liuren thread reveal 2");
      stopMotionSound(thirdLiurenThreadPlayer, "liuren thread reveal 3");
    };
  }, [firstLiurenLessonPlayer, firstLiurenThreadPlayer, firstMeihuaDropPlayer, firstQimenLidPlayer, secondLiurenLessonPlayer, secondLiurenThreadPlayer, secondMeihuaDropPlayer, secondQimenLidPlayer, soundEnabled, thirdLiurenLessonPlayer, thirdLiurenThreadPlayer, thirdMeihuaDropPlayer, thirdQimenLidPlayer]);

  useEffect(() => {
    if (!meihuaSoundEnabled || motionState !== "generating_start") return;
    const players = [firstMeihuaDropPlayer, secondMeihuaDropPlayer, thirdMeihuaDropPlayer];
    const timers = meihuaGuqinPluckOffsetsMs.map((offset, index) =>
      setTimeout(() => replayMotionSound(players[index % players.length], `meihua guqin pluck ${index + 1}`), offset),
    );
    return () => timers.forEach(clearTimeout);
  }, [firstMeihuaDropPlayer, meihuaSoundEnabled, motionState, secondMeihuaDropPlayer, thirdMeihuaDropPlayer]);

  useEffect(() => {
    if (!qimenSoundEnabled || motionState !== "generating_start") return;
    const players = [firstQimenLidPlayer, secondQimenLidPlayer, thirdQimenLidPlayer];
    const timers = qimenTextSoundOffsetsMs.map((offset, index) =>
      setTimeout(() => replayMotionSound(players[index % players.length], `qimen glyph open ${index + 1}`), offset),
    );
    return () => timers.forEach(clearTimeout);
  }, [firstQimenLidPlayer, motionState, qimenSoundEnabled, secondQimenLidPlayer, thirdQimenLidPlayer]);

  useEffect(() => {
    if (!liurenSoundEnabled || motionState !== "generating_start") return;
    const players = [firstLiurenLessonPlayer, secondLiurenLessonPlayer, thirdLiurenLessonPlayer];
    const timers = liurenLessonSoundOffsetsMs.map((offset, index) =>
      setTimeout(() => replayMotionSound(players[index % players.length], `liuren lesson reveal ${index + 1}`), offset),
    );
    return () => timers.forEach(clearTimeout);
  }, [firstLiurenLessonPlayer, liurenSoundEnabled, motionState, secondLiurenLessonPlayer, thirdLiurenLessonPlayer]);

  useEffect(() => {
    if (!liurenSoundEnabled || motionState !== "generating_loop") return;
    const players = [firstLiurenThreadPlayer, secondLiurenThreadPlayer, thirdLiurenThreadPlayer];
    const timers = liurenThreadSoundOffsetsMs.map((offset, index) =>
      setTimeout(() => replayMotionSound(players[index % players.length], `liuren transmission reveal ${index + 1}`), offset),
    );
    return () => timers.forEach(clearTimeout);
  }, [firstLiurenThreadPlayer, liurenSoundEnabled, motionState, secondLiurenThreadPlayer, thirdLiurenThreadPlayer]);

  return (
    <View style={[styles.stage, fullscreen && styles.fullscreenStage]}>
      <StatusBar hidden={fullscreen} barStyle="light-content" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        disabled={busy && !isError}
        onPress={onPress}
        style={styles.motionPressable}
      >
        <DivinationMotion
          method={motionMethod}
          motionState={motionState}
          generatingStartMs={generatingStartMsFor(method)}
          generatingCompleteMs={DIVINATION_COMPLETION_MS}
          onGeneratingStartEnd={onGeneratingStartEnd}
          onGeneratingCompleteEnd={onGeneratingCompleteEnd}
          style={styles.motionLayer}
        >
          <FallbackScene method={method} motionState={motionState} fullscreen={fullscreen} />
        </DivinationMotion>
      </Pressable>

      <View style={[styles.captionPanel, fullscreen && styles.captionPanelFullscreen]}>
        <Text style={styles.eventName}>{isError ? l({ zh: "推演未完成", en: "Reading incomplete" }) : statusCopy.kicker}</Text>
        <Text style={styles.stageTitle}>{isError ? l({ zh: "推演未完成，请重新尝试", en: "The reading did not complete. Please try again." }) : isCompleted ? copy.completed : statusCopy.title}</Text>
        <Text style={styles.stageHint}>
          {isError ? l({ zh: "线索暂未聚合，保留问题后可直接重试。", en: "The signals did not gather. Keep the question and retry directly." }) : isGeneratingMotionState(motionState) ? statusCopy.hint : chartSummary(method, chart) ?? hint}
        </Text>
        {isError ? (
          <View style={styles.errorActions}>
            <Pressable accessibilityRole="button" onPress={onPress} style={styles.retryButton}>
              <Text style={styles.retryText}>{l({ zh: "重新尝试", en: "Try again" })}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onDismissError} style={styles.dismissButton}>
              <Text style={styles.dismissText}>{l({ zh: "返回修改", en: "Edit question" })}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function FallbackScene({ method, motionState, fullscreen }: { method: DivinationMethod; motionState: DivinationMotionState; fullscreen: boolean }) {
  const isError = motionState === "error";
  const isQimen = method === "qimen";
  const sceneLoop = useLoop(motionState, method);
  const sceneStyle = useAnimatedStyle(() => ({
    opacity: isError ? 0.62 : isQimen ? (fullscreen ? 0.76 : 0.84) : 0.94,
    transform: [
      { scale: interpolate(sceneLoop.value, [0, 1], isQimen ? (fullscreen ? [1, 1.025] : [1, 1.018]) : fullscreen ? [1.03, 1.08] : [1.02, 1.055]) },
      { translateY: interpolate(sceneLoop.value, [0, 1], isQimen ? (fullscreen ? [-3, 3] : [-2, 2]) : fullscreen ? [-8, 8] : [-4, 4]) },
    ],
  }));

  return (
    <>
      <AnimatedImage source={methodSceneImages[method]} resizeMode="cover" style={[styles.sceneImage, fullscreen && styles.sceneImageFullscreen, sceneStyle]} />
      <View style={styles.sceneTint} />
      {isQimen ? <View style={styles.qimenSceneTint} /> : null}
      {method === "daliuren" ? <LiurenSkyConstellationLayer motionState={motionState} /> : null}
      <View style={styles.smokeBand} />
      <View style={styles.starOne} />
      <View style={styles.starTwo} />
      <View style={[styles.touchTarget, fullscreen && styles.touchTargetFullscreen]}>
        <MethodGlyph method={method} motionState={motionState} compact={false} fullscreen={fullscreen} />
      </View>
    </>
  );
}

function MethodGlyph({ method, motionState, compact, fullscreen = false }: { method: DivinationMethod; motionState: DivinationMotionState; compact: boolean; fullscreen?: boolean }) {
  if (!compact) return <SceneOverlay method={method} motionState={motionState} fullscreen={fullscreen} />;
  if (method === "meihua") return <MeihuaGlyph motionState={motionState} compact={compact} />;
  if (method === "qimen") return <QimenGlyph motionState={motionState} compact={compact} />;
  return <DaliurenGlyph motionState={motionState} compact={compact} />;
}

function SceneOverlay({ method, motionState, fullscreen }: { method: DivinationMethod; motionState: DivinationMotionState; fullscreen: boolean }) {
  if (method === "meihua") return <MeihuaSceneOverlay motionState={motionState} fullscreen={fullscreen} />;
  if (method === "qimen") return <QimenSceneOverlay motionState={motionState} fullscreen={fullscreen} />;
  return <DaliurenSceneOverlay motionState={motionState} fullscreen={fullscreen} />;
}

function MeihuaSceneOverlay({ motionState, fullscreen }: { motionState: DivinationMotionState; fullscreen: boolean }) {
  const loop = useLoop(motionState, "meihua");
  const isGenerating = isGeneratingMotionState(motionState);
  const waterY = fullscreen ? 188 : 136;
  const wideWaterY = waterY + 4;
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(loop.value, isGenerating ? [0, 0.56, 0.76, 1] : [0, 0.48, 1], isGenerating ? [0, 0, 0.72, 0.14] : [0.1, 0.62, 0.1]),
    transform: [{ translateY: waterY }, { scaleX: interpolate(loop.value, [0.56, 1], [0.82, 1.68], Extrapolation.CLAMP) }, { scaleY: interpolate(loop.value, [0.56, 1], [0.4, 1.12], Extrapolation.CLAMP) }],
  }));
  const wideRippleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(loop.value, isGenerating ? [0, 0.62, 0.84, 1] : [0, 0.62, 1], isGenerating ? [0, 0, 0.38, 0.07] : [0.04, 0.32, 0.04]),
    transform: [{ translateY: wideWaterY }, { scaleX: interpolate(loop.value, [0.62, 1], [1.04, 2.05], Extrapolation.CLAMP) }, { scaleY: interpolate(loop.value, [0.62, 1], [0.44, 1.02], Extrapolation.CLAMP) }],
  }));
  const lightStyle = useAnimatedStyle(() => ({
    opacity: interpolate(loop.value, isGenerating ? [0, 0.58, 0.72, 1] : [0, 0.48, 1], isGenerating ? [0.14, 0.14, 0.82, 0.22] : [0.24, 0.74, 0.24]),
    transform: [{ translateY: waterY }, { scale: interpolate(loop.value, [0.58, 1], [0.64, 1.2], Extrapolation.CLAMP) }],
  }));

  return (
    <View pointerEvents="none" style={[styles.sceneOverlay, styles.meihuaSceneOverlay, fullscreen && styles.meihuaSceneOverlayFullscreen]}>
      <Animated.View style={[styles.meihuaCenterLight, lightStyle]} />
      <Animated.View style={[styles.waterRipple, styles.waterRippleWide, wideRippleStyle]} />
      <Animated.View style={[styles.waterRipple, rippleStyle]} />
      <RealPlumDrop source={plumPetalSoft1} loop={loop} start={0.02} end={0.5} fromX={-104} toX={-18} fromY={fullscreen ? -150 : -118} toY={waterY} size={50} rotateFrom={-32} rotateTo={82} sway={24} />
      <RealPlumDrop source={plumPetalSoft2} loop={loop} start={0.08} end={0.56} fromX={76} toX={18} fromY={fullscreen ? -150 : -118} toY={waterY + 10} size={62} rotateFrom={28} rotateTo={142} sway={-28} />
      <RealPlumDrop source={plumPetalSoft3} loop={loop} start={0.16} end={0.62} fromX={-20} toX={-6} fromY={fullscreen ? -134 : -108} toY={waterY + 4} size={54} rotateFrom={-8} rotateTo={16} sway={16} />
      <RealPlumDrop source={plumPetalSoft4} loop={loop} start={0.24} end={0.66} fromX={108} toX={58} fromY={fullscreen ? -124 : -98} toY={waterY - 2} size={64} rotateFrom={12} rotateTo={78} sway={-18} />
      <RealPlumDrop source={plumPetalSoft5} loop={loop} start={0.32} end={0.7} fromX={-126} toX={-62} fromY={fullscreen ? -110 : -86} toY={waterY + 8} size={60} rotateFrom={-18} rotateTo={32} sway={20} />
      <RealPlumDrop source={plumPetalSoft6} loop={loop} start={0.4} end={0.74} fromX={118} toX={70} fromY={fullscreen ? -96 : -70} toY={waterY + 14} size={48} rotateFrom={22} rotateTo={58} sway={-12} />
      <MeihuaHexagramBuild loop={loop} motionState={motionState} fullscreen={fullscreen} />
      <Text style={styles.miniProcessText}>{l({ zh: "本卦 → 变卦", en: "Primary → Changed" })}</Text>
    </View>
  );
}

function MeihuaHexagramBuild({ loop, motionState, fullscreen }: { loop: SharedValue<number>; motionState: DivinationMotionState; fullscreen: boolean }) {
  const isGenerating = isGeneratingMotionState(motionState);
  const isError = motionState === "error";
  const style = useAnimatedStyle(() => ({
    opacity: isError ? 0.2 : isGenerating ? interpolate(loop.value, [0.68, 0.82, 1], [0, 0.96, 0.9], Extrapolation.CLAMP) : 0.86,
    transform: [
      { translateY: isGenerating ? interpolate(loop.value, [0.68, 0.9], [fullscreen ? 112 : 68, 0], Extrapolation.CLAMP) : 0 },
      { scale: isGenerating ? interpolate(loop.value, [0.68, 0.92, 1], [0.6, 1.55, 1.42], Extrapolation.CLAMP) : interpolate(loop.value, [0, 1], [1.08, 1.22]) },
    ],
  }));

  return (
    <Animated.View style={[styles.hexagramBuild, fullscreen && styles.hexagramBuildFullscreen, style]}>
      {meihuaLinePattern.map((line, index) => (
        <AnimatedHexLine key={index} index={index} value={line} loop={loop} motionState={motionState} />
      ))}
    </Animated.View>
  );
}

function RealPlumDrop({
  source,
  loop,
  start,
  end,
  fromX,
  toX,
  fromY,
  toY,
  size,
  rotateFrom,
  rotateTo,
  sway = 18,
}: {
  source: ImageSourcePropType;
  loop: SharedValue<number>;
  start: number;
  end: number;
  fromX: number;
  toX: number;
  fromY: number;
  toY: number;
  size: number;
  rotateFrom: number;
  rotateTo: number;
  sway?: number;
}) {
  const style = useAnimatedStyle(() => {
    const progress = interpolate(loop.value, [start, end], [0, 1], Extrapolation.CLAMP);
    const fall = progress * progress * (1.64 - 0.64 * progress);
    const drift = Math.sin(progress * Math.PI * 2.4) * sway * (1 - progress * 0.28);
    const opacity = interpolate(progress, [0, 0.12, 0.78, 1], [0, 0.96, 0.86, 0], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [
        { translateX: fromX + (toX - fromX) * progress + drift },
        { translateY: fromY + (toY + 28 - fromY) * fall },
        { rotate: `${rotateFrom + (rotateTo - rotateFrom) * progress + Math.sin(progress * Math.PI * 1.8) * 12}deg` },
        { scale: interpolate(progress, [0, 0.72, 1], [0.82, 1, 0.58]) },
      ],
    };
  });

  return <AnimatedImage source={source} resizeMode="contain" style={[styles.realPlumDrop, { height: size, width: size }, style]} />;
}

function QimenSceneOverlay({ motionState, fullscreen }: { motionState: DivinationMotionState; fullscreen: boolean }) {
  const loop = useLoop(motionState, "qimen");
  const isGenerating = isGeneratingMotionState(motionState);
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(loop.value, [0, 0.5, 1], [0.28, 0.7, 0.28]),
    transform: [{ rotate: `${interpolate(loop.value, [0, 1], [0, isGenerating ? 32 : 8])}deg` }],
  }));
  const lockStyle = useAnimatedStyle(() => ({
    opacity: motionState === "generating_complete" ? interpolate(loop.value, [0, 1], [0.2, 0.85]) : 0.28,
    transform: [{ scale: interpolate(loop.value, [0, 1], [0.9, 1.06]) }],
  }));

  return (
    <View pointerEvents="none" style={[styles.sceneOverlay, styles.qimenSceneOverlay, fullscreen && styles.qimenSceneOverlayFullscreen]}>
      <View style={styles.qimenMapPlate}>
        <View style={styles.qimenPlateBronzeWash} />
        <View style={styles.qimenPlateOuterLip} />
        <View style={styles.qimenPlateInnerTray} />
        <View style={[styles.qimenPlateSideLip, styles.qimenPlateSideLipTop]} />
        <View style={[styles.qimenPlateSideLip, styles.qimenPlateSideLipBottom]} />
        <View style={[styles.qimenPlateSideLipVertical, styles.qimenPlateSideLipLeft]} />
        <View style={[styles.qimenPlateSideLipVertical, styles.qimenPlateSideLipRight]} />
        <View style={[styles.qimenPlateGridLine, styles.qimenPlateGridH1]} />
        <View style={[styles.qimenPlateGridLine, styles.qimenPlateGridH2]} />
        <View style={[styles.qimenPlateGridLine, styles.qimenPlateGridV1]} />
        <View style={[styles.qimenPlateGridLine, styles.qimenPlateGridV2]} />
        <View style={[styles.qimenPlateCornerRivet, styles.qimenPlateCornerTL]} />
        <View style={[styles.qimenPlateCornerRivet, styles.qimenPlateCornerTR]} />
        <View style={[styles.qimenPlateCornerRivet, styles.qimenPlateCornerBL]} />
        <View style={[styles.qimenPlateCornerRivet, styles.qimenPlateCornerBR]} />
      </View>
      <Animated.View style={[styles.qimenAuraRing, ringStyle]} />
      <Animated.View style={[styles.qimenLockGlow, lockStyle]} />
      <View style={styles.qimenOverlayGrid}>
        {Array.from({ length: 9 }, (_, cellIndex) => (
          <QimenPalaceCell key={cellIndex} cellIndex={cellIndex} order={qimenCellSequence.indexOf(cellIndex as (typeof qimenCellSequence)[number])} motionState={motionState} loop={loop} />
        ))}
      </View>
    </View>
  );
}

function DaliurenSceneOverlay({ motionState, fullscreen }: { motionState: DivinationMotionState; fullscreen: boolean }) {
  const loop = useLoop(motionState, "daliuren");
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(loop.value, [0, 0.5, 1], [0.18, 0.72, 0.18]),
    transform: [{ scale: interpolate(loop.value, [0, 1], [0.82, 1.08]) }],
  }));

  return (
    <View pointerEvents="none" style={[styles.sceneOverlay, styles.daliurenSceneOverlay, fullscreen && styles.daliurenSceneOverlayFullscreen]}>
      <LiurenConstellationLayer loop={loop} />
      <View style={styles.daliurenMapPlate} />
      <Animated.View style={[styles.daliurenPulse, pulseStyle]} />
      <View style={styles.daliurenBranchDial}>
        {branches.map((branch, index) => (
          <DaliurenBranchMark key={branch} branch={branch} index={index} loop={loop} motionState={motionState} />
        ))}
      </View>
      <View style={styles.lessonMiniDeck}>
        {["一课", "二课", "三课", "四课"].map((label, index) => (
          <LiurenLessonCard key={label} index={index} label={label} loop={loop} motionState={motionState} />
        ))}
      </View>
      {[0, 1, 2].map((index) => (
        <DaliurenThread key={index} index={index} loop={loop} motionState={motionState} />
      ))}
      <View style={styles.transmissionMiniRow}>
        {["初传", "中传", "末传"].map((label, index) => (
          <TransmissionMiniMark key={label} index={index} label={label} loop={loop} motionState={motionState} />
        ))}
      </View>
    </View>
  );
}

function LiurenSkyConstellationLayer({ motionState }: { motionState: DivinationMotionState }) {
  const loop = useLoop(motionState, "daliuren");

  return (
    <View pointerEvents="none" style={styles.liurenSkyConstellationLayer}>
      {liurenSkyLines.map((line, index) => (
        <LiurenSkyLine key={`sky-line-${index}`} index={index} line={line} loop={loop} motionState={motionState} />
      ))}
      {liurenSkyStars.map((star, index) => (
        <LiurenSkyStar key={`sky-star-${index}`} index={index} star={star} loop={loop} motionState={motionState} />
      ))}
    </View>
  );
}

function LiurenSkyStar({
  index,
  star,
  loop,
  motionState,
}: {
  index: number;
  star: (typeof liurenSkyStars)[number];
  loop: SharedValue<number>;
  motionState: DivinationMotionState;
}) {
  const isError = motionState === "error";
  const style = useAnimatedStyle(() => {
    const start = 0.03 + star.group * 0.12 + (index % 3) * 0.024;
    const peak = Math.min(start + 0.1, 1);
    const breathe = interpolate(loop.value, [0, 0.5, 1], [0.82, 1.34, 0.86]);
    return {
      opacity: isError ? 0.18 : interpolate(loop.value, [start, peak, 1], [0.24, 0.98, 0.46], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(loop.value, [start, peak], [0.68, breathe], Extrapolation.CLAMP) }],
    };
  });

  return <Animated.View style={[styles.liurenSkyStarPoint, { left: star.left, top: star.top }, style]} />;
}

function LiurenSkyLine({
  index,
  line,
  loop,
  motionState,
}: {
  index: number;
  line: (typeof liurenSkyLines)[number];
  loop: SharedValue<number>;
  motionState: DivinationMotionState;
}) {
  const isError = motionState === "error";
  const style = useAnimatedStyle(() => {
    const start = 0.04 + line.group * 0.12 + (index % 2) * 0.032;
    const peak = Math.min(start + 0.16, 1);
    return {
      opacity: isError ? 0.1 : interpolate(loop.value, [start, peak, 1], [0.04, 0.44, 0.2], Extrapolation.CLAMP),
      transform: [{ rotateZ: `${line.rotate}deg` }, { scaleX: interpolate(loop.value, [start, peak], [0.05, 1], Extrapolation.CLAMP) }],
    };
  });

  return <Animated.View style={[styles.liurenSkyStarLine, { left: line.left, top: line.top, width: line.width }, style]} />;
}

function LiurenConstellationLayer({ loop }: { loop: SharedValue<number> }) {
  return (
    <View style={styles.liurenConstellationLayer}>
      {liurenStarLines.map((line, index) => (
        <LiurenStarLine key={`line-${index}`} index={index} line={line} loop={loop} />
      ))}
      {liurenStarPoints.map((star, index) => (
        <LiurenStar key={`star-${index}`} index={index} star={star} loop={loop} />
      ))}
    </View>
  );
}

function LiurenStar({ index, star, loop }: { index: number; star: (typeof liurenStarPoints)[number]; loop: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const start = 0.04 + star.group * 0.19 + (index % 3) * 0.028;
    const peak = Math.min(start + 0.14, 1);
    const end = Math.min(start + 0.54, 1);
    return {
      opacity: interpolate(loop.value, [start, peak, end], [0.18, 0.95, 0.42], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(loop.value, [start, peak, end], [0.62, 1.3, 0.94], Extrapolation.CLAMP) }],
    };
  });

  return <Animated.View style={[styles.liurenStarPoint, { left: star.left, top: star.top }, style]} />;
}

function LiurenStarLine({ index, line, loop }: { index: number; line: (typeof liurenStarLines)[number]; loop: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const start = 0.06 + line.group * 0.19 + (index % 2) * 0.036;
    const peak = Math.min(start + 0.18, 1);
    const end = Math.min(start + 0.58, 1);
    return {
      opacity: interpolate(loop.value, [start, peak, end], [0.04, 0.5, 0.24], Extrapolation.CLAMP),
      transform: [{ rotateZ: `${line.rotate}deg` }, { scaleX: interpolate(loop.value, [start, peak], [0.08, 1], Extrapolation.CLAMP) }],
    };
  });

  return <Animated.View style={[styles.liurenStarLine, { left: line.left, top: line.top, width: line.width }, style]} />;
}

function DaliurenBranchMark({ branch, index, loop, motionState }: { branch: string; index: number; loop: SharedValue<number>; motionState: DivinationMotionState }) {
  const isGenerating = isGeneratingMotionState(motionState);
  const isError = motionState === "error";
  const angle = (Math.PI * 2 * index) / branches.length - Math.PI / 2;
  const radius = 112;
  const style = useAnimatedStyle(() => {
    const start = 0.08 + index * 0.045;
    const end = start + 0.16;
    return {
      opacity: isError ? 0.2 : isGenerating ? interpolate(loop.value, [start, end], [0.08, 0.9], Extrapolation.CLAMP) : 0.82,
      transform: [
        { translateY: isGenerating ? interpolate(loop.value, [start, end], [8, 0], Extrapolation.CLAMP) : 0 },
        { scale: isGenerating ? interpolate(loop.value, [start, end], [0.72, 1.08], Extrapolation.CLAMP) : 1 },
      ],
    };
  });

  return (
    <Animated.Text style={[styles.daliurenBranchLabel, { left: 135 + Math.cos(angle) * radius, top: 116 + Math.sin(angle) * radius }, style]}>
      {branch}
    </Animated.Text>
  );
}

function LiurenLessonCard({ index, label, loop, motionState }: { index: number; label: string; loop: SharedValue<number>; motionState: DivinationMotionState }) {
  const isGenerating = isGeneratingMotionState(motionState);
  const isError = motionState === "error";
  const style = useAnimatedStyle(() => {
    const start = 0.36 + index * 0.065;
    const end = start + 0.16;
    return {
      opacity: isError ? 0.2 : isGenerating ? interpolate(loop.value, [start, end], [0, 0.92], Extrapolation.CLAMP) : 0.86,
      transform: [
        { perspective: 420 },
        { translateY: isGenerating ? interpolate(loop.value, [start, end], [20, 0], Extrapolation.CLAMP) : 0 },
        { rotateY: `${isGenerating ? interpolate(loop.value, [start, end], [-74, 0], Extrapolation.CLAMP) : 0}deg` },
        { rotateZ: `${(index - 1.5) * 5}deg` },
      ],
    };
  });

  return (
    <Animated.View style={[styles.lessonMiniCard, style]}>
      <Text style={styles.lessonMiniText}>{label}</Text>
    </Animated.View>
  );
}

function DaliurenThread({ index, loop, motionState }: { index: number; loop: SharedValue<number>; motionState: DivinationMotionState }) {
  const isGenerating = isGeneratingMotionState(motionState);
  const isError = motionState === "error";
  const style = useAnimatedStyle(() => {
    const start = 0.74 + index * 0.07;
    const end = Math.min(start + 0.15, 1);
    return {
      opacity: isError ? 0.16 : isGenerating ? interpolate(loop.value, [start, end], [0, 0.78], Extrapolation.CLAMP) : interpolate(loop.value, [0, 0.5, 1], [0.3, 0.68, 0.3]),
      transform: [
        { rotateZ: `${index * 34 - 18}deg` },
        { scaleX: isGenerating ? interpolate(loop.value, [start, end], [0.02, 1], Extrapolation.CLAMP) : interpolate(loop.value, [0, 1], [0.72, 1.12]) },
      ],
    };
  });

  return <Animated.View style={[styles.daliurenThread, style]} />;
}

function TransmissionMiniMark({ index, label, loop, motionState }: { index: number; label: string; loop: SharedValue<number>; motionState: DivinationMotionState }) {
  const isGenerating = isGeneratingMotionState(motionState);
  const isError = motionState === "error";
  const style = useAnimatedStyle(() => {
    const start = 0.74 + index * 0.07;
    const end = Math.min(start + 0.15, 1);
    return {
      opacity: isError ? 0.22 : isGenerating ? interpolate(loop.value, [start, end], [0, 0.94], Extrapolation.CLAMP) : 0.84,
      transform: [
        { translateY: isGenerating ? interpolate(loop.value, [start, end], [7, 0], Extrapolation.CLAMP) : 0 },
        { scale: isGenerating ? interpolate(loop.value, [start, end], [0.86, 1.08], Extrapolation.CLAMP) : 1 },
      ],
    };
  });

  return (
    <Animated.Text style={[styles.transmissionMiniText, index === 0 && styles.transmissionMiniTextFirst, index === 1 && styles.transmissionMiniTextSecond, index === 2 && styles.transmissionMiniTextThird, style]}>
      {label}
    </Animated.Text>
  );
}

function AnimatedHexLine({ index, value, loop, motionState }: { index: number; value: 0 | 1; loop: SharedValue<number>; motionState: DivinationMotionState }) {
  const isGenerating = isGeneratingMotionState(motionState);
  const isError = motionState === "error";
  const style = useAnimatedStyle(() => {
    const activeThreshold = 0.68 + index * 0.048;
    const opacity = isGenerating
      ? interpolate(loop.value, [activeThreshold, Math.min(activeThreshold + 0.12, 0.98)], [0.12, 0.96], Extrapolation.CLAMP)
      : isError
        ? 0.18
        : 0.74;
    return {
      opacity,
      transform: [{ translateX: interpolate(loop.value, [activeThreshold, Math.min(activeThreshold + 0.12, 0.98)], [-12 + index * 1.5, 0], Extrapolation.CLAMP) }],
    };
  });

  return (
    <Animated.View style={[styles.hexagramLine, style]}>
      {value === 1 ? (
        <View style={styles.hexagramYang} />
      ) : (
        <View style={styles.hexagramYin}>
          <View style={styles.hexagramYinHalf} />
          <View style={styles.hexagramYinHalf} />
        </View>
      )}
    </Animated.View>
  );
}

function QimenPalaceCell({
  cellIndex,
  order,
  motionState,
  loop,
}: {
  cellIndex: number;
  order: number;
  motionState: DivinationMotionState;
  loop: SharedValue<number>;
}) {
  const isGenerating = isGeneratingMotionState(motionState);
  const isError = motionState === "error";
  const isCenterCell = cellIndex === 4;
  const qimenCellStart = 0.04 + order * 0.077;
  const cellStyle = useAnimatedStyle(() => {
    const start = qimenCellStart;
    const end = Math.min(start + 0.135, 1);
    const activeOpacity = interpolate(loop.value, [start, end], [0.46, isCenterCell ? 1 : 0.9], Extrapolation.CLAMP);
    return {
      opacity: isError ? 0.26 : isGenerating ? activeOpacity : isCenterCell ? 0.96 : 0.76,
      transform: [
        { translateY: isGenerating ? interpolate(loop.value, [start, end], [11, 0], Extrapolation.CLAMP) : 0 },
        { scale: isCenterCell && !isGenerating ? interpolate(loop.value, [0, 1], [0.95, 1.045]) : interpolate(loop.value, [start, end], [0.94, 1], Extrapolation.CLAMP) },
      ],
    };
  });
  const textStyle = useAnimatedStyle(() => {
    const start = qimenCellStart + 0.125;
    const end = Math.min(start + 0.075, 1);
    return {
      opacity: isError ? 0.2 : isGenerating ? interpolate(loop.value, [start, end], [0, 1], Extrapolation.CLAMP) : 1,
      transform: [
        { perspective: 420 },
        { rotateY: `${isGenerating ? interpolate(loop.value, [start, end], [-78, 0], Extrapolation.CLAMP) : 0}deg` },
        { scale: isGenerating ? interpolate(loop.value, [start, end], [0.86, 1], Extrapolation.CLAMP) : 1 },
      ],
    };
  });
  const lidStyle = useAnimatedStyle(() => {
    const start = qimenCellStart;
    const holdEnd = Math.min(start + 0.06, 1);
    const liftEnd = Math.min(start + 0.14, 1);
    const flyEnd = Math.min(start + 0.22, 1);
    const visible = motionState === "generating_start" || motionState === "generating_loop" || motionState === "pressed" || motionState === "entering";
    return {
      opacity: isError ? 0 : visible ? interpolate(loop.value, [start, holdEnd, liftEnd, flyEnd], [1, 1, 0.98, 0], Extrapolation.CLAMP) : 0,
      transform: [
        { perspective: 900 },
        { translateY: visible ? interpolate(loop.value, [start, holdEnd, liftEnd, flyEnd], [0, 0, -18, -78], Extrapolation.CLAMP) : -78 },
        { translateX: visible ? interpolate(loop.value, [start, holdEnd, liftEnd, flyEnd], [0, 0, (order % 2 === 0 ? -1 : 1) * 5, (order % 2 === 0 ? -1 : 1) * 22], Extrapolation.CLAMP) : 0 },
        { rotateX: `${visible ? interpolate(loop.value, [start, holdEnd, liftEnd, flyEnd], [0, 0, 7, 14], Extrapolation.CLAMP) : 14}deg` },
        { rotateZ: `${visible ? interpolate(loop.value, [start, holdEnd, flyEnd], [0, 0, (order - 4) * 6], Extrapolation.CLAMP) : 0}deg` },
        { scale: visible ? interpolate(loop.value, [start, holdEnd, liftEnd, flyEnd], [1.08, 1.08, 1.04, 0.9], Extrapolation.CLAMP) : 0.9 },
      ],
    };
  });

  return (
    <Animated.View style={[styles.qimenOverlayCell, cellIndex === 4 && styles.qimenOverlayCellActive, cellStyle]}>
      <View style={[styles.qimenCellSolidBack, cellIndex === 4 && styles.qimenCellSolidBackActive]} />
      <View style={styles.qimenCellPatina} />
      <View style={styles.qimenCellInnerFrame} />
      <View style={[styles.qimenCellRivet, styles.qimenCellRivetTL]} />
      <View style={[styles.qimenCellRivet, styles.qimenCellRivetTR]} />
      <View style={[styles.qimenCellRivet, styles.qimenCellRivetBL]} />
      <View style={[styles.qimenCellRivet, styles.qimenCellRivetBR]} />
      <Animated.View style={[styles.qimenGateTextWrap, textStyle]}>
        <Text style={styles.qimenOverlayGate}>{qimenPalaceLabels[cellIndex]}</Text>
        <Text style={styles.qimenOverlayGateSub}>{qimenPalaceNumbers[cellIndex]}宫</Text>
        <Text style={styles.qimenOverlayDoor}>{cellIndex === 4 ? "值符" : `${gates[order % gates.length]}门`}</Text>
      </Animated.View>
      <Animated.View style={[styles.qimenBronzeLid, lidStyle]}>
        <Image source={qimenDragonHeadLid} resizeMode="cover" style={styles.qimenDragonLidImage} />
        <View style={styles.qimenLidImageShade} />
        <View style={styles.qimenLidLowerLip} />
      </Animated.View>
    </Animated.View>
  );
}

function MeihuaGlyph({ motionState, compact }: { motionState: DivinationMotionState; compact: boolean }) {
  const loop = useLoop(motionState, "meihua");
  const blossomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(loop.value, [0, 1], compact ? [-3, 3] : [-20, 18]) },
      { rotate: `${interpolate(loop.value, [0, 1], [-12, 18])}deg` },
      { scale: motionState === "generating_complete" ? 0.82 : 1 },
    ],
  }));
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(loop.value, [0, 0.7, 1], [0.2, 0.72, 0.2]),
    transform: [{ scale: interpolate(loop.value, [0, 1], [0.68, 1.18]) }],
  }));

  return (
    <View style={[styles.glyphWrap, compact && styles.compactGlyph]}>
      <Animated.View style={[styles.ripple, compact && styles.compactRipple, rippleStyle]} />
      <AnimatedImage source={plumBlossomSoft} resizeMode="contain" style={[styles.plumBlossomImage, compact && styles.compactBlossomImage, blossomStyle]} />
      {!compact ? <Text style={styles.centerSeal}>{l({ zh: "梅", en: "Plum" })}</Text> : null}
    </View>
  );
}

function QimenGlyph({ motionState, compact }: { motionState: DivinationMotionState; compact: boolean }) {
  const loop = useLoop(motionState, "qimen");
  const isGenerating = isGeneratingMotionState(motionState);
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(loop.value, [0, 1], [0, isGenerating ? 38 : 7])}deg` }],
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(loop.value, [0, 0.5, 1], [0.32, 0.92, 0.32]),
  }));

  return (
    <View style={[styles.glyphWrap, compact && styles.compactGlyph]}>
      <Animated.View style={[styles.outerRing, compact && styles.compactRing, ringStyle]} />
      <View style={[styles.qimenGridStage, compact && styles.compactGrid]}>
        {Array.from({ length: 9 }, (_, index) => (
          <Animated.View key={index} style={[styles.qimenMiniCell, compact && styles.compactCell, index === 4 && pulseStyle]}>
            <Text style={[styles.qimenMiniText, compact && styles.compactTinyText]}>{gates[index % gates.length]}</Text>
          </Animated.View>
        ))}
      </View>
      {!compact ? <Text style={styles.centerSeal}>{l({ zh: "九宫", en: "Nine" })}</Text> : null}
    </View>
  );
}

function DaliurenGlyph({ motionState, compact }: { motionState: DivinationMotionState; compact: boolean }) {
  const loop = useLoop(motionState, "daliuren");
  const isGenerating = isGeneratingMotionState(motionState);
  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(loop.value, [0, 1], [0, isGenerating ? -44 : -8])}deg` }],
  }));
  const lineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(loop.value, [0, 0.5, 1], [0.28, 0.86, 0.28]),
    transform: [{ scaleX: interpolate(loop.value, [0, 1], [0.7, 1]) }],
  }));

  return (
    <View style={[styles.glyphWrap, compact && styles.compactGlyph]}>
      <Animated.View style={[styles.branchRing, compact && styles.compactRing, orbitStyle]}>
        {branches.map((branch, index) => {
          const angle = (Math.PI * 2 * index) / branches.length;
          const radius = compact ? 28 : 82;
          return (
            <Text
              key={branch}
              style={[
                styles.branchText,
                compact && styles.compactTinyText,
                { left: compact ? 32 + Math.cos(angle) * radius : 94 + Math.cos(angle) * radius, top: compact ? 32 + Math.sin(angle) * radius : 94 + Math.sin(angle) * radius },
              ]}
            >
              {branch}
            </Text>
          );
        })}
      </Animated.View>
      {[0, 1, 2].map((index) => (
        <Animated.View key={index} style={[styles.causalLine, compact && styles.compactCausalLine, { transform: [{ rotate: `${index * 58 - 28}deg` }] }, lineStyle]} />
      ))}
      {!compact ? <Text style={styles.centerSeal}>{l({ zh: "三传", en: "Three" })}</Text> : null}
    </View>
  );
}

function useLoop(motionState: DivinationMotionState, method?: DivinationMethod) {
  const loop = useSharedValue(0);
  const previousMotionStateRef = useRef<DivinationMotionState | null>(null);

  useEffect(() => {
    const previousMotionState = previousMotionStateRef.current;
    previousMotionStateRef.current = motionState;
    if (motionState === "error") {
      loop.value = 0;
      loop.value = withSequence(withTiming(0.35, { duration: 260 }), withTiming(0, { duration: 420 }));
      return;
    }
    if (motionState === "generating_complete") {
      loop.value = withTiming(1, { duration: DIVINATION_COMPLETION_MS, easing: Easing.out(Easing.cubic) });
      return;
    }
    const isGenerating = isGeneratingMotionState(motionState);
    if (isGenerating) {
      if (motionState === "generating_start" || !isGeneratingMotionState(previousMotionState)) {
        loop.value = 0;
        loop.value = withTiming(generatingStartTarget(method), { duration: generatingStartMsFor(method), easing: generatingStartEasingFor(method) });
        return;
      }
      loop.value = withTiming(0.98, { duration: generatingLoopContinuationMsFor(method), easing: Easing.inOut(Easing.cubic) });
      return;
    }
    loop.value = 0;
    loop.value = withDelay(80, withRepeat(withTiming(1, { duration: idleLoopDuration(method), easing: Easing.inOut(Easing.ease) }), -1, true));
  }, [loop, method, motionState]);

  return loop;
}

function idleLoopDuration(method: DivinationMethod | undefined): number {
  if (method === "daliuren") return 18000;
  if (method === "qimen") return 15000;
  if (method === "meihua") return 13000;
  return 8200;
}

function generatingStartTarget(method: DivinationMethod | undefined): number {
  if (method === "qimen") return 0.78;
  if (method === "daliuren") return 0.72;
  if (method === "meihua") return 0.74;
  return 0.42;
}

function generatingLoopContinuationMsFor(method: DivinationMethod | undefined): number {
  if (method === "daliuren") return 9000;
  if (method === "qimen") return 9200;
  if (method === "meihua") return 9000;
  return 7000;
}

function generatingStartMsFor(method: DivinationMethod | undefined): number {
  if (method === "daliuren") return 11000;
  if (method === "qimen") return 8200;
  if (method === "meihua") return 8800;
  return 5200;
}

function generatingStartEasingFor(method: DivinationMethod | undefined) {
  if (method === "qimen" || method === "daliuren") return Easing.linear;
  return Easing.out(Easing.cubic);
}

function isGeneratingMotionState(motionState: DivinationMotionState | null | undefined): boolean {
  return motionState === "generating_start" || motionState === "generating_loop";
}

function replayMotionSound(player: ReturnType<typeof useAudioPlayer>, label: string) {
  void player.seekTo(0).then(() => {
    player.play();
  }).catch((error: unknown) => {
    console.warn(`[MethodRitualStage] Failed to play ${label} sound`, error);
  });
}

function stopMotionSound(player: ReturnType<typeof useAudioPlayer>, label: string) {
  try {
    player.pause();
    void player.seekTo(0).catch((error: unknown) => {
      if (isReleasedAudioObject(error)) return;
      console.warn(`[MethodRitualStage] Failed to reset ${label} sound`, error);
    });
  } catch (error) {
    if (isReleasedAudioObject(error)) return;
    console.warn(`[MethodRitualStage] Failed to stop ${label} sound`, error);
  }
}

function isReleasedAudioObject(error: unknown): boolean {
  return error instanceof Error && error.message.includes("NativeSharedObjectNotFoundException");
}

function chartSummary(method: DivinationMethod, chart: DivineChart | null): string | null {
  if (!chart) return null;
  if (method === "meihua" && chart.method === "meihua") return `${chart.hexagram} → ${chart.changed}${l({ zh: `，动第 ${chart.moving} 爻`, en: `, changing line ${chart.moving}` })}`;
  if (method === "qimen" && chart.method === "qimen") return `${chart.dun} ${chart.ju}${l({ zh: ` 局，值符落 ${chart.fuPalace} 宫`, en: ` chart, chief sign in palace ${chart.fuPalace}` })}`;
  if (method === "daliuren" && chart.method === "daliuren") return l({ zh: `${chart.dayGanzhi}日，${chart.monthGeneral}将，${chart.hour}时`, en: `${chart.dayGanzhi} day, ${chart.monthGeneral} general, ${chart.hour} hour` });
  return null;
}

function motionStatusCopy(method: DivinationMethod, motionState: DivinationMotionState): { kicker: string; title: string; hint: string } {
  if (method === "meihua") {
    if (motionState === "generating_start") return { kicker: l({ zh: "一念起象", en: "Intent forms" }), title: l({ zh: "梅影入水", en: "Plum shadow enters water" }), hint: l({ zh: "问题凝成光点，外应开始取象。", en: "The question gathers as a point of light and the outer sign begins to form." }) };
    if (motionState === "generating_complete") return { kicker: l({ zh: "起卦完成", en: "Casting complete" }), title: l({ zh: "本卦变卦已定", en: "Primary and changed hexagrams are set" }), hint: l({ zh: "本卦与变卦已收束，准备进入解读。", en: "The primary and changed hexagrams have gathered and are ready for interpretation." }) };
    return { kicker: l({ zh: "取象中", en: "Reading signs" }), title: l({ zh: "水纹成卦", en: "Ripples form the hexagram" }), hint: l({ zh: "梅花、涟漪与六爻线正在自下而上聚合。", en: "Petals, ripples, and six lines are gathering from bottom to top." }) };
  }
  if (method === "qimen") {
    if (motionState === "generating_start") return { kicker: l({ zh: "时间定局", en: "Time anchors" }), title: l({ zh: "九宫展开", en: "Nine palaces unfold" }), hint: l({ zh: "占时落入中宫，天盘与地盘开始对齐。", en: "The casting time lands in the center as the heaven and earth plates align." }) };
    if (motionState === "generating_complete") return { kicker: l({ zh: "奇门局已成", en: "Qi Men chart formed" }), title: l({ zh: "方位取势", en: "Direction takes shape" }), hint: l({ zh: "八门落宫，关键宫位已经锁定。", en: "The eight gates settle and the key palace locks into place." }) };
    return { kicker: l({ zh: "八门落宫", en: "Gates settling" }), title: l({ zh: "排局中", en: "Arranging chart" }), hint: l({ zh: "九宫由中心向外点亮，方位环缓慢归位。", en: "The nine palaces light from the center outward as the directional ring settles." }) };
  }
  if (motionState === "generating_start") return { kicker: l({ zh: "占时起课", en: "Hour begins the lesson" }), title: l({ zh: "十二支定位", en: "Twelve branches align" }), hint: l({ zh: "占时印记落入中心，地支环开始浮现。", en: "The time seal lands in the center and the earthly branch ring appears." }) };
  if (motionState === "generating_complete") return { kicker: l({ zh: "三传已明", en: "Three transmissions clear" }), title: l({ zh: "四课三传收束", en: "Lessons and transmissions gather" }), hint: l({ zh: "初传、中传、末传汇聚成因果链。", en: "Initial, middle, and final transmissions gather into one causal line." }) };
  return { kicker: l({ zh: "四课成象", en: "Four lessons form" }), title: l({ zh: "三传推演中", en: "Transmissions unfolding" }), hint: l({ zh: "四课卡片翻开，三条线索依次被点亮。", en: "The four lesson cards open and three clues light in sequence." }) };
}

const styles = StyleSheet.create({
  stage: {
    alignItems: "center",
    backgroundColor: "#172627",
    borderRadius: 28,
    justifyContent: "center",
    minHeight: 342,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  fullscreenStage: {
    borderRadius: 0,
    flex: 1,
    minHeight: "100%",
    paddingHorizontal: 24,
  },
  sceneImage: {
    ...StyleSheet.absoluteFill,
    height: "104%",
    width: "104%",
  },
  sceneImageFullscreen: {
    height: "108%",
    width: "108%",
  },
  motionPressable: {
    alignItems: "center",
    alignSelf: "stretch",
    flex: 1,
    justifyContent: "center",
    minHeight: 342,
  },
  motionLayer: {
    alignItems: "center",
    alignSelf: "stretch",
    flex: 1,
    justifyContent: "center",
    minHeight: 342,
    width: "100%",
  },
  sceneTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(5, 8, 8, 0.26)",
  },
  qimenSceneTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(5, 10, 9, 0.18)",
  },
  smokeBand: {
    backgroundColor: "rgba(242,213,138,0.11)",
    borderRadius: 120,
    height: 170,
    left: -36,
    position: "absolute",
    top: 48,
    transform: [{ rotate: "-18deg" }, { scaleX: 1.6 }],
    width: 250,
  },
  starOne: {
    backgroundColor: mystic.goldSoft,
    borderRadius: 2,
    height: 4,
    opacity: 0.6,
    position: "absolute",
    right: 68,
    top: 58,
    width: 4,
  },
  starTwo: {
    backgroundColor: mystic.jade,
    borderRadius: 2,
    bottom: 86,
    height: 4,
    left: 58,
    opacity: 0.55,
    position: "absolute",
    width: 4,
  },
  touchTarget: {
    alignItems: "center",
    justifyContent: "center",
  },
  touchTargetFullscreen: {
    marginBottom: 108,
  },
  sceneOverlay: {
    alignItems: "center",
    height: 194,
    justifyContent: "center",
    position: "relative",
    width: 250,
  },
  meihuaSceneOverlay: {
    height: 266,
    overflow: "visible",
    width: 292,
  },
  meihuaSceneOverlayFullscreen: {
    height: 352,
    width: 308,
  },
  waterRipple: {
    borderColor: "rgba(242,213,138,0.62)",
    borderRadius: 80,
    borderWidth: 2,
    height: 58,
    position: "absolute",
    width: 188,
  },
  waterRippleWide: {
    borderColor: "rgba(209,229,220,0.34)",
    height: 84,
    width: 214,
  },
  meihuaCenterLight: {
    backgroundColor: "rgba(244,218,149,0.24)",
    borderColor: "rgba(255,242,205,0.5)",
    borderRadius: 38,
    borderWidth: 1,
    height: 76,
    position: "absolute",
    top: 112,
    width: 76,
  },
  hexagramBuild: {
    flexDirection: "column-reverse",
    gap: 5,
    left: 110,
    position: "absolute",
    top: 72,
    width: 72,
  },
  hexagramBuildFullscreen: {
    left: 118,
    top: 94,
  },
  hexagramLine: {
    alignItems: "center",
    height: 7,
    justifyContent: "center",
  },
  hexagramYang: {
    backgroundColor: "rgba(252,226,148,0.92)",
    borderRadius: 999,
    height: 3,
    width: 68,
  },
  hexagramYin: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 68,
  },
  hexagramYinHalf: {
    backgroundColor: "rgba(252,226,148,0.88)",
    borderRadius: 999,
    height: 3,
    width: 27,
  },
  miniProcessText: {
    bottom: 78,
    color: "rgba(255,246,223,0.72)",
    fontFamily: "PingFang SC",
    fontSize: 11,
    fontWeight: "900",
    left: 0,
    position: "absolute",
    right: 0,
    textAlign: "center",
  },
  realPlumDrop: {
    position: "absolute",
  },
  fallingPetal: {
    backgroundColor: "rgba(246,205,211,0.86)",
    borderColor: "rgba(255,241,199,0.32)",
    borderRadius: 14,
    borderWidth: 1,
    height: 25,
    position: "absolute",
    width: 15,
  },
  fallingPetalOne: {
    left: 74,
    top: 44,
  },
  fallingPetalTwo: {
    right: 66,
    top: 78,
    transform: [{ rotate: "28deg" }],
  },
  qimenAuraRing: {
    borderColor: "rgba(242,213,138,0.52)",
    borderRadius: 118,
    borderWidth: 2,
    height: 236,
    position: "absolute",
    width: 236,
  },
  qimenSceneOverlay: {
    height: 264,
    overflow: "visible",
    width: 306,
  },
  qimenSceneOverlayFullscreen: {
    height: 292,
    width: 328,
  },
  qimenMapPlate: {
    backgroundColor: "#251d13",
    borderColor: "rgba(196,143,69,0.72)",
    borderRadius: 24,
    borderWidth: 4,
    height: 278,
    overflow: "hidden",
    position: "absolute",
    shadowColor: "#000",
    shadowOpacity: 0.34,
    shadowRadius: 24,
    width: 278,
  },
  qimenPlateBronzeWash: {
    backgroundColor: "rgba(32, 83, 67, 0.82)",
    borderRadius: 18,
    bottom: 10,
    left: 10,
    position: "absolute",
    right: 10,
    top: 10,
  },
  qimenPlateOuterLip: {
    borderColor: "rgba(255,226,145,0.34)",
    borderRadius: 18,
    borderWidth: 1,
    bottom: 14,
    left: 14,
    position: "absolute",
    right: 14,
    top: 14,
  },
  qimenPlateInnerTray: {
    backgroundColor: "rgba(18, 36, 31, 0.96)",
    borderColor: "rgba(90, 170, 137, 0.34)",
    borderRadius: 12,
    borderWidth: 1,
    bottom: 26,
    left: 26,
    position: "absolute",
    right: 26,
    top: 26,
  },
  qimenPlateSideLip: {
    backgroundColor: "rgba(159, 108, 54, 0.34)",
    borderColor: "rgba(255,226,145,0.16)",
    borderRadius: 999,
    borderWidth: 1,
    height: 9,
    left: 36,
    position: "absolute",
    right: 36,
  },
  qimenPlateSideLipTop: {
    top: 18,
  },
  qimenPlateSideLipBottom: {
    bottom: 18,
  },
  qimenPlateSideLipVertical: {
    backgroundColor: "rgba(159, 108, 54, 0.3)",
    borderColor: "rgba(255,226,145,0.14)",
    borderRadius: 999,
    borderWidth: 1,
    bottom: 36,
    position: "absolute",
    top: 36,
    width: 9,
  },
  qimenPlateSideLipLeft: {
    left: 18,
  },
  qimenPlateSideLipRight: {
    right: 18,
  },
  qimenPlateGridLine: {
    backgroundColor: "rgba(255,228,154,0.22)",
    position: "absolute",
  },
  qimenPlateGridH1: {
    height: 1,
    left: 30,
    right: 30,
    top: 92,
  },
  qimenPlateGridH2: {
    height: 1,
    left: 30,
    right: 30,
    top: 186,
  },
  qimenPlateGridV1: {
    bottom: 30,
    left: 92,
    top: 30,
    width: 1,
  },
  qimenPlateGridV2: {
    bottom: 30,
    right: 92,
    top: 30,
    width: 1,
  },
  qimenPlateCornerRivet: {
    backgroundColor: "rgba(206,161,82,0.74)",
    borderColor: "rgba(255,232,166,0.58)",
    borderRadius: 5,
    borderWidth: 1,
    height: 10,
    position: "absolute",
    width: 10,
  },
  qimenPlateCornerTL: {
    left: 14,
    top: 14,
  },
  qimenPlateCornerTR: {
    right: 14,
    top: 14,
  },
  qimenPlateCornerBL: {
    bottom: 14,
    left: 14,
  },
  qimenPlateCornerBR: {
    bottom: 14,
    right: 14,
  },
  qimenLockGlow: {
    backgroundColor: "rgba(217,170,77,0.22)",
    borderColor: "rgba(242,213,138,0.46)",
    borderRadius: 48,
    borderWidth: 1,
    height: 96,
    position: "absolute",
    width: 96,
  },
  qimenOverlayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    position: "absolute",
    width: 252,
  },
  qimenOverlayCell: {
    alignItems: "center",
    backgroundColor: "#26362e",
    borderColor: "rgba(224,184,105,0.72)",
    borderRadius: 9,
    borderWidth: 1.5,
    height: 80,
    justifyContent: "center",
    overflow: "visible",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 5,
    width: 80,
  },
  qimenCellPatina: {
    backgroundColor: "rgba(52, 142, 105, 0.22)",
    borderRadius: 8,
    bottom: 4,
    left: 4,
    position: "absolute",
    right: 4,
    top: 4,
  },
  qimenCellInnerFrame: {
    borderColor: "rgba(255,225,151,0.28)",
    borderRadius: 6,
    borderWidth: 1,
    bottom: 7,
    left: 7,
    position: "absolute",
    right: 7,
    top: 7,
  },
  qimenCellRivet: {
    backgroundColor: "rgba(230,181,91,0.72)",
    borderRadius: 2,
    height: 4,
    position: "absolute",
    width: 4,
  },
  qimenCellRivetTL: {
    left: 5,
    top: 5,
  },
  qimenCellRivetTR: {
    right: 5,
    top: 5,
  },
  qimenCellRivetBL: {
    bottom: 5,
    left: 5,
  },
  qimenCellRivetBR: {
    bottom: 5,
    right: 5,
  },
  qimenOverlayCellActive: {
    backgroundColor: "#694d26",
    borderColor: "rgba(255,231,156,0.92)",
  },
  qimenCellSolidBack: {
    backgroundColor: "#26362e",
    borderRadius: 9,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  qimenCellSolidBackActive: {
    backgroundColor: "#694d26",
  },
  qimenGateTextWrap: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
  },
  qimenOverlayGate: {
    color: "rgba(255,238,178,0.94)",
    fontFamily: "Songti SC",
    fontSize: 21,
    fontWeight: "900",
    textShadowColor: "rgba(22,12,4,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  qimenOverlayGateSub: {
    color: "rgba(160,227,204,0.72)",
    fontFamily: "PingFang SC",
    fontSize: 7,
    fontWeight: "900",
    marginTop: 1,
  },
  qimenOverlayDoor: {
    color: "rgba(255,226,151,0.66)",
    fontFamily: "PingFang SC",
    fontSize: 7,
    fontWeight: "900",
    marginTop: 1,
  },
  qimenBronzeLid: {
    alignItems: "center",
    backgroundColor: "rgba(34, 27, 18, 1)",
    borderColor: "rgba(255,222,147,0.96)",
    borderRadius: 12,
    borderWidth: 2,
    height: 98,
    justifyContent: "center",
    overflow: "hidden",
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.54,
    shadowRadius: 8,
    width: 98,
    zIndex: 12,
  },
  qimenLidImageShade: {
    backgroundColor: "rgba(3, 5, 4, 0)",
    borderColor: "rgba(255,234,164,0.34)",
    borderRadius: 10,
    borderWidth: 1,
    bottom: 4,
    left: 4,
    position: "absolute",
    right: 4,
    top: 4,
  },
  qimenLidLowerLip: {
    backgroundColor: "rgba(24, 16, 8, 0.26)",
    borderRadius: 999,
    bottom: 8,
    height: 3,
    left: 14,
    position: "absolute",
    right: 14,
  },
  qimenDragonLidImage: {
    height: 98,
    width: 98,
  },
  daliurenSceneOverlay: {
    height: 282,
    overflow: "visible",
    width: 292,
  },
  daliurenSceneOverlayFullscreen: {
    height: 304,
    width: 312,
  },
  liurenSkyConstellationLayer: {
    ...StyleSheet.absoluteFill,
    opacity: 0.72,
  },
  liurenSkyStarPoint: {
    backgroundColor: "rgba(255,239,184,0.98)",
    borderColor: "rgba(141,255,223,0.46)",
    borderRadius: 4,
    borderWidth: 1,
    height: 7,
    position: "absolute",
    shadowColor: "#f2d58a",
    shadowOpacity: 0.9,
    shadowRadius: 10,
    width: 7,
  },
  liurenSkyStarLine: {
    backgroundColor: "rgba(147,255,224,0.38)",
    borderRadius: 999,
    height: 1,
    position: "absolute",
    shadowColor: "#93ffe0",
    shadowOpacity: 0.36,
    shadowRadius: 8,
  },
  liurenConstellationLayer: {
    height: 282,
    position: "absolute",
    width: 292,
  },
  liurenStarPoint: {
    backgroundColor: "rgba(255,236,178,0.95)",
    borderColor: "rgba(147,255,224,0.52)",
    borderRadius: 3,
    borderWidth: 1,
    height: 6,
    position: "absolute",
    shadowColor: "#f2d58a",
    shadowOpacity: 0.8,
    shadowRadius: 7,
    width: 6,
  },
  liurenStarLine: {
    backgroundColor: "rgba(177,255,234,0.48)",
    borderRadius: 999,
    height: 1,
    position: "absolute",
  },
  daliurenMapPlate: {
    backgroundColor: "rgba(36, 25, 16, 0.36)",
    borderColor: "rgba(242,213,138,0.24)",
    borderRadius: 126,
    borderWidth: 1,
    height: 252,
    position: "absolute",
    shadowColor: "#d9aa4d",
    shadowOpacity: 0.24,
    shadowRadius: 16,
    width: 252,
  },
  daliurenPulse: {
    backgroundColor: "rgba(74,163,145,0.16)",
    borderColor: "rgba(242,213,138,0.28)",
    borderRadius: 114,
    borderWidth: 1,
    height: 228,
    position: "absolute",
    width: 228,
  },
  daliurenThread: {
    backgroundColor: "rgba(74,210,186,0.72)",
    borderRadius: 999,
    height: 3,
    position: "absolute",
    zIndex: 4,
    width: 228,
  },
  daliurenBranchDial: {
    height: 252,
    position: "absolute",
    width: 292,
  },
  daliurenBranchLabel: {
    color: "rgba(255,236,170,0.92)",
    fontFamily: "Songti SC",
    fontSize: 16,
    fontWeight: "900",
    position: "absolute",
    textAlign: "center",
    textShadowColor: "rgba(3, 7, 10, 0.95)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    width: 30,
    zIndex: 8,
  },
  lessonMiniDeck: {
    flexDirection: "row",
    gap: 6,
    position: "absolute",
    top: -18,
    zIndex: 18,
  },
  lessonMiniCard: {
    alignItems: "center",
    backgroundColor: "rgba(47, 36, 24, 0.84)",
    borderColor: "rgba(255,229,155,0.58)",
    borderRadius: 4,
    borderWidth: 1,
    height: 54,
    justifyContent: "center",
    shadowColor: "#f2d58a",
    shadowOpacity: 0.28,
    shadowRadius: 7,
    width: 40,
    zIndex: 9,
  },
  lessonMiniText: {
    color: "rgba(255,239,184,0.96)",
    fontFamily: "Songti SC",
    fontSize: 12,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  transmissionMiniRow: {
    bottom: 42,
    flexDirection: "row",
    gap: 18,
    position: "absolute",
    zIndex: 12,
  },
  transmissionMiniText: {
    backgroundColor: "rgba(5, 12, 14, 0.54)",
    borderRadius: 999,
    color: "rgba(177,255,234,0.9)",
    fontFamily: "Songti SC",
    fontSize: 15,
    fontWeight: "900",
    minWidth: 40,
    paddingHorizontal: 7,
    paddingVertical: 4,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.88)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  transmissionMiniTextFirst: {
    color: "rgba(255,232,165,0.96)",
  },
  transmissionMiniTextSecond: {
    color: "rgba(151,244,218,0.96)",
  },
  transmissionMiniTextThird: {
    color: "rgba(255,248,225,0.98)",
  },
  glyphWrap: {
    alignItems: "center",
    height: 194,
    justifyContent: "center",
    opacity: 0.72,
    position: "relative",
    width: 194,
  },
  compactGlyph: {
    height: 78,
    opacity: 1,
    width: 78,
  },
  ripple: {
    borderColor: "rgba(242,213,138,0.38)",
    borderRadius: 82,
    borderWidth: 2,
    height: 164,
    position: "absolute",
    width: 164,
  },
  compactRipple: {
    borderRadius: 31,
    height: 62,
    width: 62,
  },
  plumBlossom: {
    alignItems: "center",
    height: 82,
    justifyContent: "center",
    position: "absolute",
    width: 82,
  },
  plumBlossomImage: {
    height: 96,
    position: "absolute",
    width: 96,
  },
  compactBlossom: {
    height: 42,
    width: 42,
  },
  compactBlossomImage: {
    height: 48,
    width: 48,
  },
  petal: {
    backgroundColor: "rgba(242,213,138,0.92)",
    borderColor: "rgba(190,60,45,0.6)",
    borderRadius: 18,
    borderWidth: 1,
    height: 28,
    position: "absolute",
    width: 17,
  },
  flowerCore: {
    backgroundColor: mystic.cinnabar,
    borderRadius: 8,
    height: 16,
    position: "absolute",
    width: 16,
  },
  outerRing: {
    borderColor: "rgba(242,213,138,0.55)",
    borderRadius: 94,
    borderWidth: 2,
    height: 188,
    position: "absolute",
    width: 188,
  },
  compactRing: {
    borderRadius: 34,
    height: 68,
    width: 68,
  },
  qimenGridStage: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    width: 154,
  },
  compactGrid: {
    gap: 2,
    width: 54,
  },
  qimenMiniCell: {
    alignItems: "center",
    backgroundColor: "rgba(255,244,214,0.08)",
    borderColor: mystic.lineStrong,
    borderRadius: 9,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  compactCell: {
    borderRadius: 4,
    height: 16,
    width: 16,
  },
  qimenMiniText: {
    color: mystic.goldSoft,
    fontFamily: "PingFang SC",
    fontSize: 17,
    fontWeight: "900",
  },
  branchRing: {
    height: 194,
    position: "absolute",
    width: 194,
  },
  branchText: {
    color: mystic.goldSoft,
    fontFamily: "Songti SC",
    fontSize: 16,
    fontWeight: "900",
    position: "absolute",
    textAlign: "center",
    width: 28,
  },
  compactTinyText: {
    fontSize: 8,
    width: 14,
  },
  causalLine: {
    backgroundColor: "rgba(74,163,145,0.78)",
    borderRadius: 999,
    height: 3,
    position: "absolute",
    width: 142,
  },
  compactCausalLine: {
    height: 2,
    width: 52,
  },
  centerSeal: {
    color: mystic.ink,
    fontFamily: "Songti SC",
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 0,
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  captionPanel: {
    alignItems: "center",
    backgroundColor: "rgba(7, 10, 10, 0.48)",
    borderColor: "rgba(242,213,138,0.22)",
    borderRadius: 20,
    borderWidth: 1,
    bottom: 48,
    gap: 6,
    left: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: "absolute",
    right: 18,
  },
  captionPanelFullscreen: {
    bottom: 92,
  },
  eventName: {
    color: mystic.gold,
    fontFamily: "PingFang SC",
    fontSize: 11,
    fontWeight: "900",
  },
  stageTitle: {
    color: mystic.ink,
    fontFamily: "Songti SC",
    fontSize: 23,
    fontWeight: "900",
    lineHeight: 29,
    textAlign: "center",
  },
  stageHint: {
    color: mystic.muted,
    fontFamily: "PingFang SC",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    textAlign: "center",
  },
  errorActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: mystic.cinnabarDark,
    borderRadius: 18,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  retryText: {
    color: "#fffaf0",
    fontFamily: "PingFang SC",
    fontSize: 14,
    fontWeight: "900",
  },
  dismissButton: {
    borderColor: mystic.lineStrong,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  dismissText: {
    color: mystic.goldSoft,
    fontFamily: "PingFang SC",
    fontSize: 14,
    fontWeight: "900",
  },
  headerAnim: {
    alignItems: "center",
    backgroundColor: "rgba(255,244,214,0.06)",
    borderColor: mystic.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 10,
  },
  headerTextBlock: {
    flex: 1,
  },
  headerKicker: {
    color: mystic.gold,
    fontFamily: "PingFang SC",
    fontSize: 11,
    fontWeight: "900",
  },
  headerTitle: {
    color: mystic.ink,
    fontFamily: "PingFang SC",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
    marginTop: 2,
  },
});

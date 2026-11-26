import { useEffect } from "react";
import { Image, Modal, Pressable, StatusBar, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";

import { type Reading } from "@/lib/api";
import { l } from "@/lib/i18n";
import { LINE_TYPES, type CoinThrow, type LiuyaoCast } from "@/lib/liuyao";

import { CoinDropLayer } from "./CoinDropLayer";
import { CompassScene } from "./CompassScene";
import { ResultReveal } from "./ResultReveal";
import { RitualGlow } from "./RitualGlow";
import { LIUYAO_THROW_COUNT, RITUAL_COLORS } from "./theme";

const spinSound = require("../../../assets/sounds/ritual-spin.wav");
const firstCoinDropSound = require("../../../assets/sounds/coin-metal-drop-1.wav");
const secondCoinDropSound = require("../../../assets/sounds/coin-metal-drop-2.wav");
const thirdCoinDropSound = require("../../../assets/sounds/coin-metal-drop-3.wav");
const revealSound = require("../../../assets/sounds/result-reveal.wav");

const COIN_IMPACT_OFFSETS_MS = [600, 700, 800] as const;

type Props = {
  visible: boolean;
  sessionId: number;
  coinRunId: number;
  throwIndex: number;
  totalThrows?: number;
  busy: boolean;
  compassSource: ImageSourcePropType;
  coinSource: ImageSourcePropType;
  partialThrows: CoinThrow[];
  cast: LiuyaoCast | null;
  reading: Reading | null;
  onPress: () => void;
  onClose: () => void;
  actionLabel: string;
  hint: string;
};

export function RitualStage(props: Props) {
  return (
    <>
      <RitualSurface {...props} fullscreen={false} soundEnabled={false} />
      <Modal visible={props.visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={props.onClose}>
        <RitualSurface {...props} fullscreen soundEnabled />
      </Modal>
    </>
  );
}

function RitualSurface({
  visible,
  sessionId,
  coinRunId,
  throwIndex,
  totalThrows = LIUYAO_THROW_COUNT,
  busy,
  compassSource,
  coinSource,
  partialThrows,
  cast,
  reading,
  onPress,
  onClose,
  actionLabel,
  hint,
  fullscreen,
  soundEnabled,
}: Props & { fullscreen: boolean; soundEnabled: boolean }) {
  const spinPlayer = useAudioPlayer(spinSound);
  const firstImpactPlayer = useAudioPlayer(firstCoinDropSound);
  const secondImpactPlayer = useAudioPlayer(secondCoinDropSound);
  const thirdImpactPlayer = useAudioPlayer(thirdCoinDropSound);
  const revealPlayer = useAudioPlayer(revealSound);
  const resultTitle = reading?.title ?? (cast ? `${cast.primaryName}${cast.movingLabels.length ? `之${cast.changedName}` : ""}` : l({ zh: "静心问卦", en: "Settle the question" }));
  const resultBody = reading?.interpretation ?? (cast ? l({ zh: "六次铜钱已落定，正在生成白话解读。", en: "The coin oracle is complete. A plain-language reading is being generated." }) : l({ zh: "六爻问卦需掷六次，每次三枚铜钱。", en: "The Coin Oracle uses six casts, with three coins each time." }));
  const showClose = fullscreen && Boolean(cast) && !busy;

  useEffect(() => {
    if (!soundEnabled) return;
    void setAudioModeAsync({ playsInSilentMode: true }).catch((error: unknown) => {
      console.warn("[RitualStage] Failed to set audio mode", error);
    });
  }, [soundEnabled]);

  useEffect(() => {
    if (!soundEnabled) return;
    return () => {
      stopPlayer(spinPlayer, "spin");
      stopPlayer(firstImpactPlayer, "coin metal drop 1");
      stopPlayer(secondImpactPlayer, "coin metal drop 2");
      stopPlayer(thirdImpactPlayer, "coin metal drop 3");
      stopPlayer(revealPlayer, "result reveal");
    };
  }, [firstImpactPlayer, revealPlayer, secondImpactPlayer, soundEnabled, spinPlayer, thirdImpactPlayer]);

  useEffect(() => {
    if (!soundEnabled || sessionId <= 0) return;
    replay(spinPlayer, "spin");
  }, [sessionId, soundEnabled, spinPlayer]);

  useEffect(() => {
    if (!soundEnabled || coinRunId <= 0) return;
    const impactPlayers = [firstImpactPlayer, secondImpactPlayer, thirdImpactPlayer];
    const timers = impactPlayers.map((player, index) =>
      setTimeout(() => replay(player, `coin metal drop ${index + 1}`), COIN_IMPACT_OFFSETS_MS[index]),
    );
    return () => timers.forEach(clearTimeout);
  }, [coinRunId, firstImpactPlayer, secondImpactPlayer, thirdImpactPlayer, soundEnabled]);

  useEffect(() => {
    if (!soundEnabled || !cast) return;
    replay(revealPlayer, "result reveal");
  }, [cast, revealPlayer, soundEnabled]);

  return (
    <View style={[styles.stage, fullscreen && styles.stageFullscreen]}>
      <StatusBar hidden={fullscreen} barStyle="light-content" />
      <View pointerEvents="none" style={styles.glowLayer}>
        <RitualGlow coinRunId={coinRunId} />
      </View>
      <Text style={styles.leftSeal}>{l({ zh: "静\n心\n提\n问", en: "ASK" })}</Text>
      <Text style={styles.rightPoem}>{l({ zh: "罗盘旋定\n铜钱落卦", en: "Compass settles\nCoins cast the lines" })}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} disabled={busy} onPress={onPress} style={styles.touchTarget}>
        <View style={[styles.compassWrap, fullscreen && styles.compassWrapFullscreen]}>
          <CompassScene sessionId={sessionId} source={compassSource} size={fullscreen ? 310 : 236} />
          {coinRunId === 0 ? (
            <View style={styles.idleCoins}>
              <Image source={coinSource} resizeMode="contain" style={[styles.idleCoin, styles.idleCoinOne]} />
              <Image source={coinSource} resizeMode="contain" style={[styles.idleCoin, styles.idleCoinTwo]} />
              <Image source={coinSource} resizeMode="contain" style={[styles.idleCoin, styles.idleCoinThree]} />
            </View>
          ) : (
            <CoinDropLayer coinRunId={coinRunId} source={coinSource} />
          )}
        </View>
      </Pressable>
      <CastingHexagram partialThrows={partialThrows} cast={cast} fullscreen={fullscreen} />
      <View style={[styles.progressPanel, fullscreen && styles.progressPanelFullscreen]}>
        <Text style={styles.progressKicker}>{busy ? l({ zh: `第 ${Math.max(throwIndex, 1)} / ${totalThrows} 次`, en: `Cast ${Math.max(throwIndex, 1)} / ${totalThrows}` }) : l({ zh: "六爻仪式", en: "Coin Oracle ritual" })}</Text>
        <View style={styles.progressDots}>
          {Array.from({ length: totalThrows }, (_, index) => (
            <View key={index} style={[styles.progressDot, index < throwIndex && styles.progressDotActive]} />
          ))}
        </View>
        <Text style={styles.hint}>{busy ? l({ zh: "每次三枚铜钱，六次自下而上成卦", en: "Three coins per cast; six casts build the hexagram from bottom to top" }) : hint}</Text>
      </View>
      <ResultReveal runId={sessionId} visible={Boolean(cast)} title={resultTitle} body={resultBody} />
      {showClose ? (
        <Pressable accessibilityRole="button" accessibilityLabel={l({ zh: "回到问卦页", en: "Return to reading page" })} onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>{l({ zh: "完成", en: "Done" })}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function CastingHexagram({ partialThrows, cast, fullscreen }: { partialThrows: CoinThrow[]; cast: LiuyaoCast | null; fullscreen: boolean }) {
  const visibleThrows = cast?.throws ?? partialThrows;

  return (
    <View pointerEvents="none" style={[styles.castingHexagram, fullscreen && styles.castingHexagramFullscreen]}>
      <Text style={styles.castingHexagramKicker}>{cast ? l({ zh: "卦象已成", en: "Hexagram formed" }) : l({ zh: "六爻生成", en: "Lines forming" })}</Text>
      <View style={styles.castingLines}>
        {Array.from({ length: LIUYAO_THROW_COUNT }, (_, displayIndex) => {
          const lineIndex = LIUYAO_THROW_COUNT - 1 - displayIndex;
          const coinThrow = visibleThrows[lineIndex];
          const lineType = coinThrow ? LINE_TYPES[coinThrow.value] : null;
          return (
            <View key={lineIndex} style={[styles.castingLineSlot, coinThrow && styles.castingLineSlotActive]}>
              {lineType?.yang ? (
                <View style={[styles.castingYangLine, lineType.moving && styles.castingMovingLine]} />
              ) : (
                <View style={styles.castingYinLine}>
                  <View style={[styles.castingYinHalf, lineType?.moving && styles.castingMovingLine]} />
                  <View style={[styles.castingYinHalf, lineType?.moving && styles.castingMovingLine]} />
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function replay(player: ReturnType<typeof useAudioPlayer>, label: string) {
  void player.seekTo(0).then(() => {
    player.play();
  }).catch((error: unknown) => {
    console.warn(`[RitualStage] Failed to play ${label} sound`, error);
  });
}

function stopPlayer(player: ReturnType<typeof useAudioPlayer>, label: string) {
  try {
    player.pause();
    void player.seekTo(0).catch((error: unknown) => {
      if (isReleasedAudioObject(error)) return;
      console.warn(`[RitualStage] Failed to reset ${label} sound`, error);
    });
  } catch (error) {
    if (isReleasedAudioObject(error)) return;
    console.warn(`[RitualStage] Failed to stop ${label} sound`, error);
  }
}

function isReleasedAudioObject(error: unknown): boolean {
  return error instanceof Error && error.message.includes("NativeSharedObjectNotFoundException");
}

const styles = StyleSheet.create({
  stage: {
    borderRadius: 28,
    minHeight: 382,
    overflow: "hidden",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: RITUAL_COLORS.bgTop,
  },
  stageFullscreen: {
    flex: 1,
    minHeight: "100%",
    borderRadius: 0,
    paddingTop: 36,
  },
  glowLayer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    zIndex: 0,
  },
  touchTarget: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  compassWrap: {
    width: 260,
    height: 260,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    zIndex: 2,
  },
  compassWrapFullscreen: {
    width: 330,
    height: 330,
    marginBottom: 44,
  },
  idleCoins: {
    position: "absolute",
    width: 190,
    height: 190,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
  },
  idleCoin: {
    position: "absolute",
    width: 54,
    height: 54,
  },
  idleCoinOne: {
    transform: [{ translateX: -54 }, { translateY: 26 }, { rotate: "-17deg" }],
  },
  idleCoinTwo: {
    transform: [{ translateX: 22 }, { translateY: -36 }, { rotate: "16deg" }],
  },
  idleCoinThree: {
    transform: [{ translateX: 58 }, { translateY: 46 }, { rotate: "7deg" }],
  },
  leftSeal: {
    position: "absolute",
    left: 14,
    top: 112,
    zIndex: 5,
    color: "#fff1c7",
    backgroundColor: RITUAL_COLORS.jade,
    borderColor: RITUAL_COLORS.gold,
    borderWidth: 1,
    borderRadius: 17,
    overflow: "hidden",
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 19,
    textAlign: "center",
  },
  rightPoem: {
    position: "absolute",
    right: 16,
    top: 114,
    zIndex: 5,
    color: RITUAL_COLORS.ink,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 21,
    textAlign: "center",
  },
  hint: {
    color: RITUAL_COLORS.muted,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  progressPanel: {
    position: "absolute",
    bottom: 104,
    left: 18,
    right: 18,
    alignItems: "center",
    gap: 8,
    zIndex: 5,
  },
  progressPanelFullscreen: {
    bottom: 164,
  },
  castingHexagram: {
    alignItems: "center",
    backgroundColor: "rgba(10, 7, 4, 0.42)",
    borderColor: "rgba(243,216,138,0.18)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: "absolute",
    right: 16,
    top: 18,
    zIndex: 6,
  },
  castingHexagramFullscreen: {
    right: 28,
    top: 156,
  },
  castingHexagramKicker: {
    color: RITUAL_COLORS.goldSoft,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  castingLines: {
    gap: 5,
    width: 74,
  },
  castingLineSlot: {
    alignItems: "center",
    height: 7,
    justifyContent: "center",
    opacity: 0.3,
  },
  castingLineSlotActive: {
    opacity: 1,
  },
  castingYangLine: {
    backgroundColor: "rgba(255,236,170,0.92)",
    borderRadius: 999,
    height: 3,
    shadowColor: RITUAL_COLORS.goldSoft,
    shadowOpacity: 0.7,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    width: 68,
  },
  castingYinLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 68,
  },
  castingYinHalf: {
    backgroundColor: "rgba(255,236,170,0.88)",
    borderRadius: 999,
    height: 3,
    shadowColor: RITUAL_COLORS.goldSoft,
    shadowOpacity: 0.55,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    width: 27,
  },
  castingMovingLine: {
    backgroundColor: "#ffd66f",
    shadowOpacity: 0.95,
    shadowRadius: 8,
  },
  progressKicker: {
    color: RITUAL_COLORS.goldSoft,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },
  progressDots: {
    flexDirection: "row",
    gap: 7,
  },
  progressDot: {
    width: 24,
    height: 4,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  progressDotActive: {
    backgroundColor: RITUAL_COLORS.goldSoft,
  },
  closeButton: {
    position: "absolute",
    top: 54,
    right: 74,
    minHeight: 46,
    justifyContent: "center",
    borderRadius: 999,
    paddingHorizontal: 24,
    backgroundColor: "rgba(243,216,138,0.16)",
    borderWidth: 1,
    borderColor: RITUAL_COLORS.cardBorder,
  },
  closeText: {
    color: RITUAL_COLORS.ink,
    fontSize: 15,
    fontWeight: "900",
  },
});

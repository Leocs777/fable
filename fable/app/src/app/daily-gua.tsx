import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DailyGuaLoadingMotion, DailyGuaReveal } from "@/components/daily/DailyGuaMotion";
import { MysticBackdrop } from "@/components/MysticBackdrop";
import { durationBucket, trackAnalytics } from "@/lib/analytics";
import {
  enrichDailyGuaWithAi,
  loadDailyGua,
  localDateKey,
  type DailyGuaResult,
} from "@/lib/dailyGua";
import { l } from "@/lib/i18n";
import type { LineValue } from "@/lib/liuyao";
import { mystic } from "@/theme/mystic";

type PageState = "loading" | "ready" | "error";
type AiState = "idle" | "loading" | "done" | "fallback";

const MIN_LOADING_MS = 1700;

export default function DailyGuaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [aiState, setAiState] = useState<AiState>("idle");
  const [result, setResult] = useState<DailyGuaResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const startedAt = Date.now();
    trackAnalytics("daily_view");
    async function load() {
      setPageState("loading");
      setError(null);
      setAiState("idle");
      try {
        const { result: base, source, storageError } = await loadDailyGua();
        await waitForMinimum(startedAt, MIN_LOADING_MS);
        if (!alive) return;
        setResult(base);
        setPageState("ready");
        trackAnalytics("daily_success", { source, durationBucket: durationBucket(Date.now() - startedAt), aiState: "base" });
        if (storageError) {
          setError(l({ zh: `本地缓存暂不可用，已使用本次会话结果：${storageError}`, en: `Local cache is unavailable, so a session-only result was used: ${storageError}` }));
        }
        setAiState("loading");
        try {
          const enriched = await enrichDailyGuaWithAi(base);
          if (!alive) return;
          setResult(enriched);
          setAiState("done");
          trackAnalytics("daily_success", { source, durationBucket: durationBucket(Date.now() - startedAt), aiState: "ai" });
        } catch (aiError) {
          if (!alive) return;
          setAiState("fallback");
          setResult({ ...base, aiError: errorMessage(aiError) });
          trackAnalytics("daily_error", { phase: "ai", durationBucket: durationBucket(Date.now() - startedAt), errorType: errorName(aiError) });
        }
      } catch (loadError) {
        if (!alive) return;
        setError(errorMessage(loadError));
        setPageState("error");
        trackAnalytics("daily_error", { phase: "load", durationBucket: durationBucket(Date.now() - startedAt), errorType: errorName(loadError) });
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  const retry = () => {
    setResult(null);
    setError(null);
    setPageState("loading");
    void loadDailyGua(new Date())
      .then(({ result: next }) => {
        setResult(next);
        setPageState("ready");
      })
      .catch((retryError: unknown) => {
        setError(errorMessage(retryError));
        setPageState("error");
      });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 }]}
    >
      <MysticBackdrop />
      <View style={styles.topbar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.topCopy}>
          <Text style={styles.kicker}>{l({ zh: "每日梅花", en: "Daily Plum Oracle" })}</Text>
          <Text style={styles.title}>{l({ zh: "今日一卦", en: "Today's Reading" })}</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(new Date())}</Text>
      </View>

      {pageState === "loading" ? (
        <View style={styles.loadingPanel}>
          <DailyGuaLoadingMotion />
          <Text style={styles.loadingTitle}>{l({ zh: "一念起象", en: "A thought becomes a sign" })}</Text>
          <Text style={styles.loadingBody}>{l({ zh: "正在以今日日期、时辰和本机 seed 生成今日梅花卦象。", en: "Generating a light daily reading from today's date, hour, and local seed." })}</Text>
        </View>
      ) : null}

      {pageState === "error" ? (
        <View style={styles.errorPanel}>
          <Text style={styles.errorTitle}>{l({ zh: "今日取象未完成", en: "Today's reading did not complete" })}</Text>
          <Text style={styles.errorBody}>{error ?? l({ zh: "本地结果暂时无法生成，请稍后重试。", en: "A local result could not be generated. Please try again shortly." })}</Text>
          <Pressable accessibilityRole="button" onPress={retry} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{l({ zh: "重新尝试", en: "Try again" })}</Text>
          </Pressable>
        </View>
      ) : null}

      {pageState === "ready" && result ? (
        <DailyGuaReveal>
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <Text style={styles.heroKicker}>{l({ zh: "今日关键词", en: "Today's keywords" })}</Text>
              <Text style={styles.heroKeyword}>{result.keyword}</Text>
            </View>
            <Text style={styles.heroSummary}>{result.summary}</Text>
            {aiState === "loading" ? (
              <View style={styles.aiRow}>
                <ActivityIndicator color={mystic.goldSoft} />
                <Text style={styles.aiText}>{l({ zh: "正在生成今日白话解读…", en: "Writing today's plain-language reading..." })}</Text>
              </View>
            ) : null}
            {aiState === "fallback" ? <Text style={styles.fallbackText}>{l({ zh: "AI 解读暂时不可用，已显示本地基础解读。", en: "AI interpretation is unavailable, so the local base reading is shown." })}</Text> : null}
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionKicker}>{l({ zh: "今日卦象", en: "Today's Hexagram" })}</Text>
            <View style={styles.hexagramRow}>
              <HexCard title={l({ zh: "本卦", en: "Primary" })} name={result.hexagram.name} lines={result.hexagram.lines} movingIndex={result.hexagram.changingLine - 1} />
              <Text style={styles.arrow}>→</Text>
              <HexCard title={l({ zh: "变卦", en: "Changed" })} name={result.hexagram.changedHexagramName} lines={result.hexagram.changedLines} movingIndex={-1} />
            </View>
            <Text style={styles.chartMeta}>
              {l({ zh: `上卦 ${result.hexagram.upperTrigram} · 下卦 ${result.hexagram.lowerTrigram} · 动第 ${result.hexagram.changingLine} 爻`, en: `Upper ${result.hexagram.upperTrigram} · Lower ${result.hexagram.lowerTrigram} · Changing line ${result.hexagram.changingLine}` })}
            </Text>
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionKicker}>{l({ zh: "分类建议", en: "Guidance" })}</Text>
            <AdviceGrid result={result} />
          </View>

          <View style={styles.panel}>
            <View style={styles.yijiRow}>
              <YiJiColumn title={l({ zh: "今日宜", en: "Favorable" })} items={result.suitable} tone="good" />
              <YiJiColumn title={l({ zh: "今日忌", en: "Avoid" })} items={result.avoid} tone="avoid" />
            </View>
          </View>

          <View style={styles.adviceCard}>
            <Text style={styles.adviceKicker}>{l({ zh: "一句话", en: "One line" })}</Text>
            <Text style={styles.oneLine}>{result.oneLineAdvice}</Text>
            <Text style={styles.specificHint}>{l({ zh: "如果你心里有一个具体问题，可以用铜钱起卦深入问事。", en: "If you have a specific question, use the coin ritual for a deeper reading." })}</Text>
            <Pressable accessibilityRole="button" onPress={() => router.replace("/")} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{l({ zh: "问一件具体事", en: "Ask a specific question" })}</Text>
            </Pressable>
          </View>

          <Text style={styles.footerNote}>{l({ zh: "同一天结果保持一致；第二天会自动刷新。内容为传统文化参考。", en: "The same day keeps the same result; tomorrow refreshes automatically. Cultural reference only." })}</Text>
        </DailyGuaReveal>
      ) : null}
    </ScrollView>
  );
}

function AdviceGrid({ result }: { result: DailyGuaResult }) {
  const items = [
    { title: l({ zh: "事业", en: "Work" }), body: result.career },
    { title: l({ zh: "感情", en: "Relationships" }), body: result.love },
    { title: l({ zh: "财运", en: "Money" }), body: result.wealth },
    { title: l({ zh: "情绪", en: "Mood" }), body: result.emotion },
  ];
  return (
    <View style={styles.adviceGrid}>
      {items.map((item) => (
        <View key={item.title} style={styles.adviceItem}>
          <Text style={styles.adviceTitle}>{item.title}</Text>
          <Text style={styles.adviceBody}>{item.body}</Text>
        </View>
      ))}
    </View>
  );
}

function YiJiColumn({ title, items, tone }: { title: string; items: string[]; tone: "good" | "avoid" }) {
  return (
    <View style={styles.yijiColumn}>
      <Text style={[styles.yijiTitle, tone === "good" ? styles.goodText : styles.avoidText]}>{title}</Text>
      {items.map((item) => (
        <View key={item} style={styles.yijiPill}>
          <Text style={styles.yijiPillText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function HexCard({ title, name, lines, movingIndex }: { title: string; name: string; lines: LineValue[]; movingIndex: number }) {
  return (
    <View style={styles.hexCard}>
      <Text style={styles.hexTitle}>{title}</Text>
      <View style={styles.glyph}>
        {lines
          .map((line, index) => ({ line, index }))
          .reverse()
          .map(({ line, index }) => (
            <LineBars key={index} value={line} moving={index === movingIndex} />
          ))}
      </View>
      <Text style={styles.hexName}>{name}</Text>
    </View>
  );
}

function LineBars({ value, moving }: { value: LineValue; moving: boolean }) {
  const color = moving ? mystic.gold : mystic.ink;
  return (
    <View style={styles.lineBars}>
      {value === 1 ? (
        <View style={[styles.yangLine, { backgroundColor: color }]} />
      ) : (
        <View style={styles.yinLine}>
          <View style={[styles.yinHalf, { backgroundColor: color }]} />
          <View style={[styles.yinHalf, { backgroundColor: color }]} />
        </View>
      )}
    </View>
  );
}

function formatDate(date: Date): string {
  const today = localDateKey(date);
  const [, month, day] = today.split("-");
  return l({ zh: `${Number(month)}月${Number(day)}日`, en: `${Number(month)}/${Number(day)}` });
}

async function waitForMinimum(startedAt: number, durationMs: number): Promise<void> {
  const remaining = durationMs - (Date.now() - startedAt);
  if (remaining <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, remaining));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: mystic.bg,
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
  },
  topbar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,244,214,0.08)",
    borderColor: "rgba(255,244,214,0.16)",
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  backText: {
    color: mystic.gold,
    fontSize: 34,
    lineHeight: 36,
    marginTop: -3,
  },
  topCopy: {
    flex: 1,
  },
  kicker: {
    color: mystic.goldSoft,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  title: {
    color: mystic.ink,
    fontFamily: "Songti SC",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 3,
  },
  dateText: {
    color: mystic.muted,
    fontSize: 13,
    fontWeight: "900",
  },
  loadingPanel: {
    backgroundColor: "rgba(12, 15, 17, 0.82)",
    borderColor: "rgba(242, 213, 138, 0.24)",
    borderRadius: 26,
    borderWidth: 1,
    minHeight: 480,
    padding: 18,
  },
  loadingTitle: {
    color: mystic.ink,
    fontFamily: "Songti SC",
    fontSize: 27,
    fontWeight: "900",
    textAlign: "center",
  },
  loadingBody: {
    color: mystic.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: "center",
  },
  heroCard: {
    backgroundColor: "rgba(44, 22, 27, 0.34)",
    borderColor: "rgba(242, 213, 138, 0.26)",
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 14,
    padding: 18,
  },
  heroTop: {
    gap: 6,
    marginBottom: 10,
  },
  heroKicker: {
    color: mystic.goldSoft,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  heroKeyword: {
    color: mystic.ink,
    fontFamily: "Songti SC",
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 38,
  },
  heroSummary: {
    color: mystic.ink,
    fontSize: 16,
    lineHeight: 26,
  },
  aiRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    marginTop: 14,
  },
  aiText: {
    color: mystic.goldSoft,
    fontSize: 13,
    fontWeight: "800",
  },
  fallbackText: {
    color: mystic.faint,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  panel: {
    backgroundColor: "rgba(12, 15, 17, 0.82)",
    borderColor: "rgba(255,244,214,0.13)",
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  sectionKicker: {
    color: mystic.goldSoft,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 12,
  },
  hexagramRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
  },
  arrow: {
    color: mystic.gold,
    fontSize: 20,
    fontWeight: "900",
  },
  hexCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,244,214,0.06)",
    borderColor: "rgba(217,170,77,0.18)",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  hexTitle: {
    color: mystic.goldSoft,
    fontSize: 12,
    fontWeight: "900",
  },
  glyph: {
    gap: 5,
    marginVertical: 10,
  },
  lineBars: {
    height: 7,
    justifyContent: "center",
    width: 54,
  },
  yangLine: {
    borderRadius: 999,
    height: 5,
    width: "100%",
  },
  yinLine: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  yinHalf: {
    borderRadius: 999,
    height: 5,
    width: 22,
  },
  hexName: {
    color: mystic.ink,
    fontFamily: "Songti SC",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  chartMeta: {
    color: mystic.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
    textAlign: "center",
  },
  adviceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  adviceItem: {
    backgroundColor: "rgba(255,244,214,0.055)",
    borderColor: "rgba(255,244,214,0.1)",
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    width: "48%",
  },
  adviceTitle: {
    color: mystic.gold,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 6,
  },
  adviceBody: {
    color: mystic.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  yijiRow: {
    flexDirection: "row",
    gap: 12,
  },
  yijiColumn: {
    flex: 1,
    gap: 8,
  },
  yijiTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  goodText: {
    color: mystic.jade,
  },
  avoidText: {
    color: mystic.goldSoft,
  },
  yijiPill: {
    backgroundColor: "rgba(255,244,214,0.06)",
    borderColor: "rgba(255,244,214,0.12)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  yijiPillText: {
    color: mystic.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  adviceCard: {
    backgroundColor: "rgba(93, 169, 143, 0.12)",
    borderColor: "rgba(122, 212, 181, 0.26)",
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  adviceKicker: {
    color: mystic.jade,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  oneLine: {
    color: mystic.ink,
    fontFamily: "Songti SC",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 31,
    marginTop: 8,
  },
  specificHint: {
    color: mystic.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: mystic.cinnabar,
    borderColor: "rgba(242, 213, 138, 0.34)",
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 14,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: "#fffaf0",
    fontSize: 15,
    fontWeight: "900",
  },
  errorPanel: {
    backgroundColor: "rgba(12, 15, 17, 0.86)",
    borderColor: "rgba(242, 213, 138, 0.2)",
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  errorTitle: {
    color: mystic.goldSoft,
    fontSize: 21,
    fontWeight: "900",
  },
  errorBody: {
    color: mystic.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  footerNote: {
    color: mystic.faint,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});

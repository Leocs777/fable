import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DailyGuaIdleMotion } from "@/components/daily/DailyGuaMotion";
import { l, useAppLanguage } from "@/lib/i18n";
import { loadDailyGua, type DailyGuaResult } from "@/lib/dailyGua";
import { useMysticTheme, useThemeMode } from "@/theme/mystic";

export function DailyGuaHomeCard({ onPress }: { onPress: () => void }) {
  useAppLanguage();
  const theme = useMysticTheme();
  const light = useThemeMode() === "light";
  const [daily, setDaily] = useState<DailyGuaResult | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");

  useEffect(() => {
    let alive = true;
    loadDailyGua()
      .then(({ result, storageError }) => {
        if (!alive) return;
        setDaily(result);
        setStatus(storageError ? "fallback" : "ready");
      })
      .catch(() => {
        if (!alive) return;
        setStatus("fallback");
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={l({ zh: "查看今日一卦", en: "View today's reading" })}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: light ? "rgba(255, 251, 242, 0.74)" : "rgba(12, 15, 17, 0.86)",
          borderColor: theme.lineStrong,
          shadowColor: theme.gold,
        },
      ]}
    >
      <View style={styles.copy}>
        <View style={styles.headRow}>
          <Text style={[styles.kicker, { color: theme.goldSoft }]}>{l({ zh: "今日一卦", en: "Today's Reading" })}</Text>
          <Text style={[styles.status, { color: theme.jade, borderColor: light ? "rgba(44, 125, 112, 0.28)" : "rgba(122, 212, 181, 0.3)" }]}>{status === "loading" ? l({ zh: "点击查看", en: "Tap to view" }) : l({ zh: "已生成", en: "Ready" })}</Text>
        </View>
        <Text style={[styles.title, { color: theme.ink }]}>{l({ zh: "一念起象，观今日之势", en: "A gentle omen for today" })}</Text>
        <Text style={[styles.body, { color: theme.muted }]} numberOfLines={2}>
          {daily
            ? l({ zh: `${daily.hexagram.name} 之 ${daily.hexagram.changedHexagramName} · ${daily.keyword}`, en: `${daily.keyword} · generated for today` })
            : l({ zh: "基于日期、时辰和今日心念生成轻量提醒", en: "A light daily reading based on date, hour, and intent" })}
        </Text>
        <View style={[styles.cta, { backgroundColor: light ? "rgba(167,111,36,0.12)" : "rgba(217, 170, 77, 0.16)", borderColor: theme.lineStrong }]}>
          <Text style={[styles.ctaText, { color: theme.goldSoft }]}>{l({ zh: "查看今日卦象", en: "View today" })}</Text>
        </View>
      </View>
      <DailyGuaIdleMotion compact />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 156,
    overflow: "hidden",
    padding: 16,
    position: "relative",
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
  copy: {
    flex: 1,
    gap: 8,
  },
  headRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  kicker: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },
  status: {
    backgroundColor: "rgba(93, 169, 143, 0.14)",
    borderRadius: 999,
    borderWidth: 1,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  title: {
    fontFamily: "Songti SC",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
  },
  cta: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 2,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "900",
  },
});

import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { dailyHexagram, type DailyHexagram } from "@/lib/api";

export default function WenguaScreen() {
  const insets = useSafeAreaInsets();
  const [daily, setDaily] = useState<DailyHexagram | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const testConnection = async () => {
    setLoading(true);
    setErr(null);
    try {
      const d = new Date();
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      setDaily(await dailyHexagram(date));
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f4f1ea" }}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20 }}
    >
      <Text style={{ fontSize: 13, color: "#2f6f64", fontWeight: "700" }}>问卦决策</Text>
      <Text style={{ fontSize: 30, fontWeight: "800", color: "#2b2118", marginTop: 4 }}>天机快问</Text>
      <Text style={{ color: "#9a8f7d", marginTop: 8, lineHeight: 20 }}>
        RN 工程骨架已就位，解读后端在 Cloudflare Workers。下一步把六爻起卦 + 梅花/奇门/六壬 + AI 解读接进来。
      </Text>

      <Pressable
        onPress={testConnection}
        style={{ marginTop: 24, backgroundColor: "#a5311a", paddingVertical: 16, borderRadius: 16, alignItems: "center" }}
      >
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>测试云端连通（取今日一卦）</Text>
      </Pressable>

      {loading && <ActivityIndicator style={{ marginTop: 20 }} color="#a5311a" />}
      {err && <Text style={{ marginTop: 16, color: "#a5311a" }}>连接失败：{err}</Text>}
      {daily && (
        <View
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 16,
            backgroundColor: "#fcf8ef",
            borderWidth: 1,
            borderColor: "#e6ddc8",
          }}
        >
          <Text style={{ fontSize: 13, color: "#b7832f", fontWeight: "800" }}>{daily.date} · 今日天机</Text>
          <Text style={{ fontSize: 40, marginVertical: 8, color: "#a5311a" }}>{daily.hexagram}</Text>
          <Text style={{ fontSize: 15, color: "#3b332b", lineHeight: 22 }}>{daily.line}</Text>
        </View>
      )}
    </ScrollView>
  );
}

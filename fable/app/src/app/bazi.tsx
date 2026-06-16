import { ScrollView, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function BaziScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f4f1ea" }}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20 }}
    >
      <Text style={{ fontSize: 13, color: "#2f6f64", fontWeight: "700" }}>四柱八字</Text>
      <Text style={{ fontSize: 30, fontWeight: "800", color: "#2b2118", marginTop: 4 }}>八字命盘</Text>
      <Text style={{ color: "#9a8f7d", marginTop: 8, lineHeight: 20 }}>
        待接：出生信息录入 → 四柱五行 → 事业/感情/年度 AI 解读（走 /api/bazi）。
      </Text>
    </ScrollView>
  );
}

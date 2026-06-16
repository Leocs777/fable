import { ScrollView, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function FengshuiScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f4f1ea" }}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20 }}
    >
      <Text style={{ fontSize: 13, color: "#2f6f64", fontWeight: "700" }}>风水 Lite</Text>
      <Text style={{ fontSize: 30, fontWeight: "800", color: "#2b2118", marginTop: 4 }}>居家风水</Text>
      <Text style={{ color: "#9a8f7d", marginTop: 8, lineHeight: 20 }}>
        待接：房间类型/朝向/布局 → 6 条整改建议 AI 解读（走 /api/fengshui）。
      </Text>
    </ScrollView>
  );
}

import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LuopanRitual } from "./ritual/LuopanRitual";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <LuopanRitual
        compassSource={require("./assets/compass.png")}
        coinSource={require("./assets/coin.png")}
        // result 实际由规则引擎 + /api/divine 解读后端在起卦前准备好
        result={{
          hexagram: "需 → 节",
          title: "先稳住节奏，再择机推进",
          interpretation:
            "当前更适合蓄力与整理资源，把关键准备做扎实，会比立即冲刺更稳。",
        }}
      />
    </GestureHandlerRootView>
  );
}

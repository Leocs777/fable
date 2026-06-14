import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ritual3D } from "./ritual3d/Ritual3D";

// 真 3D 罗盘仪式场景（React Three Fiber + expo-gl）。
// 旧的 2.5D 版仍在 ritual/LuopanRitual.tsx，需要对比时可换回。
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Ritual3D />
    </GestureHandlerRootView>
  );
}

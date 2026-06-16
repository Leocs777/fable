import { Tabs } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#a5311a",
          tabBarInactiveTintColor: "#9a8f7d",
          tabBarStyle: { backgroundColor: "#f7f2e8", borderTopColor: "#e6ddc8" },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "问卦" }} />
        <Tabs.Screen name="bazi" options={{ title: "八字" }} />
        <Tabs.Screen name="fengshui" options={{ title: "风水" }} />
      </Tabs>
    </GestureHandlerRootView>
  );
}

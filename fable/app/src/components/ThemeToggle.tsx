import { Pressable, StyleSheet, Text, View } from "react-native";

import { l } from "@/lib/i18n";
import { toggleThemeMode, useMysticTheme, useThemeMode } from "@/theme/mystic";

export function ThemeToggle() {
  const mode = useThemeMode();
  const theme = useMysticTheme();
  const light = mode === "light";

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: light }}
      accessibilityLabel={l({ zh: "切换浅色模式", en: "Toggle light mode" })}
      hitSlop={8}
      onPress={toggleThemeMode}
      style={[
        styles.button,
        {
          backgroundColor: light ? "rgba(255,255,255,0.72)" : "rgba(255, 244, 214, 0.08)",
          borderColor: theme.lineStrong,
        },
      ]}
    >
      <View style={[styles.thumb, { backgroundColor: light ? theme.gold : theme.nightJade, transform: [{ translateX: light ? 18 : 0 }] }]} />
      <Text style={[styles.label, { color: theme.ink }]}>{light ? l({ zh: "浅", en: "Light" }) : l({ zh: "深", en: "Dark" })}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 38,
    minWidth: 76,
    paddingLeft: 7,
    paddingRight: 11,
  },
  thumb: {
    borderRadius: 999,
    height: 14,
    width: 14,
  },
  label: {
    fontFamily: "PingFang SC",
    fontSize: 12,
    fontWeight: "900",
  },
});
